// Import the glob loader
import { glob } from "astro/loaders";
// Import utilities from `astro:content`
import { defineCollection, z } from "astro:content";
// Import the `format` function from `date-fns`
import { format } from "date-fns";

// Define the schema for the "posts" collection
const posts = defineCollection({
  // Load all MDX files from the "content/posts" directory
  loader: glob( { pattern: '**/[^_]*.mdx', base: './src/content/posts' }),
  schema: z.object({
      title: z.string(),
      description: z.string(),
      date: z
        .string()
        .transform((str) => format(new Date(str), "MMMM d, yyyy")),
      image: z.object({
        url: z.string(),
        alt: z.string(),
      }),
      tags: z.union([z.string(), z.array(z.string())]), // Allow tags to be a string or an array of strings
    }),
});

// Define the schema for the "pages" collection
const pages = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z
      .string()
      .transform((str) => format(new Date(str), "MMMM d, yyyy")),
    image: z.string().optional(), // Optional image field
    author: z.string().optional(), // Optional author field
    tags: z.union([z.string(), z.array(z.string())]).optional(), // Optional tags field
  }),
});

export const collections = {
  posts,
  pages,
};
