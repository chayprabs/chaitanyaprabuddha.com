import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Contact from "@/components/Contact";
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
                {post.title}
              </h1>
              <p className="mt-5 text-[15px] font-light leading-[1.8] text-[#6b6860]">
                {post.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-light text-[#9a9890]">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span>{post.readTime}</span>
              </div>
              {post.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[rgba(0,0,0,0.1)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b6860]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </header>

            <div className="my-8 max-w-[680px] border-t border-[rgba(0,0,0,0.08)]" />

            <div className="max-w-[680px]">
              <div
                className="prose prose-neutral max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
            </div>

            {prev || next ? (
              <nav className="mt-16 grid max-w-[680px] gap-4 border-t border-[rgba(0,0,0,0.08)] pt-8 md:grid-cols-2">
                {prev ? (
                  <Link
                    href={`/blog/${prev.slug}`}
                    className="rounded-[24px] border border-[rgba(0,0,0,0.08)] p-5 transition-colors duration-150 ease-in-out hover:border-[rgba(0,0,0,0.18)]"
                  >
                    <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#9a9890]">
                      Previous Post
                    </span>
                    <span className="mt-2 block text-[16px] font-medium leading-[1.5] text-[#1a1a18]">
                      {prev.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}

                {next ? (
                  <Link
                    href={`/blog/${next.slug}`}
                    className="rounded-[24px] border border-[rgba(0,0,0,0.08)] p-5 text-left transition-colors duration-150 ease-in-out hover:border-[rgba(0,0,0,0.18)]"
                  >
                    <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#9a9890]">
                      Next Post
                    </span>
                    <span className="mt-2 block text-[16px] font-medium leading-[1.5] text-[#1a1a18]">
                      {next.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
              </nav>
            ) : null}

            <p className="mt-10 max-w-[680px] text-[13px] font-light text-[#9a9890]">
              Written &amp; published by Chaitanya Prabuddha
            </p>
          </div>
        </article>
      </main>
      <Contact />
    </div>
  );
}
