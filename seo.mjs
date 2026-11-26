// SEO for the whole site: <title>, meta description, canonical, robots, Open Graph, Twitter cards
// and JSON-LD structured data, plus the sitemap filter. Used by `{% seoHead %}` in header.njk.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIN_TAG_PAGES = 3; // tag pages with fewer pages than this are thin: noindex, left out of the sitemap

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function clip(text, max = 160) {
  const s = stripHtml(text);
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return cut.slice(0, at > max * 0.5 ? at : max - 1).replace(/[\s,;:.\-–—]+$/, "") + "…";
}

const abs = (site, p) => new URL(p, site.url).href;
const iso = (d) => (d instanceof Date && !Number.isNaN(+d) ? d.toISOString() : undefined);
const visibleTags = (tags) => (tags || []).filter((t) => !["all", "pages", "articles"].includes(t));

export function readPlaylistCsv(source) {
  const file = path.join(ROOT, "src", "_data", "csv", `${source}.csv`);
  if (!fs.existsSync(file)) return [];
  return parse(fs.readFileSync(file, "utf-8"), { columns: true, skip_empty_lines: true, delimiter: ";", relax_quotes: true, relax_column_count: true });
}

/** Is this page allowed in search results (and so in the sitemap)? */
export function isIndexable(data, collections) {
  if (!data || data.noindex) return false;
  if (data.tag && collections && collections[data.tag] && collections[data.tag].length < MIN_TAG_PAGES) return false;
  return true;
}

function kindOf(d) {
  const url = d.page.url;
  if (url === "/") return "home";
  if (d.playlist) return "playlist";
  if (d.topic && d.topics && d.topics[d.topic]) return "guide";
  if (d.tag) return "tag";
  if (["/music/", "/pages/", "/tags/"].includes(url)) return "index";
  if (url === "/404.html") return "error";
  return "page";
}

export function describePage(d, site, collections) {
  const kind = kindOf(d);
  const url = abs(site, d.page.url);
  const tagPages = d.tag && collections ? collections[d.tag] || [] : [];
  const rows = kind === "playlist" ? readPlaylistCsv(d.playlist.source) : [];

  let title;
  let description;
  switch (kind) {
    case "home":
      title = `${site.name} | ${site.tagline}`;
      description = d.description || site.description;
      break;
    case "playlist":
      title = `${d.playlist.title} | ${site.name}`;
      description = d.description ||
        `${d.playlist.tag ? stripHtml(d.playlist.tag).replace(/[.\s]+$/, "") + ". " : ""}${plural(rows.length, "track", "tracks")} from my Roon library, with album art and a CSV download.`;
      break;
    case "tag":
      title = `Pages tagged “${d.tag}” | ${site.name}`;
      description = `${plural(tagPages.length, "page", "pages")} tagged ${d.tag}: ${tagPages.slice(0, 3).map((p) => p.data.title).join(", ")}${tagPages.length > 3 ? " and more" : ""}.`;
      break;
    case "error":
      title = `Page not found | ${site.name}`;
      description = "That page could not be found.";
      break;
    default:
      title = `${d.title} | ${site.name}`;
      description = d.description || d.excerpt || site.description;
      // very short excerpts make weak search snippets: add the topic's description for context
      if (kind === "guide" && !d.description && stripHtml(description).length < 80 && d.topics[d.topic].blurb)
        description = `${stripHtml(description).replace(/[.\s]+$/, "")}. ${d.topics[d.topic].blurb}`;
  }
  title = String(title).replace(/\s+/g, " ").trim();
  description = clip(description, 160);

  const image = kind === "playlist" && d.playlist.cover
    ? { url: abs(site, `/assets/images/playlists/${d.playlist.source}.jpg`), width: 600, height: 600, alt: `Cover art for ${d.playlist.title}`, card: "summary" }
    : { url: abs(site, site.ogImage), width: 1200, height: 630, alt: `${site.name} logo`, card: "summary_large_image" };

  return { kind, url, title, description, image, rows, tagPages, noindex: !isIndexable(d, collections) };
}

