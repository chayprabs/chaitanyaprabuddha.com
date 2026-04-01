import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { XMLParser } from "fast-xml-parser";
import readingTime from "reading-time";

const SOURCE_DIR_CANDIDATES = [
  path.join(process.cwd(), "Content", "blog"),
  path.join(process.cwd(), "content", "blog")
];
const TARGET_DIR = path.join(process.cwd(), "content", "blog");

const metadataParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  parseTagValue: false
});

const contentParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: false,
  preserveOrder: true,
  parseTagValue: false,
  cdataPropName: "cdata"
});

const KNOWN_CONTENT_TAGS = new Set([
  "answer",
  "callout",
  "citation",
  "code-block",
  "conclusion",
  "faq",
  "h2",
  "h3",
  "introduction",
  "item",
  "key-takeaways",
  "question",
  "section",
  "table",
  "table-of-contents",
  "tbody",
  "td",
  "th",
  "thead",
  "tr"
]);

const LT_PLACEHOLDER = "\uE000";
const GT_PLACEHOLDER = "\uE001";
const AMP_PLACEHOLDER = "\uE002";

function getSourceDirectory() {
  const directory = SOURCE_DIR_CANDIDATES.find((candidate) => {
    try {
      return readdirSync(candidate).length >= 0;
    } catch {
      return false;
    }
  });

  if (!directory) {
    throw new Error("Could not find a source blog directory.");
  }

  return directory;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function restoreLiteralMarkup(value) {
  return value
    .replaceAll(LT_PLACEHOLDER, "<")
    .replaceAll(GT_PLACEHOLDER, ">")
    .replaceAll(AMP_PLACEHOLDER, "&");
}

function protectUnknownAngleBrackets(value) {
  const knownTagsPattern = new RegExp(
    `^<\\/?(?:${Array.from(KNOWN_CONTENT_TAGS)
      .map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})(?:\\s+[^>]*?)?>`
  );
  let output = "";

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];

    if (current !== "<") {
      output += current;
      continue;
    }

    const remaining = value.slice(index);

    if (remaining.startsWith("<![CDATA[")) {
      const cdataEnd = remaining.indexOf("]]>");

      if (cdataEnd === -1) {
        output += remaining;
        break;
      }

      const cdataBlock = remaining.slice(0, cdataEnd + 3);
      output += cdataBlock;
      index += cdataBlock.length - 1;
      continue;
    }

    const match = remaining.match(knownTagsPattern);

    if (match) {
      output += match[0];
      index += match[0].length - 1;
      continue;
    }

    output += LT_PLACEHOLDER;
  }

  return output;
}

function normalizeWhitespace(value) {
  return value.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

function normalizeInlineWhitespace(value) {
  return normalizeWhitespace(value).replace(/\s+/g, " ");
}

function squeezeBlankLines(value) {
  return value
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdown(value) {
  return normalizeInlineWhitespace(
    value
      .replace(/!\[[^\]]*]\([^)]+\)/g, "")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*_~>#-]/g, "")
  );
}

