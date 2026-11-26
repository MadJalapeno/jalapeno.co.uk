#!/usr/bin/env node
/**
 * Sync playlists (and album art) from Roon into the site.
 *
 *   npm run roon -- --list                  list the playlists Roon reports
 *   npm run roon -- --inspect "Passion"     dump the raw Browse API structure for one playlist
 *   npm run roon                            sync every playlist already in src/_data/allmusic.json
 *   npm run roon -- --only "2023,Passion"   sync just these
 *   npm run roon -- --add-new --only "2025" add a Roon playlist the site doesn't list yet (needs --only)
 *   npm run roon -- --refresh-art           re-download art that already exists
 *   npm run roon -- --no-art                skip images
 *   npm run roon -- --dry-run               show what would change, write nothing
 *   npm run roon -- --verbose               also list the tracks added/removed per playlist
 *   npm run roon -- --wait 300              wait longer for you to enable the extension in Roon (default 60s)
 *
 * First run: open Roon > Settings > Extensions and enable "jalapeno.co.uk playlist sync".
 * Run it on a machine on the same network as your Roon Core.
 *
 * What it writes
 *   src/_data/csv/<source>.csv                      title;artist;album;isrc;image
 *   src/assets/images/playlists/<source>.jpg        playlist cover
 *   src/assets/images/playlists/thumbs/<hash>.jpg   track thumbnails (shared between playlists)
 *   src/_data/allmusic.json                         only adds `cover: true` (and new entries with --add-new)
 *
 * Roon's API does not provide ISRCs or album names for tracks. Tracks already in the existing CSV
 * (matched on title) keep their whole row, so artist/album/ISRC stay as exported; new tracks get album
 * and ISRC blank. Tracks removed from the Roon playlist are removed from the CSV.
 *
 * allmusic.json entries can set "roon_name" (the exact Roon playlist name) and, when Roon has several
 * playlists with that name, "roon_index" (0-based position among them; default 0).
 * Playlists have no art of their own in Roon, so the cover is a 2x2 mosaic of the first four distinct
 * album covers (or a single cover if there are fewer).
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PATHS = {
  allmusic: path.join(ROOT, "src/_data/allmusic.json"),
  csv: path.join(ROOT, "src/_data/csv"),
  covers: path.join(ROOT, "src/assets/images/playlists"),
  thumbs: path.join(ROOT, "src/assets/images/playlists/thumbs"),
  state: path.join(ROOT, "scripts/.roon"), // Roon pairing token lives here (gitignored)
};
const HIERARCHY = "playlists";
const COVER_SIZE = 600;
const THUMB_SIZE = 96;

// ---------- args ----------
export function parseArgs(argv) {
  const a = { list: false, inspect: null, only: null, addNew: false, refreshArt: false, art: true, dryRun: false, wait: 60, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--list") a.list = true;
    else if (v === "--inspect") a.inspect = argv[++i];
    else if (v === "--only") a.only = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (v === "--add-new") a.addNew = true;
    else if (v === "--refresh-art") a.refreshArt = true;
    else if (v === "--no-art") a.art = false;
    else if (v === "--dry-run") a.dryRun = true;
    else if (v === "--verbose") a.verbose = true;
    else if (v === "--wait") a.wait = Number(argv[++i]) || 60;
    else throw new Error(`Unknown option: ${v}`);
  }
  if (a.addNew && !a.only) throw new Error('--add-new needs --only "Playlist name[,Another]" (Roon has far more playlists than the site should list).');
  return a;
}

// ---------- helpers ----------
export const norm = (s) => String(s ?? "").trim().toLowerCase();
export const slug = (s) =>
  String(s).normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "playlist";
const key = (title, artist) => `${norm(title)}|${norm(artist)}`;

export function csvCell(v) {
  const s = String(v ?? "");
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function readExistingCsv(file) {
  if (!fs.existsSync(file)) return [];
  const rows = parse(fs.readFileSync(file, "utf-8"), {
    columns: true, skip_empty_lines: true, delimiter: ";", relax_quotes: true, relax_column_count: true,
  });
  return rows;
}

// Fold accents, curly quotes and Unicode hyphens so "alt‐J" == "alt-J" and "Naté" == "Nate".
export const fold = (s) =>
  String(s ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2010-\u2015\u2212]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').toLowerCase().trim();
// Split a credit string into individual names (Roon: "A, B, C"; old exports: "A / B", "A feat. B").
const names = (s) => fold(s).split(/\s*(?:,|\/|;|&|\bfeat\.?|\bft\.?|\bwith\b)\s*/).filter(Boolean);
const overlap = (a, b) => { const bs = new Set(names(b)); return names(a).some((n) => bs.has(n)); };
function lev(a, b) {
  const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}

