const now = String(Date.now())

// Import the parse function from csv-parse
import { parse } from "csv-parse/sync"; 

// Import 11ty plugins
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import timeToRead  from "eleventy-plugin-time-to-read";

// add id to headings
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

import svgContents from "eleventy-plugin-svg-contents";

import pluginFilters from "./filters.mjs";
import seoPlugin from "./seo.mjs";
import pluginRss from "@11ty/eleventy-plugin-rss";
import fs from "node:fs";

// Read as plain JSON so the build works on older Node versions (JSON import attributes need Node 18.20+/20.10+)
const topicMeta = JSON.parse(fs.readFileSync(new URL("./src/_data/topics.json", import.meta.url), "utf-8"));

//import dotenv from 'dotenv';
//dotenv.config();

export default function (eleventyConfig) {
  eleventyConfig.setInputDirectory("src");
  eleventyConfig.setIncludesDirectory("_includes");
  eleventyConfig.setLayoutsDirectory("_layouts");

  eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy("src/assets/svg");
  // icons, web manifest: served from the site root (/apple-touch-icon.png, /manifest.webmanifest)
  eleventyConfig.addPassthroughCopy({ "src/assets/icons": "/" });
  eleventyConfig.addPassthroughCopy({"src/_data/csv/" : "/csv"});
  eleventyConfig.addPassthroughCopy({ 'src/robots.txt': '/robots.txt' });
  
  eleventyConfig.addWatchTarget("src");
  eleventyConfig.setServerOptions({
    liveReload: true
  });

  // read data from .env file to determine dev or prod
  eleventyConfig.addGlobalData("env", process.env.ELEVENTY_ENV);

  // Plug Ins

  // Image Plugin
  eleventyConfig.addPlugin(eleventyImageTransformPlugin,{
    formats: ["avif", "webp", "jpeg"],
  });

  // Embed SVGs
  eleventyConfig.addPlugin(svgContents);

  eleventyConfig.addPlugin(timeToRead);

  // 11ty Plugins
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(syntaxHighlight);

  // Pages grouped by topic (first folder under /pages/), in reading order
  eleventyConfig.addCollection("pageTopics", function (collectionApi) {
    const groups = {};
    for (const item of collectionApi.getFilteredByTag("pages")) {
      if (!item.url) continue; // skip permalink: false placeholders
      const slug = item.filePathStem.split("/")[2];
      (groups[slug] ||= []).push(item);
    }
    const order = (item) => item.data.eleventyNavigation?.order ?? 999;
    return Object.entries(groups)
      .map(([slug, pages]) => ({
        slug,
        title: slug,
        order: 999,
        ...(topicMeta[slug] || {}),
        pages: pages.sort((a, b) => order(a) - order(b) || a.data.title.localeCompare(b.data.title)),
      }))
      .sort((a, b) => a.order - b.order);
  });

  eleventyConfig.addFilter("topicPages", (topics, slug) =>
    (topics || []).find((t) => t.slug === slug)?.pages || []
  );

  eleventyConfig.addFilter("adjacentPages", (pages, url) => {
    const i = (pages || []).findIndex((p) => p.url === url);
    return { prev: i > 0 ? pages[i - 1] : null, next: i >= 0 && i < pages.length - 1 ? pages[i + 1] : null };
  });

  // Automatically create a collection of all articles
  eleventyConfig.addCollection("articlesDir", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/articles/*.md");
  });

  eleventyConfig.addCollection("pagesDir", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/pages/*.md");
  });

  let markdownLibrary = markdownIt({
    html: true,
  });
  
  eleventyConfig.setLibrary("md", markdownLibrary);

  // Shortcodes
  eleventyConfig.addShortcode('version', function () {
    return now
  });
  eleventyConfig.addShortcode('year', function () {
    return new Date().getFullYear()
  });

  // Add methood to read CSV files
  eleventyConfig.addDataExtension("csv", (contents) => {
    const records = parse(contents, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
    });
    return records;
  });

  eleventyConfig.addPlugin(pluginFilters);
  eleventyConfig.addPlugin(seoPlugin);
  eleventyConfig.addPlugin(pluginRss);
};

export const config = {
  htmlTemplateEngine: "njk",
  markdownTemplateEngine: "njk"
};