function sentenceSplit(value) {
  return normalizeInlineWhitespace(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function candidateDescriptions(value) {
  const normalized = normalizeInlineWhitespace(value ?? "");

  if (!normalized) {
    return [];
  }

  const candidates = new Set();

  if (normalized.length <= 160) {
    candidates.add(normalized);
  }

  const sentences = sentenceSplit(normalized);

  for (let index = 0; index < sentences.length; index += 1) {
    const single = sentences[index];

    if (single.length <= 160) {
      candidates.add(single);
    }

    if (index + 1 < sentences.length) {
      const pair = `${sentences[index]} ${sentences[index + 1]}`;

      if (pair.length <= 160) {
        candidates.add(pair);
      }
    }
  }

  return Array.from(candidates);
}

function inferDescription({ metadataDescription, seoDescription, introText, title, primaryKeyword, pillar }) {
  const candidates = [metadataDescription, seoDescription, introText]
    .flatMap((value) => candidateDescriptions(value))
    .sort((left, right) => right.length - left.length);

  if (candidates.length > 0) {
    return candidates[0];
  }

  const topic = normalizeInlineWhitespace(primaryKeyword || title || "this post");
  const pillarPart = pillar ? ` in ${pillar}` : "";
  const generated = `A technical guide to ${topic}${pillarPart}, with code, architecture patterns, and practical implementation details.`;

  if (generated.length <= 160) {
    return generated;
  }

  return `A technical guide to ${stripMarkdown(title)}.`;
}

function formatDateFromStat(filePath) {
  const stat = statSync(filePath);
  const year = stat.mtime.getUTCFullYear();
  const month = `${stat.mtime.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${stat.mtime.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugifyFileName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getKeywordList(metadata) {
  const secondaryKeywords = metadata["secondary-keywords"];
  const keywordNodes =
    secondaryKeywords && typeof secondaryKeywords === "object"
      ? asArray(secondaryKeywords.keyword)
      : [];

  return keywordNodes
    .map((value) => normalizeInlineWhitespace(String(value)))
    .filter(Boolean);
}

function inferTags(metadata, title) {
  const candidates = [
    metadata.pillar,
    metadata["primary-keyword"],
    ...getKeywordList(metadata).slice(0, 2)
  ]
    .map((value) => normalizeInlineWhitespace(String(value ?? "")))
    .filter(Boolean);

  const tags = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/\s+/g, " ")
      .replace(/\bai\b/g, "AI")
      .replace(/\bllm\b/g, "LLM")
      .replace(/\bmcp\b/g, "MCP")
      .replace(/\brag\b/g, "RAG")
      .replace(/\bseo\b/g, "SEO")
      .trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(normalized);

    if (tags.length === 3) {
      break;
    }
  }

  if (tags.length > 0) {
    return tags;
  }

  return slugifyFileName(title)
    .split("-")
    .filter((part) => part.length > 2)
    .slice(0, 3);
}

function extractRawText(nodes) {
  return asArray(nodes)
    .map((node) => {
      if (typeof node === "string") {
        return restoreLiteralMarkup(node);
      }

      if (!node || typeof node !== "object") {
        return "";
      }

      if (typeof node["#text"] === "string") {
        return restoreLiteralMarkup(node["#text"]);
      }

      if (node.cdata) {
        return extractRawText(node.cdata);
      }

      return Object.entries(node)
        .filter(([key]) => key !== ":@")
        .map(([, value]) => extractRawText(value))
        .join("");
    })
    .join("");
}

function blockquote(value) {
  return normalizeWhitespace(value)
    .split("\n")
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");
}

function renderTable(children) {
  const rows = [];

  function walk(nodes) {
    for (const node of asArray(nodes)) {
      if (!node || typeof node !== "object") {
        continue;
      }

      if (node.tr) {
        const cells = asArray(node.tr)
          .filter((child) => child && typeof child === "object" && (child.th || child.td))
          .map((child) => {
            const key = child.th ? "th" : "td";
            const content = normalizeInlineWhitespace(extractRawText(child[key]));
            return content.replaceAll("|", "\\|");
          });

        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      Object.entries(node)
        .filter(([key]) => key !== ":@" && key !== "tr")
        .forEach(([, value]) => walk(value));
    }
  }

  walk(children);

  if (rows.length === 0) {
    return "";
  }

  const header = rows[0];
  const bodyRows = rows.slice(1);
  const divider = header.map(() => "---");
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...bodyRows.map((row) => `| ${row.join(" | ")} |`)
  ];

  return lines.join("\n");
}

function renderListItem(value) {
  const trimmed = squeezeBlankLines(value);

  if (!trimmed) {
    return "";
  }

  const lines = trimmed.split("\n");
  return [`- ${lines[0]}`, ...lines.slice(1).map((line) => `  ${line}`)].join("\n");
}

function joinBlocks(blocks) {
  return squeezeBlankLines(
    blocks
      .map((block) => squeezeBlankLines(block))
      .filter(Boolean)
      .join("\n\n")
  );
}

function normalizeCodeLanguage(value) {
  const language = normalizeInlineWhitespace(String(value ?? "")).toLowerCase();

  if (!language) {
    return "";
  }

  const aliases = {
    javascript: "js",
    typescript: "ts",
    shell: "bash",
    sh: "bash",
    text: "plaintext",
    plaintext: "plaintext",
    yml: "yaml"
  };

  return aliases[language] ?? language;
}

function renderNode(node, parentTag = "root") {
  if (typeof node?.["#text"] === "string") {
    return squeezeBlankLines(restoreLiteralMarkup(node["#text"]));
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  const attrs = node[":@"] ?? {};
  const [tag, value] = Object.entries(node).find(([key]) => key !== ":@") ?? [];

  if (!tag) {
    return "";
  }

  const children = asArray(value);

  switch (tag) {
    case "introduction":
    case "conclusion":
    case "section":
      return renderNodes(children, tag);
    case "table-of-contents":
      return "";
    case "h2":
      return `## ${stripMarkdown(extractRawText(children))}`;
    case "h3":
      return `### ${stripMarkdown(extractRawText(children))}`;
    case "callout":
      return blockquote(extractRawText(children));
    case "code-block": {
      const code = restoreLiteralMarkup(extractRawText(children)).replace(/\r/g, "").replace(/^\n+|\n+$/g, "");
      const language = normalizeCodeLanguage(attrs.lang);
      const fence = language ? `\`\`\`${language}` : "```";
      return `${fence}\n${code}\n\`\`\``;
    }
    case "table":
      return renderTable(children);
    case "key-takeaways":
      return joinBlocks([
        "## Key Takeaways",
        ...children
          .map((child) => renderNode(child, tag))
          .filter(Boolean)
      ]);
    case "faq":
      return joinBlocks([
        "## FAQ",
        ...children
          .map((child) => renderNode(child, tag))
          .filter(Boolean)
      ]);
    case "item":
      if (parentTag === "key-takeaways") {
        return renderListItem(extractRawText(children));
      }

      if (parentTag === "faq") {
        return renderNodes(children, tag);
      }

      return "";
    case "question":
      return `### ${stripMarkdown(extractRawText(children))}`;
    case "answer":
      return renderNodes(children, tag);
    case "citation": {
      const citationText = blockquote(extractRawText(children));
      const sourceParts = [attrs.source, attrs.year]
        .map((part) => normalizeInlineWhitespace(String(part ?? "")))
        .filter(Boolean);
      const sourceLine = sourceParts.length > 0 ? `> Source: ${sourceParts.join(", ")}` : "";
      return joinBlocks([citationText, sourceLine]);
    }
    default:
      return renderNodes(children, tag);
  }
}

function renderNodes(nodes, parentTag = "root") {
  return joinBlocks(
    asArray(nodes)
      .map((child) => renderNode(child, parentTag))
      .filter(Boolean)
  );
}

function extractContentNodes(xmlContent) {
  const contentMatch = xmlContent.match(/<content>([\s\S]*?)<\/content>/);

  if (!contentMatch) {
    throw new Error("Missing <content> block.");
  }

  const protectedContent = protectUnknownAngleBrackets(contentMatch[1]);
  const parsed = contentParser.parse(`<root>${protectedContent}</root>`);
  const rootNode = parsed.find((node) => node.root);

  return rootNode?.root ?? [];
}

function toQuotedYamlString(value) {
  return JSON.stringify(value);
}

function buildFrontmatter({ title, description, date, tags, readTimeText, slug }) {
  return [
    "---",
    `title: ${toQuotedYamlString(title)}`,
    `description: ${toQuotedYamlString(description)}`,
    `date: ${toQuotedYamlString(date)}`,
    `tags: ${JSON.stringify(tags)}`,
    `readTime: ${toQuotedYamlString(readTimeText)}`,
    `ogImage: ${toQuotedYamlString(`/og/${slug}.png`)}`,
    `canonical: ${toQuotedYamlString(`https://chaitanyaprabuddha.com/blog/${slug}`)}`,
    "published: true",
    "---"
  ].join("\n");
}

function main() {
  const sourceDir = getSourceDirectory();
  const files = readdirSync(sourceDir).filter((file) => file.toLowerCase().endsWith(".xml"));

  mkdirSync(TARGET_DIR, { recursive: true });

  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const rawXml = readFileSync(sourcePath, "utf8");
    const parsed = metadataParser.parse(rawXml);
    const metadata = parsed["blog-post"]?.metadata ?? {};
    const seo = parsed["blog-post"]?.seo ?? {};
    const slug = slugifyFileName(file);
    const title = stripMarkdown(metadata.title || slug.replaceAll("-", " "));
    const contentNodes = extractContentNodes(rawXml);
    const body = renderNodes(contentNodes);
    const introText = extractRawText(
      contentNodes
        .filter((node) => node.introduction)
        .flatMap((node) => node.introduction)
    );
    const description = inferDescription({
      metadataDescription: metadata["meta-description"],
      seoDescription: seo["meta-description"],
      introText,
      title,
      primaryKeyword: metadata["primary-keyword"],
      pillar: metadata.pillar
    });
    const date = normalizeInlineWhitespace(metadata.date || "") || formatDateFromStat(sourcePath);
    const tags = inferTags(metadata, title);
    const readTimeText = readingTime(body).text;
    const frontmatter = buildFrontmatter({
      title,
      description,
      date,
      tags,
      readTimeText,
      slug
    });
    const markdown = `${frontmatter}\n\n${body}\n`;
    const targetPath = path.join(TARGET_DIR, `${slug}.md`);

    writeFileSync(targetPath, markdown, "utf8");
  }

  console.log(`Migrated ${files.length} posts into ${TARGET_DIR}`);
}

main();
