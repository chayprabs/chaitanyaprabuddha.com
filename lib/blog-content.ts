import "server-only";

import { readFileSync } from "node:fs";
import { cache } from "react";

import { XMLParser } from "fast-xml-parser";

import { getBlogIndexRecordById, type Blog } from "@/lib/blogs";

type XmlNode = {
  [key: string]: unknown;
};

const contentParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: false,
  preserveOrder: true,
  parseTagValue: false,
  cdataPropName: "cdata"
});

const MARKUP_LT_PLACEHOLDER = "\uE000";
const MARKUP_GT_PLACEHOLDER = "\uE001";
const MARKUP_AMP_PLACEHOLDER = "\uE002";

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function normaliseWhitespace(value: string) {
  return value.replace(/\r/g, "").trim();
}

function protectLiteralMarkup(value: string) {
  return value
    .replace(/&/g, MARKUP_AMP_PLACEHOLDER)
    .replace(/</g, MARKUP_LT_PLACEHOLDER)
    .replace(/>/g, MARKUP_GT_PLACEHOLDER);
}

function restoreLiteralMarkup(value: string) {
  return value
    .replaceAll(MARKUP_LT_PLACEHOLDER, "<")
    .replaceAll(MARKUP_GT_PLACEHOLDER, ">")
    .replaceAll(MARKUP_AMP_PLACEHOLDER, "&");
}

function protectLiteralMarkupInCode(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, (block) => protectLiteralMarkup(block))
    .replace(/`[^`\n]+`/g, (inlineCode) => protectLiteralMarkup(inlineCode));
}

function renderInline(value: string) {
  const codeSegments: string[] = [];
  let html = escapeHtml(restoreLiteralMarkup(value.trim()));

  html = html.replace(/`([^`]+)`/g, (_, code: string) => {
    const token = `__CODE_${codeSegments.length}__`;
    codeSegments.push(`<code>${code}</code>`);
    return token;
  });

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+|#[^)]+|mailto:[^)]+)\)/g,
    (_, label: string, href: string) => {
      const safeHref = escapeAttribute(href);
      const externalAttrs = /^https?:\/\//.test(href)
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";

      return `<a href="${safeHref}"${externalAttrs}>${label}</a>`;
    }
  );
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(?!\s)([^*]+?)\*/g, "<em>$1</em>");

  codeSegments.forEach((segment, index) => {
    html = html.replace(`__CODE_${index}__`, segment);
  });

  return html;
}

function isBlankLine(line: string) {
  return line.trim().length === 0;
}

