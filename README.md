# chaitanyaprabuddha.com

Personal website of Chaitanya Prabuddha: CS student at BITS Pilani, AI/ML researcher, builder, and founder of Authos.

## Site

- **Home** - portfolio, startup work, projects, research, achievements, and contact links
- **Blog** - long-form writing on AI agents, LLM systems, inference, MCP, RAG, and developer tooling
- **Sitemap** - generated from published markdown posts with canonical `https://www.chaitanyaprabuddha.com` URLs
- **Robots** - static `robots.txt` pointing search engines to the canonical sitemap

## Featured Work

- **Authos** - remote tool platform for coding agents. It gives Claude Code, Codex, and other agents controlled remote execution for browser sessions, Office/PDF conversion, large-file inspection, webhooks, sandboxes, temporary databases, logs, and signed artifacts.
- **StemLM** - STEM learning extension for structured AI problem solving. It works alongside ChatGPT, Claude, and Gemini to turn AI answers into curriculum-aligned study views with steps, formulas, diagrams, and the missing reasoning students need.
- **LocalYapper** - privacy-first on-device voice dictation tool.
- **Newsroom** - editorial AI pipeline that turns live X trends into Crustdata-style data posts using Grok, Claude, Crustdata, and GPT-Image-2.
- **EdgeLM** - research project exploring fast local LLM inference on consumer hardware.

## Achievements

- 2nd Place, **Eightfold AI Hackathon** at Apogee Fest 2026, BITS Pilani
- Featured Builder, **OpenAI Codex Hackathon - Bengaluru**
- Top 10, **ContextCon** by Crustdata x Y Combinator
- 1st Place, **Solve for Pilani** at Apogee Fest 2025
- 3rd Place, **BITSpreneur**

## Stack

- **Next.js 15** App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Markdown content** with frontmatter, `gray-matter`, `unified`, `remark-gfm`, and `rehype-pretty-code`
- **Static SEO routes** for `sitemap.xml` and `robots.txt`

## Content Workflow

Blog posts live in `content/blog`.

The dev and build flows run:

```bash
npm run blog:sync
```

That command:

1. Migrates any legacy XML posts into markdown when needed.
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
