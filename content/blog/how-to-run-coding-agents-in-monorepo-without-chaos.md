---
title: "Run Coding Agents in a Monorepo Without Chaos"
description: "How to configure Claude Code, Cursor, and Codex for monorepo AI coding with nested instructions and scoped rules."
date: "2026-04-02"
tags: ["monorepo AI coding","CLAUDE.md","AGENTS.md","Cursor rules","Claude Code monorepo","nested instructions","AI coding agents","developer tools","monorepo configuration","rule sprawl","agentsignore"]
readTime: "35 min read"
ogImage: "/og/how-to-run-coding-agents-in-monorepo-without-chaos.png"
canonical: "https://chaitanyaprabuddha.com/blog/how-to-run-coding-agents-in-monorepo-without-chaos"
published: true
---

# How to Run Coding Agents in a Monorepo Without Chaos

Monorepos and AI coding agents are both great ideas individually. Put them together without a plan, and you get **monorepo AI coding chaos** — conflicting instructions, agents that rewrite the wrong package's config, test commands that target the whole repo when they should target one workspace, and rule files scattered across fifty directories with no clear hierarchy. The good news is that every major coding agent now has primitives designed specifically for this problem. The bad news is that almost nobody uses them correctly.

This guide covers the real patterns that work: **nested AGENTS.md** files for Codex, **CLAUDE.md** hierarchies for Claude Code, **Cursor project rules** with glob scoping, exclude patterns to keep agents out of places they should not touch, and strategies for controlling the rule sprawl that inevitably emerges as your monorepo grows. If you run a monorepo with more than a few packages and you use any AI coding tool, this is the guide you need.

We will work through real directory structures, real configuration files, and real failure modes. No abstract theory — just the patterns that survive contact with production monorepos.

## Table of Contents