/**
 * Pair each Roon track with a row from the previous CSV (so artist/album/ISRC are kept).
 * Roon's subtitle lists every credit (writers included) and its metadata drifts over time, so:
 *   1. same title + a shared credited name   2. same title, and it is the only one with that title
 *   3. a shared name + near-identical title (one starts with the other, or <= 2 edits apart)
 * Each old row is used at most once. Returns an array parallel to `tracks` (null = new track).
 */
export function matchAll(tracks, oldRows) {
  const free = new Set(oldRows);
  const pick = (pred) => { for (const r of free) if (pred(r)) { free.delete(r); return r; } return null; };
  const result = tracks.map(() => null);
  const pass = (fn) => tracks.forEach((t, i) => { if (!result[i]) result[i] = fn(t); });
  pass((t) => pick((r) => fold(r.title) === fold(t.title) && overlap(r.artist, t.subtitle)));
  pass((t) => {
    const same = [...free].filter((r) => fold(r.title) === fold(t.title));
    return same.length === 1 ? pick((r) => r === same[0]) : null;
  });
  pass((t) => pick((r) => {
    if (!overlap(r.artist, t.subtitle)) return false;
    const a = fold(r.title), b = fold(t.title);
    return a.startsWith(b) || b.startsWith(a) || lev(a, b) <= 2;
  }));
  return result;
}

export function findEntry(entries, roonName) {
  const n = norm(roonName);
  return entries.find((e) => [e.roon_name, e.full_name, e.title, e.source].some((f) => f && norm(f) === n));
}

