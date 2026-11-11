# chaitanyaprabuddha.com

Personal website of Chaitanya Prabuddha: CS student at BITS Pilani, AI/ML researcher, builder, and founder of Cruxo.

## Public Site

- **Home** - portfolio landing page with profile, Cruxo, StemLM, projects, research, achievements, current work, and contact links.
- **Blog** - long-form writing on AI agents, LLM systems, inference, MCP, RAG, autonomous SEO, and developer tooling.
- **Sitemap** - generated from published markdown posts with canonical `https://www.chaitanyaprabuddha.com` URLs.
- **Robots** - static `robots.txt` route pointing crawlers to the canonical sitemap.

## Homepage Sections

- **Cruxo** - founder section for the prompt-coding challenge site at `trycruxo.com`.
- **StemLM** - standalone co-founder section for the structured STEM problem-solving product at `stemlm.app`. The section now positions StemLM around undergrad students, structured STEM solutions, and exam-ready understanding.
- **Projects** - focused project list currently featuring LocalYapper and Newsroom. IPL2026-LM and StemLM are no longer listed as ordinary projects.
- **Research** - AI/ML and systems research work.
- **Achievements** - hackathons, builder selections, and campus entrepreneurship wins.

## Featured Work

- **Cruxo** - LeetCode for the prompting era: write one plain-English prompt, an AI turns it into code, and hidden tests score it.
- **StemLM** - study layer on top of ChatGPT, Claude, and Gemini that shows the working behind an answer: method, formulas, diagrams, and skipped steps.
- **LocalYapper** - privacy-first on-device voice dictation tool and open source alternative to cloud-first dictation apps.
- **Newsroom** - editorial AI pipeline built after ContextCon to turn live X trends into Crustdata-style data posts with Grok, Claude, Crustdata APIs, GPT-Image-2, endpoint validation, prompt caching, usage logs, and per-run artifacts.

## Achievements

- 2nd Place, **Eightfold AI Hackathon** at Apogee Fest 2026, BITS Pilani. Built Candor solo among 700+ teams.
- Featured Builder, **OpenAI Codex Hackathon - Bengaluru**. Selected from 5,000+ applicants into the 100-builder offline cohort.
- Top 10, **ContextCon** by Crustdata x Y Combinator. Selected from roughly 2,000 applicants into the top 100 participant cohort.
- 1st Place, **Solve for Pilani** at Apogee Fest 2025.
- 3rd Place, **BITSpreneur** for Gurja, a bio-CNG campus food-waste project.

## Stack

- **Next.js 15** App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Markdown content** with frontmatter, `gray-matter`, `unified`, `remark-gfm`, and `rehype-pretty-code`
- **SEO routes** through Next metadata, `app/sitemap.ts`, and `app/robots.txt/route.ts`

## Content Workflow

Blog posts live in `content/blog`.

The dev and build flows run:

```bash
npm run blog:sync
```

That command:

1. Migrates legacy XML posts into markdown when needed.
2. Normalizes markdown frontmatter.
3. Computes reading time.
4. Keeps canonical URLs aligned to `https://www.chaitanyaprabuddha.com`.

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Checks

```bash
npm run build
```

Useful URL checks after deploy:

- `https://www.chaitanyaprabuddha.com`
- `https://www.chaitanyaprabuddha.com/blog`
- `https://www.chaitanyaprabuddha.com/sitemap.xml`
- `https://www.chaitanyaprabuddha.com/robots.txt`

The canonical host is `https://www.chaitanyaprabuddha.com`.
