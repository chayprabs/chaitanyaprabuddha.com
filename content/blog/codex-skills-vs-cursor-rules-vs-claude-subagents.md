---
title: "Codex Skills vs Cursor Rules vs Claude Subagents"
description: "When to use Codex skills, Cursor rules, or Claude subagents. A practical guide to AI workflow design."
date: "2026-04-02"
tags: ["Codex skills","Cursor rules","Claude subagents","AI workflow design","Claude Code","OpenAI Codex","Cursor IDE","AI coding agents","developer tools","agent configuration"]
readTime: "35 min read"
ogImage: "/og/codex-skills-vs-cursor-rules-vs-claude-subagents.png"
canonical: "https://chaitanyaprabuddha.com/blog/codex-skills-vs-cursor-rules-vs-claude-subagents"
published: true
---

# Codex Skills vs Cursor Rules vs Claude Subagents: Choosing the Right AI Workflow Architecture

Every major AI coding tool now lets you go beyond simple instructions. **Codex skills**, **Cursor rules**, and **Claude subagents** each represent a different philosophy for customizing AI-assisted development — and understanding when to reach for each one is the difference between a setup that scales and one that fights you at every turn. This is not a "which is better" comparison. Each solves a different problem in AI workflow design, and the right answer depends on what you are actually trying to accomplish.

Most developers pick one tool and never look at the others. That is a mistake. These three systems tackle overlapping territory from fundamentally different angles: Codex skills are reusable playbooks that extend what your agent can do. Cursor rules are ambient constraints that shape how your agent behaves. Claude subagents are isolated execution environments that handle delegated work independently. The abstractions are not interchangeable, and forcing one to do the job of another leads to brittle setups.

This guide breaks down each system in full, shows where they overlap, where they diverge, and gives you a decision framework for choosing the right one based on your team, your project, and the kind of work you are doing.

## Table of Contents

