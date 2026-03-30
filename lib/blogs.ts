import "server-only";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { XMLParser } from "fast-xml-parser";

export type BlogSummary = {
  id: string;
  title: string;
  date: string;
  description: string;
  readTime: string;
};

export type Blog = BlogSummary & {
  content: string;
};

export type BlogIndexRecord = BlogSummary & {
  sortDate: string;
  filePath: string;
};

const metadataParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  parseTagValue: false
});

function getBlogsDirectory() {
  const candidates = [
    path.join(process.cwd(), "Content", "blog"),
    path.join(process.cwd(), "content", "blog")
  ];

  const match = candidates.find((candidate) => existsSync(candidate));

  if (!match) {
    throw new Error("Could not find a blog XML directory.");
  }

  return match;
}

function formatDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatReadTime(readingTime: string) {
  return /\bread\b/i.test(readingTime) ? readingTime : `${readingTime} read`;
}

function buildBlogIndexRecord(filePath: string): BlogIndexRecord {
  const rawXml = readFileSync(filePath, "utf8");
  const parsed = metadataParser.parse(rawXml) as {
    "blog-post": {
      metadata: Record<string, string>;
    };
  };
  const metadata = parsed["blog-post"].metadata;

  return {
    id: metadata.slug,
    title: metadata.title,
    date: formatDate(metadata.date),
    sortDate: metadata.date,
    filePath,
    description: metadata["meta-description"],
    readTime: formatReadTime(metadata["reading-time"])
  };
}

export const getAllBlogIndexRecords = cache(() => {
  const blogsDirectory = getBlogsDirectory();

  return readdirSync(blogsDirectory)
    .filter((file) => file.toLowerCase().endsWith(".xml"))
    .map((file) => buildBlogIndexRecord(path.join(blogsDirectory, file)))
    .sort((left, right) => {
      if (left.sortDate === right.sortDate) {
        return left.title.localeCompare(right.title);
      }

      return right.sortDate.localeCompare(left.sortDate);
    });
});

export const getAllBlogs = cache((): BlogSummary[] => {
  return getAllBlogIndexRecords().map(
    ({ sortDate: _sortDate, filePath: _filePath, ...blog }) => blog
  );
});

export const getBlogSummaryById = cache((id: string) => {
  const record = getAllBlogIndexRecords().find((blog) => blog.id === id);

  if (!record) {
    return undefined;
  }

  const { sortDate: _sortDate, filePath: _filePath, ...blog } = record;
  return blog;
});

export const getBlogIndexRecordById = cache((id: string) => {
  return getAllBlogIndexRecords().find((blog) => blog.id === id);
});

export const getAllBlogSitemapEntries = cache(() => {
  return getAllBlogIndexRecords().map(({ id, sortDate }) => ({
    id,
    lastModified: new Date(`${sortDate}T00:00:00.000Z`)
  }));
});
