---
title: Getting Playlists out of Roon
layout: page.njk
excerpt: Pull your Roon playlists and album art onto a website with a small Node script, and how to get Claude to build and debug it with you.
eleventyNavigation:
  key: roon-sync-playlists
  parent: roon
  order: 1
tags: [roon, music, claude, node, api]
---

Roon has no "export my playlists to a website" button, but it does have an official extension API. A small script can sign in to your Roon Core, read every playlist, and save each one as a CSV plus a cover image. This guide covers the whole path: what to install, how to approve the extension, the problems you are likely to hit, and the prompts that got Claude through it.

## What you end up with

* A CSV per playlist (`title;artist;album;isrc;image`) that a static site can read.
* A cover image for each playlist, built as a 2×2 mosaic of four album covers.
* A small thumbnail for every track.
* One command to refresh all of it whenever the playlists change.

Nothing is changed in Roon. The script only reads playlists and artwork.

## How it works

Roon lets third-party programs register as an **extension**. The two parts of the API that matter here are:

* **Browse**, which lists the library one level at a time. The `playlists` hierarchy gives you every playlist, and opening one gives you its tracks.
* **Image**, which returns album artwork for an `image_key` at whatever size you ask for.

The script runs on any machine on the same network as your Roon Core. The first time it connects, Roon asks you to approve it, and after that it remembers.

## Setting it up

You need a recent Node.js and a Roon Core on your network. The Roon packages are only published on GitHub, so install them with GitHub specifiers:

```bash
npm install --save-dev github:roonlabs/node-roon-api github:roonlabs/node-roon-api-browse github:roonlabs/node-roon-api-image
```

Then try listing your playlists:

```bash
npm run roon -- --list --wait 300
```

The script finds the Core automatically, registers itself, and waits. Now open Roon and go to **Settings > Extensions**. Find the extension and click **Enable**. The script carries on as soon as you do, and prints every playlist with its track count.

Before you trust a full sync, look at one playlist's raw data:

```bash
npm run roon -- --inspect "My Playlist"
```

Then do a dry run, which reads everything and writes nothing:

```bash
npm run roon -- --dry-run --verbose
```

Finally, run the real thing:

```bash
npm run roon
```

## Telling the site which playlists to use

The site keeps a list of playlists in `allmusic.json`, each with a name, a tagline and a `source` (the CSV filename). The script matches Roon playlists to those entries by name. Two optional fields cover awkward cases:

* `roon_name`, the exact Roon name, when it differs from the site name (for example "2023 - EDM" against `2023-EDM`).
* `roon_index`, which copy to use when Roon has several playlists with the same name. It counts from 0.

To add a playlist the site doesn't list yet, add an entry for it and sync just that one:

```bash
npm run roon -- --only "2026 - EDM"
```

## Things that will trip you up

**The extension only shows in Roon while the script is running.** If you cannot find it under Settings > Extensions, the script has probably already timed out. Run it with `--wait 300` and look while it waits.

**The API library insists on an email address.** The extension registration needs an `email` field. Use a generic address you control rather than your personal one, because it appears in Roon's extension list.

**Artist names are noisy.** Roon lists every credit for a track, so the artist can be "Sacha Skarbek, Amanda Ghost, James Blunt". An older export may only have "James Blunt". The script matches tracks by title and any shared artist name, so existing rows keep the artist, album and ISRC they already had. Only new tracks get Roon's long credit string.

**No ISRCs.** The API does not provide them, so new tracks have none. If your site links tracks to an ISRC lookup, those links only appear for tracks you already had.

**Playlists can contain the same track twice.** Roon's own count seems to be of unique tracks. The script lists each song once, so the counts come out close to Roon's.

**Duplicate playlist names are common**, especially if you have imported playlists from a streaming service. Run a dry run for each copy and pick the one that matches the playlist you published before.

**Some tracks have no artwork.** Roon answers "NotFound" however you ask, so show a neutral square for those instead of treating it as an error.

**Playlists have no art of their own** in the API. That is why the cover is a mosaic of the first four album covers that load.

## Prompts that worked with Claude

You do not have to write this yourself. These are the prompts that moved things along, in order. The first three, the fifth, and the two lines in the last block are the ones actually used to build this site; the others show what to say at those moments. Claude can run the script on your machine, read the output, and fix what it finds, but it cannot click Enable in Roon for you.

Start by asking whether it is possible at all:

```text
I use Roon for all my music needs and my playlists come from there.
Can you access Roon to update my playlists?
```

Ask what else the same connection could do before you commit to a direction:

```text
If we do the custom API, what else could we do with it?
```

Pick a scope and let it build:

```text
Let's do the playlist sync with album art.
```

Give it your real setup so it does not guess. It helps to say where the Core is and what the existing data looks like:

```text
The Roon Core is on my network. My playlists are CSVs in src/_data/csv
and listed in src/_data/allmusic.json. Keep the ISRCs that are already there.
```

When something does not work, say exactly what you see:

```text
Not seeing the extension in Roon under Settings > Extensions.
```

Ask for evidence before trusting a sync:

```text
Run a dry run and show me which tracks it would add or remove,
before it writes anything.
```

When the numbers look off, ask it to find out why rather than guess:

```text
The track counts don't match Roon. Find out why.
```

Then keep going in small steps:

```text
Add all the new year-lists.
Add a link to each track to search for it on YouTube, opening in a new window.
```

A few habits made the difference. Ask for a dry run first, because it exposed the artist-name and duplicate problems before any file was overwritten. Ask Claude to look at real output (`--inspect`) rather than assume how the API behaves. Keep your data in git, so a bad sync is one `git checkout` away from undone.

## Where to go next

The same connection can do more than playlists. It can read the albums, artists and genres in your library, and a separate part of the API reports what is playing right now. A live "Now Playing" widget is possible, but a static site cannot talk to Roon directly, so it needs a small always-on service on your network that publishes the current track somewhere the site can read.
