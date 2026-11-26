export default {
	tags: [
		"pages"
	],
	"layout": "page.njk",
	"prose": true,
	eleventyComputed: {
		// first folder under /pages/, e.g. "backup"
		topic: (data) => data.page.filePathStem.split("/")[2],
	},
};