function breadcrumbs(d, site, info) {
  const crumbs = [{ name: "Home", url: abs(site, "/") }];
  const parent = { guide: ["Pages", "/pages/"], playlist: ["Music", "/music/"], tag: ["Tags", "/tags/"] }[info.kind];
  if (parent) crumbs.push({ name: parent[0], url: abs(site, parent[1]) });
  if (info.kind !== "home") crumbs.push({ name: info.kind === "tag" ? `Tag: ${d.tag}` : d.title, url: info.url });
  if (crumbs.length < 2) return null;
  return {
    "@type": "BreadcrumbList",
    "@id": `${info.url}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };
}

export function buildJsonLd(d, site, info) {
  const websiteId = abs(site, "/#website");
  const pageId = `${info.url}#webpage`;
  const graph = [
    { "@type": "WebSite", "@id": websiteId, url: abs(site, "/"), name: site.name, description: site.description, inLanguage: site.lang },
  ];
  const base = { "@id": pageId, url: info.url, name: info.title, description: info.description, inLanguage: site.lang, isPartOf: { "@id": websiteId }, primaryImageOfPage: { "@type": "ImageObject", url: info.image.url } };

  if (info.kind === "guide") {
    const topic = d.topics[d.topic];
    graph.push({
      ...base,
      "@type": "TechArticle",
      headline: d.title,
      articleSection: topic.title,
      keywords: visibleTags(d.tags).join(", ") || undefined,
      dateModified: iso(d.page.date),
      image: info.image.url,
      mainEntityOfPage: info.url,
      author: { "@type": "Organization", name: site.name, url: abs(site, "/") },
      publisher: { "@type": "Organization", name: site.name, url: abs(site, "/") },
    });
  } else if (info.kind === "playlist") {
    graph.push({
      "@type": "MusicPlaylist",
      "@id": `${info.url}#playlist`,
      url: info.url,
      name: d.playlist.title,
      description: info.description,
      image: info.image.url,
      inLanguage: site.lang,
      numTracks: info.rows.length,
      track: info.rows.slice(0, 50).map((r) => ({
        "@type": "MusicRecording",
        name: r.title,
        byArtist: { "@type": "MusicGroup", name: r.artist },
        ...(r.album ? { inAlbum: { "@type": "MusicAlbum", name: r.album } } : {}),
        ...(r.isrc ? { isrcCode: r.isrc } : {}),
      })),
    }, { ...base, "@type": "CollectionPage", about: { "@id": `${info.url}#playlist` } });
  } else if (info.kind === "tag") {
    graph.push({
      ...base,
      "@type": "CollectionPage",
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: info.tagPages.length,
        itemListElement: info.tagPages.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(site, p.url), name: p.data.title })),
      },
    });
  } else if (info.kind === "index") {
    graph.push({ ...base, "@type": "CollectionPage" });
  } else {
    graph.push({ ...base, "@type": "WebPage" });
  }

  const crumbs = breadcrumbs(d, site, info);
  if (crumbs) graph.push(crumbs);
  return { "@context": "https://schema.org", "@graph": graph };
}

export function renderHead(d, collections) {
  const site = d.site;
  if (!d.page || !d.page.url) return "";
  const info = describePage(d, site, collections);
  const robots = info.noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const og = info.kind === "guide" ? "article" : "website";
  const out = [
    `<title>${esc(info.title)}</title>`,
    `<meta name="description" content="${esc(info.description)}" />`,
    `<link rel="canonical" href="${esc(info.url)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${site.themeColorLight}" />`,
    `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${site.themeColorDark}" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:locale" content="${site.locale}" />`,
    `<meta property="og:type" content="${og}" />`,
    `<meta property="og:title" content="${esc(info.title)}" />`,
    `<meta property="og:description" content="${esc(info.description)}" />`,
    `<meta property="og:url" content="${esc(info.url)}" />`,
    `<meta property="og:image" content="${esc(info.image.url)}" />`,
    `<meta property="og:image:width" content="${info.image.width}" />`,
    `<meta property="og:image:height" content="${info.image.height}" />`,
    `<meta property="og:image:alt" content="${esc(info.image.alt)}" />`,
    `<meta name="twitter:card" content="${info.image.card}" />`,
    `<meta name="twitter:title" content="${esc(info.title)}" />`,
    `<meta name="twitter:description" content="${esc(info.description)}" />`,
    `<meta name="twitter:image" content="${esc(info.image.url)}" />`,
    `<meta name="twitter:image:alt" content="${esc(info.image.alt)}" />`,
  ];
  if (info.kind === "guide") {
    const mod = iso(d.page.date);
    if (mod) out.push(`<meta property="article:modified_time" content="${mod}" />`);
    out.push(`<meta property="article:section" content="${esc(d.topics[d.topic].title)}" />`);
    visibleTags(d.tags).forEach((t) => out.push(`<meta property="article:tag" content="${esc(t)}" />`));
  }
  out.push(`<script type="application/ld+json">${JSON.stringify(buildJsonLd(d, site, info)).replace(/</g, "\\u003c")}</script>`);
  return out.join("\n    ");
}

export default function seoPlugin(eleventyConfig) {
  // {% seoHead %} inside <head>
  eleventyConfig.addShortcode("seoHead", function () {
    const ctx = this.ctx || this.context?.environments || {};
    return renderHead(ctx, ctx.collections);
  });

  // Entries for sitemap.xml: indexable pages only, with a lastmod only where there is a real date.
  eleventyConfig.addFilter("sitemapEntries", (items, collections) =>
    (items || [])
      .filter((i) => i.url && !/\.(xml|txt|json|webmanifest)$/.test(i.url) && i.url !== "/404.html" && isIndexable(i.data, collections))
      .map((i) => ({ url: i.url, lastmod: i.data.topic ? iso(i.date)?.slice(0, 10) : undefined }))
      .sort((a, b) => a.url.localeCompare(b.url)),
  );
}
