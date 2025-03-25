const now = String(Date.now())

// Import the parse function from csv-parse
import { parse } from "csv-parse/sync"; 

// Import 11ty plugins
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

// add id to headings
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

import svgContents from "eleventy-plugin-svg-contents";

import pluginFilters from "./filters.mjs";

//import dotenv from 'dotenv';
//dotenv.config();

export default function (eleventyConfig) {
  eleventyConfig.setInputDirectory("src");
  eleventyConfig.setIncludesDirectory("_includes");
  eleventyConfig.setLayoutsDirectory("_layouts");

  eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy("src/assets/svg");
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

  // 11ty Plugins
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(syntaxHighlight);

  // Automatically create a collection of all posts
  eleventyConfig.addCollection("postsDir", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md");
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
};

export const config = {
  htmlTemplateEngine: "njk",
  markdownTemplateEngine: "njk"
};