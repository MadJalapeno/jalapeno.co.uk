const now = String(Date.now())

// Image transform plugin
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

// Import the parse function from csv-parse
import { parse } from "csv-parse/sync"; 

// add id to headings
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

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
  eleventyConfig.addPlugin(eleventyImageTransformPlugin,{
    formats: ["avif", "webp", "jpeg"],
  });
  
  // Automatically create a collection of all posts
  eleventyConfig.addCollection("postsDir", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md");
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