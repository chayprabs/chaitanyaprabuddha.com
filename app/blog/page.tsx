import type { Metadata } from "next";
import Link from "next/link";

import { getAllPosts } from "@/lib/blog";

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export const metadata: Metadata = {
  title: "Blog",
  description: "Writing on AI, systems, and building things.",
  alternates: {
    canonical: "/blog"
  },
  openGraph: {
    title: "Blog",
    description: "Writing on AI, systems, and building things.",
    url: "/blog",
    siteName: "Chaitanya Prabuddha",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog",
    description: "Writing on AI, systems, and building things.",
    creator: "@chayp05",
    images: ["/og.png"]
  }
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main>
      <section className="section blog-index" aria-labelledby="blog-title">
        <div className="container">
          <h1 id="blog-title" className="section-label">
            <span>
              {posts.length > 0 ? `Blog \u2013 ${posts.length} posts` : "Blog"}
            </span>
          </h1>

          {posts.length === 0 ? (
            <div className="notepad">
              <p className="notepad-hand">Nothing published yet.</p>
              <p className="notepad-text">
                The first posts are still drafts. Until they&rsquo;re out,
                everything I&rsquo;ve built is on the home page.
              </p>
              <div className="notepad-actions">
                <Link href="/" className="btn btn-primary">
                  See my work
                </Link>
                <a
                  href="https://x.com/chayp05"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  Follow on X {"\u2197"}
                </a>
              </div>
            </div>
          ) : (
            <div className="sheet post-list">
              {posts.map((post) => (
                <article key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="post-row">
                    <time dateTime={post.date} className="post-date label">
                      {formatDate(post.date)}
                    </time>
                    <div>
                      <h2 className="post-title">{post.title}</h2>
                      <p className="post-desc">{post.description}</p>
                      <p className="post-time">{post.readTime}</p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