// ---------- Roon wrappers ----------
function roonClient(core) {
  const browseSvc = core.services.RoonApiBrowse;
  const imageSvc = core.services.RoonApiImage;
  const browse = (opts) =>
    new Promise((res, rej) => browseSvc.browse(opts, (err, body) => (err ? rej(new Error(String(err))) : res(body))));
  const load = (opts) =>
    new Promise((res, rej) => browseSvc.load(opts, (err, body) => (err ? rej(new Error(String(err))) : res(body))));
  const imageOnce = (image_key, size) =>
    new Promise((res, rej) =>
      imageSvc.get_image(
        image_key,
        { scale: "fill", width: size, height: size, format: "image/jpeg" },
        (err, contentType, buf) => (err ? rej(new Error(String(err))) : res(buf)),
      ),
    );
  // One quick retry; a track with no artwork in Roon answers NotFound every time.
  const image = async (image_key, size, tries = 2) => {
    for (let i = 1; ; i++) {
      try { return await imageOnce(image_key, size); }
      catch (e) { if (i >= tries) throw e; await new Promise((r) => setTimeout(r, 250)); }
    }
  };

  async function loadAll(total) {
    const items = [];
    for (let offset = 0; offset < total; offset += 100) {
      const body = await load({ hierarchy: HIERARCHY, offset, count: 100 });
      items.push(...(body.items || []));
    }
    return items;
  }

  async function topLevel() {
    const body = await browse({ hierarchy: HIERARCHY, pop_all: true });
    if (body.action !== "list") throw new Error(`Unexpected response browsing playlists: ${JSON.stringify(body)}`);
    return loadAll(body.list.count);
  }

  async function openPlaylist(title, index = 0) {
    const items = await topLevel(); // re-read so item keys are fresh
    const same = items.filter((i) => i.title === title && i.item_key);
    const hit = same[index];
    if (!hit) throw new Error(`Playlist "${title}"${index ? ` (#${index})` : ""} not found in Roon`);
    const body = await browse({ hierarchy: HIERARCHY, item_key: hit.item_key });
    if (body.action !== "list") throw new Error(`Could not open "${title}": ${JSON.stringify(body)}`);
    const children = await loadAll(body.list.count);
    return { top: hit, list: body.list, children, duplicates: same.map((i) => i.subtitle) };
  }

  return { browse, load, image, topLevel, openPlaylist };
}

// Roon playlists can contain the same track twice; the site lists each song once.
export const dedupe = (tracks) => {
  const seen = new Set();
  return tracks.filter((t) => { const k = `${fold(t.title)}|${fold(t.subtitle)}`; if (seen.has(k)) return false; seen.add(k); return true; });
};

const isPlaylistItem = (i) => i.item_key && i.hint !== "header" && i.hint !== "action";
// A track row has an artist in `subtitle`; headers and "Play Playlist"-style actions do not.
const isTrackItem = (i) => i.item_key && i.hint !== "header" && i.subtitle;

async function saveImage(client, imageKey, file, size, { refresh }) {
  if (!imageKey) return false;
  if (fs.existsSync(file) && !refresh) return true;
  const buf = await client.image(imageKey, size);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return true;
}

async function makeCover(client, tracks, file, { refresh }) {
  if (fs.existsSync(file) && !refresh) return true;
  // Some tracks have no artwork in Roon (NotFound), so walk the distinct covers until we have four that load.
  const keys = [...new Set(tracks.map((t) => t.image_key).filter(Boolean))];
  const half = COVER_SIZE / 2;
  const got = [];
  for (const k of keys) {
    if (got.length === 4) break;
    try { got.push({ key: k, buf: await client.image(k, half) }); } catch { /* no art for this one, try the next */ }
  }
  if (!got.length) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (got.length === 4) {
    try {
      const sharp = (await import("sharp")).default;
      const out = await sharp({ create: { width: COVER_SIZE, height: COVER_SIZE, channels: 3, background: "#ffffff" } })
        .composite(got.map(({ buf }, i) => ({ input: buf, left: (i % 2) * half, top: Math.floor(i / 2) * half })))
        .jpeg({ quality: 82 })
        .toBuffer();
      fs.writeFileSync(file, out);
      return true;
    } catch (e) {
      console.log(`  ! mosaic failed (${e.message}); using a single cover instead`);
    }
  }
  fs.writeFileSync(file, await client.image(got[0].key, COVER_SIZE));
  return true;
}

// ---------- main sync ----------
export async function sync(core, args, log = console.log) {
  const client = roonClient(core);

  if (args.list) {
    const items = await client.topLevel();
    items.filter(isPlaylistItem).forEach((i) => log(`- ${i.title}${i.subtitle ? `  (${i.subtitle})` : ""}`));
    return { changed: false };
  }

  if (args.inspect) {
    const top = await client.topLevel();
    log("Top level (first 10):\n" + JSON.stringify(top.slice(0, 10), null, 2));
    const { list, children } = await client.openPlaylist(args.inspect);
    log(`\nPlaylist list: ${JSON.stringify(list, null, 2)}`);
    log(`First 8 children of "${args.inspect}":\n` + JSON.stringify(children.slice(0, 8), null, 2));
    const tracks = children.filter(isTrackItem);
    log(`\nSummary: ${children.length} rows, ${tracks.length} counted as tracks, ${children.length - tracks.length} skipped.`);
    children.filter((c) => !isTrackItem(c)).forEach((c) => log(`  skipped: ${JSON.stringify(c)}`));
    const seen = new Map();
    tracks.forEach((t) => seen.set(`${t.title}|${t.subtitle}`, (seen.get(`${t.title}|${t.subtitle}`) || 0) + 1));
    [...seen].filter(([, n]) => n > 1).forEach(([k, n]) => log(`  duplicate x${n}: ${k}`));
    return { changed: false };
  }

  const entries = JSON.parse(fs.readFileSync(PATHS.allmusic, "utf-8"));
  const roonPlaylists = (await client.topLevel()).filter(isPlaylistItem);
  const wanted = args.only ? new Set(args.only.map(norm)) : null;
  let entriesChanged = false;
  const seen = new Set();
  const report = { synced: [], unmatched: [], failed: [] };

  const nameCounts = new Map();
  roonPlaylists.forEach((p) => nameCounts.set(p.title, (nameCounts.get(p.title) || 0) + 1));
  const used = new Map(); // title -> how many playlists of that name we have visited

  for (const pl of roonPlaylists) {
    const occurrence = used.get(pl.title) || 0;
    used.set(pl.title, occurrence + 1);
    let entry = findEntry(entries, pl.title);
    if (entry && occurrence !== (entry.roon_index || 0)) continue; // a different same-named playlist
    if (!entry && occurrence > 0) continue; // only consider the first of an unmatched name
    if (!entry && args.addNew && wanted && wanted.has(norm(pl.title))) {
      entry = { full_name: pl.title, source: slug(pl.title), title: pl.title };
      entries.push(entry);
      entriesChanged = true;
      log(`+ new entry for "${pl.title}" (source: ${entry.source})`);
    }
    if (!entry) { report.unmatched.push(pl.title); continue; }
    if (wanted && ![entry.roon_name, entry.full_name, entry.title, entry.source].some((f) => f && wanted.has(norm(f)))) continue;
    seen.add(entry);

    try {
      const { list, children, duplicates } = await client.openPlaylist(pl.title, entry.roon_index || 0);
      if (duplicates.length > 1)
        log(`  note: Roon has ${duplicates.length} playlists called "${pl.title}" (${duplicates.join(", ")}); using #${entry.roon_index || 0}. Set "roon_index" in allmusic.json to choose another.`);
      const allTracks = children.filter(isTrackItem);
      const tracks = dedupe(allTracks);
      if (tracks.length < allTracks.length) log(`  note: ${allTracks.length - tracks.length} repeated track(s) in "${pl.title}" were listed once`);
      if (!tracks.length) { report.failed.push(`${pl.title}: no tracks found (try --inspect "${pl.title}")`); continue; }

      const csvFile = path.join(PATHS.csv, `${entry.source}.csv`);
      const oldRows = readExistingCsv(csvFile);
      const matched = matchAll(tracks, oldRows);
      const rows = [];
      for (const [ti, t] of tracks.entries()) {
        const prev = matched[ti] || {};
        let image = "";
        if (args.art && t.image_key) {
          image = `${crypto.createHash("sha1").update(t.image_key).digest("hex").slice(0, 10)}.jpg`;
          if (!args.dryRun) {
            try { await saveImage(client, t.image_key, path.join(PATHS.thumbs, image), THUMB_SIZE, { refresh: args.refreshArt }); }
            catch (e) { image = ""; log(`  ! thumbnail failed for "${t.title}": ${e.message}`); }
          }
        }
        rows.push([prev.title || t.title, prev.artist || t.subtitle, prev.album || "", prev.isrc || "", image]);
      }
      const csv = ["title;artist;album;isrc;image", ...rows.map((r) => r.map(csvCell).join(";"))].join("\n") + "\n";

      const fresh = rows.filter((r) => !r[3]).length;
      const added = matched.filter((m) => !m).length;
      const dropped = oldRows.length - (tracks.length - added);
      log(`${pl.title}: ${rows.length} tracks (${added} new, ${Math.max(0, dropped)} removed, ${fresh} without ISRC)`);
      if (args.verbose) {
        const kept = new Set(matched.filter(Boolean));
        tracks.forEach((t, i) => { if (!matched[i]) log(`    + ${t.title} — ${t.subtitle}`); });
        oldRows.filter((r) => !kept.has(r)).forEach((r) => log(`    - ${r.title} — ${r.artist}`));
      }
      if (!args.dryRun) fs.writeFileSync(csvFile, csv);

      if (args.art) {
        if (!args.dryRun) {
          try {
            if (await makeCover(client, tracks, path.join(PATHS.covers, `${entry.source}.jpg`), { refresh: args.refreshArt }) && !entry.cover) {
              entry.cover = true; entriesChanged = true;
            }
          } catch (e) { log(`  ! cover failed: ${e.message}`); }
        }
      }
      report.synced.push(pl.title);
    } catch (e) {
      report.failed.push(`${pl.title}: ${e.message}`);
    }
  }

  const missing = entries.filter((e) => !seen.has(e) && (!wanted || [e.full_name, e.title, e.source].some((f) => f && wanted.has(norm(f)))));
  if (entriesChanged && !args.dryRun) fs.writeFileSync(PATHS.allmusic, JSON.stringify(entries, null, 2) + "\n");

  log(`\nSynced ${report.synced.length} playlist(s).`);
  if (report.unmatched.length && !wanted)
    log(`In Roon but not on the site (use --add-new, or add "roon_name" to an entry in allmusic.json):\n  ` + report.unmatched.join("\n  "));
  if (missing.length && !wanted)
    log(`On the site but not found in Roon (CSV left untouched; set "roon_name" if the Roon name differs):\n  ` + missing.map((e) => e.full_name).join("\n  "));
  if (report.failed.length) log(`Problems:\n  ` + report.failed.join("\n  "));
  if (args.dryRun) log("(dry run: nothing written)");
  return { changed: true, report };
}

// ---------- connect ----------
function connect(waitSeconds = 60) {
  let RoonApi, RoonApiBrowse, RoonApiImage;
  try {
    RoonApi = require("node-roon-api");
    RoonApiBrowse = require("node-roon-api-browse");
    RoonApiImage = require("node-roon-api-image");
  } catch {
    console.error(
      "Roon API packages are not installed. Run:\n" +
        "  npm install --save-dev github:roonlabs/node-roon-api github:roonlabs/node-roon-api-browse github:roonlabs/node-roon-api-image",
    );
    process.exit(1);
  }
  fs.mkdirSync(PATHS.state, { recursive: true });
  process.chdir(PATHS.state); // node-roon-api saves its pairing token (config.json) in the cwd

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`No Roon Core authorised the extension within ${waitSeconds}s. In Roon: Settings > Extensions > enable "jalapeno.co.uk playlist sync". (It only appears there while this script is running.)`)),
      waitSeconds * 1000,
    );
    const roon = new RoonApi({
      extension_id: "uk.co.jalapeno.playlist-sync",
      display_name: "jalapeno.co.uk playlist sync",
      display_version: "1.0.0",
      publisher: "jalapeno.co.uk",
      email: "noreply@jalapeno.co.uk", // required by node-roon-api; shown in Roon's extension list
      website: "https://github.com/MadJalapeno/jalapeno.co.uk",
      core_paired: (core) => { clearTimeout(timer); resolve(core); },
      core_unpaired: () => {},
    });
    roon.init_services({ required_services: [RoonApiBrowse, RoonApiImage] });
    roon.start_discovery();
  });
}

// ---------- entry ----------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const core = await connect(args.wait);
    console.log(`Connected to Roon Core "${core.display_name}".\n`);
    await sync(core, args);
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
