export default {
	tags: [
		"articles"
	],
	"layout": "page.njk",
	"permalink": "/articles/{{ title | slugify }}/",
	"prose": true,
	"sidebar": true
};