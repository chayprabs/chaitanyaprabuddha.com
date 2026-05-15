import "server-only";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";
import { cache } from "react";

import { markdownToHtml, type TableOfContentsItem } from "@/lib/markdown";

const BLOG_DIRECTORY = path.join(process.cwd(), "content", "blog");
const SITE_URL = "https://www.chaitanyaprabuddha.com";
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);

export type PostFrontmatter = {
  title: string;
  description: string;
  date: string;
  tags: string[];
  readTime: string;
  ogImage: string;
  canonical: string;
  published: boolean;
  slug: string;
};

export type Post = PostFrontmatter & {
  content: string;
  html: string;
  tableOfContents: TableOfContentsItem[];
};

type ParsedPostRecord = {
  frontmatter: PostFrontmatter;
  content: string;
};

function getBlogDirectory() {
  if (!existsSync(BLOG_DIRECTORY)) {
    throw new Error(`Missing blog content directory: ${BLOG_DIRECTORY}`);
  }

  return BLOG_DIRECTORY;
}

function isMarkdownFile(fileName: string) {
  return MARKDOWN_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normaliseString(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return fallback;
}

function normaliseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normaliseCanonical(value: unknown, slug: string) {
  const fallback = `${SITE_URL}/blog/${slug}`;
  const canonical = normaliseString(value, fallback);

  try {
    const url = new URL(canonical, SITE_URL);

    if (
      url.hostname === "chaitanyaprabuddha.com" ||
      url.hostname === "www.chaitanyaprabuddha.com"
    ) {
      return new URL(url.pathname, SITE_URL).toString();
    }

    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

function publicFileExists(publicPath: string) {
  const safePath = publicPath
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));

  return existsSync(path.join(process.cwd(), "public", ...safePath));
}

function normaliseOgImage(value: unknown, slug: string) {
  const fallback = `/og/${slug}.png`;
  const image = normaliseString(value, fallback);

  try {
    const url = new URL(image, SITE_URL);

    if (
      (url.hostname === "chaitanyaprabuddha.com" ||
        url.hostname === "www.chaitanyaprabuddha.com") &&
      !publicFileExists(url.pathname)
    ) {
      return "";
    }

    if (
      url.hostname === "chaitanyaprabuddha.com" ||
      url.hostname === "www.chaitanyaprabuddha.com"
    ) {
      return url.pathname;
    }

    return url.toString();
  } catch {
    return publicFileExists(fallback) ? fallback : "";
  }
}

function parsePostFile(fileName: string): ParsedPostRecord {
  const filePath = path.join(getBlogDirectory(), fileName);
  const rawFile = readFileSync(filePath, "utf8");
  const { data, content } = matter(rawFile);
  const slug = slugify(path.basename(fileName, path.extname(fileName)));
  const title = normaliseString(data.title, slug.replaceAll("-", " "));
  const description = normaliseString(
    data.description,
    `Technical writing on ${title}.`
  );

  return {
    frontmatter: {
      title,
      description,
      date: normaliseString(data.date, "1970-01-01"),
      tags: normaliseTags(data.tags),
      readTime: normaliseString(data.readTime, readingTime(content).text),
      ogImage: normaliseOgImage(data.ogImage, slug),
      canonical: normaliseCanonical(data.canonical, slug),
      published: data.published !== false,
      slug
    },
    content
  };
}

const getPublishedPosts = cache(() => {
  return readdirSync(getBlogDirectory())
    .filter(isMarkdownFile)
    .map((fileName) => parsePostFile(fileName))
    .filter((post) => post.frontmatter.published)
    .sort((left, right) => {
      if (left.frontmatter.date === right.frontmatter.date) {
        return left.frontmatter.title.localeCompare(right.frontmatter.title);
      }

      return right.frontmatter.date.localeCompare(left.frontmatter.date);
    });
});

export function getAllSlugs(): string[] {
  return getPublishedPosts().map((post) => post.frontmatter.slug);
}

export function getAllPosts(): PostFrontmatter[] {
  return getPublishedPosts().map((post) => post.frontmatter);
}

export const getPostBySlug = cache(async (slug: string): Promise<Post> => {
  const normalizedSlug = slugify(slug);
  const record = getPublishedPosts().find(
    (post) => post.frontmatter.slug === normalizedSlug
  );

  if (!record) {
    throw new Error(`Post not found for slug: ${slug}`);
  }

  const { html, tableOfContents } = await markdownToHtml(record.content, {
    title: record.frontmatter.title
  });

  return {
    ...record.frontmatter,
    content: record.content,
    html,
    tableOfContents
  };
});

export function getAdjacentPosts(slug: string): {
  prev: PostFrontmatter | null;
  next: PostFrontmatter | null;
} {
  const posts = getAllPosts();
  const normalizedSlug = slugify(slug);
  const currentIndex = posts.findIndex((post) => post.slug === normalizedSlug);

  if (currentIndex === -1) {
    return {
      prev: null,
      next: null
    };
  }

  return {
    prev: currentIndex > 0 ? posts[currentIndex - 1] : null,
    next: currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  };
}
