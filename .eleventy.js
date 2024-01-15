const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function(eleventyConfig) {

  // --- Config

  eleventyConfig.addPassthroughCopy("./src/assets/images/*");
  eleventyConfig.addPassthroughCopy("admin/");

  eleventyConfig.addWatchTarget('./tailwind.config.js');
  eleventyConfig.addWatchTarget('./src/assets/css/tailwind.css');

  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("./src/posts/template.md");

  // --- Shortcodes

  eleventyConfig.addShortcode('version', function () {
    return now;
  })

  // --- Plugins

  eleventyConfig.addPlugin(syntaxHighlight);

  // --- Collections

  eleventyConfig.addCollection("page", function(collections) {
    return collections.getFilteredByTag("page").sort(function(a, b) {
      return a.data.order - b.data.order;
    });
  });

  eleventyConfig.addCollection("front", function(collectionAPI) {
    return collectionAPI.getFilteredByTag("posts").sort(function(a, b) {
        return b.date - a.date;
      });
    });
  

  // --- Filters

  // Make the dates correct and human readable
  // https://moment.github.io/luxon/#/formatting
  eleventyConfig.addFilter("postDate", (dateObj) => {
    NYtime = DateTime.fromJSDate(dateObj).setZone("utc")
    return NYtime.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
  });

  return {
    dir: {
      input: "src",
      data: "_data",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
};