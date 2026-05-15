import type { TableOfContentsItem } from "@/lib/markdown";

type BlogTableOfContentsProps = {
  items: TableOfContentsItem[];
};

export default function BlogTableOfContents({
  items
}: BlogTableOfContentsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Table of contents"
      className="blog-toc"
    >
      <details className="blog-toc-details" open>
        <summary className="blog-toc-summary">Contents</summary>
        <ol className="blog-toc-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="blog-toc-item"
              data-level={item.level}
            >
              <a className="blog-toc-link" href={`#${item.id}`}>
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}
