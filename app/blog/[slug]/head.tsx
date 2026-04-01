import { BlogJsonLd } from "@/components/BlogJsonLd";
import { getPostBySlug } from "@/lib/blog";

const SITE_URL = "https://chaitanyaprabuddha.com";

type BlogPostHeadProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Head({ params }: BlogPostHeadProps) {
  const { slug } = await params;

  try {
    const post = await getPostBySlug(slug);

    return (
      <BlogJsonLd
        title={post.title}
        description={post.description}
        date={post.date}
        url={post.canonical}
        image={post.ogImage ? new URL(post.ogImage, SITE_URL).toString() : undefined}
      />
    );
  } catch {
    return null;
  }
}
