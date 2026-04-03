---
title: "AGENTS.md vs CLAUDE.md vs Cursor Rules Compared"
description: "Where AI coding agent instructions actually live in Codex, Claude Code, and Cursor. A full comparison."
date: "2026-04-02"
tags: ["AGENTS.md","CLAUDE.md","Cursor Rules","AI coding agents","Codex","Claude Code","Cursor","developer tools","AI instructions","coding assistant configuration"]
readTime: "29 min read"
ogImage: "/og/agents-md-vs-claude-md-vs-cursor-rules.png"
canonical: "https://chaitanyaprabuddha.com/blog/agents-md-vs-claude-md-vs-cursor-rules"
published: true
---

# AGENTS.md vs CLAUDE.md vs Cursor Rules: Where AI Coding Agent Instructions Actually Live

Every serious AI coding tool now ships with its own **instruction system** — a way for you to tell the agent how your project works before it writes a single line of code. OpenAI Codex reads **AGENTS.md**. Anthropic's Claude Code reads **CLAUDE.md**. And Cursor has its own **Cursor Rules** system split across files and settings. Understanding the differences between AGENTS.md, CLAUDE.md, and Cursor Rules is no longer optional if you want consistent, high-quality output from any of these tools.

The problem is that none of them work quite the same way. They differ in where files live, how instructions cascade, what syntax they expect, and how much control you actually get. If you work across multiple agents — or if your team does — you need a mental model for all three.

This guide breaks down each instruction system in full. You will learn where the files go, how they load, what to put in them, and how to keep them in sync when your repo talks to more than one agent.

## Table of Contents

