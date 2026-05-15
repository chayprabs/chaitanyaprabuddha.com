import { detectCodeLanguage, formatCodeLanguageLabel, normalizeCodeLanguage } from "@/lib/code-language";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode, { type LineElement } from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export type TableOfContentsItem = {
  id: string;
  title: string;
  level: number;
};

export type MarkdownRenderResult = {
  html: string;
  tableOfContents: TableOfContentsItem[];
};

type MarkdownToHtmlOptions = {
  title?: string;
};

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
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type NormalizeBlogPostOptions = {
  title?: string;
  tableOfContents: TableOfContentsItem[];
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

function plainText(node: HastNode): string {
  if (node.type === "text") {
    return node.value ?? "";
  }

  return node.children?.map((child) => plainText(child)).join("") ?? "";
}

function normalizeHeadingText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugifyHeading(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function uniqueHeadingId(value: string, slugCounts: Map<string, number>) {
  const slug = slugifyHeading(value);
  const count = slugCounts.get(slug) ?? 0;

  slugCounts.set(slug, count + 1);

  return count === 0 ? slug : `${slug}-${count}`;
}

function headingLevel(tagName: string | undefined) {
  if (!tagName || !/^h[1-6]$/.test(tagName)) {
    return null;
  }

  return Number(tagName.slice(1));
}

function isSameHeading(left: string, right: string | undefined) {
  if (!right) {
    return false;
  }

  return normalizeHeadingText(left) === normalizeHeadingText(right);
}

function isExistingTableOfContentsHeading(value: string) {
  const normalized = normalizeHeadingText(value);

  return normalized === "contents" || normalized === "table of contents";
}

function isIgnorableTextNode(node: HastNode | undefined) {
  return node?.type === "text" && !node.value?.trim();
}

function isListNode(node: HastNode | undefined) {
  return node?.type === "element" && (node.tagName === "ol" || node.tagName === "ul");
}

function removeFollowingTableOfContentsList(children: HastNode[], index: number) {
  let nextIndex = index;

  while (isIgnorableTextNode(children[nextIndex])) {
    children.splice(nextIndex, 1);
  }

  if (isListNode(children[nextIndex])) {
    children.splice(nextIndex, 1);
  }
}

function classNames(value: unknown) {
  if (typeof value === "string") {
    return value.split(/\s+/).filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function hasClass(node: HastNode, className: string) {
  return classNames(node.properties?.className).includes(className);
}

function imageAltFromSrc(src: unknown, pageTitle: string | undefined) {
  if (typeof src !== "string") {
    return pageTitle ? `${pageTitle} image` : "Blog image";
  }

  const fileName = decodeURIComponent(
    src.split(/[?#]/)[0]?.split("/").filter(Boolean).pop() ?? ""
  );
  const label = fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return label || (pageTitle ? `${pageTitle} image` : "Blog image");
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

function rehypeNormalizeBlogPost(options: NormalizeBlogPostOptions) {
  return (tree: HastNode) => {
    const slugCounts = new Map<string, number>();
    let removedDuplicateTitle = false;

    function normalizeChildren(parent: HastNode) {
      const children = parent.children;

      if (!children) {
        return;
      }

      for (let index = 0; index < children.length; index += 1) {
        const node = children[index];

        if (node.type !== "element") {
          continue;
        }

        const level = headingLevel(node.tagName);

        if (level) {
          const title = plainText(node).trim();

          if (isExistingTableOfContentsHeading(title)) {
            children.splice(index, 1);
            removeFollowingTableOfContentsList(children, index);
            index -= 1;
            continue;
          }

          if (
            level === 1 &&
            !removedDuplicateTitle &&
            isSameHeading(title, options.title)
          ) {
            children.splice(index, 1);
            removedDuplicateTitle = true;
            index -= 1;
            continue;
          }

          const normalizedLevel = level === 1 ? 2 : level;

          node.tagName = `h${normalizedLevel}`;

          if (title) {
            const id = uniqueHeadingId(title, slugCounts);

            node.properties = {
              ...node.properties,
              id
            };

            if (normalizedLevel >= 2 && normalizedLevel <= 3) {
              options.tableOfContents.push({
                id,
                title,
                level: normalizedLevel
              });
            }
          }
        }

        normalizeChildren(node);
      }
    }

    normalizeChildren(tree);
  };
}

function rehypeEnhanceArticleSemantics(pageTitle: string | undefined) {
  return (tree: HastNode) => {
    function wrapTables(parent: HastNode) {
      const children = parent.children;

      if (!children) {
        return;
      }

      for (let index = 0; index < children.length; index += 1) {
        const node = children[index];

        if (node.type !== "element") {
          continue;
        }

        if (hasClass(node, "blog-table-wrap")) {
          continue;
        }

        if (node.tagName === "table") {
          children[index] = {
            type: "element",
            tagName: "div",
            properties: {
              className: ["blog-table-wrap"]
            },
            children: [node]
          };
          continue;
        }

        wrapTables(node);
      }
    }

    visitHast(tree, (node) => {
      if (node.type !== "element" || node.tagName !== "img") {
        return;
      }

      const alt = getPropertyValue(node.properties, "alt");

      node.properties = {
        ...node.properties,
        alt: alt?.trim() || imageAltFromSrc(node.properties?.src, pageTitle),
        loading: node.properties?.loading ?? "lazy",
        decoding: node.properties?.decoding ?? "async"
      };
    });

    wrapTables(tree);
  };
}

export async function markdownToHtml(
  content: string,
  options: MarkdownToHtmlOptions = {}
): Promise<MarkdownRenderResult> {
  const tableOfContents: TableOfContentsItem[] = [];
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkInferCodeLanguage)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(() =>
      rehypeNormalizeBlogPost({
        title: options.title,
        tableOfContents
      })
    )
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: {
        className: ["anchor-heading"],
        ariaLabel: "Link to section"
      }
    })
    .use(() => rehypeEnhanceArticleSemantics(options.title))
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

  return {
    html: result.toString(),
    tableOfContents
  };
}
