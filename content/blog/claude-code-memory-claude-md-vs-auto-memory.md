---
title: "Claude Code Memory: CLAUDE.md vs Auto Memory"
description: "Learn what belongs in CLAUDE.md vs auto memory in Claude Code to build a reliable, persistent coding setup."
date: "2026-04-02"
tags: ["Claude Code","CLAUDE.md","auto memory","Claude Code setup","AI coding","developer tools","Claude Code configuration","memory management"]
readTime: "28 min read"
ogImage: "/og/claude-code-memory-claude-md-vs-auto-memory.png"
canonical: "https://chaitanyaprabuddha.com/blog/claude-code-memory-claude-md-vs-auto-memory"
published: true
---

# Claude Code Memory: What Belongs in CLAUDE.md vs Auto Memory

Every Claude Code session starts with a blank context window. Without memory, you would repeat yourself every single time: explaining your project structure, your build commands, your team's coding standards, the workaround for that one flaky test. **Claude Code memory** solves this by carrying knowledge across sessions through two distinct mechanisms: **CLAUDE.md** files that you write and control, and **auto memory** that Claude writes for itself based on corrections and patterns it discovers while working with you.

Understanding the difference between these two systems, and knowing exactly what belongs in each, is the single most important thing you can do to make your Claude Code setup effective. Get it right and Claude feels like a teammate who remembers everything important. Get it wrong and you end up with bloated context, ignored instructions, and wasted tokens.

This guide breaks down both memory systems in detail, gives you practical decision frameworks, and provides real-world examples you can adapt for your own projects.

## Table of Contents

