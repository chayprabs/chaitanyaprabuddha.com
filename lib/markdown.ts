import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode, { type LineElement } from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export async function markdownToHtml(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: {
        className: ["anchor-heading"],
        ariaLabel: "Link to section"
      }
    })
    .use(rehypePrettyCode, {
      theme: {
        dark: "github-dark",
        light: "github-light"
      },
      defaultLang: {
        block: "plaintext"
      },
      keepBackground: false,
      onVisitLine(node: LineElement) {
        if (node.children.length === 0) {
          node.children = [{ type: "text", value: " " }];
        }
      },
      onVisitHighlightedLine(node: LineElement) {
        const classNames = node.properties.className ?? [];
        classNames.push("highlighted");
        node.properties.className = classNames;
      }
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  return result.toString();
}
