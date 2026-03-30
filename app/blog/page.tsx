import type { Metadata } from "next";

import BlogIndexClient from "@/components/BlogIndexClient";
import { getAllBlogs } from "@/lib/blogs";

const BLOG_TITLE = "Writing | Chaitanya Prabuddha";
const BLOG_DESCRIPTION =
  "Technical writing by Chaitanya Prabuddha on AI agents, LLM systems, inference, RAG, MCP, and building products.";

export const metadata: Metadata = {
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  alternates: {
    canonical: "/blog"
  },
  openGraph: {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url: "/blog",
    siteName: "Chaitanya Prabuddha",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    creator: "@chayprabs"
  }
};

export default function BlogIndexPage() {
  const blogs = getAllBlogs();

  return <BlogIndexClient blogs={blogs} />;
}
