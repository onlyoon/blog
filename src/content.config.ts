import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    pubDate: z.date(),
    thumbnail: z.string().optional(),
    tags: z.array(z.string()).default(["uncategorized"]),
    category: z.enum(["tutorial", "news", "project", "tips"]),
    lang: z.enum(["ko", "en", "cn"]).optional(),
  }),
});

export const collections = { blog };
