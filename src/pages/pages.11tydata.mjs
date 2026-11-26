export default {
	tags: [
		"pages"
	],
	"layout": "page.njk",
	"prose": true,
	// last git commit date of each page: used for the sitemap, feed and article metadata
	date: "git Last Modified",
	eleventyComputed: {
		// first folder under /pages/, e.g. "backup"
		topic: (data) => data.page.filePathStem.split("/")[2],
	},
};
