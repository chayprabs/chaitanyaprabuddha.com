import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Colophon from "@/components/Colophon";
import Contact from "@/components/Contact";
import Masthead from "@/components/Masthead";
import Section from "@/components/Section";
import BlogTableOfContents from "@/components/BlogTableOfContents";
import { getAdjacentPosts, getAllSlugs, getPostBySlug } from "@/lib/blog";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await getPostBySlug(slug);

    return {
      title: post.title,
      description: post.description,
      openGraph: {
        title: post.title,
        description: post.description,
        type: "article",
        publishedTime: post.date,
        images: post.ogImage ? [{ url: post.ogImage }] : []
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.description,
        images: post.ogImage ? [post.ogImage] : []
      },
      alternates: {
        canonical: post.canonical
      }
    };
  } catch {
    return {
      title: "Writing | Chaitanya Prabuddha"
    };
  }
}

export default async function PostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const { prev, next } = getAdjacentPosts(slug);
  let post;

  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <div>
      <Masthead />
      <main>
        <div className="container article-shell">
          <Link href="/blog" className="btn article-back">
            {"\u2190"} Writing
          </Link>
        </div>

        <Section id="post" title="Writing">
          <article className="article">

          <header>
            <h1 id="post-heading" className="article-title">{post.title}</h1>
            <p className="article-desc">{post.description}</p>
            <div className="article-meta label">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>{post.readTime}</span>
              {post.tags.length > 0 ? (
                <span className="tags">{post.tags.join(" \u00b7 ")}</span>
              ) : null}
            </div>
          </header>

          <BlogTableOfContents items={post.tableOfContents} />

          <div
            className="blog-content prose prose-neutral"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          {prev || next ? (
            <nav className="article-nav" aria-label="More posts">
              {prev ? (
                <Link href={`/blog/${prev.slug}`}>
                  <span className="label">Previous post</span>
                  <span className="article-nav-title">{prev.title}</span>
                </Link>
              ) : (
                <div />
              )}

              {next ? (
                <Link href={`/blog/${next.slug}`}>
                  <span className="label">Next post</span>
                  <span className="article-nav-title">{next.title}</span>
                </Link>
              ) : (
                <div />
              )}
            </nav>
          ) : null}

          <p className="article-byline">
            Written &amp; published by Chaitanya Prabuddha
          </p>
          </article>
        </Section>
      </main>
      <Colophon />
      <Contact />
    </div>
  );
}
