import { defineCollection, z } from "astro:content";
import { format } from "date-fns";

const articles = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z
        .string()
        .transform((str) => format(new Date(str), "MMMM d, yyyy")),
      image: image(),
      author: z.string(),
      authorImage: z.string(),
      category: z.string(),
      featuredPost: z.boolean(),
      topArticle: z.boolean(),
    }),
});

export const collections = {
  posts: articles,
};
