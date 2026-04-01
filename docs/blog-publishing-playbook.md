# Blog Publishing Playbook

Use this workflow whenever a new post is added to this repo. The goal is to keep every post production-ready without manually repeating the SEO, metadata, and presentation cleanup work each time.

## Source Of Truth

- Publish markdown or MDX files into `content/blog/`.
- Keep the filename as the final slug. Use lowercase words with hyphens.
- Treat the body as sacred. The automation only normalizes frontmatter and never rewrites the markdown body.
- If a post arrives as XML, place it in `content/blog/` and run `npm run blog:sync`. The XML migration only creates missing markdown files by default, so existing markdown is not overwritten.

## Automatic Flow

The project now runs a blog sync step before both `npm run dev` and `npm run build`.

That sync step does two things:

1. `scripts/migrate-blog-xml-to-markdown.mjs`
   Creates missing `content/blog/*.md` files from XML posts.

2. `scripts/prepare-blog-posts.mjs`
   Normalizes every markdown post frontmatter to the production schema:

   - `title`
   - `description`
   - `date`
   - `tags`
   - `readTime`
   - `ogImage`
   - `canonical`
   - `published`

You can also run it manually:

```bash
npm run blog:sync
```

Or only re-normalize markdown frontmatter:

```bash
npm run blog:prepare
```

## Frontmatter Rules

Every post should end up with this exact shape:

```yaml
---
title: "Full post title here"
description: "1-2 sentence SEO meta description, under 160 chars"
date: "YYYY-MM-DD"
tags: ["tag1", "tag2"]
readTime: "N min read"
ogImage: "/og/<slug>.png"
canonical: "https://chaitanyaprabuddha.com/blog/<slug>"
published: true
---
```

The prep script applies these rules:

- Strip markdown formatting from `title`.
- Keep `description` under 160 characters and avoid mid-sentence truncation.
- Use the existing `date` when valid; otherwise fall back to filename date, then file mtime.
- Recalculate `readTime` from the raw markdown body.
- Preserve existing tags when present; infer tags from the title/body when missing.
- Default `ogImage`, `canonical`, and `published` when absent.

## Writing Standards

The pipeline already handles rendering, syntax highlighting, JSON-LD, sitemap generation, adjacent post navigation, and code language chips. To make new posts look good without extra cleanup, keep these authoring rules in mind:

- Open with a strong summary paragraph. The prep script uses the intro to infer the description when needed.
- Use clear `##` and `###` headings. The blog renderer turns them into linked anchor headings automatically.
- Prefer fenced code blocks, and add an explicit language when you know it. Auto-detection exists, but explicit labels are still best.
- Keep tables as real markdown tables so typography and spacing stay consistent.
- Write short, direct paragraphs. Dense walls of text look worse even when the styles are correct.
- If a post needs custom React components, switch the file to `.mdx`. Otherwise prefer plain `.md`.

## Verification

After adding or editing posts, run:

```bash
npm run build
```

That confirms the metadata pipeline, post routes, sitemap generation, and TypeScript/Next.js build all still work together.

## Codex Prompting Note

When asking Codex to help with a future post in this repo, reference this file and ask it to follow the blog publishing playbook. The expected behavior is:

- keep the markdown body intact unless you explicitly ask for content edits
- run the sync/prepare flow
- verify the post renders cleanly
- preserve SEO and structured-data quality