- [Why Monorepos Break AI Coding Agents](#why-monorepos-break-ai-coding-agents)
- [The Core Problem: Context Boundaries](#the-core-problem-context-boundaries)
- [Nested AGENTS.md for Codex in Monorepos](#nested-agentsmd-for-codex-in-monorepos)
  - [How Codex Walks the Directory Tree](#how-codex-walks-the-directory-tree)
  - [Root vs Package-Level AGENTS.md](#root-vs-package-level-agentsmd)
  - [Example: Full Monorepo AGENTS.md Structure](#example-full-monorepo-agentsmd-structure)
  - [Handling Conflicting Instructions Across Packages](#handling-conflicting-instructions-across-packages)
- [CLAUDE.md Hierarchies for Claude Code Monorepos](#claudemd-hierarchies-for-claude-code-monorepos)
  - [How Claude Code Resolves Nested CLAUDE.md Files](#how-claude-code-resolves-nested-claudemd-files)
  - [The .claude/rules Directory in Monorepos](#the-clauderules-directory-in-monorepos)
  - [Path-Scoped Rules for Package-Specific Behavior](#path-scoped-rules-for-package-specific-behavior)
  - [Example: Claude Code Monorepo Configuration](#example-claude-code-monorepo-configuration)
  - [Importing Shared Docs Into CLAUDE.md](#importing-shared-docs-into-claudemd)
- [Cursor Project Rules in Monorepo Workspaces](#cursor-project-rules-in-monorepo-workspaces)
  - [Glob-Based Rule Targeting](#glob-based-rule-targeting)
  - [The .cursor/rules Directory Structure](#the-cursorrules-directory-structure)
  - [Example: Cursor Rules for a Multi-Framework Monorepo](#example-cursor-rules-for-a-multi-framework-monorepo)
  - [Rule Precedence and Override Patterns](#rule-precedence-and-override-patterns)
- [Exclude Patterns: Keeping Agents Out of Danger Zones](#exclude-patterns-keeping-agents-out-of-danger-zones)
  - [.agentsignore and .gitignore for AI Agents](#agentsignore-and-gitignore-for-ai-agents)
  - [What to Exclude and Why](#what-to-exclude-and-why)
  - [Exclude Patterns by Tool](#exclude-patterns-by-tool)
- [Rule Sprawl: The Silent Monorepo Killer](#rule-sprawl-the-silent-monorepo-killer)
  - [How Rule Sprawl Happens](#how-rule-sprawl-happens)
  - [Measuring Rule Sprawl](#measuring-rule-sprawl)
  - [The Shared Foundation Pattern](#the-shared-foundation-pattern)
  - [Pruning Rules That No Longer Apply](#pruning-rules-that-no-longer-apply)
- [Repo-Scoped Skills and Subagents](#repo-scoped-skills-and-subagents)
  - [Claude Code Skills Scoped to Packages](#claude-code-skills-scoped-to-packages)
  - [Codex Skills in a Monorepo](#codex-skills-in-a-monorepo)
  - [When to Use Subagents vs Scoped Rules](#when-to-use-subagents-vs-scoped-rules)
- [Practical Directory Structures That Scale](#practical-directory-structures-that-scale)
  - [Small Monorepo (3-5 Packages)](#small-monorepo-3-5-packages)
  - [Medium Monorepo (10-30 Packages)](#medium-monorepo-10-30-packages)
  - [Large Monorepo (50+ Packages)](#large-monorepo-50-packages)
- [Cross-Agent Consistency in Monorepos](#cross-agent-consistency-in-monorepos)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

## Why Monorepos Break AI Coding Agents

AI coding agents were designed for single-project repositories. Every major agent — Claude Code, Codex, Cursor — starts a session by reading a root instruction file, building a mental model of the project, and operating within that model. When that project is a monorepo containing a React frontend, a Go API, a Python ML pipeline, and a shared protobuf schema package, the agent's mental model collapses under the weight of contradictions.

The **test command** is the simplest example. At the root, you might run `pnpm test` to execute everything. In the frontend package, it is `vitest run`. In the Go service, it is `go test ./...`. In the Python package, it is `pytest -v`. An agent that reads only the root instructions will run the wrong test command in the wrong package. An agent that reads only the local instructions will miss integration test requirements.

This is not a theoretical problem. It is the single most common failure mode in **monorepo AI coding** setups, and it cascades into every interaction. Wrong linters, wrong formatters, wrong import conventions, wrong deployment targets.

The solution is not "write better instructions." The solution is **structural** — you need to use the layering and scoping primitives that each tool provides, and you need to use them consistently across the entire repo.

## The Core Problem: Context Boundaries

Every AI coding agent operates within a **context boundary** — the set of files, instructions, and knowledge it considers when making decisions. In a single-project repo, the boundary is simple: everything in the repo is relevant.

In a monorepo, the context boundary is ambiguous. When you ask an agent to fix a bug in `packages/auth`, should it know about the API conventions in `services/gateway`? Should it follow the TypeScript style from the root config or the package-local override? Should it run only the auth package tests or the full suite?

The answer depends on the task. And **this is precisely what agent instruction hierarchies are designed to solve** — they let you define layered context boundaries that narrow as the agent moves deeper into the repo.

Think of it as inheritance. Root-level instructions define the global rules. Package-level instructions override or extend them. File-pattern-based rules apply only when certain files are in play. This layering is what separates a working monorepo AI setup from chaos.

## Nested AGENTS.md for Codex in Monorepos

### How Codex Walks the Directory Tree

Codex discovers **nested AGENTS.md** files by walking up from the current working directory to the repo root. Every AGENTS.md file it encounters along the way is merged, with more specific files taking precedence. This means a monorepo can have an AGENTS.md at the root and additional AGENTS.md files in every package or subdirectory that needs custom instructions.

The merge strategy is append-and-override. Codex reads the root file first, then layers on the next-most-specific file, and so on. If the root says "use pnpm for all commands" and a nested file says "use go test for tests," the nested instruction wins for test commands while the root instruction still applies for everything else.

This is exactly the behavior you need for monorepo AI coding. Global conventions travel down. Local overrides stay local.

### Root vs Package-Level AGENTS.md

The **root AGENTS.md** should contain instructions that apply universally across the entire monorepo. This includes the package manager, the CI system, the branching strategy, the commit message format, and any shared code conventions.

```markdown
<!-- /AGENTS.md (repo root) -->
# Project Instructions

## Package Manager
This is a pnpm workspace monorepo. Always use `pnpm` for installing dependencies.
Never use `npm` or `yarn`.

## Commit Conventions
Use conventional commits: feat:, fix:, chore:, docs:, refactor:, test:
Always scope to the package name: `feat(auth): add token refresh`

## CI
CI runs on GitHub Actions. The config is in `.github/workflows/`.
Do not modify CI files without explicit instructions.

## Monorepo Structure
- `packages/` — shared libraries
- `services/` — deployable backend services
- `apps/` — frontend applications
- `tools/` — internal developer tooling
```

**Package-level AGENTS.md files** should contain only what is specific to that package. Do not repeat root instructions — Codex already has them from the merge.

```markdown
<!-- /services/api-gateway/AGENTS.md -->
# API Gateway Service

## Language and Runtime
This service is written in Go 1.22. Use standard library where possible.

## Testing
Run tests with: `go test ./...`
Run tests with race detection: `go test -race ./...`
Integration tests require: `docker compose up -d postgres redis`

## Code Style
Follow the project's .golangci.yml configuration.
Do not add new linter exceptions without explaining why.

## Dependencies
Use `go mod tidy` after adding or removing dependencies.
Vendor dependencies are checked in — run `go mod vendor` after changes.
```

### Example: Full Monorepo AGENTS.md Structure

Here is what a real monorepo's nested AGENTS.md structure looks like:

```
monorepo/
├── AGENTS.md                          # Global: pnpm, conventional commits, CI
├── packages/
│   ├── ui-components/
│   │   └── AGENTS.md                  # React, Storybook, Vitest
│   ├── shared-types/
│   │   └── AGENTS.md                  # TypeScript strict mode, no runtime deps
│   └── auth-sdk/
│       └── AGENTS.md                  # OAuth patterns, token handling rules
├── services/
│   ├── api-gateway/
│   │   └── AGENTS.md                  # Go, integration tests, Docker
│   ├── ml-pipeline/
│   │   └── AGENTS.md                  # Python 3.12, pytest, conda
│   └── notification-service/
│       └── AGENTS.md                  # Node.js, SQS patterns, retry logic
├── apps/
│   ├── web-dashboard/
│   │   └── AGENTS.md                  # Next.js, App Router, Tailwind
│   └── mobile-app/
│       └── AGENTS.md                  # React Native, Expo, platform-specific
└── tools/
    └── codegen/
        └── AGENTS.md                  # Protobuf, code generation scripts
```

Each AGENTS.md file is short — typically 30 to 80 lines. The root is the longest because it carries the global conventions. Package-level files only carry what differs from the root.

### Handling Conflicting Instructions Across Packages

Conflicts happen when two packages at the same level contradict each other. The Go service uses tabs. The TypeScript packages use spaces. The Python pipeline uses Black's formatting. These are not conflicts — they are scoped naturally by the directory tree.

**Real conflicts** emerge when the root instruction is too specific. If your root AGENTS.md says "use 2-space indentation for all files," your Go service will fight it. The fix is simple: **keep root instructions generic enough that they never conflict with package-level needs**.

A good rule of thumb: if an instruction mentions a specific language, framework, or tool that is not universal across the monorepo, it does not belong in the root AGENTS.md. Move it to the relevant package.

```markdown
<!-- BAD: Root AGENTS.md being too specific -->
# Code Style
Use 2-space indentation.
Use single quotes for strings.
Always use arrow functions.

<!-- GOOD: Root AGENTS.md staying generic -->
# Code Style
Follow the linter and formatter configuration in each package.
Do not disable linter rules without justification.
Run the package-local format command before committing.
```

## CLAUDE.md Hierarchies for Claude Code Monorepos

### How Claude Code Resolves Nested CLAUDE.md Files

Claude Code uses a resolution strategy similar to Codex but with additional flexibility. It reads CLAUDE.md files from three scopes: **user-level** (`~/.claude/CLAUDE.md`), **project-level** (repo root), and **directory-level** (any subdirectory). All discovered files are merged, with local files extending rather than replacing parent files.

The critical difference for **Claude Code monorepo** setups is the `.claude/rules/` directory. This gives you a secondary, more structured layer of configuration that supports file-path-based scoping — something a flat CLAUDE.md file cannot do.

When Claude Code enters a session, it reads the root CLAUDE.md, then any CLAUDE.md files in the directory you are working in, then any applicable rules from `.claude/rules/`. This three-layer system is purpose-built for monorepos.

### The .claude/rules Directory in Monorepos

The `.claude/rules/` directory is where Claude Code's monorepo story gets powerful. Each file in this directory can include frontmatter that restricts it to specific file glob patterns. This means you can have a single rules directory at the repo root that covers every package in your monorepo without needing nested CLAUDE.md files everywhere.

```yaml
# .claude/rules/go-services.md
---
globs: ["services/**/*.go", "services/**/go.mod", "services/**/go.sum"]
---

When working on Go services:
- Use standard library over third-party packages where possible
- Always handle errors explicitly — never use _ for error returns
- Run `go vet ./...` before considering a change complete
- Test files go next to the code they test, named `*_test.go`
```

```yaml
# .claude/rules/react-packages.md
---
globs: ["packages/ui-*/**/*.tsx", "packages/ui-*/**/*.ts", "apps/**/*.tsx"]
---

When working on React code:
- Use functional components exclusively
- Prefer named exports over default exports
- Colocate styles with components using CSS modules
- Every component must have a corresponding .test.tsx file
```

```yaml
# .claude/rules/python-ml.md
---
globs: ["services/ml-*/**/*.py", "notebooks/**/*.ipynb"]
---

When working on Python ML code:
- Use type hints for all function signatures
- Use numpy docstring format
- Pin all dependency versions in requirements.txt
- Never commit model weights or large data files
```

This approach gives you **centralized rule management** with **decentralized scope**. You edit rules in one place, and they automatically apply only to the files they target.

### Path-Scoped Rules for Package-Specific Behavior

Path-scoped rules solve the hardest problem in monorepo AI coding: making the agent behave differently depending on which package it is editing, **without** requiring the developer to manually switch contexts.

The glob patterns support full minimatch syntax:

```yaml
# Targets only the API gateway service
globs: ["services/api-gateway/**"]

# Targets all TypeScript packages but not apps
globs: ["packages/**/*.ts", "packages/**/*.tsx"]

# Targets test files across the entire repo
globs: ["**/*.test.*", "**/*.spec.*", "**/__tests__/**"]

# Targets infrastructure-as-code files
globs: ["infra/**/*.tf", "infra/**/*.tfvars", "deploy/**/*.yaml"]
```

When the agent opens or edits a file, Claude Code checks all rules in `.claude/rules/` and loads only those whose globs match the active files. This means the agent's context stays lean — it only receives instructions relevant to what it is actually working on.

### Example: Claude Code Monorepo Configuration

Here is a complete Claude Code setup for a medium-sized monorepo:

```
monorepo/
├── CLAUDE.md                           # Root instructions
├── .claude/
│   └── rules/
│       ├── go-services.md              # globs: services/**/*.go
│       ├── typescript-packages.md      # globs: packages/**/*.ts
│       ├── react-apps.md              # globs: apps/**/*.tsx
│       ├── python-ml.md              # globs: services/ml-*/**/*.py
│       ├── protobuf.md               # globs: proto/**/*.proto
│       ├── ci-config.md              # globs: .github/**/*.yml
│       ├── infrastructure.md          # globs: infra/**/*.tf
│       └── testing.md                # globs: **/*.test.*, **/*.spec.*
├── packages/
│   ├── ui-components/
│   │   └── CLAUDE.md                  # Package-specific overrides
│   └── shared-types/
│       └── CLAUDE.md                  # Strict type rules
├── services/
│   ├── api-gateway/
│   │   └── CLAUDE.md                  # Go-specific deep context
│   └── ml-pipeline/
│       └── CLAUDE.md                  # ML-specific patterns
└── apps/
    └── web-dashboard/
        └── CLAUDE.md                  # Next.js App Router specifics
```

The **root CLAUDE.md** carries the global context:

```markdown
<!-- /CLAUDE.md -->
# Monorepo Instructions

This is a pnpm workspace monorepo. The workspace config is in pnpm-workspace.yaml.

## General Rules
- Use pnpm for all package management
- Commit messages follow conventional commits scoped to package: `fix(ui-components): ...`
- All PRs require passing CI before merge
- Do not modify files outside the package you are working on unless the change is explicitly cross-cutting

## Build System
- Root build: `pnpm build`
- Package build: `pnpm --filter <package> build`
- Full test: `pnpm test`
- Package test: `pnpm --filter <package> test`

## Architecture
Refer to /docs/architecture.md for the full system design.
Packages in /packages are shared libraries. Services in /services are deployable units.
Apps in /apps are user-facing frontends. Do not create circular dependencies between packages.
```

Then **package-level CLAUDE.md files** add deep context that does not make sense as a glob-scoped rule because it is too detailed:

```markdown
<!-- /services/api-gateway/CLAUDE.md -->
# API Gateway

This is a Go service that proxies requests to internal microservices.

## Key Architecture Decisions
- Uses chi router (not gin, not standard mux)
- Middleware chain: logging -> auth -> rate-limit -> handler
- All handlers return JSON using the response.Write() helper
- Database access goes through the /internal/store package only

## Testing Strategy
- Unit tests: `go test ./...`
- Integration tests: `go test -tags=integration ./...` (requires local Docker)
- Do not mock the database — use the test container setup in /internal/testutil

## Common Pitfalls
- The auth middleware expects a specific header format — see /internal/middleware/auth.go
- Rate limiting uses a sliding window — do not replace with fixed window
- gRPC clients are in /internal/clients — do not create new ones without checking existing
```

### Importing Shared Docs Into CLAUDE.md

Claude Code supports importing external files into CLAUDE.md using the `@import` syntax. This is valuable in monorepos where you have shared documentation that multiple packages reference.

```markdown
<!-- /CLAUDE.md -->
# Project Instructions

@docs/api-conventions.md
@docs/database-patterns.md
@docs/testing-strategy.md
```

This keeps the root CLAUDE.md concise while still giving the agent access to detailed documentation. The imported files are read inline at session start. For monorepos, this is often better than duplicating the same guidance across ten package-level CLAUDE.md files.

## Cursor Project Rules in Monorepo Workspaces

### Glob-Based Rule Targeting

Cursor's rule system is built around the `.cursor/rules/` directory, where each `.mdc` file can declare glob patterns that determine when the rule activates. This glob-based targeting is **Cursor project rules** working as they were intended to work — scoping agent behavior to specific parts of the codebase.

Each `.mdc` file uses YAML-like frontmatter to declare its scope:

```markdown
---
description: "Rules for Go microservices"
globs: ["services/**/*.go"]
alwaysApply: false
---

- Use the chi router for HTTP handling
- Return errors using the pkg/errors pattern
- Always close response bodies in HTTP clients
- Use context.Context as the first parameter in all public functions
```

The `alwaysApply: false` setting means this rule only loads when the agent is working on files matching the glob pattern. If `alwaysApply` is `true`, the rule loads for every interaction regardless of which files are open.

### The .cursor/rules Directory Structure

For a monorepo, the `.cursor/rules/` directory should mirror the logical structure of your codebase, not the physical directory structure. Name files after the concern they address, not the directory they target.

```
monorepo/
└── .cursor/
    └── rules/
        ├── 00-global.mdc               # alwaysApply: true — universal rules
        ├── 01-typescript.mdc            # globs: **/*.ts, **/*.tsx
        ├── 02-go.mdc                    # globs: services/**/*.go
        ├── 03-python.mdc               # globs: **/*.py
        ├── 04-react-components.mdc      # globs: packages/ui-*/**/*.tsx
        ├── 05-next-app.mdc             # globs: apps/web-dashboard/**
        ├── 06-testing.mdc              # globs: **/*.test.*, **/*.spec.*
        ├── 07-database-migrations.mdc   # globs: **/migrations/**/*.sql
        ├── 08-protobuf.mdc             # globs: proto/**/*.proto
        ├── 09-ci-workflows.mdc          # globs: .github/**/*.yml
        └── 10-infrastructure.mdc        # globs: infra/**/*.tf
```

The numeric prefixes are optional but helpful for maintaining a mental model of rule precedence. Cursor does not guarantee loading order by filename, but the prefixes help humans scanning the directory.

### Example: Cursor Rules for a Multi-Framework Monorepo

Here is the `00-global.mdc` rule that applies everywhere:

```markdown
---
description: "Global monorepo rules that apply to all files"
globs: ["**/*"]
alwaysApply: true
---

# Global Rules

- This is a pnpm workspace monorepo
- Use `pnpm --filter <package>` to run commands in specific packages
- Follow conventional commit format: type(scope): description
- Do not create cross-package imports that bypass the package boundary
- All packages publish from `dist/` or `build/` — never import from those directories
- Keep changes scoped to the package you are working on
```

And here is a framework-specific rule for the Next.js app:

```markdown
---
description: "Next.js App Router conventions for the web dashboard"
globs: ["apps/web-dashboard/**/*.ts", "apps/web-dashboard/**/*.tsx"]
alwaysApply: false
---

# Next.js Web Dashboard

- Use App Router (not Pages Router)
- Server Components by default — add 'use client' only when needed
- Data fetching happens in Server Components or Route Handlers
- Use the /app/api/ directory for API routes
- Styles use Tailwind CSS — do not add CSS modules
- Image optimization uses next/image — do not use raw <img> tags
- Environment variables that reach the client must be prefixed with NEXT_PUBLIC_
```

### Rule Precedence and Override Patterns

When multiple Cursor rules match the same file, all matching rules load simultaneously. There is no explicit override mechanism — the rules are additive. This means **contradictions between rules will confuse the agent**.

The practical solution is to avoid contradictions by layering rules correctly:

1. **Global rules** cover only universal conventions (commit messages, package manager, repo structure)
2. **Language rules** cover language-specific patterns (TypeScript, Go, Python)
3. **Framework rules** cover framework-specific behavior (Next.js, FastAPI, chi)
4. **Package rules** cover package-specific details (specific architectural decisions)

If a framework rule needs to override something from a language rule, phrase it as a clarification rather than a contradiction:

```markdown
# In 01-typescript.mdc:
- Use named exports for all modules

# In 05-next-app.mdc:
- Use named exports for all modules, EXCEPT page.tsx, layout.tsx, and
  loading.tsx which must use default exports per Next.js conventions
```

## Exclude Patterns: Keeping Agents Out of Danger Zones

### .agentsignore and .gitignore for AI Agents

Every monorepo has directories that AI agents should never read or modify. Build outputs, vendor directories, generated code, large data files, and sensitive configuration all fall into this category. The **`.agentsignore`** file tells agents to skip these paths entirely — they will not be indexed, searched, or edited.

The syntax matches `.gitignore` exactly:

```gitignore
# .agentsignore

# Build outputs
**/dist/
**/build/
**/.next/
**/node_modules/

# Generated code — agents should not edit these
**/generated/
**/proto/gen/
**/__generated__/

# Vendored dependencies
**/vendor/

# Large data files
data/
*.parquet
*.h5
*.pkl

# Sensitive configuration
.env*
secrets/
**/credentials.json

# Lock files — agents should never modify these directly
pnpm-lock.yaml
yarn.lock
package-lock.json
go.sum

# IDE and tool config that should not be agent-modified
.idea/
.vscode/settings.json
```

Claude Code respects `.agentsignore` natively. For Codex and Cursor, the `.gitignore` file already covers most of these paths, but an explicit `.agentsignore` gives you finer control — you might want agents to ignore `docs/internal/` even though it is tracked in git.

### What to Exclude and Why

Not everything that is gitignored needs to be agent-ignored, and not everything that should be agent-ignored is gitignored. The categories to think about are:

**Generated code** should almost always be excluded. If the agent edits generated files, the next code generation run will overwrite the changes. Worse, the agent might "fix" a generated file instead of fixing the source that generates it.

**Lock files** are particularly dangerous. An agent that modifies `pnpm-lock.yaml` directly can introduce subtle dependency resolution bugs that are extremely hard to diagnose. Always exclude lock files and instruct agents to run the package manager command instead.

**Build artifacts** should be excluded because they add noise to the agent's file search and context. In a large monorepo, `node_modules` alone can contain hundreds of thousands of files.

**Sensitive configuration** should be excluded for security reasons. An agent that reads `.env` files might inadvertently include secrets in its output or commit messages.

### Exclude Patterns by Tool

Each tool has slightly different mechanisms for excluding files:

| Tool | Exclude Mechanism | File |
|------|------------------|------|
| **Claude Code** | `.agentsignore`, `.gitignore`, CLAUDE.md instructions | `.agentsignore` |
| **Codex** | `.gitignore`, AGENTS.md instructions | `.gitignore` + AGENTS.md |
| **Cursor** | `.cursorignore`, `.gitignore`, rule descriptions | `.cursorignore` |

For maximum coverage in a multi-agent monorepo, maintain both `.agentsignore` and `.cursorignore` with the same content. You can symlink one to the other or use a build script to keep them in sync.

```bash
# In your repo setup script or Makefile
ln -sf .agentsignore .cursorignore
```

Or define the canonical list once and generate both:

```makefile
# Makefile
sync-agent-ignores:
	cp .agentsignore .cursorignore
```

## Rule Sprawl: The Silent Monorepo Killer

### How Rule Sprawl Happens

**Rule sprawl** is what happens when every developer on the team adds instructions to fix their specific problem, and nobody ever removes old ones. It starts innocently. Someone adds a rule saying "always use the logger from `@acme/logger`." A month later, someone else adds a rule saying "import the logging utility from `packages/shared-utils`." Now you have two rules about logging that point to different packages, because `@acme/logger` was renamed.

In a monorepo, rule sprawl is especially destructive because the instruction surface area is enormous. A monorepo with 30 packages can easily accumulate 50+ instruction files across CLAUDE.md files, `.claude/rules/`, `.cursor/rules/`, and AGENTS.md files. When nobody owns the full picture, contradictions creep in and agent behavior becomes unpredictable.

Common symptoms of rule sprawl:

- The agent follows different conventions depending on which file it reads first
- Instructions reference packages, functions, or patterns that no longer exist
- Multiple rules cover the same topic with slightly different guidance
- Developers add "ignore the previous rule about X" rules instead of removing the original
- Agent responses include caveats like "based on your instructions, I am not sure whether to..."

### Measuring Rule Sprawl

Before you can fix rule sprawl, you need to see it. Run a quick audit of your instruction files:

```bash
# Count total instruction files in the repo
find . -name "CLAUDE.md" -o -name "AGENTS.md" -o -name "*.mdc" | wc -l

# Count total lines of instruction content
find . -name "CLAUDE.md" -o -name "AGENTS.md" -o -name "*.mdc" \
  -exec cat {} + | wc -l

# Find the largest instruction files
find . -name "CLAUDE.md" -o -name "AGENTS.md" -o -name "*.mdc" \
  -exec wc -l {} + | sort -rn | head -20

# Find rules that reference non-existent files or packages
# (manual review needed, but this finds candidates)
grep -rn "import.*from" .claude/rules/ .cursor/rules/ \
  --include="*.md" --include="*.mdc"
```

A healthy monorepo has roughly **one instruction file per meaningful boundary** — one root file, one per major package or service, and a handful of glob-scoped rules for cross-cutting concerns. If you have more instruction files than packages, something has gone wrong.

### The Shared Foundation Pattern

The most maintainable approach to monorepo AI coding instructions is the **shared foundation pattern**. This means a single source of truth for common conventions, with thin overlays per package.

```
monorepo/
├── docs/
│   ├── conventions/
│   │   ├── code-style.md              # One doc for style rules
│   │   ├── testing-strategy.md        # One doc for test patterns
│   │   ├── api-design.md             # One doc for API conventions
│   │   └── git-workflow.md           # One doc for git practices
│   └── packages/
│       ├── api-gateway.md             # Architecture doc per service
│       ├── web-dashboard.md           # Architecture doc per app
│       └── ui-components.md           # Architecture doc per library
├── CLAUDE.md                          # Imports from docs/conventions/
├── AGENTS.md                          # References docs/conventions/
└── .cursor/rules/
    └── 00-global.mdc                  # References docs/conventions/
```

The key insight: **the canonical knowledge lives in `/docs/`, not in instruction files**. The instruction files simply point to the docs. When a convention changes, you update one document, and all three agents (Claude Code, Codex, Cursor) get the updated information.

```markdown
<!-- /CLAUDE.md -->
# Project Instructions

@docs/conventions/code-style.md
@docs/conventions/testing-strategy.md
@docs/conventions/api-design.md
@docs/conventions/git-workflow.md

## Monorepo Layout
See /docs/architecture.md for the full system design.
```

```markdown
<!-- /AGENTS.md -->
# Project Instructions

Follow the conventions documented in:
- /docs/conventions/code-style.md
- /docs/conventions/testing-strategy.md
- /docs/conventions/api-design.md
- /docs/conventions/git-workflow.md
```

### Pruning Rules That No Longer Apply

Schedule a quarterly review of all instruction files. The review checklist is simple:

1. **Does this rule reference something that still exists?** Check package names, function names, file paths, and tool versions.
2. **Is this rule duplicated elsewhere?** Search for overlapping guidance across all instruction files.
3. **Is this rule still necessary?** Some rules were added to work around agent bugs that have since been fixed.
4. **Is this rule scoped correctly?** A rule about React components should not live in the root CLAUDE.md.

Treat instruction file maintenance like you treat dependency updates — it is technical debt that compounds silently.

## Repo-Scoped Skills and Subagents

### Claude Code Skills Scoped to Packages

Claude Code skills are reusable slash commands that you define in your project. In a monorepo, you can scope skills to specific packages using the skill's configuration. This lets you create package-specific workflows without cluttering the global skill namespace.

Skills are defined in markdown files within the `.claude/skills/` directory or equivalent location. Each skill can declare which packages it applies to:

```markdown
<!-- .claude/skills/test-go-service.md -->
---
name: "test-go-service"
description: "Run tests for a Go service with integration test support"
---

# Test Go Service

1. Identify which Go service is being targeted based on context
2. Run `go vet ./...` in the service directory
3. Run `go test ./...` for unit tests
4. If the user requests integration tests, verify Docker is running
5. Run `go test -tags=integration ./...` for integration tests
6. Report results with any failing test details
```

```markdown
<!-- .claude/skills/test-ts-package.md -->
---
name: "test-ts-package"
description: "Run tests for a TypeScript package"
---

# Test TypeScript Package

1. Identify the package from the current working directory
2. Run `pnpm --filter <package> typecheck` first
3. Run `pnpm --filter <package> test` for unit tests
4. If coverage is requested, run `pnpm --filter <package> test -- --coverage`
5. Report results with any failing test details
```

The power of this approach is that the developer says `/test-go-service` or `/test-ts-package` and the right workflow runs for the right language — no ambiguity.

### Codex Skills in a Monorepo

Codex skills (typically defined in AGENTS.md or referenced markdown files) follow the same nesting rules as AGENTS.md itself. A skill defined in `services/api-gateway/AGENTS.md` is available when Codex is working in that directory context.

```markdown
<!-- /services/api-gateway/AGENTS.md -->
# Skills

## Adding a New Endpoint
When asked to add a new API endpoint:
1. Create the handler in /internal/handlers/
2. Add the route in /internal/routes/routes.go
3. Create request/response types in /internal/types/
4. Add input validation using the validator package
5. Write a table-driven test in the handler's _test.go file
6. Update the OpenAPI spec in /api/openapi.yaml
```

This skill is implicitly scoped to the api-gateway service because it lives in that directory's AGENTS.md. When Codex works on a different service, it picks up that service's skills instead.

### When to Use Subagents vs Scoped Rules

**Subagents** (Claude Code's `Task` tool) and **scoped rules** solve different problems in monorepos:

Use **scoped rules** when:
- The guidance is about conventions and style (how to write code)
- The instructions are static and do not require multi-step reasoning
- You want the behavior to be automatic based on file context
- The scope maps cleanly to a glob pattern

Use **subagents** when:
- The task requires working across multiple packages simultaneously
- The work is a multi-step workflow (test, lint, format, commit)
- You need isolation — the subagent should not be influenced by the main session's context
- The task is computationally expensive and benefits from parallel execution

Example: a subagent that validates cross-package dependencies:

```markdown
When the user asks to check dependency health:
1. Spawn a subagent to analyze the dependency graph in packages/
2. Check for circular dependencies between workspace packages
3. Verify that all inter-package version constraints are satisfied
4. Report any packages that import from another package's internals
   (anything not exported from the package's index.ts)
```

## Practical Directory Structures That Scale

### Small Monorepo (3-5 Packages)

For small monorepos, keep it simple. One root instruction file per agent, optional package-level files only where behavior meaningfully differs.

```
my-project/
├── CLAUDE.md                    # Everything fits in one file
├── AGENTS.md                    # Mirror of CLAUDE.md for Codex
├── .cursor/
│   └── rules/
│       └── 00-global.mdc       # Single rule file is enough
├── .agentsignore
├── packages/
│   ├── shared-utils/            # No instruction file needed — root is enough
│   ├── api/
│   │   └── CLAUDE.md            # Only if API conventions differ significantly
│   └── web/
│       └── CLAUDE.md            # Only if frontend needs specific context
└── pnpm-workspace.yaml
```

At this scale, the overhead of maintaining nested instruction files is not worth it unless the packages use fundamentally different languages or frameworks. A React frontend and an Express backend in TypeScript can probably share a single set of rules.

### Medium Monorepo (10-30 Packages)

Medium monorepos benefit from the full hierarchy: root instructions, glob-scoped rules, and selective package-level files.

```
platform/
├── CLAUDE.md                           # Global conventions + imports
├── AGENTS.md                           # Global conventions for Codex
├── .claude/
│   └── rules/
│       ├── typescript.md               # globs: **/*.ts, **/*.tsx
│       ├── go-services.md              # globs: services/**/*.go
│       ├── react-components.md         # globs: packages/ui-*/**
│       ├── database.md                 # globs: **/migrations/**, **/models/**
│       └── testing.md                  # globs: **/*.test.*, **/*.spec.*
├── .cursor/
│   └── rules/
│       ├── 00-global.mdc
│       ├── 01-typescript.mdc
│       ├── 02-go.mdc
│       ├── 03-react.mdc
│       ├── 04-database.mdc
│       └── 05-testing.mdc
├── .agentsignore
├── .cursorignore
├── docs/
│   └── conventions/                    # Shared source of truth
│       ├── code-style.md
│       ├── api-design.md
│       └── testing-strategy.md
├── packages/                           # ~15 shared packages
│   ├── ui-components/
│   │   └── CLAUDE.md
│   ├── auth-sdk/
│   │   └── CLAUDE.md
│   └── ...
├── services/                           # ~8 backend services
│   ├── api-gateway/
│   │   ├── CLAUDE.md
│   │   └── AGENTS.md
│   └── ...
└── apps/                               # ~3 frontend apps
    ├── web-dashboard/
    │   └── CLAUDE.md
    └── ...
```

At this scale, the `.claude/rules/` and `.cursor/rules/` directories do most of the heavy lifting. Package-level CLAUDE.md files are reserved for packages with deep architectural context that a glob rule cannot capture.

### Large Monorepo (50+ Packages)

Large monorepos require a governance strategy. Without one, rule sprawl will make your instruction system unmaintainable within months.

```
enterprise-platform/
├── CLAUDE.md                           # Minimal — imports from docs/
├── AGENTS.md                           # Minimal — references docs/
├── .claude/
│   └── rules/
│       ├── _README.md                  # Documents rule governance process
│       ├── languages/
│       │   ├── typescript.md
│       │   ├── go.md
│       │   ├── python.md
│       │   └── rust.md
│       ├── frameworks/
│       │   ├── nextjs.md
│       │   ├── fastapi.md
│       │   └── chi.md
│       ├── concerns/
│       │   ├── testing.md
│       │   ├── database.md
│       │   ├── authentication.md
│       │   ├── observability.md
│       │   └── error-handling.md
│       └── packages/                   # Only for packages needing deep context
│           ├── payment-service.md
│           ├── identity-service.md
│           └── data-pipeline.md
├── .cursor/
│   └── rules/                          # Mirrors .claude/rules/ structure
│       └── ...
├── .agentsignore
├── .cursorignore
├── docs/
│   ├── conventions/                    # Single source of truth
│   ├── architecture/                   # Per-domain architecture docs
│   └── runbooks/                       # Operational runbooks agents can reference
├── packages/                           # 30+ shared packages
├── services/                           # 15+ services
├── apps/                               # 5+ apps
└── tools/                              # Internal tooling
```

Key governance rules for large monorepos:

1. **Instruction files require code review** — add a CODEOWNERS entry for all CLAUDE.md, AGENTS.md, and `.mdc` files.
2. **Package-level instruction files are the exception, not the rule** — most packages should rely on glob-scoped rules from the root.
3. **No instruction file should exceed 100 lines** — if it does, split it or move content to `/docs/`.
4. **Contradictions are bugs** — treat conflicting instructions like you treat conflicting test assertions.

```
# CODEOWNERS
CLAUDE.md                    @platform-team
AGENTS.md                    @platform-team
.claude/rules/**             @platform-team
.cursor/rules/**             @platform-team
**/CLAUDE.md                 @platform-team
**/AGENTS.md                 @platform-team
```

## Cross-Agent Consistency in Monorepos

If your team uses multiple AI coding tools — some developers prefer Cursor, others use Claude Code, the CI system runs Codex — you need the agents to behave consistently. Different tools reading different instructions and producing different results defeats the purpose of having instructions at all.

The **canonical docs pattern** is the most reliable approach. Instead of maintaining three parallel instruction systems, maintain one set of documentation and have each tool's instruction files reference it.

```markdown
<!-- /CLAUDE.md -->
# Instructions
@docs/conventions/code-style.md
@docs/conventions/testing.md
```

```markdown
<!-- /AGENTS.md -->
# Instructions
Follow the conventions in:
- docs/conventions/code-style.md
- docs/conventions/testing.md
```

```markdown
<!-- /.cursor/rules/00-global.mdc -->
---
alwaysApply: true
---
Follow the conventions documented in:
- docs/conventions/code-style.md
- docs/conventions/testing.md
```

The limitation is that not all tools handle file references the same way. Claude Code's `@import` actually inlines the content. Codex reads referenced files if explicitly instructed. Cursor requires the content to be in the rule itself or relies on the agent's ability to read files.

For maximum reliability, keep your `.cursor/rules/` files self-contained (inline the key points) while using `@import` in CLAUDE.md. Accept that some duplication is the cost of cross-agent consistency, and use your quarterly review process to keep them in sync.

A practical sync script can help:

```bash
#!/bin/bash
# scripts/sync-agent-rules.sh

echo "Checking instruction file consistency..."

# Extract key directives from the canonical docs
CANONICAL_DIRS=$(find docs/conventions -name "*.md" -exec basename {} \; | sort)

# Check CLAUDE.md references
for doc in $CANONICAL_DIRS; do
  if ! grep -q "$doc" CLAUDE.md; then
    echo "WARNING: CLAUDE.md missing reference to $doc"
  fi
done

# Check AGENTS.md references
for doc in $CANONICAL_DIRS; do
  if ! grep -q "$doc" AGENTS.md; then
    echo "WARNING: AGENTS.md missing reference to $doc"
  fi
done

echo "Sync check complete."
```

## Frequently Asked Questions

### How many CLAUDE.md files should a monorepo have?

The right number is **one root file plus one per package that has meaningfully different conventions**. If a package follows the same patterns as everything else in the repo, it does not need its own CLAUDE.md — glob-scoped rules in `.claude/rules/` cover it. A 20-package monorepo might have 5-8 CLAUDE.md files total: one root and one for each package with unique architectural context.

### Can AGENTS.md and CLAUDE.md coexist in the same repo?

Yes, and they should if your team uses both Codex and Claude Code. Each tool reads only its own instruction file format. AGENTS.md is invisible to Claude Code, and CLAUDE.md is invisible to Codex. Having both is not redundant — it is necessary for **cross-agent consistency in monorepos**. Keep them in sync manually or through the canonical docs pattern described above.

### What happens when two glob-scoped rules contradict each other?

Both Claude Code and Cursor load all matching rules simultaneously. If two rules contradict each other, the agent receives both and must reconcile them — which usually means unpredictable behavior. The fix is to prevent contradictions at authorship time. Each rule should be authoritative for its specific concern. A "TypeScript" rule should not include testing guidance if there is a separate "Testing" rule. Think of glob-scoped rules as non-overlapping slices of advice.

### Should I put instruction files in .gitignore?

**No.** Instruction files should be version-controlled and shared with the team. They are part of the project's development infrastructure, like linter configs or CI pipelines. The one exception is personal preference files like `~/.claude/CLAUDE.md`, which live outside the repo and are naturally excluded.

### How do I prevent agents from modifying instruction files?

Add instruction files to your `.agentsignore` and `.cursorignore` if you want agents to never read or modify them. Alternatively, add an explicit instruction in the root file:

```markdown
## Off-Limits Files
Never modify CLAUDE.md, AGENTS.md, or any file in .claude/rules/ or .cursor/rules/
unless explicitly instructed to do so.
```

Most agents respect this directive reliably. For CI-enforced protection, add a pre-commit hook that rejects changes to instruction files unless the commit message includes a specific tag.

### How do I handle monorepo packages in different languages?

This is the single most common monorepo AI coding challenge. The answer is **glob-scoped rules per language**. Your root instruction file should be language-agnostic (package manager, commit conventions, CI). Language-specific guidance lives in scoped rules that target files by extension or directory:

```yaml
# .claude/rules/go.md
---
globs: ["**/*.go", "**/go.mod"]
---
# Go conventions here
```

```yaml
# .claude/rules/python.md
---
globs: ["**/*.py", "**/pyproject.toml", "**/requirements*.txt"]
---
# Python conventions here
```

This way the agent automatically switches context as it moves between packages. No manual intervention required.

### What is the performance impact of many rule files?

Minimal. All three tools (Claude Code, Codex, Cursor) read instruction files at session start and filter by relevance. The actual performance cost is in **context window consumption**, not file I/O. Each loaded rule takes up tokens in the agent's context. With modern context windows (100K-1M tokens), even a large monorepo's instruction files are negligible — typically under 5K tokens total. The real risk is not performance but **contradictions** and **staleness**.

### Should every PR update instruction files?

No. Instruction files should change when conventions change, not when code changes. A good cadence is to review them monthly or quarterly, with ad-hoc updates when the team adopts a new tool, changes a convention, or notices the agent consistently doing something wrong. Treat instruction file changes as their own PR with proper review — they affect every developer's AI experience.

### How do I test whether my instruction files actually work?

Run a standardized set of tasks against each major package and verify the agent follows the expected conventions. For example:

1. Ask the agent to create a new test file in three different packages — does it use the right test framework each time?
2. Ask the agent to fix a linting error — does it use the right linter command?
3. Ask the agent to add a dependency — does it use the right package manager?

Automate this with a script that spawns the agent in non-interactive mode (both Claude Code and Codex support this) and checks the output. This is your instruction file "test suite."

### How do nested AGENTS.md files work with Codex sandbox mode?

Codex runs in a sandboxed environment where file access is restricted. The nested AGENTS.md resolution still works — Codex reads instruction files before entering the sandbox. However, the sandbox may prevent the agent from accessing files referenced in your AGENTS.md (like `docs/conventions/code-style.md`) if those files are outside the sandbox boundary. Keep all referenced files within the repo and ensure the sandbox configuration includes the repo root.

## Key Takeaways

Running AI coding agents in a monorepo without chaos comes down to **structure, not volume**. More instruction files do not mean better results. The right layering, the right scoping, and the right governance do.

Here is what actually works for **monorepo AI coding**:

1. **Use the hierarchy.** Root instructions carry universal conventions. Glob-scoped rules carry language and framework specifics. Package-level files carry deep architectural context. Never put specific guidance at the wrong level.

2. **Scope aggressively.** Every rule should declare exactly which files it applies to. Unscoped rules that load for every interaction waste context and invite contradictions. Use glob patterns in `.claude/rules/` and `.cursor/rules/` to target precisely.

3. **Exclude ruthlessly.** Generated code, build artifacts, lock files, vendor directories, and sensitive config should be in `.agentsignore` and `.cursorignore`. Agents that index unnecessary files are slower and more confused.

4. **Prevent rule sprawl.** Treat instruction files like production code: version-control them, review changes, assign ownership, and prune regularly. A quarterly audit of all instruction files catches contradictions, stale references, and unnecessary duplication before they degrade agent behavior.

5. **Use canonical docs.** If your team uses multiple agents, maintain a single source of truth in `/docs/conventions/` and have each tool's instruction files reference it. Accept some duplication where tools require self-contained rules, but keep the source of truth singular.

6. **Keep root instructions language-agnostic.** The moment your root CLAUDE.md or AGENTS.md mentions a specific language's conventions, you have created a rule that will conflict with some package. Push language-specific guidance to scoped rules.

7. **Fewer files, better scoping.** A monorepo with 50 packages does not need 50 instruction files. It needs a root file, 5-10 glob-scoped rules, and package-level files only for services with genuinely complex architectural context.

The tools are ready. **Claude Code**, **Codex**, and **Cursor** all support the primitives you need — nested instruction files, glob-scoped rules, exclude patterns, and package-scoped skills. The challenge is not capability. It is discipline. Apply these patterns consistently, review them regularly, and your monorepo AI coding setup will scale with your codebase instead of against it.
