const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");



module.exports = function(eleventyConfig) {

  // --- Config

  eleventyConfig.setServerOptions({
    showVersion: true,
  })

  eleventyConfig.addPassthroughCopy("./src/assets/images/*");

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

  eleventyConfig.addFilter('excerpt', (post) => {
    const content = post.replace(/(<([^>]+)>)/gi, '');
      return content.substr(0, content.lastIndexOf(' ', 200)) + '... ';
    
  });





  // Return all the tags used in a collection
  // source https://github.com/11ty/eleventy-base-blog/blob/main/eleventy.config.js
	eleventyConfig.addFilter("getAllTags", collection => {
		let tagSet = new Set();
		for(let item of collection) {
			(item.data.tags || []).forEach(tag => tagSet.add(tag));
		}
		return Array.from(tagSet);
	});

	eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
		return (tags || []).filter(tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1);
	});


  // Make the dates correct and human readable
  // https://moment.github.io/luxon/#/formatting
  eleventyConfig.addFilter("postDate", (dateObj) => {
    NYtime = DateTime.fromJSDate(dateObj).setZone("utc")
    return NYtime.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
  });

  eleventyConfig.addFilter('dateToIso', (dateString) => {
    return new Date(dateString).toISOString()
  });

  eleventyConfig.addAsyncFilter("makeUppercase", async function(value) {});

  return {

    templateFormats: [
			"md",
			"njk",
		],

		// Pre-process *.md files with: (default: `liquid`)
		markdownTemplateEngine: "njk",

    dir: {
      input: "src",
      data: "_data",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
};
