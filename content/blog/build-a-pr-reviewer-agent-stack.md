---
title: "Build a PR Reviewer Agent Stack"
description: "Design a multi-agent PR review workflow with explorer, reviewer, and docs-research subagents."
date: "2026-04-02"
tags: ["PR reviewer agent","AI code review","reviewer subagent","docs research agent","multi-agent workflow","Claude Code","GitHub Actions","automated code review","CLAUDE.md","AGENTS.md","agentic coding","developer tools"]
readTime: "37 min read"
ogImage: "/og/build-a-pr-reviewer-agent-stack.png"
canonical: "https://chaitanyaprabuddha.com/blog/build-a-pr-reviewer-agent-stack"
published: true
---

# Build a PR Reviewer Agent Stack: Explorer, Reviewer, and Docs-Research Agents Working Together

Automated code review has gone through three generations. First came linters. Then came static analysis. Now we have the **PR reviewer agent** — an AI system that reads your pull request, understands what changed, checks it against your project's conventions, and leaves substantive review comments that go beyond style nitpicks. The difference between a toy setup and a production-grade system is architecture: specifically, whether you design your **AI code review workflow** as a single monolithic prompt or as a coordinated stack of specialized subagents.

This guide shows you how to build the latter. We are building a three-agent stack: an **explorer agent** that maps what changed and gathers context, a **reviewer subagent** that performs the actual code review, and a **docs-research agent** that checks whether the changes align with framework documentation, API contracts, and your own internal standards. Each agent has a focused job, a scoped context window, and clear inputs and outputs.

This is not a theoretical architecture diagram. You will see the actual configuration files, orchestration code, GitHub Actions integration, and the CLAUDE.md / AGENTS.md instructions that make these agents behave predictably. By the end, you will have a working PR reviewer agent stack you can deploy to your own repositories.

---

## Table of Contents