- [The Core Problem All Three Solve](#the-core-problem-all-three-solve)
- [Codex Skills: Reusable Playbooks for Your Agent](#codex-skills-reusable-playbooks-for-your-agent)
  - [What Codex Skills Actually Are](#what-codex-skills-actually-are)
  - [The AGENTS.md Foundation](#the-agentsmd-foundation)
  - [How Codex Approaches Customization](#how-codex-approaches-customization)
  - [What Codex Skills Do Well](#what-codex-skills-do-well)
  - [Where Codex Skills Fall Short](#where-codex-skills-fall-short)
- [Cursor Rules: Ambient Constraints for AI Behavior](#cursor-rules-ambient-constraints-for-ai-behavior)
  - [How Cursor Rules Work](#how-cursor-rules-work)
  - [Types of Cursor Rules](#types-of-cursor-rules)
  - [The .cursorrules File and .cursor/rules Directory](#the-cursorrules-file-and-cursorrules-directory)
  - [Rule Targeting and Scoping](#rule-targeting-and-scoping)
  - [What Cursor Rules Do Well](#what-cursor-rules-do-well)
  - [Where Cursor Rules Fall Short](#where-cursor-rules-fall-short)
- [Claude Subagents: Isolated Execution Environments](#claude-subagents-isolated-execution-environments)
  - [How Claude Subagents Work](#how-claude-subagents-work)
  - [Built-in Subagents](#built-in-subagents)
  - [Creating Custom Subagents](#creating-custom-subagents)
  - [Subagent Configuration Options](#subagent-configuration-options)
  - [What Claude Subagents Do Well](#what-claude-subagents-do-well)
  - [Where Claude Subagents Fall Short](#where-claude-subagents-fall-short)
- [Claude Code Skills: The Fourth Player](#claude-code-skills-the-fourth-player)
  - [How Claude Code Skills Differ from Codex Skills](#how-claude-code-skills-differ-from-codex-skills)
  - [Skill Configuration and Frontmatter](#skill-configuration-and-frontmatter)
  - [Skills vs Subagents in Claude Code](#skills-vs-subagents-in-claude-code)
- [Side-by-Side Comparison](#side-by-side-comparison)
  - [Feature Comparison Table](#feature-comparison-table)
  - [Architecture Comparison](#architecture-comparison)
  - [Configuration Syntax Compared](#configuration-syntax-compared)
- [Decision Framework: When to Use What](#decision-framework-when-to-use-what)
  - [Use Codex Skills When](#use-codex-skills-when)
  - [Use Cursor Rules When](#use-cursor-rules-when)
  - [Use Claude Subagents When](#use-claude-subagents-when)
  - [Use Claude Code Skills When](#use-claude-code-skills-when)
- [Real-World Workflow Patterns](#real-world-workflow-patterns)
  - [Pattern 1: Code Review Pipeline](#pattern-1-code-review-pipeline)
  - [Pattern 2: Monorepo with Multiple Frameworks](#pattern-2-monorepo-with-multiple-frameworks)
  - [Pattern 3: Multi-Step Deployment](#pattern-3-multi-step-deployment)
- [Making Multiple Systems Work Together](#making-multiple-systems-work-together)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

## The Core Problem All Three Solve

Every AI coding agent starts from zero. It does not know your build system, your naming conventions, your test framework, or the architectural decisions your team made last quarter. Without customization, the agent uses training defaults that probably do not match your project.

The question is not whether to customize — it is **how to customize** and at what level of abstraction.

Think of it as three layers of customization:

1. **Behavioral constraints** — "always do X, never do Y" (Cursor rules)
2. **Reusable workflows** — "here is how to perform task Z" (Codex skills, Claude Code skills)
3. **Delegated execution** — "hand this off to a specialized worker" (Claude subagents)

These layers are not competing. They are complementary. The confusion arises because each tool bundles its own mix of these capabilities under different names, and the boundaries between them are not always obvious.

## Codex Skills: Reusable Playbooks for Your Agent

### What Codex Skills Actually Are

OpenAI's Codex CLI uses a straightforward customization model built around **AGENTS.md files** and a `.codex/skills` directory. Codex skills are essentially saved instructions that the agent can reference when performing specific types of tasks.

The Codex CLI is a terminal-based coding agent that runs locally. It reads instructions from AGENTS.md files at multiple levels and uses them to shape its behavior across your project.

### The AGENTS.md Foundation

Codex's instruction system is built on AGENTS.md — plain markdown files that merge top-down to provide context to the agent. There is no YAML frontmatter, no special schema. You write markdown, and Codex reads it.

```markdown
# AGENTS.md (project root)

## Build Commands
- Install: `pnpm install`
- Test: `pnpm test`
- Lint: `pnpm lint`

## Code Conventions
- Use TypeScript strict mode
- Prefer named exports over default exports
- Use Vitest for testing, not Jest

## Architecture
- API routes live in src/routes/
- Database models in src/models/
- Shared utilities in src/lib/
```

AGENTS.md files live at three levels:

| Scope | Location | Priority |
|-------|----------|----------|
| Global | `~/.codex/AGENTS.md` | Lowest — personal defaults |
| Project root | `./AGENTS.md` | Middle — team-shared instructions |
| Working directory | `./subdir/AGENTS.md` | Highest — subdirectory-specific |

All three levels are concatenated and injected into context before your first prompt. More specific instructions take precedence over general ones.

### How Codex Approaches Customization

Codex's philosophy is **simplicity over structure**. The AGENTS.md file is free-form markdown. The `.codex/skills` directory follows the Agent Skills open standard — a community-driven specification for portable AI agent instructions.

Codex operates with three approval modes that govern how much autonomy the agent has:

```
suggest    → Requires approval for file writes and shell commands
auto-edit  → Auto-applies file patches; still asks for shell commands
full-auto  → Autonomous execution with network disabled
```

These modes interact with the instructions in AGENTS.md but are not defined by them. The instructions shape what the agent does; the approval mode shapes what it is allowed to do.

### What Codex Skills Do Well

**Portability is the standout feature.** Because AGENTS.md is plain markdown with no vendor-specific syntax, the same file can provide useful context to any tool that reads project-root markdown files. Claude Code reads CLAUDE.md but can be pointed at additional files. Other tools can benefit from the same documentation.

**The cascade model is intuitive.** Global instructions for your personal preferences, project-level instructions for team conventions, directory-level instructions for package-specific rules. This mirrors how developers already think about configuration (think `.gitignore` or `tsconfig.json` cascading).

**Zero ceremony.** No YAML to learn, no frontmatter fields to memorize, no initialization commands. Create a file, write markdown, and you are done.

### Where Codex Skills Fall Short

**No conditional execution.** AGENTS.md loads everything upfront. There is no mechanism to say "only load these instructions when working on frontend code" or "use this skill only when deploying." Every token of instruction competes for context space on every task.

**No tool restrictions.** Unlike Claude subagents, Codex skills cannot limit which tools the agent uses. The approval mode is a session-wide setting, not a per-skill configuration.

**No delegation model.** Codex skills are instructions, not workers. There is no concept of handing off a task to an isolated environment that returns results. Everything runs in the same context.

## Cursor Rules: Ambient Constraints for AI Behavior

### How Cursor Rules Work

**Cursor rules are persistent instructions that shape how the AI assistant behaves** inside the Cursor IDE. Unlike Codex's free-form markdown or Claude's executable skills, Cursor rules are designed as ambient constraints — they modify the AI's behavior passively, coloring every interaction rather than being invoked for specific tasks.

Cursor rules are injected into the system prompt for every AI interaction: autocomplete, inline edits, chat, and Composer sessions. They function as a layer of personality and convention that sits between the base model and your conversation.

### Types of Cursor Rules

Cursor provides multiple rule types organized by scope and intent:

| Rule Type | Location | Scope | How It Loads |
|-----------|----------|-------|--------------|
| **Project rules** | `.cursor/rules/*.mdc` | Project-wide, committed to version control | Automatically for all team members |
| **User rules** | Cursor Settings > Rules | Personal, applies to all projects | Always loaded for you |
| **Global rules** | Cursor Settings > Global Rules | Personal, applies everywhere | Always loaded |
| **Legacy rules** | `.cursorrules` (project root) | Project-wide | Auto-loaded but deprecated |

The `.mdc` file extension stands for "Markdown Cursor" — a Cursor-specific format that supports frontmatter-style metadata for controlling when and how rules activate.

### The .cursorrules File and .cursor/rules Directory

The original `.cursorrules` file was a single project-root file containing plain text instructions. It worked, but it was limited — one file for an entire project, no way to scope rules to specific file types or directories.

The current system uses the `.cursor/rules/` directory, where each `.mdc` file represents a distinct rule:

```markdown
<!-- .cursor/rules/typescript.mdc -->
---
description: TypeScript coding conventions
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: false
---

- Use strict TypeScript with no `any` types
- Prefer interfaces over type aliases for object shapes
- Use `const` assertions for literal types
- Handle all error cases explicitly
- Use discriminated unions over optional properties
```

The frontmatter controls targeting:

- **`description`** — helps the AI understand when the rule is relevant
- **`globs`** — file patterns that trigger automatic loading
- **`alwaysApply`** — if true, loaded into every interaction regardless of context

### Rule Targeting and Scoping

This is where Cursor rules get interesting. The glob-based targeting means you can have different behavioral rules for different parts of your codebase:

```markdown
<!-- .cursor/rules/react-components.mdc -->
---
description: React component conventions
globs: ["src/components/**/*.tsx"]
alwaysApply: false
---

- Use functional components only
- Props interface named {ComponentName}Props
- Export components as named exports
- Co-locate tests as {ComponentName}.test.tsx
```

```markdown
<!-- .cursor/rules/api-routes.mdc -->
---
description: API route conventions
globs: ["src/routes/**/*.ts"]
alwaysApply: false
---

- Use Zod for request validation
- Return consistent error envelope
- Log all errors with request context
- Rate-limit all public endpoints
```

When you edit a file matching `src/components/**/*.tsx`, Cursor loads the React rules. When you edit an API route, it loads the API conventions. This is **context-aware customization** that neither Codex's all-or-nothing AGENTS.md nor a single instruction file can match.

### What Cursor Rules Do Well

**Granular targeting is the killer feature.** The ability to scope rules by file path pattern means your AI assistant behaves differently in different parts of your codebase — automatically. No manual switching, no "remember to use the right instructions" overhead.

**IDE integration is seamless.** Because Cursor rules are built into the editor, they apply to every AI interaction: autocompletion, inline edits, chat, and multi-file Composer sessions. You do not need to remember to invoke them.

**Team sharing through version control.** The `.cursor/rules/` directory commits with your project. New team members get the rules automatically when they clone the repo.

**Separation of concerns.** Having individual `.mdc` files for different rule sets is cleaner than a single monolithic instruction file. You can have a rule for TypeScript conventions, another for testing patterns, another for documentation standards, and they stay organized.

### Where Cursor Rules Fall Short

**No execution model.** Cursor rules are purely instructional. They cannot run commands, spawn processes, or perform multi-step workflows. You cannot create a "deploy" rule that actually deploys. They inform the AI's behavior but do not extend its capabilities.

**Cursor-only portability.** The `.mdc` format with its specific frontmatter fields is proprietary to Cursor. Your `.cursor/rules/` directory is useless in Claude Code, Codex, VS Code with Copilot, or any other tool. If your team uses multiple editors, you maintain duplicate configurations.

**No isolation or delegation.** All rules run in the same context as your main conversation. There is no way to say "handle this task with a restricted toolset" or "run this research in a separate context so it does not consume my main window."

**Passive only.** You cannot invoke a Cursor rule on demand. They activate (or not) based on glob patterns and the `alwaysApply` flag. There is no `/rule-name` command or explicit triggering mechanism.

## Claude Subagents: Isolated Execution Environments

### How Claude Subagents Work

**Claude subagents are specialized AI assistants that run in their own context window** with a custom system prompt, specific tool access, and independent permissions. When Claude encounters a task that matches a subagent's description, it delegates to that subagent, which works independently and returns results.

This is fundamentally different from both Codex skills and Cursor rules. Subagents are not instructions — they are **workers**. Each one gets its own context, its own model configuration, its own tool restrictions, and its own permission model. The main conversation stays clean because the subagent's work happens in isolation.

```markdown
<!-- .claude/agents/code-reviewer.md -->
---
name: code-reviewer
description: Expert code review specialist. Use after writing or modifying code.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a senior code reviewer ensuring high standards of code quality.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Review for clarity, naming, duplication, error handling, security

Provide feedback organized by priority:
- Critical issues (must fix)
- Warnings (should fix)
- Suggestions (consider improving)

Include specific examples of how to fix issues.
```

When Claude determines that a code review is needed — either because you asked or because the subagent's description matches the current task — it delegates to this subagent. The subagent runs in isolation with only the tools listed (`Read`, `Grep`, `Glob`, `Bash`), performs the review, and returns a summary to the main conversation.

### Built-in Subagents

Claude Code ships with several built-in subagents that handle common delegation patterns:

| Subagent | Model | Tools | Purpose |
|----------|-------|-------|---------|
| **Explore** | Haiku (fast) | Read-only | File discovery, code search, codebase exploration |
| **Plan** | Inherits | Read-only | Research and context gathering for plan mode |
| **General-purpose** | Inherits | All | Complex multi-step tasks requiring exploration and modification |

The **Explore** subagent is particularly valuable. When Claude needs to understand your codebase, it delegates exploration to a fast Haiku-powered subagent with read-only tools. The exploration results stay in the subagent's context — your main conversation only sees the relevant summary.

### Creating Custom Subagents

Custom subagents are markdown files with YAML frontmatter. They live in scoped directories:

| Location | Scope | Priority |
|----------|-------|----------|
| Managed settings | Organization-wide | Highest |
| `--agents` CLI flag | Current session only | High |
| `.claude/agents/` | Current project | Medium |
| `~/.claude/agents/` | All your projects | Low |
| Plugin `agents/` | Where plugin is enabled | Lowest |

Here is a debugging subagent that can both analyze and fix issues:

```markdown
<!-- .claude/agents/debugger.md -->
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior.
tools: Read, Edit, Bash, Grep, Glob
model: inherit
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify solution works

For each issue, provide:
- Root cause explanation
- Evidence supporting the diagnosis
- Specific code fix
- Testing approach
- Prevention recommendations

Focus on fixing the underlying issue, not the symptoms.
```

### Subagent Configuration Options

The power of subagents comes from their configuration depth. Each subagent supports:

**Model selection** — route cheap exploration tasks to `haiku`, balanced work to `sonnet`, complex reasoning to `opus`, or `inherit` from the main conversation.

**Permission modes** — control autonomy from `default` (standard prompts) through `acceptEdits`, `plan` (read-only), `dontAsk`, to `bypassPermissions`.

**Tool restrictions** — use `tools` for an allowlist or `disallowedTools` for a denylist:

```yaml
# Allowlist: only these tools available
tools: Read, Grep, Glob, Bash

# Denylist: inherit everything except these
disallowedTools: Write, Edit
```

**Persistent memory** — let subagents learn across sessions with `memory: user` (all projects), `memory: project` (shareable via git), or `memory: local` (not committed).

**Lifecycle hooks** — validate or transform tool calls with `PreToolUse` and `PostToolUse` events scoped to the subagent.

**MCP server access** — scope external tools like Playwright or GitHub to specific subagents without polluting the main conversation context.

### What Claude Subagents Do Well

**Context isolation is the defining advantage.** Every subagent runs in its own context window. Verbose operations — running test suites, fetching documentation, processing logs — stay in the subagent's context. Only the relevant summary returns to your main conversation. This is something neither Codex skills nor Cursor rules can do.

**Cost and latency control through model routing.** Route exploratory research to cheap, fast Haiku instances. Reserve expensive Opus capacity for complex reasoning tasks. This is not possible with systems that run everything in a single context.

**Fine-grained tool restrictions.** A code review subagent that cannot edit files. A database query subagent that only allows read-only SQL. A research subagent with no write access. These constraints are enforced at the system level, not by asking the AI to follow instructions politely.

**Parallel execution.** Multiple subagents can run concurrently on independent tasks. Research the authentication module, the database layer, and the API surface simultaneously with three separate subagents, then synthesize findings.

**Persistent memory across sessions.** Subagents can accumulate knowledge over time. A code reviewer that remembers the patterns it has seen, the recurring issues in your codebase, the conventions your team follows — all stored in a dedicated memory directory.

### Where Claude Subagents Fall Short

**Higher complexity ceiling.** Defining a subagent requires understanding frontmatter fields, tool names, permission modes, and how delegation works. The learning curve is steeper than dropping a `.cursorrules` file into your project root.

**Claude Code only.** Subagents are a Claude Code feature. They do not work in Cursor, Codex, VS Code with Copilot, or any other tool. If you invest heavily in subagent configurations, that investment is locked to the Claude Code ecosystem.

**No ambient behavior modification.** Subagents are workers, not constraints. You cannot use a subagent to say "always use TypeScript strict mode." For that, you need CLAUDE.md or project-level instructions. Subagents are invoked for tasks, not applied as passive rules.

**Latency overhead.** Each subagent invocation creates a new context. For quick, targeted changes, the overhead of spawning a subagent is not worth it. Use the main conversation instead.

## Claude Code Skills: The Fourth Player

There is a system that blurs the line between Codex skills and Claude subagents, and it lives in the same tool: **Claude Code skills**. Understanding how they differ from both Codex skills and Claude subagents is critical for making the right architectural choice.

### How Claude Code Skills Differ from Codex Skills

Claude Code skills follow the same Agent Skills open standard as Codex, but they add significant functionality on top. A Claude Code skill is a `SKILL.md` file in a structured directory that can be invoked as a slash command, triggered automatically by the AI, or run in an isolated subagent context.

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template for Claude to fill in
├── examples/
│   └── sample.md      # Example output
└── scripts/
    └── validate.sh    # Script Claude can execute
```

The key difference: Claude Code skills have **frontmatter that controls invocation, tool access, execution context, and model selection**. Codex skills are plain markdown instructions. Claude Code skills are configurable execution units.

```yaml
# Claude Code skill with full configuration
---
name: deploy
description: Deploy the application to production
context: fork
agent: general-purpose
disable-model-invocation: true
allowed-tools: Bash(npm *), Bash(git *)
---

Deploy $ARGUMENTS to production:

1. Run the test suite
2. Build the application
3. Push to the deployment target
4. Verify the deployment succeeded
```

Compare that to the equivalent in Codex — a section in your AGENTS.md file:

```markdown
## Deployment

To deploy:
1. Run the test suite with `pnpm test`
2. Build with `pnpm build`
3. Deploy with `pnpm deploy:production`
```

The Codex version is simpler. The Claude Code version is more powerful. It can run in a forked subagent context (`context: fork`), restrict tool access, prevent the AI from triggering it automatically (`disable-model-invocation: true`), and accept arguments.

### Skill Configuration and Frontmatter

Claude Code skills support a rich set of frontmatter fields:

| Field | Purpose |
|-------|---------|
| `name` | Slash command name (`/deploy`) |
| `description` | Helps Claude decide when to load it automatically |
| `disable-model-invocation` | Only you can trigger it, not the AI |
| `user-invocable` | Set `false` to hide from the `/` menu |
| `allowed-tools` | Restrict which tools the skill can use |
| `model` | Override the session model for this skill |
| `effort` | Override reasoning effort level |
| `context` | Set to `fork` to run in an isolated subagent |
| `agent` | Which subagent type to use with `context: fork` |
| `hooks` | Lifecycle hooks scoped to this skill |
| `paths` | Glob patterns limiting when the skill activates |

**Dynamic context injection** is a standout feature. Skills can run shell commands at load time and inject the output:

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request for reviewers.
```

The `` !`command` `` syntax executes before the skill content reaches Claude. The AI sees actual PR data, not the command that fetched it.

### Skills vs Subagents in Claude Code

This is where the architecture gets nuanced. Skills and subagents in Claude Code are **not competing features** — they are composable. A skill can run inside a subagent, and a subagent can preload skills.

| Approach | System Prompt | Task | When to Use |
|----------|---------------|------|-------------|
| Skill with `context: fork` | From agent type | SKILL.md content | You write the task, pick an agent type |
| Subagent with `skills` field | Subagent's markdown body | Claude's delegation | You define the worker, load reference material |

A **skill with `context: fork`** says: "Here is a specific task. Run it in an isolated environment using this agent type."

A **subagent with `skills`** says: "Here is a specialized worker. Give it this reference material so it can handle delegated tasks."

```yaml
# Subagent that preloads skills as reference material
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---

Implement API endpoints. Follow the conventions and patterns
from the preloaded skills.
```

The skill content is injected into the subagent's context at startup — not just made available for invocation. This gives the subagent domain knowledge without requiring it to discover and load skills during execution.

## Side-by-Side Comparison

### Feature Comparison Table

| Feature | Codex Skills | Cursor Rules | Claude Subagents | Claude Code Skills |
|---------|-------------|--------------|------------------|-------------------|
| **File format** | Plain markdown | `.mdc` with frontmatter | Markdown with YAML frontmatter | Markdown with YAML frontmatter |
| **Invocation** | Always loaded | Auto by glob/flag | Auto by description or explicit | Slash command or auto |
| **Isolation** | None (shared context) | None (shared context) | Full (own context window) | Optional (`context: fork`) |
| **Tool restrictions** | None | None | Yes (allowlist/denylist) | Yes (`allowed-tools`) |
| **Model selection** | Session-wide | Session-wide | Per-subagent | Per-skill |
| **Conditional loading** | By directory level | By glob pattern | By task description | By glob + description |
| **Permission control** | Session-wide modes | IDE-level | Per-subagent modes | Inherits from skill config |
| **Persistent memory** | No | No | Yes (user/project/local) | No (but subagents can) |
| **Supporting files** | No | No | No | Yes (templates, scripts) |
| **Dynamic context** | No | No | No | Yes (`` !`command` ``) |
| **Parallel execution** | No | No | Yes | Yes (via subagents) |
| **Arguments** | No | No | Via delegation message | Yes (`$ARGUMENTS`) |
| **Portability** | High (plain markdown) | Low (Cursor-only) | Low (Claude Code-only) | Medium (Agent Skills standard) |
| **Team sharing** | Git (AGENTS.md) | Git (.cursor/rules/) | Git (.claude/agents/) | Git (.claude/skills/) |
| **Hooks/lifecycle** | No | No | Yes (Pre/PostToolUse) | Yes (scoped hooks) |

### Architecture Comparison

The fundamental architectural difference is about **where the customization lives in the execution pipeline**:

- **Codex and Cursor** operate in a **single context**: instructions (AGENTS.md or .mdc rules) are injected alongside your prompt and code context. Everything shares one context window.
- **Claude subagents** operate in an **isolated context**: the subagent gets its own context window with a custom system prompt and tool restrictions. Only the summary returns to the main conversation.
- **Claude Code skills with `context: fork`** behave like subagents: the skill content becomes the task prompt in a forked context. Without `context: fork`, skills run inline like Codex/Cursor instructions.

### Configuration Syntax Compared

Here is the same concept — "enforce TypeScript strict conventions" — expressed in each system:

**Codex (AGENTS.md):**

```markdown
## TypeScript Conventions
- Enable strict mode in all files
- No `any` types — use `unknown` and narrow
- Prefer interfaces for object shapes
- Use const assertions for literals
```

**Cursor Rules (.cursor/rules/typescript.mdc):**

```markdown
---
description: TypeScript strict conventions
globs: ["**/*.ts", "**/*.tsx"]
alwaysApply: false
---

- Enable strict mode in all TypeScript files
- Never use `any` — use `unknown` and narrow with type guards
- Prefer interfaces over type aliases for object shapes
- Use const assertions for literal types
- Handle all error cases explicitly
```

**Claude Code Skill (.claude/skills/ts-conventions/SKILL.md):**

```yaml
---
name: ts-conventions
description: TypeScript strict conventions for this codebase
user-invocable: false
paths: "**/*.ts, **/*.tsx"
---

When working with TypeScript files in this project:

- Enable strict mode in all files
- Never use `any` — use `unknown` and narrow with type guards
- Prefer interfaces over type aliases for object shapes
- Use const assertions for literal types
- Handle all error cases explicitly
```

**Claude Subagent (.claude/agents/ts-reviewer.md):**

```markdown
---
name: ts-reviewer
description: Reviews TypeScript code for strict typing violations
tools: Read, Grep, Glob
model: haiku
---

You are a TypeScript strict mode reviewer. When invoked, scan files
for typing violations and report them.

Check for:
- Usage of `any` type
- Missing error handling
- Type assertions that bypass safety
- Functions without return type annotations
- Objects that should use interfaces
```

Notice how the same concept maps differently. Codex and Cursor express it as a passive rule. Claude Code skills express it as either a passive rule (`user-invocable: false`) or an invocable workflow. The Claude subagent expresses it as an active worker that can be delegated to.

## Decision Framework: When to Use What

### Use Codex Skills When

**Your priority is simplicity and portability.** If your team uses Codex and you want straightforward project instructions without learning a configuration schema, AGENTS.md is the right choice. Write markdown, commit it, and your agent knows your project.

**You work across multiple AI tools.** Plain markdown instructions in AGENTS.md can serve as useful project documentation that any tool (or any human) can read. The content is not locked to a vendor-specific format.

**Your customization needs are purely instructional.** If you need to tell the agent about your project conventions, build commands, and architecture — but you do not need conditional loading, tool restrictions, or execution isolation — AGENTS.md is sufficient and simpler.

**You are a solo developer or small team.** The single-file approach works well when you do not need the organizational overhead of multiple rule files or agent configurations.

### Use Cursor Rules When

**You live in the Cursor IDE.** If Cursor is your primary editor and you are not using terminal-based agents, rules are the natural customization mechanism. They integrate with autocomplete, inline edits, chat, and Composer sessions.

**You need file-type-specific behavior.** The glob-based targeting in `.mdc` files is the most elegant solution for "use React conventions in component files, use Express conventions in route files." No other system does this as cleanly.

**Your team standardizes on Cursor.** When everyone uses the same editor, `.cursor/rules/` becomes a powerful way to enforce conventions through version control. New team members get the rules automatically.

**You want passive, always-on constraints.** Cursor rules are the right tool for behavioral guardrails that should apply to every AI interaction without explicit invocation. "Always use named exports." "Never use var." "Prefer composition over inheritance." These are constraints, not tasks, and rules handle them better than skills or subagents.

### Use Claude Subagents When

**You need context isolation.** Any task that produces verbose output — running test suites, exploring large codebases, fetching documentation, processing logs — belongs in a subagent. The output stays in the subagent's context; only the summary returns to your conversation.

**You need tool restrictions for safety.** A read-only research agent that cannot edit files. A database agent that only allows SELECT queries. A reviewer that can read but not modify. These constraints are enforced at the system level, not by trusting the AI to follow instructions.

**You want to optimize cost and latency.** Route cheap exploration tasks to Haiku. Reserve Opus for complex reasoning. This is not possible with single-context systems where everything runs on the same model.

**You need parallel execution.** Research three modules simultaneously, each in its own subagent. This is the only system among the three that supports genuine parallelism with isolated contexts.

**Your tasks need persistent memory.** A subagent that accumulates knowledge across sessions — learning your codebase patterns, remembering recurring issues, building institutional knowledge — is something no other system offers.

### Use Claude Code Skills When

**You need reusable workflows with configurable execution.** A deployment skill, a PR summary skill, a code migration skill — tasks you want to invoke on demand with `/skill-name` and optionally run in isolated contexts.

**You want dynamic context at invocation time.** The `` !`command` `` syntax lets skills inject live data (git diffs, PR details, environment info) into their prompts before the AI sees them.

**You need to bridge instructions and execution.** Claude Code skills sit between passive rules and active subagents. They can serve as reference material (`user-invocable: false`) or as invocable workflows with full isolation (`context: fork`).

**You work in a monorepo with package-specific skills.** Skills in nested `.claude/skills/` directories are automatically discovered when working with files in those subdirectories.

## Real-World Workflow Patterns

### Pattern 1: Code Review Pipeline

**With Cursor Rules:**

```markdown
<!-- .cursor/rules/code-review.mdc -->
---
description: Code review standards
alwaysApply: true
---

When reviewing code, always check:
- Error handling completeness
- Input validation
- SQL injection prevention
- Proper use of TypeScript types
```

This is a passive constraint. Every time you interact with Cursor, these review standards color its responses. But you cannot invoke a dedicated review session or get a structured report.

**With Claude Subagent:**

```markdown
---
name: code-reviewer
description: Reviews code for quality, security, and maintainability
tools: Read, Grep, Glob, Bash
model: sonnet
memory: project
---

You are a senior code reviewer. When invoked:
1. Run git diff to see recent changes
2. Analyze each changed file
3. Check for security issues, error handling, and type safety
4. Report findings by severity

Update your memory with patterns you observe.
```

This is an active worker. You can say "review my changes" and Claude delegates to a dedicated subagent that runs a structured review, learns from your codebase over time, and returns organized findings. The review output stays in the subagent's context.

**With Claude Code Skill:**

```yaml
---
name: review
description: Run a code review on recent changes
context: fork
agent: general-purpose
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git *)
---

## Context
- Recent changes: !`git diff --stat HEAD~1`
- Changed files: !`git diff --name-only HEAD~1`

## Review task
Review all changed files for:
1. Security vulnerabilities
2. Error handling gaps
3. Type safety issues
4. Performance concerns

Organize findings by file and severity.
```

This is an invocable workflow with dynamic context. Run `/review` and it fetches the actual diff, injects it into the prompt, and runs the review in an isolated context. The `` !`git diff` `` runs before Claude sees anything.

### Pattern 2: Monorepo with Multiple Frameworks

Consider a monorepo with a React frontend, a Go backend, and a Python data pipeline.

**With Codex:**

```markdown
# AGENTS.md (project root)

## Project Structure
- packages/frontend/ — React/TypeScript frontend
- packages/backend/ — Go API server
- packages/pipeline/ — Python data pipeline

## Frontend Conventions
- Use React functional components
- State management with Zustand
- Testing with Vitest + Testing Library

## Backend Conventions
- Standard Go project layout
- Use chi for routing
- Testing with standard library

## Pipeline Conventions
- Python 3.12+ with type hints
- Use Polars for data processing
- Testing with pytest
```

Every convention loads on every task, regardless of which package you are working in. You can mitigate this with directory-level AGENTS.md files in each package, but the cascade model is limited.

**With Cursor Rules:**

```markdown
<!-- .cursor/rules/frontend.mdc -->
---
description: React frontend conventions
globs: ["packages/frontend/**"]
---

Use React functional components with hooks.
State management with Zustand. Testing with Vitest.
```

```markdown
<!-- .cursor/rules/backend.mdc -->
---
description: Go backend conventions
globs: ["packages/backend/**/*.go"]
---

Standard Go project layout. Use chi for routing.
Error handling with explicit error returns.
```

```markdown
<!-- .cursor/rules/pipeline.mdc -->
---
description: Python pipeline conventions
globs: ["packages/pipeline/**/*.py"]
---

Python 3.12+ with full type hints.
Use Polars for dataframes. Testing with pytest.
```

Each rule loads only when you are working in its scope. This is the cleanest solution for context-aware monorepo conventions.

**With Claude Code:**

```yaml
# packages/frontend/.claude/skills/component-gen/SKILL.md
---
name: component-gen
description: Generate React components following frontend conventions
paths: "packages/frontend/**"
---

Generate a React component with:
- Functional component with typed props
- Zustand store integration if state needed
- Vitest test file co-located
- Storybook story if visual component
```

```yaml
# packages/backend/.claude/skills/endpoint/SKILL.md
---
name: endpoint
description: Generate Go API endpoints following backend conventions
paths: "packages/backend/**"
---

Generate a Go API endpoint with:
- chi route handler
- Request validation
- Error handling with proper HTTP status codes
- Table-driven tests
```

Claude Code skills with `paths` targeting provide both context-aware loading and invocable workflows. You get the targeting of Cursor rules plus the actionability of skills.

### Pattern 3: Multi-Step Deployment

**With Codex:** Document deployment steps in AGENTS.md, but there is no isolation, no tool restrictions, and no way to prevent the agent from running the deployment without approval beyond the session-wide mode.

**With Cursor Rules:** Not applicable. Rules cannot execute workflows.

**With Claude Code Skill + Subagent:**

```yaml
# .claude/skills/deploy/SKILL.md
---
name: deploy
description: Deploy the application to production
context: fork
agent: general-purpose
disable-model-invocation: true
allowed-tools: Bash(npm *), Bash(git *), Bash(aws *)
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-deploy-command.sh"
---

Deploy $ARGUMENTS to production:

1. Verify all tests pass: !`npm test -- --reporter=dot 2>&1 | tail -5`
2. Check current branch: !`git branch --show-current`
3. Build the application
4. Push to the deployment target
5. Run smoke tests against the deployed version
6. Report deployment status
```

This combines multiple features: manual-only invocation (`disable-model-invocation`), isolated execution (`context: fork`), tool restrictions (`allowed-tools`), pre-execution validation (hooks), and dynamic context (`` !`command` ``). No other system comes close to this level of deployment workflow control.

## Making Multiple Systems Work Together

If your team uses multiple AI coding tools — and most teams do — you need a strategy for keeping instructions in sync without duplicating everything.

**The shared documentation pattern.** Maintain a single source of truth for project conventions as plain markdown in a `docs/conventions/` directory. Then have each tool's configuration reference or mirror the relevant sections:

```
docs/conventions/
├── typescript.md    # Source of truth
├── testing.md       # Source of truth
└── api-design.md    # Source of truth
AGENTS.md            # References docs/
.cursor/rules/       # Mirrors relevant sections with glob targeting
.claude/skills/      # References or loads docs
CLAUDE.md            # References docs/
```

Each tool's config becomes a thin adapter pointing at canonical docs. The maintenance cost is real, but far lower than maintaining completely independent instruction sets.

**A practical sync strategy:**

1. Write your conventions once in `docs/conventions/`
2. Keep tool-specific configs minimal — reference the docs rather than duplicating content
3. Use CI to check that tool configs stay current (a simple hash check of the docs files)
4. When conventions change, update the docs first, then update the tool configs

## Frequently Asked Questions

**Can I use Codex skills and Claude subagents in the same project?**

Yes. They live in different directories and are read by different tools. Each tool reads its own configuration files and ignores the others. The key is keeping the underlying conventions consistent across both.

**Are Cursor rules just a simpler version of Claude Code skills?**

No. Cursor rules are passive constraints applied to every AI interaction. Claude Code skills are invocable workflows that can run in isolated contexts. A Cursor rule says "always do X." A skill says "when invoked, perform this multi-step task." You might want both.

**Do Claude subagents replace CLAUDE.md?**

No. CLAUDE.md provides persistent context loaded into every session — project conventions, build commands, architecture decisions. Subagents are specialized workers for delegated tasks. They are complementary. Your CLAUDE.md tells Claude how your project works. Your subagents tell Claude how to handle specific types of work.

**What happens if a Claude subagent and a Claude Code skill have the same name?**

They coexist without conflict since they live in different directories (`.claude/agents/` vs `.claude/skills/`). Skills are invoked as slash commands. Subagents are invoked through delegation.

**Can I convert Cursor rules to Claude Code skills?**

Conceptually, yes. A Cursor rule with glob targeting maps to a Claude Code skill with the `paths` field and `user-invocable: false`. The syntax differs, but the intent translates directly.

**What is the Agent Skills open standard?**

The Agent Skills standard (agentskills.io) is a community specification for portable AI agent instructions. Both Codex and Claude Code support it. The standard defines a `SKILL.md` file format with optional frontmatter. Claude Code extends the standard with additional features like invocation control, subagent execution, and dynamic context injection.

**Should I use `context: fork` on every Claude Code skill?**

No. Use `context: fork` when the skill produces verbose output or needs isolation. For reference skills that provide conventions or patterns, running inline is better — the information stays in your main conversation context where Claude can apply it to subsequent work.

**Can Claude subagents spawn other subagents?**

No. Subagents cannot spawn other subagents. If your workflow requires nested delegation, use skills or chain subagents from the main conversation. For parallel work across independent sessions, Claude Code's agent teams feature coordinates separate sessions rather than nesting subagents.

**How do Cursor rules handle monorepos compared to Claude Code?**

Cursor uses glob patterns in `.mdc` files to target directories. Claude Code uses the `paths` field in skill frontmatter plus automatic discovery of nested `.claude/skills/` directories. Cursor is simpler for passive rules. Claude Code is more powerful for invocable, package-specific workflows.

**What is the performance impact of many rules vs many skills?**

Cursor rules matching the current context load fully into the system prompt. Claude Code skill descriptions are loaded (capped at 250 characters each), but full content only loads when invoked. Claude Code is more token-efficient for large collections.

## Key Takeaways

The choice between **Codex skills**, **Cursor rules**, **Claude subagents**, and **Claude Code skills** is not about which is "best." It is about matching the abstraction to the problem.

**Codex skills (AGENTS.md)** are the right choice when you want simplicity, portability, and straightforward project instructions without vendor lock-in. They are instructions, not execution environments. Use them for project conventions that any tool or developer can read.

**Cursor rules** are the right choice when you want ambient, file-type-aware constraints that apply passively to every AI interaction in the IDE. They are the most elegant solution for "this part of the codebase follows these conventions." Use them when your team standardizes on Cursor and needs glob-targeted behavioral guardrails.

**Claude subagents** are the right choice when you need isolated execution, tool restrictions, model routing, parallel execution, or persistent memory. They are workers, not instructions. Use them for delegated tasks that benefit from separation: code review, debugging, research, data analysis.

**Claude Code skills** are the right choice when you need reusable, invocable workflows with optional isolation. They bridge the gap between passive instructions and active workers. Use them for specific tasks you want to trigger on demand — deployments, PR summaries, code generation — especially when those tasks benefit from dynamic context injection.

The real power comes from combining them. Use CLAUDE.md or AGENTS.md for persistent project context. Use Cursor rules or Claude Code skill `paths` for file-type-aware conventions. Use subagents for heavyweight delegated work. Use skills for repeatable workflows.

**AI workflow design** is not about picking one tool and mastering it. It is about understanding what each abstraction does well and composing them into a system that handles your actual workflow. The developers who get the most out of these tools are the ones who stop asking "which is best?" and start asking "which is right for this specific job?"

Start with the simplest system that solves your problem. Add complexity only when you hit a limitation. And when you do hit a limitation, now you know exactly which system to reach for.
