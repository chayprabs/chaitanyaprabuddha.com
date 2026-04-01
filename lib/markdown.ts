import { detectCodeLanguage, formatCodeLanguageLabel, normalizeCodeLanguage } from "@/lib/code-language";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode, { type LineElement } from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

type MarkdownNode = {
  type?: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  children?: MarkdownNode[];
};

type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function visitMarkdown(node: MarkdownNode, callback: (node: MarkdownNode) => void) {
  callback(node);

  node.children?.forEach((child) => visitMarkdown(child, callback));
}

function getPropertyValue(
  properties: Record<string, unknown> | undefined,
  key: string
) {
  const value = properties?.[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(" ");
  }

  return undefined;
}

function findFirstElement(
  nodes: HastNode[] | undefined,
  tagName: string
): HastNode | undefined {
  if (!nodes) {
    return undefined;
  }

  for (const node of nodes) {
    if (node.type === "element" && node.tagName === tagName) {
      return node;
    }

    const nested = findFirstElement(node.children, tagName);

    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function visitHast(node: HastNode, callback: (node: HastNode) => void) {
  callback(node);

  node.children?.forEach((child) => visitHast(child, callback));
}

function remarkInferCodeLanguage() {
  return (tree: MarkdownNode) => {
    visitMarkdown(tree, (node) => {
      if (node.type !== "code") {
        return;
      }

      const existingLanguage = normalizeCodeLanguage(node.lang);

      if (existingLanguage !== "plaintext" || node.lang?.trim()) {
        node.lang = existingLanguage;
        return;
      }

      node.lang = detectCodeLanguage(node.value ?? "");
    });
  };
}

function rehypeCodeLanguageLabel() {
  return (tree: HastNode) => {
    visitHast(tree, (node) => {
      if (
        node.type !== "element" ||
        node.tagName !== "figure" ||
        !node.properties ||
        !("data-rehype-pretty-code-figure" in node.properties)
      ) {
        return;
      }

      const pre = findFirstElement(node.children, "pre");
      const title = findFirstElement(node.children, "figcaption");
      const language = normalizeCodeLanguage(
        getPropertyValue(pre?.properties, "data-language")
      );

      node.properties["data-code-language"] = formatCodeLanguageLabel(language);
      node.properties["data-code-language-label"] = `#${formatCodeLanguageLabel(
        language
      )}`;

      if (title) {
        node.properties["data-has-code-title"] = "true";
      }
    });
  };
}

export async function markdownToHtml(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkInferCodeLanguage)
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
    .use(rehypeCodeLanguageLabel)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  return result.toString();
}