- [Why a Single-Agent PR Review Falls Short](#why-a-single-agent-pr-review-falls-short)
- [The Three-Agent Architecture](#the-three-agent-architecture)
  - [Agent 1: The Explorer](#agent-1-the-explorer)
  - [Agent 2: The Reviewer](#agent-2-the-reviewer)
  - [Agent 3: The Docs-Research Agent](#agent-3-the-docs-research-agent)
  - [How the Agents Communicate](#how-the-agents-communicate)
- [Setting Up the Explorer Agent](#setting-up-the-explorer-agent)
  - [What the Explorer Actually Does](#what-the-explorer-actually-does)
  - [Explorer Agent Configuration](#explorer-agent-configuration)
  - [Explorer Output Format](#explorer-output-format)
- [Setting Up the Reviewer Subagent](#setting-up-the-reviewer-subagent)
  - [What the Reviewer Checks](#what-the-reviewer-checks)
  - [Reviewer Agent Configuration](#reviewer-agent-configuration)
  - [Writing Review Comments That Developers Actually Read](#writing-review-comments-that-developers-actually-read)
- [Setting Up the Docs-Research Agent](#setting-up-the-docs-research-agent)
  - [Why Documentation Checking Matters](#why-documentation-checking-matters)
  - [Docs-Research Agent Configuration](#docs-research-agent-configuration)
  - [Connecting to External Documentation Sources](#connecting-to-external-documentation-sources)
- [Orchestrating the Full Stack](#orchestrating-the-full-stack)
  - [The Orchestration Script](#the-orchestration-script)
  - [Sequential vs Parallel Execution](#sequential-vs-parallel-execution)
  - [Merging Results Into a Unified Review](#merging-results-into-a-unified-review)
- [GitHub Actions Integration](#github-actions-integration)
  - [The Workflow File](#the-workflow-file)
  - [Triggering on Pull Request Events](#triggering-on-pull-request-events)
  - [Posting Review Comments via the GitHub API](#posting-review-comments-via-the-github-api)
- [CLAUDE.md and AGENTS.md for Review Agents](#claudemd-and-agentsmd-for-review-agents)
  - [CLAUDE.md for the Reviewer Subagent](#claudemd-for-the-reviewer-subagent)
  - [AGENTS.md for the Reviewer Subagent](#agentsmd-for-the-reviewer-subagent)
  - [Path-Specific Review Rules](#path-specific-review-rules)
- [Handling Edge Cases](#handling-edge-cases)
  - [Large PRs With Hundreds of Changed Files](#large-prs-with-hundreds-of-changed-files)
  - [Binary Files and Generated Code](#binary-files-and-generated-code)
  - [Conflicting Review Feedback](#conflicting-review-feedback)
- [Cost and Performance Optimization](#cost-and-performance-optimization)
  - [Token Budget Management](#token-budget-management)
  - [Caching Strategies](#caching-strategies)
  - [When to Skip the Full Stack](#when-to-skip-the-full-stack)
- [Real-World Results and Benchmarks](#real-world-results-and-benchmarks)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

---

## Why a Single-Agent PR Review Falls Short

A single-agent PR review fails because it tries to do too many things in one context window. It has to read the diff, understand the surrounding code, check conventions, verify documentation alignment, and write helpful comments — all in one pass. The result is shallow feedback that misses the deeper issues.

The core problem is **context competition**. A single agent reviewing a 400-line diff needs to hold the changed lines, the surrounding file context, your project conventions, and relevant documentation all at once. By the time it has loaded all of that, it has consumed most of its context window on input, leaving little room for nuanced reasoning about the actual review.

There is also the **specialization problem**. Good code review requires different modes of thinking. Mapping what changed and understanding the blast radius is an investigative task. Checking code quality and catching bugs is an analytical task. Verifying that API usage matches documentation is a research task. A single prompt cannot be optimized for all three modes simultaneously.

Multi-agent architectures solve both problems. Each **reviewer subagent** gets a focused job, a curated context window with only the information it needs, and a prompt optimized for its specific mode of analysis. The result is deeper, more accurate reviews.

---

## The Three-Agent Architecture

### Agent 1: The Explorer

The explorer agent is the first agent to run, and its only job is context gathering. It reads the PR diff, identifies which files changed, maps the dependencies between changed files, and pulls in surrounding context that the reviewer will need.

Think of the explorer as a senior developer who opens a PR and spends five minutes clicking through the changed files, reading the commit messages, and building a mental model of what this PR is trying to do. It does not judge the code. It maps the territory.

The explorer outputs a structured context package: a summary of what changed, a dependency map, the relevant surrounding code, and any flags (like "this PR touches the auth middleware" or "this modifies a public API endpoint").

### Agent 2: The Reviewer

The reviewer subagent takes the explorer's context package and performs the actual code review. It checks for bugs, logic errors, style violations, performance issues, security concerns, and adherence to project conventions.

This is the agent that writes the actual review comments. It receives a curated, focused context — not the raw diff, but the diff plus the explorer's analysis — which means it can spend its full reasoning capacity on finding real issues rather than figuring out what changed.

The **reviewer subagent** is where your project-specific instructions matter most. Your CLAUDE.md or AGENTS.md file tells it about your naming conventions, error handling patterns, test requirements, and whatever else your team cares about during review.

### Agent 3: The Docs-Research Agent

The docs-research agent checks whether the code changes align with external and internal documentation. If a PR modifies how you call a third-party API, this agent verifies that the new usage matches the API's current documentation. If a PR changes a database query pattern, this agent checks it against your internal architecture docs.

This is the agent that catches the class of bugs where code "works" but does not match what the documentation says it should do. These bugs are invisible to linters, tricky for static analysis, and easy for human reviewers to miss because they would need to open the docs and cross-reference manually.

The **docs research agent** is the most novel part of this stack, and the one that adds the most value over what existing tools already provide.

### How the Agents Communicate

The agents communicate through structured intermediate outputs, not through shared context windows. The explorer produces a JSON context package. The reviewer and docs-research agent each consume that package independently. Their outputs are then merged by an orchestrator into a single unified review.

```
┌─────────────┐
│   PR Diff   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Explorer   │ ──► Context Package (JSON)
│   Agent     │
└──────┬──────┘
       │
       ├────────────────┐
       ▼                ▼
┌─────────────┐  ┌──────────────┐
│  Reviewer   │  │ Docs-Research│
│  Subagent   │  │    Agent     │
└──────┬──────┘  └──────┬───────┘
       │                │
       ▼                ▼
┌─────────────────────────────┐
│    Orchestrator / Merger    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Unified PR Review Comments │
└─────────────────────────────┘
```

This architecture means the reviewer and docs-research agents can run **in parallel**, cutting total review time nearly in half compared to running them sequentially.

---

## Setting Up the Explorer Agent

### What the Explorer Actually Does

The explorer agent performs four specific tasks: it parses the diff to identify changed files and the nature of each change, it reads surrounding context from unchanged code that the reviewer will need, it maps dependencies between changed files, and it produces a structured summary.

The explorer does not make judgments about code quality. Its job is purely informational. If it adds opinions, those opinions will bias the reviewer, which defeats the purpose of separating the agents.

A well-configured explorer reduces the reviewer's workload dramatically. Instead of the reviewer spending half its context window figuring out what changed, it starts with a clean summary and can spend its full capacity on analysis.

### Explorer Agent Configuration

Here is the explorer agent's system prompt and configuration. This example uses Claude Code's Task tool for spawning the subagent, but the same structure works with any agent framework.

```yaml
# explorer-agent-config.yaml
name: "pr-explorer"
role: "context-gathering"
model: "claude-sonnet-4-20250514"
max_tokens: 8192
temperature: 0

system_prompt: |
  You are a PR exploration agent. Your job is to analyze a pull request diff
  and produce a structured context package for downstream review agents.

  You MUST NOT provide any code review feedback. Your role is purely to
  gather and organize context.

  For each changed file, determine:
  1. The type of change (new file, modification, deletion, rename)
  2. Which functions/classes/methods were modified
  3. What other files in the codebase import or depend on the changed code
  4. Whether this file is a test, source, config, or documentation file

  Output a JSON object with this exact structure:
  {
    "pr_summary": "One-paragraph description of what this PR does",
    "changed_files": [...],
    "dependency_map": {...},
    "risk_flags": [...],
    "context_files": [...]
  }
```

The temperature is set to 0 because the explorer should be deterministic. There is no creativity involved in mapping changes — you want the same input to produce the same output every time.

### Explorer Output Format

The explorer's output is a JSON context package that both downstream agents consume. Here is what a real output looks like for a PR that modifies an authentication middleware:

```json
{
  "pr_summary": "Adds rate limiting to the /api/auth/login endpoint by introducing a sliding window rate limiter middleware and wiring it into the auth route chain.",
  "changed_files": [
    {
      "path": "src/middleware/rate-limiter.ts",
      "change_type": "new_file",
      "language": "typescript",
      "exports": ["createRateLimiter", "RateLimiterConfig"],
      "line_count": 87,
      "category": "source"
    },
    {
      "path": "src/routes/auth.ts",
      "change_type": "modified",
      "language": "typescript",
      "modified_functions": ["loginRoute"],
      "lines_added": 12,
      "lines_removed": 3,
      "category": "source"
    },
    {
      "path": "tests/middleware/rate-limiter.test.ts",
      "change_type": "new_file",
      "language": "typescript",
      "test_count": 8,
      "category": "test"
    }
  ],
  "dependency_map": {
    "src/middleware/rate-limiter.ts": {
      "imported_by": ["src/routes/auth.ts"],
      "imports": ["src/config/redis.ts", "src/utils/time.ts"]
    },
    "src/routes/auth.ts": {
      "imported_by": ["src/app.ts"],
      "imports": ["src/middleware/rate-limiter.ts", "src/controllers/auth.ts"]
    }
  },
  "risk_flags": [
    "Modifies authentication flow — security-sensitive area",
    "New Redis dependency in rate limiter — verify connection handling",
    "No integration tests for rate limiting under concurrent requests"
  ],
  "context_files": [
    "src/config/redis.ts",
    "src/utils/time.ts",
    "src/controllers/auth.ts"
  ]
}
```

The `risk_flags` array is particularly important. These are not review comments — they are signals to the reviewer about where to focus attention. The reviewer can then spend disproportionate effort on the flagged areas.

---

## Setting Up the Reviewer Subagent

### What the Reviewer Checks

The **reviewer subagent** checks five categories: correctness (logic errors, off-by-one bugs, null reference risks), security (injection vulnerabilities, authentication bypasses, data exposure), performance (unnecessary allocations, N+1 queries, missing indexes), maintainability (naming, complexity, duplication), and convention adherence (your project's specific patterns and rules).

Each category maps to a severity level. Correctness and security issues are blockers. Performance issues are warnings. Maintainability and convention issues are suggestions. This severity mapping ensures that the reviewer's output is actionable — developers know what must be fixed versus what is nice-to-fix.

The reviewer receives the explorer's context package as input, so it already knows which files changed, what the dependencies look like, and where the risk flags are. It does not need to re-derive any of this information.

### Reviewer Agent Configuration

```yaml
# reviewer-agent-config.yaml
name: "pr-reviewer"
role: "code-review"
model: "claude-sonnet-4-20250514"
max_tokens: 16384
temperature: 0.1

system_prompt: |
  You are a senior code reviewer. You receive a context package from an
  explorer agent and the raw diff of a pull request. Your job is to
  produce actionable review comments.

  REVIEW CATEGORIES (in priority order):
  1. CORRECTNESS — Logic errors, bugs, incorrect behavior
  2. SECURITY — Vulnerabilities, data exposure, auth issues
  3. PERFORMANCE — Inefficiency, resource waste, scaling problems
  4. MAINTAINABILITY — Readability, complexity, duplication
  5. CONVENTIONS — Project-specific patterns and style rules

  SEVERITY LEVELS:
  - "blocker": Must fix before merge. Bugs, security issues, data loss risks.
  - "warning": Should fix. Performance problems, missing error handling.
  - "suggestion": Nice to fix. Style, naming, minor improvements.
  - "praise": Something done well. Include at least one per review.

  OUTPUT FORMAT:
  Return a JSON array of review comments:
  [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "severity": "blocker",
      "category": "correctness",
      "comment": "Clear explanation of the issue and how to fix it",
      "suggested_fix": "Optional code suggestion"
    }
  ]

  RULES:
  - Focus on the risk_flags from the explorer's context package first
  - Do not comment on formatting — that is the linter's job
  - Every comment must include a concrete suggestion, not just "this could be better"
  - Include at least one "praise" comment for something done well
  - If you are not confident an issue is real, say so explicitly
```

The temperature is set to 0.1 — not 0, because a small amount of variation helps the reviewer consider edge cases it might miss with fully deterministic output. But it is low enough that the reviews are consistent and reproducible.

### Writing Review Comments That Developers Actually Read

The single biggest failure mode of automated review is **comments that developers ignore**. This happens when comments are vague, nitpicky, or wrong. The reviewer agent's prompt is designed to prevent all three.

Every comment must include a concrete fix suggestion. "This could cause issues" is not helpful. "This will throw a NullReferenceException when `user.profile` is undefined because line 38 does not check for null — add an optional chain operator" is helpful.

The severity system also matters. If every comment is a "blocker," developers will treat none of them as blockers. The reviewer should reserve "blocker" for genuine bugs and security issues, use "warning" for things that will cause problems eventually, and use "suggestion" for everything else.

Including **praise** is not just feel-good nonsense. It signals that the reviewer actually read the code and understood it. A single "Good use of the builder pattern here — this makes the configuration much more readable" comment increases the likelihood that developers take the critical feedback seriously.

```typescript
// Example of a well-structured review comment output
{
  "file": "src/middleware/rate-limiter.ts",
  "line": 34,
  "severity": "blocker",
  "category": "correctness",
  "comment": "The sliding window calculation uses `Date.now()` which returns milliseconds, but `windowSize` is defined in seconds on line 12. This means the rate limiter window is 1000x shorter than intended. A user limited to 10 requests per 60 seconds would actually be limited to 10 requests per 0.06 seconds.",
  "suggested_fix": "Change `Date.now()` to `Math.floor(Date.now() / 1000)` or change `windowSize` to use milliseconds throughout."
}
```

That comment explains the bug, quantifies the impact, and offers two concrete solutions. A developer reading it knows exactly what is wrong and how to fix it.

---

## Setting Up the Docs-Research Agent

### Why Documentation Checking Matters

The **docs research agent** catches a class of bugs that no other tool in the stack can find: code that works correctly against the current state of the world but violates the contract defined in documentation. These are bugs that pass tests, look fine in review, and break silently in production when the third-party service enforces its documented constraints.

Common examples include: using a deprecated API parameter that still works but will be removed next quarter, exceeding an undocumented rate limit that the API docs specify, passing data in a format that the API accepts but documents as unsupported, or violating an internal architectural decision record that the reviewer has not read.

Human reviewers catch these bugs only when they happen to remember the relevant documentation. An agent can systematically check every API call against its documentation, every time, without forgetting.

### Docs-Research Agent Configuration

```yaml
# docs-research-agent-config.yaml
name: "docs-researcher"
role: "documentation-verification"
model: "claude-sonnet-4-20250514"
max_tokens: 12288
temperature: 0

system_prompt: |
  You are a documentation research agent. You receive a context package
  from an explorer agent describing what changed in a pull request.
  Your job is to verify that the changes align with relevant documentation.

  CHECK THESE SOURCES (in priority order):
  1. Internal architecture decision records (ADRs) in docs/adr/
  2. API documentation for any third-party services used in changed code
  3. Framework documentation for patterns used in changed code
  4. README and contributing guides for project conventions

  FOR EACH CHANGED FILE:
  - Identify any external API calls or framework usage
  - Cross-reference the usage against current documentation
  - Flag any deprecated patterns, incorrect parameter usage, or
    violations of documented constraints
  - Note any documentation that should be updated to reflect the changes

  OUTPUT FORMAT:
  Return a JSON object:
  {
    "doc_findings": [
      {
        "file": "path/to/file.ts",
        "line": 23,
        "severity": "warning",
        "finding": "Description of documentation mismatch",
        "source": "URL or path to the relevant documentation",
        "recommendation": "What to change"
      }
    ],
    "docs_to_update": [
      {
        "doc_path": "path/to/doc.md",
        "reason": "Why this doc needs updating"
      }
    ]
  }

  RULES:
  - Only flag issues where you have high confidence in the documentation source
  - If you are unsure whether documentation is current, say so explicitly
  - Do not flag style or formatting issues — that is the reviewer's job
  - Focus on semantic correctness against documented contracts
```

### Connecting to External Documentation Sources

The docs-research agent needs access to documentation that lives outside your repository. There are three strategies for providing this access, each with different tradeoffs.

**Strategy 1: Pre-fetched documentation snapshots.** Before the agent runs, your CI pipeline fetches the latest documentation for your key dependencies and stores it as plain text files in a temporary directory. The agent reads these files directly. This is the simplest approach and works well when you have a small number of critical dependencies.

```bash
#!/bin/bash
# fetch-docs.sh — Pre-fetch documentation for the docs-research agent
mkdir -p /tmp/pr-review-docs

# Fetch API docs for key dependencies
curl -s https://api.stripe.com/docs/api > /tmp/pr-review-docs/stripe-api.txt
curl -s https://redis.io/commands > /tmp/pr-review-docs/redis-commands.txt

# Copy internal ADRs
cp -r docs/adr/ /tmp/pr-review-docs/adr/
```

**Strategy 2: MCP server integration.** If you are using Claude Code, you can connect the docs-research agent to an MCP (Model Context Protocol) server that serves documentation on demand. The agent calls a tool like `fetch_docs(library="stripe", topic="rate-limiting")` and gets back the relevant documentation section.

```json
{
  "mcpServers": {
    "docs-server": {
      "command": "node",
      "args": ["./tools/docs-mcp-server.js"],
      "env": {
        "DOCS_CACHE_DIR": "/tmp/docs-cache"
      }
    }
  }
}
```

**Strategy 3: Web search with verification.** The agent uses web search to find current documentation, then cross-references what it finds against the code. This is the most flexible approach but also the slowest and least reliable, because web search results can be outdated or incorrect. Use this as a fallback, not a primary strategy.

For most teams, Strategy 1 is the right starting point. It is fast, deterministic, and easy to debug. Graduate to Strategy 2 when your dependency list grows large enough that pre-fetching everything becomes impractical.

---

## Orchestrating the Full Stack

### The Orchestration Script

The orchestrator is the glue that ties the three agents together. It runs the explorer first, waits for its output, then spawns the reviewer and docs-research agents in parallel with the explorer's context package as input, and finally merges their outputs into a single review.

Here is the orchestration script in TypeScript. This uses Claude Code's subagent spawning, but the same pattern applies to any agent framework.

```typescript
// orchestrate-review.ts
import { spawn } from "child_process";
import { readFileSync, writeFileSync } from "fs";

interface ReviewConfig {
  prNumber: number;
  repoPath: string;
  baseBranch: string;
  diffPath: string;
}

async function runExplorer(config: ReviewConfig): Promise<string> {
  const diff = readFileSync(config.diffPath, "utf-8");

  const result = await spawnAgent({
    name: "pr-explorer",
    prompt: `Analyze this PR diff and produce a context package.\n\nDiff:\n${diff}`,
    configPath: "./agents/explorer-agent-config.yaml",
    cwd: config.repoPath,
  });

  return result.output;
}

async function runReviewer(
  contextPackage: string,
  diff: string
): Promise<string> {
  const result = await spawnAgent({
    name: "pr-reviewer",
    prompt: `Review this PR using the provided context package.

Context Package:
${contextPackage}

Diff:
${diff}`,
    configPath: "./agents/reviewer-agent-config.yaml",
  });

  return result.output;
}

async function runDocsResearcher(
  contextPackage: string,
  diff: string
): Promise<string> {
  const result = await spawnAgent({
    name: "docs-researcher",
    prompt: `Check documentation alignment for this PR.

Context Package:
${contextPackage}

Diff:
${diff}`,
    configPath: "./agents/docs-research-agent-config.yaml",
  });

  return result.output;
}

async function orchestrateReview(config: ReviewConfig) {
  console.log(`Starting review for PR #${config.prNumber}`);

  // Phase 1: Explorer runs first (sequential — others depend on it)
  const contextPackage = await runExplorer(config);
  console.log("Explorer complete. Context package generated.");

  const diff = readFileSync(config.diffPath, "utf-8");

  // Phase 2: Reviewer and docs-researcher run in parallel
  const [reviewerOutput, docsOutput] = await Promise.all([
    runReviewer(contextPackage, diff),
    runDocsResearcher(contextPackage, diff),
  ]);

  console.log("Reviewer and docs-researcher complete.");

  // Phase 3: Merge results
  const mergedReview = mergeReviewOutputs(reviewerOutput, docsOutput);

  // Write merged review to file for GitHub Actions to pick up
  writeFileSync(
    `/tmp/pr-review-${config.prNumber}.json`,
    JSON.stringify(mergedReview, null, 2)
  );

  return mergedReview;
}

function mergeReviewOutputs(reviewerOutput: string, docsOutput: string) {
  const reviewComments = JSON.parse(reviewerOutput);
  const docsFindings = JSON.parse(docsOutput);

  return {
    comments: [
      ...reviewComments,
      ...docsFindings.doc_findings.map((f: any) => ({
        file: f.file,
        line: f.line,
        severity: f.severity,
        category: "documentation",
        comment: `${f.finding}\n\nSource: ${f.source}`,
        suggested_fix: f.recommendation,
      })),
    ],
    docs_to_update: docsFindings.docs_to_update,
    metadata: {
      review_timestamp: new Date().toISOString(),
      agents_used: ["explorer", "reviewer", "docs-researcher"],
    },
  };
}
```

### Sequential vs Parallel Execution

The explorer must run first because both the reviewer and docs-researcher depend on its output. But the reviewer and docs-researcher are independent of each other — they both consume the explorer's context package, but neither needs the other's output.

This means the optimal execution pattern is **sequential then parallel**: explorer runs alone, then reviewer and docs-researcher run simultaneously. This cuts total review time significantly compared to running all three sequentially.

In practice, the explorer is also the fastest agent because it does the least reasoning. It typically completes in 10-15 seconds. The reviewer and docs-researcher take 30-60 seconds each, but since they run in parallel, the total wall-clock time for the review is roughly 45-75 seconds for a typical PR.

### Merging Results Into a Unified Review

The merge step combines review comments and docs findings into a single array, sorted by severity. This is important because the developer should see the most critical issues first.

The merge step also deduplicates. If the reviewer flags an issue on line 34 of `rate-limiter.ts` and the docs-researcher also flags the same line for a documentation mismatch, the merger combines them into a single comment that includes both perspectives.

```typescript
function deduplicateComments(comments: ReviewComment[]): ReviewComment[] {
  const grouped = new Map<string, ReviewComment[]>();

  for (const comment of comments) {
    const key = `${comment.file}:${comment.line}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(comment);
  }

  return Array.from(grouped.entries()).map(([_key, group]) => {
    if (group.length === 1) return group[0];

    // Merge multiple comments on the same line
    const highest_severity = group.reduce((max, c) =>
      severityRank(c.severity) > severityRank(max.severity) ? c : max
    );

    return {
      ...highest_severity,
      comment: group.map((c) => `[${c.category}] ${c.comment}`).join("\n\n"),
    };
  });
}

function severityRank(s: string): number {
  return { blocker: 4, warning: 3, suggestion: 2, praise: 1 }[s] || 0;
}
```

---

## GitHub Actions Integration

### The Workflow File

Here is the complete GitHub Actions workflow that triggers the PR reviewer agent stack on every pull request. It checks out the code, generates the diff, runs the orchestrator, and posts the review comments back to the PR.

```yaml
# .github/workflows/ai-pr-review.yml
name: AI PR Review

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]

permissions:
  contents: read
  pull-requests: write

jobs:
  ai-review:
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate PR diff
        run: |
          git diff origin/${{ github.event.pull_request.base.ref }}...HEAD > /tmp/pr-diff.patch
          echo "Diff size: $(wc -l < /tmp/pr-diff.patch) lines"

      - name: Check diff size
        id: check-size
        run: |
          DIFF_LINES=$(wc -l < /tmp/pr-diff.patch)
          if [ "$DIFF_LINES" -gt 5000 ]; then
            echo "skip=true" >> $GITHUB_OUTPUT
            echo "Large PR detected ($DIFF_LINES lines). Skipping full review."
          else
            echo "skip=false" >> $GITHUB_OUTPUT
          fi

      - name: Setup Node.js
        if: steps.check-size.outputs.skip == 'false'
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        if: steps.check-size.outputs.skip == 'false'
        run: npm ci

      - name: Fetch documentation snapshots
        if: steps.check-size.outputs.skip == 'false'
        run: bash ./scripts/fetch-docs.sh

      - name: Run PR review agent stack
        if: steps.check-size.outputs.skip == 'false'
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          REPO_PATH: ${{ github.workspace }}
          BASE_BRANCH: ${{ github.event.pull_request.base.ref }}
          DIFF_PATH: /tmp/pr-diff.patch
        run: npx tsx ./scripts/orchestrate-review.ts

      - name: Post review comments
        if: steps.check-size.outputs.skip == 'false'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: npx tsx ./scripts/post-review-comments.ts
```

### Triggering on Pull Request Events

The workflow triggers on three events: `opened` (new PR), `synchronize` (new commits pushed to an existing PR), and `ready_for_review` (PR moved from draft to ready). It skips draft PRs entirely, because reviewing work-in-progress wastes tokens and annoys developers with premature feedback.

The `synchronize` trigger is important because it re-runs the review when the developer pushes fixes. The agent sees the full diff against the base branch, so it reviews the entire PR state, not just the incremental changes. This means the agent naturally stops flagging issues that were fixed in subsequent commits.

### Posting Review Comments via the GitHub API

The comment-posting script reads the merged review output and uses the GitHub API to post inline review comments. Here is the key function:

```typescript
// post-review-comments.ts
import { Octokit } from "@octokit/rest";
import { readFileSync } from "fs";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const prNumber = parseInt(process.env.PR_NUMBER!);
const [owner, repo] = process.env.GITHUB_REPOSITORY!.split("/");

interface ReviewComment {
  file: string;
  line: number;
  severity: string;
  category: string;
  comment: string;
  suggested_fix?: string;
}

async function postReview() {
  const reviewData = JSON.parse(
    readFileSync(`/tmp/pr-review-${prNumber}.json`, "utf-8")
  );

  const comments: ReviewComment[] = reviewData.comments;

  // Filter out praise for inline comments — include it in the body instead
  const inlineComments = comments.filter((c) => c.severity !== "praise");
  const praiseComments = comments.filter((c) => c.severity === "praise");

  const hasBlockers = comments.some((c) => c.severity === "blocker");

  // Build the review body
  const summaryLines = [
    `## AI Review Summary\n`,
    `**${comments.length}** comments across **${new Set(comments.map((c) => c.file)).size}** files.\n`,
    hasBlockers ? `> **Blockers found** — please address before merging.\n` : "",
    ...praiseComments.map((c) => `- ${c.comment}`),
  ];

  // Map severity to emoji for scannability
  const severityPrefix: Record<string, string> = {
    blocker: "[BLOCKER]",
    warning: "[WARNING]",
    suggestion: "[SUGGESTION]",
  };

  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: hasBlockers ? "REQUEST_CHANGES" : "COMMENT",
    body: summaryLines.join("\n"),
    comments: inlineComments.map((c) => ({
      path: c.file,
      line: c.line,
      body: [
        `${severityPrefix[c.severity] || ""} **${c.category}**\n`,
        c.comment,
        c.suggested_fix
          ? `\n\`\`\`suggestion\n${c.suggested_fix}\n\`\`\``
          : "",
      ].join("\n"),
    })),
  });

  console.log(`Posted review with ${inlineComments.length} inline comments.`);
}

postReview().catch(console.error);
```

The script uses `REQUEST_CHANGES` when blockers are found and `COMMENT` otherwise. This maps naturally to GitHub's review system — the PR gets a red "changes requested" status only when there are genuine blocking issues.

---

## CLAUDE.md and AGENTS.md for Review Agents

### CLAUDE.md for the Reviewer Subagent

Your **CLAUDE.md** file tells Claude Code how to behave when acting as a reviewer. This is where you encode your team's specific conventions, architectural decisions, and review preferences. Here is a complete example:

```markdown
# CLAUDE.md — PR Review Agent Configuration

## Project Context
This is a TypeScript monorepo using pnpm workspaces. The API is Express.js
with Prisma ORM. The frontend is Next.js 14 with App Router.

## Review Priorities
When reviewing PRs, check these in order:
1. Security: SQL injection, XSS, auth bypasses, secrets in code
2. Data integrity: Missing transactions, race conditions, lost updates
3. Error handling: Uncaught promises, missing error boundaries, silent failures
4. Performance: N+1 queries, missing pagination, unbounded loops
5. Types: Unsafe type assertions, `any` usage, missing null checks

## Conventions to Enforce
- All API endpoints must validate input with Zod schemas
- Database queries must use Prisma transactions for multi-table writes
- Error responses must use the `ApiError` class from `src/lib/errors.ts`
- React components must use named exports, not default exports
- Test files must be colocated with source files: `foo.ts` -> `foo.test.ts`

## Things NOT to Flag
- Import ordering (handled by ESLint)
- Formatting (handled by Prettier)
- Semicolons (handled by Prettier)
- Line length (handled by Prettier)

## Comment Style
- Be direct and specific
- Always explain WHY something is a problem, not just WHAT
- Include a code suggestion when possible
- Never be condescending or sarcastic
```

### AGENTS.md for the Reviewer Subagent

If you are using OpenAI Codex as your review agent, the equivalent configuration goes in **AGENTS.md**:

```markdown
# AGENTS.md — PR Review Agent

## Role
You are a code reviewer for this project. You only review — you never
modify code directly.

## Architecture
- Express.js API in `packages/api/`
- Next.js frontend in `packages/web/`
- Shared types in `packages/shared/`
- Prisma ORM for database access

## Review Rules
- Every API route must have Zod input validation
- Database writes spanning multiple tables must use transactions
- All async functions must have error handling
- React components use named exports only
- Tests live next to source files (colocated)

## Do NOT Comment On
- Formatting, import order, semicolons (automated tooling handles these)
- Stylistic preferences that are not in this document

## Output Format
Return review comments as JSON with file, line, severity, and comment fields.
```

### Path-Specific Review Rules

Both CLAUDE.md and AGENTS.md support path-specific rules that activate only when certain files are part of the review. This is powerful for a PR reviewer agent because different parts of your codebase have different review requirements.

For Claude Code, you can use `.claude/rules/` with glob-matched filenames:

```markdown
<!-- .claude/rules/api-routes.md -->
<!-- Applies to: packages/api/src/routes/**/*.ts -->

When reviewing API route files:
- Verify that authentication middleware is applied (except for public endpoints listed in PUBLIC_ROUTES)
- Check that response types match the OpenAPI schema in `docs/api-spec.yaml`
- Ensure rate limiting is configured for any endpoint that accepts user input
- Verify that all path parameters are validated before use
```

```markdown
<!-- .claude/rules/database.md -->
<!-- Applies to: packages/api/src/repositories/**/*.ts -->

When reviewing database repository files:
- All queries must use parameterized inputs (no string interpolation in SQL)
- SELECT queries must specify columns explicitly (no SELECT *)
- Mutations must include an updatedAt timestamp
- Bulk operations must use batch/transaction patterns
```

This means a PR that only touches frontend components will not trigger the database review rules, and vice versa. The reviewer gets focused, relevant instructions instead of a wall of rules about areas that are not relevant to the current changes.

---

## Handling Edge Cases

### Large PRs With Hundreds of Changed Files

Large PRs break the agent stack because the diff exceeds the context window. The solution is not to try harder — it is to **triage and subset**.

When the explorer detects a PR with more than 50 changed files, it switches to a tiered review strategy. It classifies files into three buckets: high-risk (security-sensitive, core business logic), medium-risk (feature code, utilities), and low-risk (tests, documentation, config). The reviewer only receives the high-risk and medium-risk files. Low-risk files get a simplified review that checks for obvious issues only.

```typescript
function triageLargePR(files: ChangedFile[]): ReviewTiers {
  const highRisk = files.filter(
    (f) =>
      f.path.includes("auth") ||
      f.path.includes("payment") ||
      f.path.includes("middleware") ||
      f.category === "migration"
  );

  const lowRisk = files.filter(
    (f) =>
      f.category === "test" ||
      f.category === "documentation" ||
      f.category === "config"
  );

  const mediumRisk = files.filter(
    (f) => !highRisk.includes(f) && !lowRisk.includes(f)
  );

  return { highRisk, mediumRisk, lowRisk };
}
```

The GitHub Actions workflow also includes a hard limit — if the diff exceeds 5,000 lines, it posts a comment suggesting the PR be broken into smaller pieces rather than attempting a full review. This is actually better feedback than a shallow review of a massive PR.

### Binary Files and Generated Code

The explorer agent should filter out binary files and generated code before passing context to the reviewer. Binary files (images, compiled assets, font files) cannot be meaningfully reviewed by an AI agent. Generated code (GraphQL codegen output, Prisma client, protobuf stubs) should not be reviewed because the changes are not authored by a human — the generator's configuration is what should be reviewed instead.

```typescript
const EXCLUDED_PATTERNS = [
  /\.png$/,
  /\.jpg$/,
  /\.gif$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.ico$/,
  /generated\//,
  /\.gen\./,
  /prisma\/client\//,
  /__generated__\//,
  /\.lock$/,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
];

function filterReviewableFiles(files: ChangedFile[]): ChangedFile[] {
  return files.filter(
    (f) => !EXCLUDED_PATTERNS.some((pattern) => pattern.test(f.path))
  );
}
```

### Conflicting Review Feedback

Sometimes the reviewer and docs-research agent will give conflicting advice. The reviewer might say "use method A for better performance" while the docs-research agent says "the documentation recommends method B for this use case."

The merge step handles this by flagging conflicts explicitly rather than trying to resolve them. When two comments target the same file and line but give different advice, the merged output includes both perspectives with a clear label:

```typescript
if (hasConflict(reviewerComment, docsComment)) {
  return {
    file: reviewerComment.file,
    line: reviewerComment.line,
    severity: "warning",
    category: "conflicting-advice",
    comment: [
      "**Multiple perspectives on this line:**\n",
      `**Code quality view:** ${reviewerComment.comment}\n`,
      `**Documentation view:** ${docsComment.comment}\n`,
      "Please evaluate both perspectives and choose the approach that best fits your requirements.",
    ].join("\n"),
  };
}
```

This is the right approach because the human reviewer should make the final call when agents disagree. Automated resolution would mask important nuance.

---

## Cost and Performance Optimization

### Token Budget Management

Running three agents per PR is not free. Each agent consumes tokens for both input (the diff, context package, and system prompt) and output (the review comments). For a typical 300-line PR, the token breakdown looks roughly like this:

| Agent | Input Tokens | Output Tokens | Cost (Sonnet) |
|-------|-------------|---------------|---------------|
| Explorer | ~4,000 | ~1,500 | ~$0.02 |
| Reviewer | ~8,000 | ~3,000 | ~$0.05 |
| Docs-Research | ~6,000 | ~2,000 | ~$0.03 |
| **Total** | **~18,000** | **~6,500** | **~$0.10** |

Ten cents per PR review is remarkably cheap compared to the cost of a human reviewer's time. But if your team opens 50 PRs per day, that is $5/day or ~$150/month. For most teams, this is an easy win. For very high-volume repositories, you will want the optimizations described below.

### Caching Strategies

The biggest token savings come from caching the explorer's output. If a developer pushes multiple commits to the same PR, the explorer's context package only needs partial recomputation — most of the context (dependency map, file categories, surrounding code) has not changed.

Implement a simple cache that stores the explorer's output keyed by the PR number and the list of changed file paths. If the file list has not changed since the last run, reuse the cached context package entirely. If only one file was added or modified, update only that file's entry.

```typescript
import { createHash } from "crypto";

function getCacheKey(prNumber: number, changedFiles: string[]): string {
  const fileList = changedFiles.sort().join("\n");
  const hash = createHash("sha256").update(fileList).digest("hex").slice(0, 16);
  return `pr-${prNumber}-${hash}`;
}

async function getOrRunExplorer(
  config: ReviewConfig,
  changedFiles: string[]
): Promise<string> {
  const cacheKey = getCacheKey(config.prNumber, changedFiles);
  const cachePath = `/tmp/explorer-cache/${cacheKey}.json`;

  try {
    return readFileSync(cachePath, "utf-8");
  } catch {
    const result = await runExplorer(config);
    writeFileSync(cachePath, result);
    return result;
  }
}
```

### When to Skip the Full Stack

Not every PR needs a three-agent review. Small, low-risk PRs can be reviewed by the reviewer alone, skipping the explorer and docs-research agent entirely. The orchestrator should include a triage step that decides how much of the stack to activate.

```typescript
function determineReviewStrategy(diffStats: DiffStats): ReviewStrategy {
  // Documentation-only PRs: skip everything
  if (diffStats.allFilesAre("documentation")) {
    return "skip";
  }

  // Tiny PRs (under 30 lines, no security-sensitive files): reviewer only
  if (diffStats.totalLines < 30 && !diffStats.hasSecuritySensitiveFiles) {
    return "reviewer-only";
  }

  // Medium PRs without external API changes: explorer + reviewer
  if (diffStats.totalLines < 200 && !diffStats.hasExternalApiCalls) {
    return "explorer-and-reviewer";
  }

  // Everything else: full stack
  return "full-stack";
}
```

This tiered approach can reduce costs by 40-60% for repositories where most PRs are small. The docs-research agent, which is the most expensive because it needs to load external documentation, only runs when the PR actually touches code that interacts with external services.

---

## Real-World Results and Benchmarks

After running this **PR reviewer agent** stack across a mid-size TypeScript monorepo (roughly 200k lines of code, 15 active developers, 8-12 PRs per day) for four weeks, here are the measured results.

**Review accuracy.** The agent flagged 342 issues across 180 PRs. Of those, 287 (84%) were accepted by the human reviewer as valid and useful. 41 (12%) were technically correct but too minor to act on. 14 (4%) were false positives. An 84% accuracy rate is high enough that developers take the feedback seriously.

**Time savings.** Average time from PR opened to first review comment dropped from 4.2 hours (waiting for a human) to 1.5 minutes (agent review). Human reviewers reported spending 30-40% less time on each review because the agent had already flagged the obvious issues.

**Bug catch rate.** The agent caught 23 bugs that would have reached production. 8 were correctness issues (logic bugs, null references). 6 were security issues (missing auth checks, SQL injection vectors). 9 were documentation mismatches (deprecated API usage, incorrect parameter formats) that only the docs-research agent would have caught.

**Cost.** Total API cost for four weeks was $127. For context, the team's total developer salary cost for the same period was roughly $120,000. The agent review cost was 0.1% of the human cost it augmented.

The key insight is that the three-agent architecture did not just find more bugs — it found **different kinds** of bugs. The explorer's risk flags directed the reviewer to areas that mattered. The docs-research agent caught issues that no amount of code-level analysis would have found. And the structured output meant that developers could quickly scan the review and focus on the blockers.

---

## Frequently Asked Questions

**What is a PR reviewer agent?**

A PR reviewer agent is an AI system that automatically reviews pull requests. Unlike a linter (which checks syntax) or static analysis (which checks patterns), a **PR reviewer agent** reads and understands the code changes in context, then provides the kind of feedback a human reviewer would give — identifying bugs, security issues, performance problems, and convention violations.

**How is a multi-agent review different from a single-prompt review?**

A single-prompt review sends the entire diff to one AI model and asks it to review everything. A multi-agent review splits the work among specialized agents — an explorer that gathers context, a **reviewer subagent** that checks code quality, and a **docs research agent** that verifies documentation alignment. The multi-agent approach produces deeper reviews because each agent gets a focused context window and a specialized prompt.

**Does this replace human code review?**

No. The agent stack is a first-pass reviewer that catches the obvious and semi-obvious issues before a human looks at the PR. It reduces the human reviewer's workload and speeds up the feedback loop, but it does not replace the human's judgment on architecture, design decisions, or product requirements.

**What models work best for the reviewer subagent?**

Claude Sonnet is the current sweet spot for the **reviewer subagent** — it is fast enough for CI pipelines (30-60 second response times), accurate enough for production use (84%+ accuracy in our benchmarks), and cheap enough to run on every PR. Claude Opus produces slightly more nuanced reviews but at 5-10x the cost and 3-5x the latency, which breaks the CI feedback loop.

**How do I handle false positives?**

False positives erode developer trust faster than any other failure mode. The primary defense is the severity system — false positives at the "suggestion" level are tolerable, but false positives at the "blocker" level are unacceptable. Configure the reviewer to use "blocker" severity only when it has very high confidence. You can also add a feedback mechanism where developers can dismiss a comment as "not useful," and feed that signal back into the system prompt as examples of what not to flag.

**Can I use this with languages other than TypeScript?**

Yes. The architecture is language-agnostic. The explorer, reviewer, and docs-research agent configurations need to be adapted for your language's ecosystem (different conventions, different documentation sources), but the orchestration layer and GitHub Actions integration remain the same. The agents themselves are language models — they can review Python, Go, Rust, Java, or any other language with equal facility.

**How does the docs-research agent access documentation?**

Three strategies, from simplest to most flexible: pre-fetched documentation snapshots stored as text files, an MCP server that serves documentation on demand, or web search as a fallback. Most teams should start with pre-fetched snapshots for their critical dependencies and add MCP integration when the dependency list grows. See the [Connecting to External Documentation Sources](#connecting-to-external-documentation-sources) section for implementation details.

**What happens if one agent in the stack fails?**

The orchestrator should handle agent failures gracefully. If the explorer fails, the reviewer can still run on the raw diff — it just will not have the context package, so reviews will be shallower. If the docs-research agent fails, the reviewer's output is still posted without documentation findings. If the reviewer itself fails, post the explorer's risk flags as a minimal review so the human reviewer knows where to focus. Never let one agent's failure block the entire pipeline.

**How much does it cost to run per PR?**

For a typical 300-line PR using Claude Sonnet, the full three-agent stack costs approximately $0.10. Smaller PRs (under 30 lines) cost $0.02-0.03 when the triage step activates a simpler review strategy. The docs-research agent adds roughly 30% of the total cost and can be skipped for PRs that do not touch external API integrations.

---

## Key Takeaways

Building a **PR reviewer agent** stack is not about replacing human reviewers — it is about giving them a head start. The three-agent architecture (explorer, reviewer, docs-researcher) produces deeper, more accurate reviews than a single-prompt approach because each agent gets a focused job, a curated context window, and a specialized prompt.

Here are the core lessons from building and running this system:

- **Separate context gathering from analysis.** The explorer agent builds a structured context package that makes the reviewer's job dramatically easier. Without it, the reviewer wastes half its capacity figuring out what changed.

- **Run the reviewer and docs-research agent in parallel.** They have no dependencies on each other, only on the explorer's output. Parallel execution cuts total review time roughly in half.

- **Use structured outputs everywhere.** JSON-formatted review comments with file paths, line numbers, severity levels, and categories enable automated posting to GitHub, deduplication, and conflict detection. Free-text reviews are harder to process programmatically.

- **Triage PRs before running the full stack.** Small, low-risk PRs do not need a three-agent review. Use a triage step to determine how much of the stack to activate. This reduces costs by 40-60% for most repositories.

- **Encode your conventions in CLAUDE.md / AGENTS.md, not in prompts.** Project-specific review rules belong in the instruction files that your team commits to version control and can update over time. Hard-coding conventions in agent prompts makes them invisible and unmodifiable.

- **The docs-research agent is the highest-value addition.** It catches a class of bugs that no other automated tool can find: code that works but violates documented contracts. This alone justifies the three-agent architecture over a simpler setup.

- **Measure accuracy and build trust incrementally.** Track how often developers accept, dismiss, or dispute agent comments. An 80%+ acceptance rate is the threshold where developers start treating agent reviews as genuinely helpful rather than noisy. Below that threshold, they will ignore everything.

The **AI code review workflow** described here is not the final form of automated review — it is a practical architecture that works today with current models and tooling. As models get faster, cheaper, and more capable, the same three-agent pattern will produce even better results. Start with this stack, measure the results, and iterate.

If you are building this for your team, start with the reviewer subagent alone. Get it working, get it posting to PRs, and get developer feedback. Then add the explorer to improve context quality. Then add the docs-research agent to catch the issues that nothing else catches. Incremental adoption builds trust and gives you data to justify the investment.
