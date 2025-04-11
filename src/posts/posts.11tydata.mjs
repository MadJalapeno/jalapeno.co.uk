export default {
	tags: [
		"posts"
	],
	"layout": "page.njk",
	"permalink": "/posts/{{ title | slugify }}/",
	"prose": true,
	"sidebar": true
};