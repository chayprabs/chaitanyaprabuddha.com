import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const blogEntries = posts.map((post) => ({
    url: `https://chaitanyaprabuddha.com/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.8
  }));

  return [
    {
      url: "https://chaitanyaprabuddha.com",
      lastModified: new Date(),
      priority: 1
    },
    {
      url: "https://chaitanyaprabuddha.com/blog",
      lastModified: new Date(),
      priority: 0.9
    },
    ...blogEntries
  ];
}
