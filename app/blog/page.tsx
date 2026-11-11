import type { Metadata } from "next";
import Link from "next/link";

import Contact from "@/components/Contact";
import Colophon from "@/components/Colophon";
import Masthead from "@/components/Masthead";
import PageTitle from "@/components/PageTitle";
import Section from "@/components/Section";
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
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Blog",
    description: "Writing on AI, systems, and building things.",
    creator: "@chayprabs"
  }
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div>
      <Masthead current="blog" />
      <main>
        <PageTitle kicker="Blog">
          I write when I <em>figure something out.</em>
        </PageTitle>

        <Section id="writing" title={`Writing \u2013 ${posts.length} posts`}>
          <div className="post-list">
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
        </Section>
      </main>
      <Colophon />
      <Contact />
    </div>
  );
}