- [How Claude Code Memory Works](#how-claude-code-memory-works)
- [Understanding CLAUDE.md Files](#understanding-claudemd-files)
  - [Where CLAUDE.md Files Live](#where-claudemd-files-live)
  - [What Belongs in CLAUDE.md](#what-belongs-in-claudemd)
  - [Writing Effective CLAUDE.md Instructions](#writing-effective-claudemd-instructions)
  - [Importing and Organizing Rules](#importing-and-organizing-rules)
- [Understanding Auto Memory](#understanding-auto-memory)
  - [How Auto Memory Works Under the Hood](#how-auto-memory-works-under-the-hood)
  - [Where Auto Memory is Stored](#where-auto-memory-is-stored)
  - [What Auto Memory Captures](#what-auto-memory-captures)
  - [Auto Memory Limits and Loading](#auto-memory-limits-and-loading)
- [CLAUDE.md vs Auto Memory: The Decision Framework](#claudemd-vs-auto-memory-the-decision-framework)
- [Practical Examples: What Goes Where](#practical-examples-what-goes-where)
  - [Build and Test Commands](#build-and-test-commands)
  - [Code Style and Conventions](#code-style-and-conventions)
  - [Architecture and Project Structure](#architecture-and-project-structure)
  - [Debugging Insights and Workarounds](#debugging-insights-and-workarounds)
  - [Personal Preferences vs Team Standards](#personal-preferences-vs-team-standards)
- [Setting Up CLAUDE.md From Scratch](#setting-up-claudemd-from-scratch)
- [Managing Auto Memory Effectively](#managing-auto-memory-effectively)
- [Advanced Patterns for Large Teams](#advanced-patterns-for-large-teams)
- [Common Mistakes and How to Fix Them](#common-mistakes-and-how-to-fix-them)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

## How Claude Code Memory Works

Claude Code has two complementary memory systems that both load at the start of every conversation. Both are treated as context, not enforced configuration, which means the more specific and concise your instructions, the more reliably Claude follows them.

Here is a side-by-side comparison of the two systems:

| Aspect | CLAUDE.md Files | Auto Memory |
|--------|----------------|-------------|
| **Who writes it** | You | Claude |
| **What it contains** | Instructions and rules | Learnings and patterns |
| **Scope** | Project, user, or organization | Per working tree / per project |
| **Loaded into** | Every session (in full) | Every session (first 200 lines or 25KB) |
| **Best used for** | Coding standards, workflows, project architecture | Build commands, debugging insights, preferences Claude discovers |
| **Shared with team** | Yes (via version control) | No (machine-local) |

The key mental model is this: **CLAUDE.md is what you want Claude to know. Auto memory is what Claude learns on its own.**

Both systems are plain markdown files. Both are editable. Both affect behavior from the very first message of every session. But they serve fundamentally different purposes, and mixing them up leads to problems.

## Understanding CLAUDE.md Files

CLAUDE.md files are markdown files that give Claude persistent instructions. You write them. You maintain them. You decide what goes in and what gets pruned. Think of a CLAUDE.md file as the onboarding document you would hand to a new developer joining your team, except this developer has perfect recall and reads the document before every conversation.

### Where CLAUDE.md Files Live

CLAUDE.md files can live in several locations, each with a different scope. **More specific locations take precedence over broader ones.**

| Scope | Location | Purpose | Shared With |
|-------|----------|---------|-------------|
| **Managed policy** | Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`; macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`; Linux: `/etc/claude-code/CLAUDE.md` | Organization-wide instructions managed by IT/DevOps | All users in the organization |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared instructions for the project | Team members via source control |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences for all projects | Just you (across all projects) |

Claude Code reads CLAUDE.md files by walking up the directory tree from your current working directory. If you run Claude Code in `project/frontend/`, it loads instructions from both `project/frontend/CLAUDE.md` and `project/CLAUDE.md`.

CLAUDE.md files in subdirectories load on demand. When Claude reads files in a subdirectory, the subdirectory's CLAUDE.md gets pulled in automatically. This is powerful for monorepos where different subdirectories have different conventions.

### What Belongs in CLAUDE.md

The guiding question for every line in your CLAUDE.md is: **"Would removing this cause Claude to make a mistake?"** If the answer is no, cut it.

Here is what should go in your project CLAUDE.md:

**Include these:**

- Build, test, and lint commands Claude cannot guess
- Code style rules that differ from language defaults
- Testing instructions and preferred test runners
- Repository etiquette (branch naming, PR conventions, commit message format)
- Architectural decisions specific to your project
- Developer environment quirks (required environment variables, local setup steps)
- Common gotchas or non-obvious behaviors

**Exclude these:**

- Anything Claude can figure out by reading your code
- Standard language conventions Claude already knows
- Detailed API documentation (link to docs instead)
- Information that changes frequently
- Long explanations or tutorials
- File-by-file descriptions of the codebase
- Self-evident practices like "write clean code"

Here is a practical example of a well-structured project CLAUDE.md:

```markdown
# Build & Test
- Build: `npm run build`
- Test single file: `npm test -- path/to/test.ts`
- Lint: `npm run lint -- --fix`
- Typecheck: `npx tsc --noEmit`

# Code Style
- Use ES modules (import/export), not CommonJS (require)
- Destructure imports when possible: `import { foo } from 'bar'`
- Use 2-space indentation
- Prefer named exports over default exports

# Architecture
- API handlers live in `src/api/handlers/`
- Business logic goes in `src/services/`
- Database queries are in `src/db/queries/`
- Shared types are in `src/types/`

# Workflow
- Always typecheck after making code changes
- Prefer running single tests, not the whole test suite
- Branch naming: `feature/`, `fix/`, `chore/`
- Commit messages: imperative mood, under 72 chars

# Gotchas
- The Redis connection requires `REDIS_URL` env var to be set
- Tests use a separate database; run `npm run db:test:setup` first
- The `legacy/` directory uses a different ORM; do not mix patterns
```

Notice how every line is **specific and actionable**. There are no vague platitudes. Each instruction tells Claude exactly what to do or avoid.

### Writing Effective CLAUDE.md Instructions

The way you write instructions directly affects how reliably Claude follows them. Here are the principles that matter most.

**Keep it under 200 lines.** Longer CLAUDE.md files consume more context tokens and reduce adherence. When your file grows beyond 200 lines, important rules get lost in the noise. Split into imports or `.claude/rules/` files instead.

**Use markdown structure.** Headers and bullet points help Claude scan the document just like they help humans. Organized sections are easier to follow than dense paragraphs.

**Be specific enough to verify.** Compare these:

```markdown
# Bad: Vague
- Format code properly
- Test your changes
- Keep files organized

# Good: Specific
- Use 2-space indentation
- Run `npm test` before committing
- API handlers live in `src/api/handlers/`
```

**Avoid contradictions.** If two rules conflict, Claude may pick one arbitrarily. Review your CLAUDE.md files periodically and remove outdated instructions. In monorepos, use `claudeMdExcludes` to skip CLAUDE.md files from other teams.

**Emphasize critical rules.** Adding emphasis like "IMPORTANT" or "YOU MUST" improves adherence for rules that absolutely cannot be broken. Use this sparingly; if everything is critical, nothing is.

```markdown
# Security
- IMPORTANT: Never log or print API keys, tokens, or credentials
- YOU MUST validate all user input before passing to database queries
```

### Importing and Organizing Rules

As your project grows, a single CLAUDE.md file becomes unwieldy. Claude Code gives you two mechanisms to split things up.

**Import syntax** lets you reference external files from within CLAUDE.md:

```markdown
See @README.md for project overview and @package.json for available scripts.

# Additional Instructions
- Git workflow: @docs/git-workflow.md
- Personal overrides: @~/.claude/my-project-instructions.md
```

Imported files are expanded and loaded into context at launch. Relative paths resolve relative to the file containing the import. You can nest imports up to five levels deep.

**The `.claude/rules/` directory** lets you break instructions into topic-specific files:

```
your-project/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
│       ├── code-style.md
│       ├── testing.md
│       ├── security.md
│       └── api-design.md
```

Rules without a `paths` frontmatter field are loaded unconditionally at launch. Rules with `paths` frontmatter only apply when Claude works with matching files:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation
- Use the standard error response format from `src/api/errors.ts`
- Include OpenAPI documentation comments on every handler
```

This is extremely useful in large codebases. Your frontend rules only load when Claude touches frontend files. Your database rules only load when Claude works with query files. This saves context tokens and reduces noise.

**Path-scoped rules support glob patterns:**

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files in any directory |
| `src/**/*` | All files under `src/` |
| `*.md` | Markdown files in the project root only |
| `src/components/*.tsx` | React components in a specific directory |
| `src/**/*.{ts,tsx}` | TypeScript and TSX files under `src/` |

## Understanding Auto Memory

Auto memory is the system where **Claude writes notes for itself** as it works with you. You do not need to configure it, tell Claude what to remember, or manage the files manually (though you can). It is on by default and accumulates knowledge across sessions without any effort on your part.

### How Auto Memory Works Under the Hood

During a session, Claude observes your corrections, preferences, and the patterns it discovers in your codebase. When Claude encounters information that would be useful in a future conversation, it saves a note to its memory directory.

You will occasionally see status messages like "Writing memory" or "Recalled memory" in the Claude Code interface. These indicate Claude is actively updating or reading from its memory files.

Claude does not save something every session. It makes a judgment call about whether the information is worth persisting. Typical triggers include:

- You correct Claude's behavior ("No, we use pnpm, not npm")
- Claude discovers a non-obvious build step or configuration
- You explain a debugging workflow or workaround
- Claude encounters a recurring pattern it wants to remember

When you explicitly tell Claude to remember something ("remember that the API tests require a local Redis instance"), Claude saves it to auto memory. If you instead want it in your CLAUDE.md, say so explicitly ("add this to CLAUDE.md").

### Where Auto Memory is Stored

Each project gets its own memory directory:

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # Concise index, loaded into every session
├── debugging.md       # Detailed notes on debugging patterns
├── api-conventions.md # API design decisions Claude discovered
└── ...                # Any other topic files Claude creates
```

The `<project>` path is derived from the git repository, so **all worktrees and subdirectories within the same repo share one auto memory directory**. Outside a git repo, the project root path is used instead.

Auto memory is **machine-local**. It is not shared across machines, cloud environments, or team members. This is by design. Auto memory captures machine-specific learnings (local paths, local tools, local configuration) that would not apply to other developers or environments.

You can customize the storage location if needed:

```json
{
  "autoMemoryDirectory": "~/my-custom-memory-dir"
}
```

This setting is accepted from policy, local, and user settings. It is deliberately not accepted from project settings (`.claude/settings.json`) to prevent a shared project from redirecting auto memory writes to sensitive locations.

### What Auto Memory Captures

Auto memory captures the things Claude learns from working with you that are not already documented in CLAUDE.md. Here is a realistic example of what a `MEMORY.md` file might look like after several sessions:

```markdown
# Project Memory

## Build
- Use `pnpm` not `npm` for all package management
- Run `pnpm test:unit` for fast feedback; `pnpm test` runs the full suite including integration
- The build requires Node 20+; nvm is configured in .nvmrc

## Debugging
- When auth tests fail locally, check that Redis is running (`docker compose up redis`)
- The `DEBUG=app:*` env var enables verbose logging for all modules
- Flaky test in `payment.test.ts` line 142 is a known race condition; rerun once before investigating

## Preferences
- User prefers explicit type annotations over inference for function signatures
- User prefers `async/await` over `.then()` chains
- When making components, user wants Tailwind CSS classes, not styled-components

## Architecture Notes
- See debugging.md for detailed notes on the auth flow
- See api-conventions.md for API versioning decisions
```

Notice how these are **learnings and observations**, not rules. Claude discovered these by working with you, getting corrected, and noting what worked. They tend to be more specific and contextual than what you would write in a CLAUDE.md.

### Auto Memory Limits and Loading

The first **200 lines of MEMORY.md**, or the first **25KB** (whichever comes first), are loaded at the start of every conversation. Content beyond that threshold is not loaded at session start.

This limit applies only to MEMORY.md. **CLAUDE.md files are loaded in full regardless of length** (though shorter files produce better adherence).

Claude keeps MEMORY.md concise by moving detailed notes into separate topic files. Those topic files (like `debugging.md` or `patterns.md`) are not loaded at startup. Claude reads them on demand using its standard file tools when it needs the information.

This is an important architectural detail. It means auto memory has a natural self-organizing structure: high-level index in MEMORY.md (always loaded), detailed notes in topic files (loaded on demand). You do not need to manage this organization yourself; Claude handles it.

## CLAUDE.md vs Auto Memory: The Decision Framework

Here is the practical framework for deciding where information belongs. **Ask yourself these four questions:**

**1. Did you write it or did Claude discover it?**

If you are defining a rule or standard, it belongs in CLAUDE.md. If Claude figured something out by working with you, let auto memory handle it.

**2. Should your team follow this?**

If yes, it belongs in CLAUDE.md (which gets committed to version control). Auto memory is machine-local and only affects your sessions.

**3. Is it a rule or a learning?**

Rules ("always use 2-space indentation") go in CLAUDE.md. Learnings ("this user prefers explicit type annotations") go in auto memory.

**4. Does it apply to all machines or just this one?**

Machine-specific details (local paths, local tool versions, local workarounds) naturally belong in auto memory. Universal project standards belong in CLAUDE.md.

Here is a decision flowchart you can reference:

```
Should this be in CLAUDE.md or auto memory?
│
├─ Is it a team standard or project rule?
│  └─ YES → CLAUDE.md (project level)
│
├─ Is it a personal preference that applies to all projects?
│  └─ YES → ~/.claude/CLAUDE.md (user level)
│
├─ Is it something Claude learned from correcting a mistake?
│  └─ YES → Auto memory (let Claude handle it)
│
├─ Is it machine-specific (local paths, local tools)?
│  └─ YES → Auto memory
│
├─ Would a new team member need to know this?
│  └─ YES → CLAUDE.md
│  └─ NO  → Auto memory
│
└─ Does it change frequently?
   └─ YES → Auto memory (or don't persist at all)
   └─ NO  → CLAUDE.md
```

## Practical Examples: What Goes Where

Let us walk through the most common categories of information and where each one should live.

### Build and Test Commands

**CLAUDE.md** is the right place for build commands that are stable, non-obvious, and team-wide:

```markdown
# Build & Test
- Build: `pnpm build`
- Test single file: `pnpm test -- --testPathPattern=path/to/test`
- Lint: `pnpm lint --fix`
- Typecheck: `pnpm typecheck`
- Start dev server: `pnpm dev` (requires `REDIS_URL` to be set)
```

**Auto memory** naturally captures refinements Claude discovers while working:

```markdown
## Build Notes
- `pnpm test:unit` is faster than full `pnpm test` for iterating
- Integration tests require `docker compose up` first
- Build takes ~90 seconds; incremental rebuilds are ~10 seconds
```

The distinction: CLAUDE.md has the canonical commands your whole team uses. Auto memory has the operational details Claude discovered through experience.

### Code Style and Conventions

**CLAUDE.md** is the right place for style rules that differ from defaults:

```markdown
# Code Style
- Use ES modules (import/export), not CommonJS
- Prefer named exports over default exports
- 2-space indentation
- Use `type` for type aliases, `interface` for object shapes with methods
- Error messages should be user-facing strings, not internal codes
```

**Auto memory** captures individual preferences and patterns Claude infers:

```markdown
## Style Preferences
- User prefers early returns over nested if/else
- User wants explicit return types on exported functions
- User prefers `const` arrow functions over function declarations for React components
```

The distinction: CLAUDE.md has the team's style guide. Auto memory has your personal preferences that are not codified in the project's linting rules.

### Architecture and Project Structure

**CLAUDE.md** should describe non-obvious architectural decisions:

```markdown
# Architecture
- We use a hexagonal architecture: domain logic in `src/domain/`, adapters in `src/adapters/`
- API routes are defined in `src/routes/` and handlers in `src/handlers/`
- Database migrations are in `db/migrations/` and use Drizzle ORM
- Shared types live in `packages/shared/types/`
- DO NOT import from `src/adapters/` inside `src/domain/`
```

**Auto memory** records structural observations Claude makes while exploring:

```markdown
## Architecture Notes
- The `legacy/` directory uses Sequelize; the rest of the project uses Drizzle
- Feature flags are managed through `src/config/features.ts`
- The GraphQL schema is auto-generated from `schema.graphql`; do not edit `generated/` directly
```

The distinction: CLAUDE.md captures intentional design decisions. Auto memory captures discovered facts about how the codebase actually works.

### Debugging Insights and Workarounds

**CLAUDE.md** is appropriate for known gotchas that affect every developer:

```markdown
# Gotchas
- The Redis connection requires `REDIS_URL` env var
- Tests use a separate database; run `pnpm db:test:setup` first
- The CI pipeline uses Node 20; do not use Node 22 features
```

**Auto memory** excels at capturing debugging patterns:

```markdown
## Debugging
- When auth tests fail, first check that Redis is running locally
- The `payment.test.ts` flaky failure at line 142 is a known race condition; rerun once
- To debug email sending, set `DEBUG=mailer:*` for verbose SMTP logs
- The `TypeError: Cannot read property of undefined` in `UserService` usually means the user object was not populated; check the `populate()` call in the query
```

The distinction: CLAUDE.md has the blockers. Auto memory has the diagnostic patterns Claude builds up over time.

### Personal Preferences vs Team Standards

This is where the user-level `~/.claude/CLAUDE.md` file comes in.

**User-level CLAUDE.md** (`~/.claude/CLAUDE.md`) applies to all your projects:

```markdown
# Personal Preferences
- I prefer verbose variable names over abbreviations
- When explaining code, use concrete examples, not abstract descriptions
- Always show me the full diff before committing
- Use Vim keybinding mnemonics when explaining editor shortcuts
```

**Project-level CLAUDE.md** (`./CLAUDE.md`) captures team standards:

```markdown
# Team Standards
- Follow the Airbnb JavaScript style guide
- Use Conventional Commits format for commit messages
- All PRs require at least one approval
```

**Auto memory** picks up the intersection: your personal preferences as they apply to this specific project:

```markdown
## Preferences (this project)
- User wants Tailwind utility classes instead of CSS modules for new components
- User prefers `zod` schemas for runtime validation over manual checks
- When user says "clean up," they mean extract helper functions and add types
```

## Setting Up CLAUDE.md From Scratch

If you are starting fresh, here is a step-by-step approach to creating an effective **Claude Code setup**.

**Step 1: Run `/init`**

The `/init` command analyzes your codebase and generates a starter CLAUDE.md. It detects build systems, test frameworks, and code patterns automatically.

```bash
cd your-project
claude
# Inside Claude Code:
/init
```

If you set the environment variable `CLAUDE_CODE_NEW_INIT=1`, you get an interactive multi-phase flow that asks which artifacts to set up and presents a reviewable proposal before writing any files.

**Step 2: Review and prune the generated file**

The generated CLAUDE.md is a starting point. Review every line and ask: "Would Claude make a mistake without this?" Remove anything redundant or obvious.

**Step 3: Add what `/init` cannot discover**

Some things are not discoverable from code alone:

- Team conventions and workflow rules
- Architectural decisions and their rationale
- Environment setup requirements
- Known gotchas and workarounds
- Security-sensitive rules (never log credentials, always validate input)

**Step 4: Create your user-level CLAUDE.md**

For personal preferences that apply across all projects:

```bash
mkdir -p ~/.claude
```

Then create `~/.claude/CLAUDE.md` with your global preferences:

```markdown
# My Global Preferences
- Prefer async/await over .then() chains
- Use descriptive variable names; avoid single-letter variables except in loops
- When writing tests, always include both happy path and error cases
- Prefer composition over inheritance
```

**Step 5: Set up rules for large projects**

If your project has distinct areas with different conventions:

```
.claude/
├── CLAUDE.md
└── rules/
    ├── frontend.md      # React/TypeScript conventions
    ├── backend.md       # API and database conventions
    ├── testing.md       # Testing patterns
    └── infrastructure.md # Deployment and CI rules
```

Use path-scoped rules to keep context lean:

```markdown
---
paths:
  - "src/frontend/**/*.{ts,tsx}"
---

# Frontend Rules
- Use React Server Components by default; use "use client" only when necessary
- Co-locate tests next to components: `Button.tsx` and `Button.test.tsx`
- Use the `cn()` utility from `src/lib/utils` for conditional class names
```

**Step 6: Commit and iterate**

Commit your CLAUDE.md to version control. Encourage your team to contribute. The file compounds in value as more people add their knowledge. Treat it like code: review it when things go wrong, prune it regularly, and test changes by observing whether Claude's behavior actually shifts.

## Managing Auto Memory Effectively

Auto memory works well out of the box, but there are things you can do to make it more effective.

**Use the `/memory` command regularly.** Running `/memory` inside a session shows you all loaded CLAUDE.md files, lets you toggle auto memory on or off, and provides a link to browse the auto memory folder. Make it a habit to check what Claude has remembered, especially if you notice unexpected behavior.

**Edit memory files directly.** Auto memory files are plain markdown. If Claude saved something incorrect or outdated, open the file and fix it. If a topic file has grown stale, delete it. You have full control.

```bash
# Browse auto memory files
ls ~/.claude/projects/your-project/memory/

# Read the main memory index
cat ~/.claude/projects/your-project/memory/MEMORY.md

# Edit or delete as needed
code ~/.claude/projects/your-project/memory/MEMORY.md
```

**Promote important learnings to CLAUDE.md.** If you notice auto memory captured something that the whole team should know, move it to CLAUDE.md and commit it. Auto memory is a discovery mechanism; CLAUDE.md is the permanent record.

**Disable auto memory when it is not helpful.** For some projects or workflows, auto memory adds noise. You can disable it per-project:

```json
{
  "autoMemoryEnabled": false
}
```

Or globally via environment variable:

```bash
export CLAUDE_CODE_DISABLE_AUTO_MEMORY=1
```

**Understand the sharing boundary.** Auto memory is machine-local. If you work across multiple machines (office desktop, laptop, cloud VM), each machine builds its own auto memory. This is usually fine because auto memory captures machine-specific details. But if you want consistency, maintain your rules in CLAUDE.md and commit them to git.

## Advanced Patterns for Large Teams

When you are deploying Claude Code across an engineering organization, the memory hierarchy becomes critical.

**Organization-wide CLAUDE.md** can be deployed through managed policy. On Windows, this lives at `C:\Program Files\ClaudeCode\CLAUDE.md`. This file cannot be excluded by individual settings, making it the right place for non-negotiable security policies and compliance requirements.

```markdown
# Organization Policy
- IMPORTANT: Never commit secrets, API keys, or credentials to source control
- All database queries must use parameterized statements
- Log user actions for audit trail; never log PII in plain text
- Follow OWASP Top 10 guidelines for all web-facing code
```

**Project-level CLAUDE.md** carries team standards through version control:

```markdown
# Team Standards
- Use the shared ESLint config from `@company/eslint-config`
- Follow the API design guidelines in @docs/api-standards.md
- All new endpoints require integration tests
```

**User-level CLAUDE.md** handles personal preferences:

```markdown
# My Preferences
- Use verbose explanations when I ask "why"
- Default to TypeScript strict mode
```

**Auto memory** fills in the machine-specific gaps Claude discovers while working with each individual developer.

This layered approach means new team members get sensible defaults from the organization and project CLAUDE.md files, while experienced developers benefit from accumulated auto memory insights.

**For monorepos**, use `claudeMdExcludes` to prevent other teams' CLAUDE.md files from loading:

```json
{
  "claudeMdExcludes": [
    "**/other-team/CLAUDE.md",
    "**/experimental/.claude/rules/**"
  ]
}
```

**For cross-project consistency**, use symlinks to share rules across repositories:

```bash
# Link shared rules into your project
ln -s ~/company-claude-rules/security.md .claude/rules/security.md
ln -s ~/company-claude-rules/code-style.md .claude/rules/code-style.md
```

Symlinks are resolved and loaded normally. Circular symlinks are detected and handled gracefully.

**For projects that also use other coding agents**, create a CLAUDE.md that imports your existing AGENTS.md:

```markdown
@AGENTS.md

## Claude Code Specific
- Use plan mode for changes under `src/billing/`
- Always run typecheck after modifying shared types
```

This avoids duplicating instructions across tools.

## Common Mistakes and How to Fix Them

**Mistake 1: Putting everything in CLAUDE.md**

Symptoms: Your CLAUDE.md is 500+ lines. Claude ignores half of it. Instructions contradict each other.

Fix: Ruthlessly prune. Move detailed documentation to imported files or `.claude/rules/`. Keep the main CLAUDE.md under 200 lines. Every line should pass the "would Claude make a mistake without this?" test.

**Mistake 2: Never checking auto memory**

Symptoms: Claude has saved incorrect information and keeps repeating the same wrong behavior across sessions.

Fix: Run `/memory` periodically. Browse `~/.claude/projects/<project>/memory/`. Edit or delete incorrect entries. Auto memory is not write-once; it is a living document you can curate.

**Mistake 3: Duplicating information across CLAUDE.md and auto memory**

Symptoms: The same instruction exists in both places, sometimes with slight variations. Claude gets confused about which version to follow.

Fix: If something is important enough to be in CLAUDE.md, it should only be in CLAUDE.md. If Claude saved a duplicate in auto memory, delete the auto memory version. Let each system handle its own domain.

**Mistake 4: Using CLAUDE.md for frequently changing information**

Symptoms: You are editing CLAUDE.md every week to update environment variables, API endpoints, or version numbers.

Fix: CLAUDE.md should contain stable information. For things that change often, either let auto memory handle it, or reference the source of truth with an import (`@.env.example` or `@docs/current-endpoints.md`).

**Mistake 5: Ignoring the scope hierarchy**

Symptoms: You put personal preferences in the project CLAUDE.md, annoying teammates. Or you put project-specific rules in your user CLAUDE.md, causing confusion when you switch projects.

Fix: Use the right scope for each type of information:
- Organization policies go in managed CLAUDE.md
- Project standards go in `./CLAUDE.md`
- Personal preferences go in `~/.claude/CLAUDE.md`
- Machine-specific learnings stay in auto memory

**Mistake 6: Writing vague instructions**

Symptoms: Claude does not follow your CLAUDE.md rules consistently. You keep correcting the same mistakes.

Fix: Make every instruction specific enough to verify. Replace "format code properly" with "use 2-space indentation and trailing commas." Replace "test your changes" with "run `pnpm test:unit` after modifying any file in `src/`."

**Mistake 7: Not understanding what survives compaction**

Symptoms: Instructions seem lost after `/compact` or after a long session.

Fix: **CLAUDE.md fully survives compaction.** After `/compact`, Claude re-reads CLAUDE.md from disk and re-injects it. If an instruction disappeared after compaction, it was given only in conversation, not written to CLAUDE.md. Add critical instructions to CLAUDE.md so they persist.

## Frequently Asked Questions

**What is CLAUDE.md in Claude Code?**

CLAUDE.md is a special markdown file that Claude Code reads at the start of every session. It contains persistent instructions you write to guide Claude's behavior: build commands, code style rules, architectural decisions, workflow conventions, and project-specific knowledge. It is the primary mechanism for giving Claude long-term context about your project.

**How is CLAUDE.md different from auto memory?**

CLAUDE.md is written and maintained by you. It contains rules and instructions you define. Auto memory is written by Claude itself as it works with you. It contains learnings, observations, and patterns Claude discovers during sessions. CLAUDE.md is shared with your team through version control. Auto memory is machine-local and private to you.

**Where should I create my CLAUDE.md file?**

For project-level instructions shared with your team, create `CLAUDE.md` in your project root or at `.claude/CLAUDE.md`. For personal preferences that apply to all projects, create `~/.claude/CLAUDE.md`. For organization-wide policies, use the managed policy location for your operating system.

**How do I check what auto memory has saved?**

Run the `/memory` command inside a Claude Code session. It lists all loaded memory files and provides a link to browse the auto memory folder. You can also directly browse `~/.claude/projects/<project>/memory/` on your filesystem. All files are plain markdown you can read, edit, or delete.

**Can I disable auto memory?**

Yes. Toggle it from within a session using `/memory`, set `"autoMemoryEnabled": false` in your project settings, or set the environment variable `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`.

**Does CLAUDE.md survive context compaction?**

Yes. After compaction or `/compact`, Claude re-reads all CLAUDE.md files from disk and re-injects them into the session. CLAUDE.md content is never lost during compaction. If an instruction disappeared, it was likely given in conversation but never added to CLAUDE.md.

**How long should my CLAUDE.md be?**

Target under 200 lines for the main CLAUDE.md file. Longer files consume more context tokens and reduce how reliably Claude follows instructions. If you need more space, use `@path/to/import` syntax to reference additional files or split instructions into `.claude/rules/` files.

**Can I use CLAUDE.md if my project also uses AGENTS.md?**

Yes. Create a CLAUDE.md that imports your AGENTS.md file using `@AGENTS.md`, then add any Claude-specific instructions below it. Claude loads the imported file at session start, so both tools read the same base instructions.

**Does auto memory sync across machines?**

No. Auto memory is machine-local by design. Each machine builds its own auto memory based on the sessions that run on it. For instructions that need to be consistent across machines and team members, use CLAUDE.md and commit it to version control.

**How do I tell Claude to remember something permanently?**

If you say "remember this" during a session, Claude saves it to auto memory. If you want it in CLAUDE.md instead, say "add this to CLAUDE.md." You can also edit either file manually at any time.

**What happens if CLAUDE.md and auto memory contradict each other?**

Both are loaded as context, and Claude tries to follow both. If they conflict, Claude may pick one arbitrarily. To avoid this, periodically review your auto memory files and remove anything that contradicts your CLAUDE.md instructions.

**Can auto memory be shared with my team?**

Not directly, since auto memory is stored outside the project repository. However, you can promote useful auto memory entries to CLAUDE.md and commit them. This is actually the recommended workflow: auto memory is a discovery mechanism, and CLAUDE.md is the permanent team record.

**What is the difference between `.claude/rules/` and CLAUDE.md?**

Both are instruction files you write. CLAUDE.md is a single file that loads every session. `.claude/rules/` files are modular topic files that can be scoped to specific file paths using glob patterns. Rules without path scoping load every session like CLAUDE.md. Rules with path scoping only load when Claude works with matching files, saving context tokens.

## Key Takeaways

Getting **Claude Code memory** right is not complicated, but it does require intentional choices about what goes where. Here is the essential summary.

**Use CLAUDE.md for rules, standards, and decisions.** These are the things you write, your team agrees on, and you commit to version control. Keep each file under 200 lines. Make every instruction specific enough to verify. Prune regularly.

**Let auto memory handle learnings, patterns, and preferences.** These are the things Claude discovers while working with you: build quirks, debugging patterns, personal coding preferences, machine-specific details. Review them periodically with `/memory` and delete anything incorrect.

**Use the right scope for each type of information.** Organization policies in managed CLAUDE.md. Project standards in `./CLAUDE.md`. Personal preferences in `~/.claude/CLAUDE.md`. Machine-specific learnings in auto memory.

**Promote valuable auto memory to CLAUDE.md.** When Claude discovers something the whole team should know, move it from auto memory to CLAUDE.md and commit it. This is how your project's knowledge base grows organically.

**Treat both systems as living documents.** Neither CLAUDE.md nor auto memory is write-once. Review, edit, and prune both regularly. When Claude misbehaves, check your memory files first. The problem is almost always stale, vague, or contradictory instructions.

The investment you make in your Claude Code memory setup pays dividends across every future session. A well-maintained CLAUDE.md and a curated auto memory mean fewer corrections, faster sessions, and a Claude that genuinely feels like it understands your project. Start with `/init`, prune aggressively, and build from there.
