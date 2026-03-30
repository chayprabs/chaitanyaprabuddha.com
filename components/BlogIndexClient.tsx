"use client";

import Link from "next/link";

import Contact from "@/components/Contact";
import SectionJumpBar from "@/components/SectionJumpBar";

type BlogListItem = {
  id: string;
  title: string;
  description: string;
  readTime: string;
};

type BlogIndexClientProps = {
  blogs: BlogListItem[];
};

export default function BlogIndexClient({ blogs }: BlogIndexClientProps) {
  const sectionLinks = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
    { href: "/#projects", label: "Projects" },
    { href: "/#research", label: "Research" },
    { href: "/#achievements", label: "Achievements" }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main>
        <section className="pb-8 pt-[60px] md:pb-6 md:pt-20">
          <div className="mx-auto w-full max-w-[800px]">
            <h1
              className="max-w-[800px] text-left text-[clamp(40px,8vw,72px)] font-bold leading-[1.1] text-[#1a1a18]"
              style={{
                fontFamily: "var(--font-inter)",
                margin: "0"
              }}
            >
              I write when I figure something out.
            </h1>

            <SectionJumpBar links={sectionLinks} />
          </div>
        </section>

        <section className="w-full pb-16">
          <div className="container">
            <div>
              {blogs.map((blog) => (
                <article
                  key={blog.id}
                  style={{ borderBottom: "0.5px solid rgba(0,0,0,0.1)" }}
                >
                  <Link
                    href={`/blog/${blog.id}`}
                    className="-mx-3 block cursor-pointer px-3 py-6"
                  >
                    <div className="flex items-start justify-between gap-6 max-md:flex-col max-md:gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[17px] font-medium leading-[1.35] text-[#1a1a18]">
                          {blog.title}
                        </h2>
                        <p className="mt-2 text-[14px] font-light leading-[1.7] text-[#6b6860]">
                          {blog.description}
                        </p>
                        <p className="mt-3 text-[12px] font-light text-[#9a9890]">
                          {blog.readTime}
                        </p>
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
