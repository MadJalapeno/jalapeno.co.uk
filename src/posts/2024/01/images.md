---
date: 2024-01-12 16:00:00
title: Images?
author: mikee
mood: need a pee
---
Next up, on the wonderful fact finding adventure that is Static Site Generators, is figuring how to do images.

I will want some pages with hero images, which should be easy enough to do with the YAML at the top of the page. It was easy in Jekyll, so should be easy here too.

The harder part is going to be how to do inline images in markdown, and how to format them.

## Findings

[markdownguide.org](https://www.markdownguide.org/basic-syntax/#images-1) has how to insert an image into a page.

Can I just use html?

<figure>
    <img src="https://www.pet-portraitartist.com/commissions-list/moses.jpg" width="100" height="100">
    <figcaption>Our best boy, Moses.</figcaption>
</figure>

Looks like I can. That was easy enough, and I should be able to control everything else via [TailwindCSS](https://tailwindcss.com).