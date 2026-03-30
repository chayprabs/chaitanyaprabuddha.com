import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Contact from "@/components/Contact";
import { getAllBlogs, getBlogSummaryById } from "@/lib/blogs";
import { getBlogById } from "@/lib/blog-content";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getAllBlogs().map((blog) => ({
    slug: blog.id
  }));
}

export async function generateMetadata({
  params
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = getBlogSummaryById(slug);

  if (!blog) {
    return {
      title: "Writing | Chaitanya Prabuddha"
    };
  }

  return {
    title: `${blog.title} | Chaitanya Prabuddha`,
    description: blog.description,
    alternates: {
      canonical: `/blog/${blog.id}`
    },
    openGraph: {
      title: `${blog.title} | Chaitanya Prabuddha`,
      description: blog.description,
      url: `/blog/${blog.id}`,
      siteName: "Chaitanya Prabuddha",
      type: "article"
    },
    twitter: {
      card: "summary",
      title: `${blog.title} | Chaitanya Prabuddha`,
      description: blog.description,
      creator: "@chayprabs"
    }
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const blog = getBlogById(slug);

  if (!blog) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main>
        <article className="w-full pb-20 pt-10">
          <div className="container">
            <Link
              href="/blog"
              className="inline-flex text-[14px] font-normal text-[#9a9890] transition-colors duration-150 ease-in-out hover:text-[#1a1a18]"
            >
              {"\u2190"} Writing
            </Link>

            <header className="mt-12 max-w-[680px]">
              <h1 className="text-[34px] font-bold leading-[1.15] text-[#1a1a18] md:text-[48px]">
                {blog.title}
              </h1>
              <p className="mt-5 text-[12px] font-medium text-[#C84B2F]">
                Written &amp; published by Authos
              </p>
            </header>

            <div
              className="my-8 max-w-[680px]"
              style={{ height: "1px", background: "rgba(0,0,0,0.08)" }}
            />

            <div
              className="blog-content max-w-[680px]"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          </div>
        </article>
      </main>
      <Contact />
    </div>
  );
}
