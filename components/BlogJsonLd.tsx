type Props = {
  title: string;
  description: string;
  date: string;
  url: string;
  image?: string;
};

export function BlogJsonLd({
  title,
  description,
  date,
  url,
  image
}: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    datePublished: date,
    url,
    image: image ?? undefined,
    author: {
      "@type": "Person",
      name: "Chaitanya Prabuddha",
      url: "https://chaitanyaprabuddha.com"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
