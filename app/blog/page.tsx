import type { Metadata } from "next";
import Link from "next/link";

import Contact from "@/components/Contact";
import SectionJumpBar from "@/components/SectionJumpBar";
import { getAllPosts } from "@/lib/blog";

const sectionLinks = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/#projects", label: "Projects" },
  { href: "/#research", label: "Research" },
  { href: "/#achievements", label: "Achievements" }
];

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

export const metadata: Metadata = {
  title: "Blog",
  description: "Writing on AI, systems, and building things."
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main>
        <section className="pb-8 pt-[60px] md:pb-6 md:pt-20">
          <div className="mx-auto w-full max-w-[800px]">
            <h1 className="max-w-[800px] text-left text-[clamp(40px,8vw,72px)] font-bold leading-[1.1] text-[#1a1a18]">
              I write when I figure something out.
            </h1>

            <SectionJumpBar links={sectionLinks} />
          </div>
        </section>

        <section className="w-full pb-16">
          <div className="container">
            <div>
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="border-b border-[rgba(0,0,0,0.1)]"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="-mx-3 block px-3 py-6"
                  >
                    <div className="flex items-start justify-between gap-6 max-md:flex-col max-md:gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[17px] font-medium leading-[1.35] text-[#1a1a18]">
                          {post.title}
                        </h2>
                        <p className="mt-2 text-[14px] font-light leading-[1.7] text-[#6b6860]">
                          {post.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] font-light text-[#9a9890]">
                          <span>{formatDate(post.date)}</span>
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Contact />
    </div>
  );
}