function isFencedCodeStart(line: string) {
  return /^```(\S+)?\s*$/.test(line.trim());
}

function isBlockquoteLine(line: string) {
  return /^>\s?/.test(line.trim());
}

function isUnorderedListItem(line: string) {
  return /^-\s+/.test(line.trim());
}

function isOrderedListItem(line: string) {
  return /^\d+\.\s+/.test(line.trim());
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
}

function isMarkdownTableDivider(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function startsStructuredBlock(lines: string[], index: number) {
  const line = lines[index];

  if (line === undefined) {
    return false;
  }

  if (isFencedCodeStart(line)) {
    return true;
  }

  if (isBlockquoteLine(line)) {
    return true;
  }

  if (isUnorderedListItem(line) || isOrderedListItem(line)) {
    return true;
  }

  return (
    isMarkdownTableRow(line) &&
    index + 1 < lines.length &&
    isMarkdownTableDivider(lines[index + 1])
  );
}

function unwrapSingleParagraph(html: string) {
  const trimmed = html.trim();
  const match = trimmed.match(/^<p>([\s\S]*)<\/p>$/);

  return match ? match[1] : trimmed;
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function findNextNonEmptyLine(lines: string[], startIndex: number) {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (!isBlankLine(lines[index])) {
      return index;
    }
  }

  return -1;
}

function renderFencedCodeBlock(lines: string[], startIndex: number) {
  const match = lines[startIndex].trim().match(/^```(\S+)?\s*$/);
  const language = match?.[1];
  const codeLines: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length && !/^```/.test(lines[index].trim())) {
    codeLines.push(lines[index].replace(/\r/g, ""));
    index += 1;
  }

  if (index < lines.length) {
    index += 1;
  }

  const className = language
    ? ` class="language-${escapeAttribute(language)}"`
    : "";
  const code = restoreLiteralMarkup(
    codeLines.join("\n").replace(/^\n+|\n+$/g, "")
  );

  return {
    html: `<pre><code${className}>${escapeHtml(code)}</code></pre>`,
    nextIndex: index
  };
}

function renderMarkdownTable(lines: string[], startIndex: number) {
  const headerCells = splitTableRow(lines[startIndex]);
  const bodyRows: string[][] = [];
  let index = startIndex + 2;

  while (index < lines.length) {
    if (isBlankLine(lines[index])) {
      const nextIndex = findNextNonEmptyLine(lines, index + 1);

      if (nextIndex === -1 || !isMarkdownTableRow(lines[nextIndex])) {
        break;
      }

      index = nextIndex;
      continue;
    }

    if (!isMarkdownTableRow(lines[index])) {
      break;
    }

    bodyRows.push(splitTableRow(lines[index]));
    index += 1;
  }

  const thead = `<thead><tr>${headerCells
    .map((cell) => `<th>${renderInline(cell)}</th>`)
    .join("")}</tr></thead>`;
  const tbody = bodyRows.length
    ? `<tbody>${bodyRows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${renderInline(cell)}</td>`)
              .join("")}</tr>`
        )
        .join("")}</tbody>`
    : "";

  return {
    html: `<div class="blog-table-wrap"><table>${thead}${tbody}</table></div>`,
    nextIndex: index
  };
}

function renderMarkdownList(
  lines: string[],
  startIndex: number,
  ordered: boolean
) {
  const itemPattern = ordered ? /^(\d+)\.\s+(.*)$/ : /^-\s+(.*)$/;
  const items: string[] = [];
  let currentItem: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (isBlankLine(line)) {
      const nextIndex = findNextNonEmptyLine(lines, index + 1);

      if (nextIndex === -1) {
        index = lines.length;
        break;
      }

      const nextLine = lines[nextIndex];

      if (itemPattern.test(nextLine.trim())) {
        index = nextIndex;
        continue;
      }

      break;
    }

    const match = trimmed.match(itemPattern);

    if (match) {
      if (currentItem.length > 0) {
        items.push(currentItem.join("\n"));
      }

      currentItem = [match[match.length - 1]];
      index += 1;
      continue;
    }

    if (currentItem.length === 0 || startsStructuredBlock(lines, index)) {
      break;
    }

    currentItem.push(trimmed);
    index += 1;
  }

  if (currentItem.length > 0) {
    items.push(currentItem.join("\n"));
  }

  const tagName = ordered ? "ol" : "ul";
  const renderedItems = items
    .map((item) => `<li>${unwrapSingleParagraph(renderRichText(item))}</li>`)
    .join("");

  return {
    html: `<${tagName}>${renderedItems}</${tagName}>`,
    nextIndex: index
  };
}

function renderBlockquote(lines: string[], startIndex: number) {
  const quotedLines: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlankLine(line)) {
      quotedLines.push("");
      index += 1;
      continue;
    }

    if (!isBlockquoteLine(line)) {
      break;
    }

    quotedLines.push(line.trim().replace(/^>\s?/, ""));
    index += 1;
  }

  return {
    html: `<blockquote>${unwrapSingleParagraph(
      renderRichText(quotedLines.join("\n"))
    )}</blockquote>`,
    nextIndex: index
  };
}

function renderParagraph(lines: string[], startIndex: number) {
  const paragraphLines: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    if (isBlankLine(lines[index])) {
      break;
    }

    if (paragraphLines.length > 0 && startsStructuredBlock(lines, index)) {
      break;
    }

    paragraphLines.push(lines[index].trim());
    index += 1;
  }

  return {
    html: `<p>${renderInline(paragraphLines.join(" "))}</p>`,
    nextIndex: index
  };
}

function renderRichText(value: string) {
  const trimmed = normaliseWhitespace(value);

  if (!trimmed) {
    return "";
  }

  const lines = trimmed.split("\n");
  const htmlBlocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    if (isBlankLine(lines[index])) {
      index += 1;
      continue;
    }

    if (isFencedCodeStart(lines[index])) {
      const block = renderFencedCodeBlock(lines, index);
      htmlBlocks.push(block.html);
      index = block.nextIndex;
      continue;
    }

    if (
      isMarkdownTableRow(lines[index]) &&
      index + 1 < lines.length &&
      isMarkdownTableDivider(lines[index + 1])
    ) {
      const table = renderMarkdownTable(lines, index);
      htmlBlocks.push(table.html);
      index = table.nextIndex;
      continue;
    }

    if (isBlockquoteLine(lines[index])) {
      const quote = renderBlockquote(lines, index);
      htmlBlocks.push(quote.html);
      index = quote.nextIndex;
      continue;
    }

    if (isUnorderedListItem(lines[index])) {
      const list = renderMarkdownList(lines, index, false);
      htmlBlocks.push(list.html);
      index = list.nextIndex;
      continue;
    }

    if (isOrderedListItem(lines[index])) {
      const list = renderMarkdownList(lines, index, true);
      htmlBlocks.push(list.html);
      index = list.nextIndex;
      continue;
    }

    const paragraph = renderParagraph(lines, index);
    htmlBlocks.push(paragraph.html);
    index = paragraph.nextIndex;
  }

  return htmlBlocks.join("");
}

function extractText(nodes: unknown): string {
  return asArray(nodes)
    .map((node) => {
      if (typeof node === "string") {
        return node;
      }

      if (!node || typeof node !== "object") {
        return "";
      }

      const xmlNode = node as XmlNode;

      if (typeof xmlNode["#text"] === "string") {
        return xmlNode["#text"] as string;
      }

      if (xmlNode.cdata) {
        return extractText(xmlNode.cdata);
      }

      return Object.entries(xmlNode)
        .filter(([key]) => key !== ":@")
        .map(([, value]) => extractText(value))
        .join("");
    })
    .join("");
}

function renderTableCell(nodes: unknown) {
  const trimmed = normaliseWhitespace(extractText(nodes));

  if (!trimmed) {
    return "";
  }

  return renderInline(trimmed.replace(/\n+/g, " "));
}

function renderNode(node: XmlNode, parentTag: string): string {
  if (typeof node["#text"] === "string") {
    return renderRichText(node["#text"] as string);
  }

  const attrs = (node[":@"] as Record<string, string> | undefined) ?? {};
  const [tag, value] =
    Object.entries(node).find(([key]) => key !== ":@") ?? [];

  if (!tag) {
    return "";
  }

  const children = asArray(value as XmlNode[] | undefined);

  switch (tag) {
    case "introduction":
    case "conclusion":
      return renderRichText(extractText(children));
    case "table-of-contents":
      return "";
    case "section": {
      const id = attrs.id ? ` id="${escapeHtml(attrs.id)}"` : "";
      return `<section${id}>${renderNodes(children, tag)}</section>`;
    }
    case "h2":
      return `<h2>${renderInline(extractText(children))}</h2>`;
    case "h3":
      return `<h3>${renderInline(extractText(children))}</h3>`;
    case "callout":
      return `<blockquote>${unwrapSingleParagraph(
        renderRichText(extractText(children))
      )}</blockquote>`;
    case "code-block": {
      const code = restoreLiteralMarkup(extractText(children)).replace(
        /^\n+|\n+$/g,
        ""
      );
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }
    case "table":
      return `<div class="blog-table-wrap"><table>${renderNodes(children, tag)}</table></div>`;
    case "thead":
      return `<thead>${renderNodes(children, tag)}</thead>`;
    case "tbody":
      return `<tbody>${renderNodes(children, tag)}</tbody>`;
    case "tr":
      return `<tr>${renderNodes(children, tag)}</tr>`;
    case "th":
      return `<th>${renderTableCell(children)}</th>`;
    case "td":
      return `<td>${renderTableCell(children)}</td>`;
    case "key-takeaways":
      return `<section id="key-takeaways"><h2>Key Takeaways</h2><ul>${renderNodes(children, tag)}</ul></section>`;
    case "faq":
      return `<section id="faq"><h2>FAQ</h2>${renderNodes(children, tag)}</section>`;
    case "item":
      if (parentTag === "key-takeaways") {
        return `<li>${renderInline(extractText(children))}</li>`;
      }

      if (parentTag === "faq") {
        return `<div class="blog-faq-item">${renderNodes(children, tag)}</div>`;
      }

      return "";
    case "question":
      return `<h3>${renderInline(extractText(children))}</h3>`;
    case "answer":
      return renderRichText(extractText(children));
    case "citation": {
      const sourceParts = [attrs.source, attrs.year].filter(Boolean).join(", ");
      const sourceHtml = sourceParts
        ? `<span class="blog-citation-meta">Source: ${escapeHtml(sourceParts)}</span>`
        : "";

      return `<blockquote>${unwrapSingleParagraph(
        renderRichText(extractText(children))
      )}${sourceHtml}</blockquote>`;
    }
    default:
      return renderNodes(children, tag);
  }
}

function renderNodes(nodes: XmlNode[], parentTag = "root") {
  return nodes
    .map((node) => renderNode(node, parentTag))
    .join("");
}

export const getBlogById = cache((id: string): Blog | undefined => {
  const record = getBlogIndexRecordById(id);

  if (!record) {
    return undefined;
  }

  const rawXml = readFileSync(record.filePath, "utf8");
  const contentMatch = rawXml.match(/<content>([\s\S]*?)<\/content>/);

  if (!contentMatch) {
    throw new Error(`Missing <content> block in ${record.filePath}`);
  }

  const protectedContent = protectLiteralMarkupInCode(contentMatch[1]);
  const renderedContentTree = contentParser.parse(
    `<root>${protectedContent}</root>`
  ) as XmlNode[];
  const rootNode = renderedContentTree.find((node) => "root" in node) as
    | { root: XmlNode[] }
    | undefined;

  return {
    id: record.id,
    title: record.title,
    date: record.date,
    description: record.description,
    readTime: record.readTime,
    content: rootNode ? renderNodes(rootNode.root) : ""
  };
});
