import { defineCollection, z } from "astro:content";
import { format } from "date-fns";

// Define the schema for the "posts" collection
const posts = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z
        .string()
        .transform((str) => format(new Date(str), "MMMM d, yyyy")),
      image: image().refine((img) => {
        console.error("Image width:", img.width); // Debugging line
        return img.width >= 960;
      }, {
        message: "Angua insists mage must be at least 960px wide",
      }),
      author: z.string(),
      authorImage: z.string(),
      tags: z.union([z.string(), z.array(z.string())]), // Allow tags to be a string or an array of strings
      featuredPost: z.boolean(),
      topArticle: z.boolean(),
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
