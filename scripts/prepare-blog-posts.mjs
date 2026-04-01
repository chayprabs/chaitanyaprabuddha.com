import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIRECTORY = path.join(process.cwd(), "content", "blog");
const SITE_URL = "https://chaitanyaprabuddha.com";
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ACRONYM_MAP = {
  ai: "AI",
  api: "API",
  a2a: "A2A",
  c: "C",
  cms: "CMS",
  css: "CSS",
  gpt: "GPT",
  html: "HTML",
  json: "JSON",
  kv: "KV",
  llm: "LLM",
  llms: "LLMs",
  mcp: "MCP",
  mdx: "MDX",
  og: "OG",
  rag: "RAG",
  seo: "SEO",
  sql: "SQL",
  ts: "TS",
  tsx: "TSX",
  ui: "UI",
  ux: "UX",
  xml: "XML"
};

const TAG_PATTERNS = [
  { label: "AI Agents", pattern: /\bai agents?\b/i },
  { label: "A2A", pattern: /\bagent2agent\b|\ba2a\b/i },
  { label: "MCP", pattern: /\bmodel context protocol\b|\bmcp\b/i },
  {
    label: "RAG",
    pattern: /\bretrieval augmented generation\b|\brag\b/i
  },
  { label: "LLM Inference", pattern: /\bllm\b.*\binference\b|\binference\b/i },
  { label: "Reasoning Models", pattern: /\breasoning models?\b/i },
  { label: "Structured Outputs", pattern: /\bstructured outputs?\b|\bconstrained decoding\b/i },
  { label: "Speculative Decoding", pattern: /\bspeculative decoding\b/i },
  { label: "KV Cache", pattern: /\bkv cache\b/i },
  { label: "Prompt Caching", pattern: /\bprompt caching\b/i },
  { label: "Mixture of Experts", pattern: /\bmixture of experts\b|\bmoe\b/i },
  { label: "FlashAttention", pattern: /\bflashattention\b/i },
  { label: "SEO", pattern: /\bseo\b|\bsearch intent\b|\bserp\b/i },
  { label: "Next.js", pattern: /\bnext(?:\.js)?\b/i },
  { label: "TypeScript", pattern: /\btypescript\b/i },
  { label: "JavaScript", pattern: /\bjavascript\b/i },
  { label: "Browser Automation", pattern: /\bbrowser\b.*\bautomation\b|\bplaywright\b/i },
  { label: "Sandboxing", pattern: /\bsandbox(?:ed|ing)?\b/i }
];

function isMarkdownFile(fileName) {
  return MARKDOWN_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function normalizeInlineWhitespace(value) {
  return normalizeWhitespace(value).replace(/\s+/g, " ");
}

function stripInlineMarkdown(value) {
  return normalizeInlineWhitespace(
    String(value ?? "")
      .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/[*_~]/g, "")
  );
}

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();

      if (ACRONYM_MAP[lower]) {
        return ACRONYM_MAP[lower];
      }

      if (lower === "next.js") {
        return "Next.js";
      }

      if (lower === "agent2agent") {
        return "Agent2Agent";
      }

      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function titleFromSlug(slug) {
  return toTitleCase(slug.replaceAll("-", " "));
}

function extractFirstHeading(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? stripInlineMarkdown(match[1]) : "";
}

function extractParagraphs(body) {
  const paragraphs = [];
  const lines = body.replace(/\r/g, "").split("\n");
  const buffer = [];
  let inFence = false;

  function flush() {
    const paragraph = normalizeInlineWhitespace(buffer.join(" "));

    if (paragraph) {
      paragraphs.push(paragraph);
    }

    buffer.length = 0;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      flush();
      continue;
    }

    if (inFence) {
      continue;
    }

    if (!trimmed) {
      flush();
      continue;
    }

    if (
      /^(#{1,6}\s|>|[-*+]\s|\d+\.\s|\|.*\||!\[|---$|___$|\*\*\*$)/.test(trimmed)
    ) {
      flush();
      continue;
    }

    buffer.push(stripInlineMarkdown(trimmed));
  }

  flush();
  return paragraphs;
}

