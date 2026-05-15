import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/blog";

const SITE_URL = "https://www.chaitanyaprabuddha.com";
const HOME_LAST_MODIFIED = "2026-05-15";

function dateFromIsoDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(`${HOME_LAST_MODIFIED}T00:00:00.000Z`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latestPostDate = posts[0]?.date ?? HOME_LAST_MODIFIED;

  const blogEntries = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: dateFromIsoDate(post.date)
  }));

  return [
    {
      url: SITE_URL,
      lastModified: dateFromIsoDate(HOME_LAST_MODIFIED)
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: dateFromIsoDate(latestPostDate)
    },
    ...blogEntries
  ];
}
