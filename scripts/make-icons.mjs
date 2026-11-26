#!/usr/bin/env node
/**
 * Generates the share image, app icons and web manifest from the logo.
 *   node scripts/make-icons.mjs
 * Outputs: src/assets/images/og-default.png (1200x630), src/assets/icons/{apple-touch-icon,icon-192,icon-512}.png
 * and src/assets/icons/manifest.webmanifest. Re-run it if the logo or src/_data/site.json colours change.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/site.json"), "utf-8"));
const logo = fs.readFileSync(path.join(ROOT, "src/assets/svg/jalapeno-logo.svg"));
const bg = site.themeColorLight;

async function icon(size, padFraction, file) {
  const inner = Math.round(size * (1 - padFraction * 2));
  const mark = await sharp(logo, { density: 600 }).resize(inner, inner, { fit: "contain", background: bg }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite([{ input: mark, gravity: "centre" }]).png().toFile(file);
  console.log("wrote", path.relative(ROOT, file));
}

const icons = path.join(ROOT, "src/assets/icons");
fs.mkdirSync(icons, { recursive: true });
await icon(180, 0.14, path.join(icons, "apple-touch-icon.png"));
await icon(192, 0.14, path.join(icons, "icon-192.png"));
await icon(512, 0.14, path.join(icons, "icon-512.png"));

const mark = await sharp(logo, { density: 600 }).resize(420, 420, { fit: "contain", background: bg }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: bg } }).composite([{ input: mark, gravity: "centre" }]).png().toFile(path.join(ROOT, "src/assets/images/og-default.png"));
console.log("wrote src/assets/images/og-default.png");

fs.writeFileSync(path.join(icons, "manifest.webmanifest"), JSON.stringify({
  name: site.name,
  short_name: site.name,
  description: site.description,
  start_url: "/",
  display: "browser",
  lang: site.lang,
  background_color: site.themeColorLight,
  theme_color: site.themeColorLight,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  ],
}, null, 2) + "\n");
console.log("wrote src/assets/icons/manifest.webmanifest");
