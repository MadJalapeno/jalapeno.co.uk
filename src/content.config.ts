import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
  schema: ({ image }) => z.object({
    title: z.string(),
    hero: image().refine((image) => image.width >= 1080, {
      message: "Cover image must be at least 1080 pixels wide!",
    }),
    date: z.string(),
    author: z.string(),
    tags: z.array(z.string()),
    image: image(), // Assuming this is the field for the post image
  }),
});

export const collections = {
  posts: postsCollection,
};