function splitSentences(value) {
  return normalizeInlineWhitespace(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function candidateDescriptions(value) {
  const normalized = normalizeInlineWhitespace(value);

  if (!normalized) {
    return [];
  }

  const candidates = new Set();

  if (normalized.length <= 160) {
    candidates.add(normalized);
  }

  const sentences = splitSentences(normalized);

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

  return Array.from(candidates).sort((left, right) => right.length - left.length);
}

function inferDescription({ currentDescription, title, paragraphs }) {
  const candidates = [
    currentDescription,
    paragraphs[0],
    paragraphs.slice(0, 2).join(" ")
  ].flatMap((value) => candidateDescriptions(value));

  if (candidates.length > 0) {
    return candidates[0];
  }

  const fallback = `A technical guide to ${title}, with practical implementation details and production-ready takeaways.`;

  if (fallback.length <= 160) {
    return fallback;
  }

  return `A technical guide to ${title}.`;
}

function formatDateFromStat(filePath) {
  const stat = statSync(filePath);
  const year = stat.mtime.getUTCFullYear();
  const month = `${stat.mtime.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${stat.mtime.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inferDate(currentDate, filePath, slug) {
  const normalizedDate = normalizeInlineWhitespace(currentDate);

  if (DATE_PATTERN.test(normalizedDate)) {
    return normalizedDate;
  }

  const slugDateMatch = slug.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (slugDateMatch) {
    return `${slugDateMatch[1]}-${slugDateMatch[2]}-${slugDateMatch[3]}`;
  }

  return formatDateFromStat(filePath);
}

function normalizeTags(value) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const unique = [];
  const seen = new Set();

  for (const item of items) {
    const normalized = normalizeInlineWhitespace(item);
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(normalized);
  }

  return unique;
}

function cleanTagPhrase(value) {
  const cleaned = normalizeInlineWhitespace(value)
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/^(advanced|complete|practical|production|technical)\s+/i, "")
    .replace(/^(guide to|guide for|founders guide to)\s+/i, "")
    .replace(/\b(beyond|with|without|for)\b.*$/i, "")
    .replace(/[.:;,]+$/g, "");

  if (!cleaned || cleaned.split(" ").length > 4) {
    return "";
  }

  return toTitleCase(cleaned);
}

function inferTags(title, body) {
  const sourceText = `${title}\n${body}`;
  const tags = [];
  const seen = new Set();

  function pushTag(value) {
    const normalized = normalizeInlineWhitespace(value);
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      return;
    }

    seen.add(key);
    tags.push(normalized);
  }

  for (const { label, pattern } of TAG_PATTERNS) {
    if (pattern.test(sourceText)) {
      pushTag(label);
    }

    if (tags.length === 3) {
      return tags;
    }
  }

  const phraseCandidates = title
    .split(/[:|]/)
    .flatMap((part) => part.split(","))
    .flatMap((part) => part.split(/\band\b/i))
    .map((part) => cleanTagPhrase(part))
    .filter(Boolean);

  for (const candidate of phraseCandidates) {
    pushTag(candidate);

    if (tags.length === 3) {
      return tags;
    }
  }

  const fallbackTokens = title
    .split(/[^a-zA-Z0-9+.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .filter((token) => !/^(the|and|for|with|from|into|that|this|your|beyond)$/i.test(token));

  for (const token of fallbackTokens) {
    pushTag(toTitleCase(token));

    if (tags.length === 3) {
      return tags;
    }
  }

  return tags;
}

function toQuotedYamlString(value) {
  return JSON.stringify(String(value));
}

function buildFrontmatter(frontmatter) {
  return [
    "---",
    `title: ${toQuotedYamlString(frontmatter.title)}`,
    `description: ${toQuotedYamlString(frontmatter.description)}`,
    `date: ${toQuotedYamlString(frontmatter.date)}`,
    `tags: ${JSON.stringify(frontmatter.tags)}`,
    `readTime: ${toQuotedYamlString(frontmatter.readTime)}`,
    `ogImage: ${toQuotedYamlString(frontmatter.ogImage)}`,
    `canonical: ${toQuotedYamlString(frontmatter.canonical)}`,
    `published: ${frontmatter.published ? "true" : "false"}`,
    "---"
  ].join("\n");
}

function main() {
  const files = readdirSync(BLOG_DIRECTORY).filter(isMarkdownFile);
  let updatedCount = 0;

  for (const fileName of files) {
    const filePath = path.join(BLOG_DIRECTORY, fileName);
    const rawFile = readFileSync(filePath, "utf8");
    const { data, content } = matter(rawFile);
    const slug = slugify(path.basename(fileName, path.extname(fileName)));
    const paragraphs = extractParagraphs(content);
    const title = stripInlineMarkdown(
      data.title || extractFirstHeading(content) || titleFromSlug(slug)
    );
    const description = inferDescription({
      currentDescription: data.description,
      title,
      paragraphs
    });
    const tags = normalizeTags(data.tags);
    const nextFrontmatter = {
      title,
      description,
      date: inferDate(data.date, filePath, slug),
      tags: tags.length > 0 ? tags : inferTags(title, content),
      readTime: readingTime(content).text,
      ogImage: normalizeInlineWhitespace(data.ogImage) || `/og/${slug}.png`,
      canonical:
        normalizeInlineWhitespace(data.canonical) || `${SITE_URL}/blog/${slug}`,
      published: data.published !== false
    };

    const separator = content.startsWith("\n") ? "\n" : "\n\n";
    const nextFile = `${buildFrontmatter(nextFrontmatter)}${separator}${content}`;

    if (nextFile !== rawFile) {
      writeFileSync(filePath, nextFile, "utf8");
      updatedCount += 1;
      console.log(`Updated ${path.relative(process.cwd(), filePath)}`);
    }
  }

  console.log(
    `Prepared ${files.length} markdown posts in ${path.relative(process.cwd(), BLOG_DIRECTORY)} (${updatedCount} updated).`
  );
}

main();
