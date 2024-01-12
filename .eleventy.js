const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {

  // --- Config

  eleventyConfig.addPassthroughCopy("src/assets");

  eleventyConfig.addWatchTarget('./tailwind.config.js');
  eleventyConfig.addWatchTarget('./src/assets/css/tailwind.css');

  // --- Shortcodes

  eleventyConfig.addShortcode('version', function () {
    return now;
  })

  // --- Collections
  
  eleventyConfig.addCollection("page", function(collections) {
    return collections.getFilteredByTag("page").sort(function(a, b) {
      return a.data.order - b.data.order;
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