- [Why Instruction Files Matter](#why-instruction-files-matter)
- [AGENTS.md: How OpenAI Codex Reads Your Project](#agentsmd-how-openai-codex-reads-your-project)
  - [Where AGENTS.md Files Live](#where-agentsmd-files-live)
  - [How Codex Merges AGENTS.md Files](#how-codex-merges-agentsmd-files)
  - [What to Put in AGENTS.md](#what-to-put-in-agentsmd)
  - [Example AGENTS.md File](#example-agentsmd-file)
  - [Disabling AGENTS.md](#disabling-agentsmd)
- [CLAUDE.md: How Claude Code Reads Your Project](#claudemd-how-claude-code-reads-your-project)
  - [Where CLAUDE.md Files Live](#where-claudemd-files-live)
  - [How Claude Code Loads CLAUDE.md Files](#how-claude-code-loads-claudemd-files)
  - [The .claude/rules/ Directory](#the-clauderules-directory)
  - [Path-Specific Rules in Claude Code](#path-specific-rules-in-claude-code)
  - [Importing Files Into CLAUDE.md](#importing-files-into-claudemd)
  - [Auto Memory: Claude's Self-Written Notes](#auto-memory-claudes-self-written-notes)
  - [Example CLAUDE.md File](#example-claudemd-file)
- [Cursor Rules: How Cursor Reads Your Project](#cursor-rules-how-cursor-reads-your-project)
  - [Where Cursor Rules Live](#where-cursor-rules-live)
  - [Project Rules vs User Rules](#project-rules-vs-user-rules)
  - [The .cursorrules File (Legacy)](#the-cursorrules-file-legacy)
  - [The .cursor/rules Directory (Current)](#the-cursorrules-directory-current)
  - [Example Cursor Rules File](#example-cursor-rules-file)
- [Side-by-Side Comparison](#side-by-side-comparison)
- [How Instructions Actually Affect Agent Behavior](#how-instructions-actually-affect-agent-behavior)
- [Making All Three Work Together](#making-all-three-work-together)
  - [The Shared Source of Truth Pattern](#the-shared-source-of-truth-pattern)
  - [Example Multi-Agent Setup](#example-multi-agent-setup)
- [Common Mistakes and How to Avoid Them](#common-mistakes-and-how-to-avoid-them)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

## Why Instruction Files Matter

Instruction files are the difference between an AI agent that understands your project and one that guesses. Without them, every session starts from zero — the agent has no idea about your build system, your naming conventions, your test framework, or the architectural decisions your team made six months ago.

These files serve as **persistent context**. They survive across sessions, they can be shared with your team through version control, and they let you encode tribal knowledge that would otherwise live in someone's head.

The stakes are real. A coding agent without instructions will use its training defaults. It might use `npm` when your project uses `pnpm`. It might write Jest tests when you use Vitest. It might create files in `lib/` when your convention is `src/`. Instruction files prevent this entire class of problems.

Every major AI coding tool has converged on the same core idea: a markdown file in your repo that the agent reads before doing anything. But the implementations diverge in important ways.

## AGENTS.md: How OpenAI Codex Reads Your Project

**AGENTS.md is the instruction file format used by OpenAI's Codex CLI** — their locally-running coding agent. It is a plain markdown file containing free-form directives that shape how Codex behaves in your project.

The design philosophy behind AGENTS.md is simplicity. There is no special syntax, no YAML frontmatter, no config schema. You write markdown, and Codex reads it. The filename itself is the convention — `AGENTS.md` — and Codex looks for it automatically.

### Where AGENTS.md Files Live

Codex searches for AGENTS.md files in three locations, merged in order from broadest to most specific scope.

| Scope | Location | Purpose |
|-------|----------|---------|
| **Global (personal)** | `~/.codex/AGENTS.md` | Your personal preferences, applied to every project |
| **Project root** | `./AGENTS.md` (repo root) | Shared team instructions for the entire project |
| **Local (working directory)** | `./AGENTS.md` (current directory) | Feature-specific or subdirectory-specific instructions |

The global file is yours alone. It travels with you across every repository. The project-root file is what your team commits to version control. And the local file lets you add context for a specific part of the codebase.

### How Codex Merges AGENTS.md Files

Codex uses a **top-down cascade** to merge instructions. It starts with your global `~/.codex/AGENTS.md`, layers on the project root `AGENTS.md`, and finishes with the local directory `AGENTS.md`.

This means more specific instructions take precedence. If your global file says "use tabs" but the project file says "use 2-space indentation," the project-level instruction wins for that repo.

All three files are concatenated and injected into the agent's context before your first prompt. There is no conditional loading or on-demand file discovery — everything loads upfront.

### What to Put in AGENTS.md

Because AGENTS.md is free-form markdown, you have complete flexibility. The most effective AGENTS.md files tend to include:

- **Build and test commands** — how to install dependencies, run tests, and build the project
- **Code style rules** — naming conventions, indentation, import ordering
- **Architectural decisions** — where files go, how modules are organized, what patterns to follow
- **Common workflows** — how to add a new API endpoint, how to create a migration, how to deploy
- **Things to avoid** — anti-patterns, deprecated APIs, files not to touch

Keep it concise. Codex loads the entire file into context, and every token spent on instructions is a token not available for reasoning about your code.

### Example AGENTS.md File

Here is a practical AGENTS.md for a TypeScript backend project:

```markdown
# Project: payment-service

## Stack
- Runtime: Node.js 22 with TypeScript 5.7
- Framework: Fastify
- Database: PostgreSQL via Drizzle ORM
- Testing: Vitest
- Package manager: pnpm (never use npm or yarn)

## Build & Test
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Run all tests: `pnpm test`
- Run a single test file: `pnpm vitest run src/path/to/file.test.ts`
- Type check: `pnpm typecheck`
- Lint: `pnpm lint`

## Code Style
- Use 2-space indentation
- Prefer named exports over default exports
- Use `type` imports for TypeScript types: `import type { Foo } from './foo'`
- File naming: kebab-case for files, PascalCase for types, camelCase for functions
- Always use explicit return types on exported functions

## Architecture
- API route handlers live in `src/routes/`
- Business logic lives in `src/services/`
- Database queries live in `src/db/queries/`
- Shared types live in `src/types/`
- Never import from `src/routes/` in service files

## Testing
- Every new service function needs a unit test
- Use `describe` / `it` blocks, not `test`
- Mock external services, never make real HTTP calls in tests
- Test files live next to the source file: `foo.ts` → `foo.test.ts`

## Git
- Use conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`
- Only use git commands when explicitly asked
```

### Disabling AGENTS.md

If you need to prevent Codex from reading AGENTS.md files — for example, when debugging unexpected behavior — you have two options:

- **CLI flag:** `--no-project-doc`
- **Environment variable:** `CODEX_DISABLE_PROJECT_DOC=1`

This disables loading at all three levels (global, project, local).

## CLAUDE.md: How Claude Code Reads Your Project

**CLAUDE.md is the instruction system for Anthropic's Claude Code**, their terminal-based coding agent. It is the most feature-rich of the three systems, with support for hierarchical loading, file imports, path-scoped rules, organization-wide policies, and an automatic memory system that writes notes on your behalf.

Where AGENTS.md aims for simplicity, CLAUDE.md aims for **granularity**. You can put different instructions at different levels of your directory tree, scope rules to specific file types, and even let Claude accumulate its own knowledge over time.

### Where CLAUDE.md Files Live

Claude Code reads CLAUDE.md files from multiple locations, each with different scope and precedence.

| Scope | Location | Purpose | Shared With |
|-------|----------|---------|-------------|
| **Managed policy** | OS-specific system path | Org-wide instructions from IT/DevOps | All users in organization |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared project instructions | Team via source control |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences for all projects | Just you |

The managed policy locations are platform-specific:

- **macOS:** `/Library/Application Support/ClaudeCode/CLAUDE.md`
- **Linux/WSL:** `/etc/claude-code/CLAUDE.md`
- **Windows:** `C:\Program Files\ClaudeCode\CLAUDE.md`

The managed policy file cannot be excluded by individual settings. This is how organizations enforce coding standards and security policies across all developers.

### How Claude Code Loads CLAUDE.md Files

Claude Code walks **up the directory tree** from your working directory, loading every CLAUDE.md it finds along the way. If you run Claude Code in `project/packages/api/`, it will load:

1. `project/packages/api/CLAUDE.md` (if it exists)
2. `project/packages/CLAUDE.md` (if it exists)
3. `project/CLAUDE.md` (if it exists)

CLAUDE.md files **above** your working directory load at session start. CLAUDE.md files in **subdirectories** below your working directory load on demand — they are pulled in when Claude reads files in those directories.

More specific locations take precedence over broader ones. This means a `CLAUDE.md` in `src/api/` overrides conflicting instructions from the root `CLAUDE.md` for files in that directory.

HTML comments (`<!-- like this -->`) are stripped before injection into context. Use them for notes to human maintainers without wasting tokens.

### The .claude/rules/ Directory

For larger projects, Claude Code supports a **rules directory** at `.claude/rules/`. Each markdown file in this directory covers a single topic, and all `.md` files are discovered recursively.

```
your-project/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
│       ├── code-style.md
│       ├── testing.md
│       ├── security.md
│       └── frontend/
│           ├── react-patterns.md
│           └── accessibility.md
```

This approach is better than one giant CLAUDE.md for several reasons. Individual rule files are easier to review in pull requests. Different team members can own different rule files. And path-scoped rules only load when relevant, saving context space.

Rules without path frontmatter load at session start, just like `.claude/CLAUDE.md`. The rules directory also supports **symlinks**, so you can share rules across multiple repositories by linking to a central location.

### Path-Specific Rules in Claude Code

Rules can be scoped to specific files using **YAML frontmatter** with a `paths` field. These conditional rules only load when Claude works with files matching the specified glob patterns.

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation using zod schemas
- Use the standard error response format from `src/lib/errors.ts`
- Include OpenAPI documentation comments on every route handler
- Never return raw database objects — always map to response DTOs
```

This is one of the most powerful features unique to Claude Code. Instead of bloating your main instruction file with rules for every part of the codebase, you scope them precisely where they matter.

Common glob patterns:

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files in any directory |
| `src/components/**/*.tsx` | React components in a specific directory |
| `*.md` | Markdown files in the project root only |
| `src/**/*.{ts,tsx}` | TypeScript and TSX files under src/ |
| `tests/**/*.test.ts` | Test files in the tests directory |

### Importing Files Into CLAUDE.md

CLAUDE.md supports an **import syntax** using `@path/to/file`. Imported files are expanded and loaded into context alongside the CLAUDE.md that references them.

```markdown
See @README.md for project overview and @package.json for available scripts.

# Project Instructions

- Follow the API design guide: @docs/api-design.md
- Git workflow: @docs/git-workflow.md
```

Both relative and absolute paths work. Relative paths resolve from the file containing the import, not from your working directory. Imports can be recursive up to five levels deep.

This is particularly useful for pulling in existing documentation without duplicating it. Your README already describes the project? Import it instead of rewriting the same information in CLAUDE.md.

For personal preferences you do not want to commit to the repo, import a file from your home directory:

```markdown
# Team Instructions
- Use conventional commits
- Run tests before pushing

# Personal Preferences
- @~/.claude/my-preferences.md
```

### Auto Memory: Claude's Self-Written Notes

Claude Code has a second memory system beyond CLAUDE.md: **auto memory**. This is a set of notes that Claude writes for itself as it works, capturing build commands, debugging insights, architectural patterns, and your preferences.

Auto memory files live in `~/.claude/projects/<project>/memory/` and include a `MEMORY.md` index plus optional topic-specific files:

```
~/.claude/projects/<project>/memory/
├── MEMORY.md           # Index, loaded into every session
├── debugging.md        # Notes about debugging patterns
├── api-conventions.md  # API patterns Claude discovered
└── build-tips.md       # Build system quirks
```

The first 200 lines (or 25KB) of `MEMORY.md` load at session start. Topic files load on demand when Claude needs them.

This is **unique to Claude Code**. Neither Codex nor Cursor has a self-writing memory system. It means Claude Code gets better at your project over time without you updating any files.

Auto memory is on by default. You can toggle it off via the `/memory` command or by setting `"autoMemoryEnabled": false` in project settings.

### Example CLAUDE.md File

Here is a comprehensive CLAUDE.md for the same TypeScript backend project:

```markdown
# payment-service

@README.md

## Build & Test
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Run all tests: `pnpm test`
- Run single test: `pnpm vitest run src/path/to/file.test.ts`
- Type check: `pnpm typecheck`

## Code Style
- 2-space indentation, no tabs
- Named exports only, no default exports
- Use `import type` for type-only imports
- kebab-case files, PascalCase types, camelCase functions
- Explicit return types on all exported functions

## Architecture
- Routes: `src/routes/`
- Services: `src/services/`
- DB queries: `src/db/queries/`
- Types: `src/types/`
- Services must not import from routes

## Testing Conventions
- Colocate tests: `foo.ts` → `foo.test.ts`
- Use `describe` / `it` blocks
- Mock external HTTP calls, never make real requests
- Every new service function needs a test

## Git
- Conventional commits: `feat:`, `fix:`, `chore:`
- Use plan mode for changes touching `src/billing/`
```

Notice how this file uses `@README.md` to import existing documentation, keeping the CLAUDE.md itself focused on instructions the agent would not discover on its own.

## Cursor Rules: How Cursor Reads Your Project

**Cursor Rules are the instruction system built into the Cursor IDE**, an AI-native code editor forked from VS Code. Unlike Codex and Claude Code, which are terminal-based agents, Cursor is a full editor with inline AI features (Tab completion, Cmd+K edits, Chat, and Composer).

The rules system has evolved over time. The original `.cursorrules` file in the project root has been joined by a more structured `.cursor/rules/` directory system and user-level global rules in Cursor's settings.

### Where Cursor Rules Live

Cursor rules exist in two main locations:

| Scope | Location | Purpose |
|-------|----------|---------|
| **User (global)** | Cursor Settings > Rules for AI | Personal preferences across all projects |
| **Project (legacy)** | `.cursorrules` in project root | Project-wide instructions (original format) |
| **Project (current)** | `.cursor/rules/` directory | Structured, multi-file project rules |

The user-level rules are set in Cursor's Settings UI under "Rules for AI." These apply to every project you open and are a good place for personal style preferences.

### Project Rules vs User Rules

**User rules** are configured inside Cursor's settings panel. They are plain text instructions that load for every project. Use them for preferences that never change: your preferred comment style, response language, general coding patterns.

**Project rules** live in your repository and are shared with your team. They contain project-specific instructions: the tech stack, build commands, architectural decisions, and coding standards. These are the rules that matter most for consistent AI output across a team.

When both exist, Cursor combines them. User rules provide a baseline, and project rules add project-specific detail on top. If they conflict, the project-level rules generally take precedence in practice.

### The .cursorrules File (Legacy)

The original method for providing project instructions to Cursor was a single `.cursorrules` file at the root of your project. This file contains **plain text instructions** — no special format required.

```
# .cursorrules

You are working on a TypeScript backend project using Fastify and Drizzle ORM.

## Stack
- Runtime: Node.js 22, TypeScript 5.7
- Framework: Fastify
- Database: PostgreSQL with Drizzle ORM
- Testing: Vitest
- Package manager: pnpm

## Code Guidelines
- Use 2-space indentation
- Prefer named exports
- Use import type for type-only imports
- Always add explicit return types to exported functions
- File naming: kebab-case

## Architecture
- Route handlers go in src/routes/
- Business logic goes in src/services/
- Database queries go in src/db/queries/
- Shared types go in src/types/

## Testing
- Test files sit next to source: foo.ts → foo.test.ts
- Use describe/it blocks
- Mock all external HTTP calls
```

The `.cursorrules` file is still supported, but the newer `.cursor/rules/` directory is the recommended approach for new projects. Both can coexist.

### The .cursor/rules Directory (Current)

The **`.cursor/rules/` directory** is Cursor's modern approach to project instructions. It allows you to create multiple rule files, each focused on a specific concern. Rule files in this directory can optionally use frontmatter to control when they apply.

```
your-project/
├── .cursor/
│   └── rules/
│       ├── general.mdc
│       ├── typescript.mdc
│       ├── testing.mdc
│       └── api-design.mdc
```

Rule files in this directory use the `.mdc` extension (Markdown Config). The `.mdc` format is essentially markdown with optional YAML-like frontmatter for metadata.

A key feature of the `.cursor/rules/` system is the ability to set rules that apply **conditionally** based on the context. Rules can be configured to:

- **Always apply** — loaded into every interaction
- **Apply to specific file types** — activated when working with matching files (via glob patterns)
- **Apply on agent request** — available for the agent to pull in when it determines they are relevant
- **Apply manually** — only used when you explicitly reference them

### Example Cursor Rules File

Here is what a `.cursor/rules/` rule file looks like for API development:

```markdown
---
description: Rules for API route development
globs: src/routes/**/*.ts
alwaysApply: false
---

# API Development Standards

- All route handlers must validate input using zod schemas
- Use the standard error format from `src/lib/errors.ts`
- Add OpenAPI documentation comments to every endpoint
- Never return raw database objects — always use response DTOs
- Route files should export a single `registerRoutes` function
- Use async/await, never raw promises with .then()
```

And a general rules file that always applies:

```markdown
---
description: General project coding standards
alwaysApply: true
---

# General Standards

- Use pnpm for all package management (never npm or yarn)
- 2-space indentation, no tabs
- Named exports only
- Use import type for type-only imports
- kebab-case file names
- PascalCase for types and interfaces
- camelCase for functions and variables
- Conventional commit messages: feat:, fix:, chore:, docs:
```

The `.mdc` format gives you a structured way to organize rules that is more powerful than a single `.cursorrules` file, though slightly less flexible than Claude Code's `paths` frontmatter since the glob scoping works differently depending on the mode selected.

## Side-by-Side Comparison

Here is a direct comparison of all three instruction systems across the dimensions that matter most.

| Feature | AGENTS.md (Codex) | CLAUDE.md (Claude Code) | Cursor Rules |
|---------|-------------------|-------------------------|--------------|
| **File format** | Markdown | Markdown | Markdown / .mdc |
| **Project file** | `./AGENTS.md` | `./CLAUDE.md` or `./.claude/CLAUDE.md` | `.cursorrules` or `.cursor/rules/*.mdc` |
| **User (personal) file** | `~/.codex/AGENTS.md` | `~/.claude/CLAUDE.md` | Settings UI |
| **Organization file** | Not supported | OS-level managed policy | Not supported |
| **Multi-file rules** | Not supported | `.claude/rules/` directory | `.cursor/rules/` directory |
| **Path-scoped rules** | Not supported | YAML frontmatter with `paths` | Glob patterns in `.mdc` frontmatter |
| **File imports** | Not supported | `@path/to/file` syntax | Not supported |
| **Directory walking** | 3 fixed locations | Walks up entire directory tree | Project root + rules directory |
| **Subdirectory loading** | Current directory only | On-demand when Claude reads files in subdirectories | Via glob-matched rule files |
| **Auto memory** | Not supported | Yes, self-writing memory system | Not natively (Cursor has "Memories" feature in newer versions) |
| **Disable loading** | `--no-project-doc` flag | `claudeMdExcludes` in settings | Remove files or disable in settings |
| **Symlink support** | Not documented | Yes, in `.claude/rules/` | Not documented |
| **Managed by** | You (free-form text) | You + Claude (auto memory) | You (free-form text + settings) |
| **Shared via VCS** | Yes (project-level file) | Yes (project-level files and rules) | Yes (project-level files) |

**Key differences that matter in practice:**

1. **Claude Code has the deepest hierarchy.** It walks the entire directory tree, discovers subdirectory CLAUDE.md files on demand, supports imports, and has organization-wide managed policies. Codex has three fixed locations. Cursor rules sit in the project root.

2. **Only Claude Code has file imports.** The `@path/to/file` syntax is a significant advantage. You can import your README, your package.json, or any documentation file directly without duplicating content.

3. **Both Claude Code and Cursor support path-scoped rules.** Claude Code uses `paths` in YAML frontmatter. Cursor uses glob patterns in `.mdc` frontmatter. The core idea is the same: load instructions only when working with matching files.

4. **Claude Code's auto memory is unique.** It is the only system where the agent writes its own notes and reads them back in future sessions. This creates a feedback loop that improves the agent's understanding over time.

5. **Cursor's UI integration is unique.** Because Cursor is an IDE, you can configure user-level rules through a settings panel. Codex and Claude Code are terminal tools where everything is file-based.

## How Instructions Actually Affect Agent Behavior

All three systems inject instructions into the model's context window as **guidance, not enforcement**. This is a critical distinction.

CLAUDE.md files, for example, are loaded as user messages after the system prompt. Claude reads them and tries to follow them, but there is no hard guarantee of compliance. The same is true for AGENTS.md in Codex and rules in Cursor. These are all soft constraints.

**Specificity matters more than volume.** An instruction like "use 2-space indentation" is followed more reliably than "format code properly." An instruction like "run `pnpm test` before committing" is followed more reliably than "make sure tests pass."

**Conflicts cause unpredictable behavior.** If two instruction files give contradictory guidance, the agent may pick one arbitrarily. Periodically audit your instruction files for conflicts, especially in monorepos where multiple CLAUDE.md files or rule files might apply simultaneously.

**Shorter is better.** Every token spent on instructions is a token taken from the agent's reasoning budget. Claude Code recommends keeping each CLAUDE.md under 200 lines. The same principle applies to AGENTS.md and Cursor Rules. Say what you need to say, then stop.

**Structure helps.** Markdown headers, bullet points, and tables are easier for models to parse than dense paragraphs. Group related instructions under clear headings. Use consistent formatting across your instruction files.

## Making All Three Work Together

Many teams use more than one AI coding tool. A developer might use Cursor as their daily editor, Claude Code for complex refactoring tasks, and Codex for automated workflows. In this scenario, you need your instruction files to stay in sync.

### The Shared Source of Truth Pattern

The cleanest approach is to maintain **one authoritative file** and have each tool-specific file reference it. There are two ways to do this.

**Option A: AGENTS.md as the shared source.** Since both AGENTS.md and CLAUDE.md are markdown files in the repo root, you can write your canonical instructions in AGENTS.md and import them into CLAUDE.md:

```markdown
<!-- CLAUDE.md -->
@AGENTS.md

## Claude-Specific Instructions
- Use plan mode for changes under src/billing/
- Prefer the Read tool over shell commands for viewing files
```

This works because Claude Code's `@import` syntax pulls in the full contents of AGENTS.md. You add Claude-specific behavior below the import.

For Cursor, you can include a reference in your `.cursorrules` or create a `.cursor/rules/shared.mdc` that duplicates the key instructions from AGENTS.md. Unfortunately, Cursor does not support file imports, so you need to maintain this manually or use a build script.

**Option B: A shared base file.** Create a file like `docs/ai-instructions.md` and reference it from each tool's config:

```markdown
<!-- CLAUDE.md -->
@docs/ai-instructions.md

## Claude Code Specifics
- ...
```

```markdown
<!-- AGENTS.md -->
See docs/ai-instructions.md for full project conventions.

(Then duplicate or summarize the key instructions here,
since AGENTS.md does not support imports.)
```

This approach is less clean for Codex since AGENTS.md has no import mechanism, but it keeps the canonical source of truth in one place.

### Example Multi-Agent Setup

Here is what a repository looks like when it supports all three tools:

```
my-project/
├── AGENTS.md                    # Codex instructions (canonical source)
├── CLAUDE.md                    # Imports AGENTS.md + Claude-specific rules
├── .cursorrules                 # Cursor instructions (mirrored from AGENTS.md)
├── .claude/
│   ├── CLAUDE.md                # Alternative location (not needed if root exists)
│   └── rules/
│       ├── api-routes.md        # Path-scoped rules for API code
│       ├── testing.md           # Testing-specific rules
│       └── security.md          # Security rules
├── .cursor/
│   └── rules/
│       ├── general.mdc          # Always-on rules
│       ├── api-routes.mdc       # Glob-scoped rules for API code
│       └── testing.mdc          # Testing-specific rules
├── src/
│   └── ...
└── package.json
```

The root `AGENTS.md` is the single source of truth. `CLAUDE.md` imports it and adds Claude-specific instructions. The `.cursorrules` file mirrors the core instructions. The `.claude/rules/` and `.cursor/rules/` directories add tool-specific path-scoped rules.

Is this redundant? Slightly. But the alternative — inconsistent agent behavior across tools — is worse. And in practice, the maintenance burden is low because the core instructions live in one place.

## Common Mistakes and How to Avoid Them

**Mistake 1: Writing a novel.** Your instruction file is not documentation. It is a concise set of directives. Every unnecessary line competes with your actual code for context window space. Keep files under 200 lines. Use imports (in Claude Code) or separate rule files (in Claude Code and Cursor) to break up large instruction sets.

**Mistake 2: Being vague.** "Write clean code" tells the agent nothing. "Use 2-space indentation, named exports, and explicit return types on exported functions" tells it exactly what to do. Concrete instructions are followed. Abstract ones are ignored.

**Mistake 3: Contradicting yourself.** If your root CLAUDE.md says "use Jest" and a subdirectory CLAUDE.md says "use Vitest," the agent will pick one unpredictably. Audit your instruction files periodically, especially in monorepos.

**Mistake 4: Ignoring the instruction file entirely.** Many developers add AI tools to their workflow but never create instruction files. They then complain about inconsistent output. Five minutes of setup saves hours of correction.

**Mistake 5: Duplicating instead of importing.** In Claude Code, use `@imports` to pull in existing docs. Maintaining the same information in three places is a recipe for drift. Establish one authoritative source and reference it.

**Mistake 6: Not committing project instruction files.** Your `.cursorrules`, `.cursor/rules/`, `AGENTS.md`, `CLAUDE.md`, and `.claude/rules/` should all be committed to version control (assuming they contain no secrets). They are team resources, not personal preferences. Personal preferences go in user-level files that stay on your machine.

**Mistake 7: Putting secrets in instruction files.** Instruction files are loaded into the model's context. Never put API keys, passwords, database credentials, or any sensitive information in these files. If the agent needs to know about environment variables, reference them by name: "The API key is in the `STRIPE_SECRET_KEY` environment variable."

## Frequently Asked Questions

### What is AGENTS.md and which tool uses it?

AGENTS.md is a markdown instruction file read by OpenAI's Codex CLI. It lives at the root of your repository (or in `~/.codex/` for global preferences) and contains free-form markdown directives that tell Codex how to work with your project. Codex searches for it in three locations — global, project root, and current working directory — and merges them in that order.

### What is CLAUDE.md and how is it different from AGENTS.md?

CLAUDE.md is the instruction file for Anthropic's Claude Code. It serves the same fundamental purpose as AGENTS.md — giving persistent instructions to the AI agent — but has more features. CLAUDE.md supports file imports via `@path` syntax, path-scoped rules via `.claude/rules/`, organization-wide managed policies, directory tree walking, and integration with Claude's auto memory system. It also loads CLAUDE.md files from subdirectories on demand, while AGENTS.md only checks three fixed locations.

### Can I use AGENTS.md with Claude Code?

Not directly. Claude Code reads CLAUDE.md, not AGENTS.md. However, you can create a CLAUDE.md that imports your existing AGENTS.md using the `@AGENTS.md` import syntax. This lets both tools read the same base instructions without duplicating content.

### What are Cursor Rules and how do they compare?

Cursor Rules are the instruction system built into the Cursor IDE. They come in two forms: a legacy `.cursorrules` file at the project root, and a modern `.cursor/rules/` directory with `.mdc` files that support glob-based scoping. User-level rules are configured in Cursor's Settings UI. Unlike AGENTS.md and CLAUDE.md, Cursor Rules are tied to an IDE rather than a standalone CLI tool.

### Which instruction system is the best?

There is no single best system — it depends on which tool you use. Claude Code's CLAUDE.md is the most feature-rich, with imports, path-scoped rules, directory walking, and auto memory. Codex's AGENTS.md is the simplest and most straightforward. Cursor Rules offer a middle ground with glob-scoped `.mdc` files and IDE integration. If you use multiple tools, maintain a shared source of truth and reference it from each tool's instruction file.

### Do instruction files guarantee the agent will follow my rules?

No. All three systems inject instructions as context, not as hard constraints. The agent reads them and tries to follow them, but there is no enforcement mechanism. Specific, concise, non-contradictory instructions are followed most reliably. Vague or conflicting instructions may be ignored or interpreted inconsistently.

### Should I commit these files to version control?

Yes. Project-level instruction files — `AGENTS.md`, `CLAUDE.md`, `.claude/rules/`, `.cursorrules`, and `.cursor/rules/` — should be committed to your repository. They are team resources that ensure every developer gets consistent AI behavior. Personal preferences go in user-level files (`~/.codex/AGENTS.md`, `~/.claude/CLAUDE.md`, Cursor Settings) that stay on your machine.

### How long should my instruction file be?

Keep each file under 200 lines. Claude Code explicitly recommends this limit, and the principle applies to all three systems. Instruction content competes with your code for context window space. If you need more than 200 lines, split instructions across multiple files using `.claude/rules/` (Claude Code), `.cursor/rules/` (Cursor), or separate the content into referenced documents.

### Can I scope instructions to specific file types?

Yes, in Claude Code and Cursor. Claude Code uses YAML frontmatter with a `paths` field in `.claude/rules/` files. Cursor uses glob patterns in `.mdc` frontmatter within `.cursor/rules/`. Codex's AGENTS.md does not support path-scoped rules — all instructions apply globally.

### What happens if AGENTS.md and CLAUDE.md have conflicting instructions?

They do not conflict because they are read by different tools. AGENTS.md is only read by Codex. CLAUDE.md is only read by Claude Code. However, if you import AGENTS.md into CLAUDE.md and the two files contain contradictory instructions, Claude may follow either one unpredictably. Keep imported files consistent with the instructions in your CLAUDE.md.

### Does Cursor support importing files like CLAUDE.md does?

No. Cursor Rules do not support an import syntax. If you want Cursor to reference content from another file, you need to duplicate the relevant instructions in your `.cursorrules` or `.cursor/rules/` files. This is one area where Claude Code's system is meaningfully more flexible.

### What is Claude Code's auto memory and should I use it?

Auto memory is a feature where Claude Code writes notes for itself as it works — build commands it discovers, debugging patterns, your preferences. These notes persist across sessions in `~/.claude/projects/<project>/memory/`. It is enabled by default and requires no setup. You should leave it on unless you have a specific reason to disable it, as it helps Claude Code get better at your project over time.

## Key Takeaways

**AGENTS.md, CLAUDE.md, and Cursor Rules** all solve the same problem: giving your AI coding agent persistent context about your project. They differ in complexity, features, and where they live, but the core principle is the same — write clear instructions in markdown, and the agent reads them before every session.

Here is what to remember:

- **AGENTS.md** (Codex) is the simplest. Three locations, free-form markdown, top-down merge. No imports, no path scoping, no auto memory. Great if you value simplicity and only use Codex.

- **CLAUDE.md** (Claude Code) is the most powerful. Directory tree walking, `@file` imports, `.claude/rules/` with path-scoped frontmatter, organization-wide managed policies, and auto memory. The right choice if you need fine-grained control or work in a large monorepo.

- **Cursor Rules** sit in between. The `.cursor/rules/` directory with `.mdc` files gives you glob-scoped rules and multi-file organization. The Settings UI adds user-level configuration. No imports, but solid IDE integration.

If you use **multiple tools**, establish one source of truth — typically `AGENTS.md` or a shared documentation file — and reference it from each tool's config. Use CLAUDE.md's `@import` to pull in AGENTS.md. Mirror the essentials into `.cursorrules`.

If you are not using **any** instruction file yet, start today. Create a single file — whichever matches your primary tool — with your build commands, code style rules, and architectural decisions. Even 20 lines of clear instructions will dramatically improve the consistency of your AI-assisted coding.

The agents are only as good as the context you give them. Make that context count.
