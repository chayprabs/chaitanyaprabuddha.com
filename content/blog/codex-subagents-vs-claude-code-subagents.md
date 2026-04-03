---
title: "Codex Subagents vs Claude Code Subagents"
description: "Compare Codex and Claude Code subagents on context isolation, cost, parallelism, and when they're worth it."
date: "2026-04-02"
tags: ["Codex subagents","Claude Code subagents","parallel coding agents","multi-agent coding","OpenAI Codex","Claude Code","context isolation","AI coding agents","agentic coding","developer tools"]
readTime: "35 min read"
ogImage: "/og/codex-subagents-vs-claude-code-subagents.png"
canonical: "https://chaitanyaprabuddha.com/blog/codex-subagents-vs-claude-code-subagents"
published: true
---

# Codex Subagents vs Claude Code Subagents: Context Isolation, Cost, and When Parallel Agents Are Worth It

Both OpenAI Codex and Anthropic Claude Code now support **subagents** — child processes that run in isolation from the main agent to handle delegated tasks. **Codex subagents** and **Claude Code subagents** represent two fundamentally different approaches to multi-agent coding, and the differences matter a lot more than most developers realize. Choosing the wrong model does not just slow you down; it changes your cost structure, the reliability of your outputs, and whether parallelism actually helps or hurts.

This is not an abstract architectural comparison. If you are running parallel coding agents across a monorepo, debugging a production incident with multiple threads of investigation, or trying to figure out whether spinning up three subagents is cheaper than one sequential agent doing all three tasks, this guide gives you the concrete numbers and practical frameworks to decide.

We will cover how each system isolates context, what happens to tokens and cost when you fan out work, the specific configurations that control subagent behavior, and — most importantly — when parallel agents are genuinely worth the overhead versus when a single agent doing sequential work is the smarter choice.

---

## Table of Contents

- [What Are Subagents and Why Do They Exist?](#what-are-subagents-and-why-do-they-exist)
- [How Codex Subagents Work](#how-codex-subagents-work)
  - [The Codex Sandbox Model](#the-codex-sandbox-model)
  - [Codex Subagent Configuration](#codex-subagent-configuration)
  - [Context Inheritance in Codex](#context-inheritance-in-codex)
- [How Claude Code Subagents Work](#how-claude-code-subagents-work)
  - [The Task Tool Architecture](#the-task-tool-architecture)
  - [Claude Code Subagent Configuration](#claude-code-subagent-configuration)
  - [Context Isolation in Claude Code](#context-isolation-in-claude-code)
- [Context Isolation: Side-by-Side Comparison](#context-isolation-side-by-side-comparison)
  - [What Each Subagent Sees](#what-each-subagent-sees)
  - [File System Access Models](#file-system-access-models)
  - [Isolation Comparison Table](#isolation-comparison-table)
- [Cost Analysis: The Real Math Behind Parallel Agents](#cost-analysis-the-real-math-behind-parallel-agents)
  - [Token Economics of Subagents](#token-economics-of-subagents)
  - [Codex Cost Structure](#codex-cost-structure)
  - [Claude Code Cost Structure](#claude-code-cost-structure)
  - [Cost Comparison Table](#cost-comparison-table)
  - [When Parallelism Saves Money vs When It Costs More](#when-parallelism-saves-money-vs-when-it-costs-more)
- [Parallel Execution: How Each Platform Handles Concurrency](#parallel-execution-how-each-platform-handles-concurrency)
  - [Codex Parallel Patterns](#codex-parallel-patterns)
  - [Claude Code Parallel Patterns](#claude-code-parallel-patterns)
  - [Merge Conflicts and Coordination](#merge-conflicts-and-coordination)
- [When Parallel Agents Are Actually Worth It](#when-parallel-agents-are-actually-worth-it)
  - [The Five Criteria for Beneficial Parallelism](#the-five-criteria-for-beneficial-parallelism)
  - [Tasks That Benefit From Parallel Subagents](#tasks-that-benefit-from-parallel-subagents)
  - [Tasks That Should Stay Sequential](#tasks-that-should-stay-sequential)
- [Practical Configuration Examples](#practical-configuration-examples)
  - [Codex Multi-Agent Setup](#codex-multi-agent-setup)
  - [Claude Code Multi-Agent Setup](#claude-code-multi-agent-setup)
  - [Hybrid Approaches](#hybrid-approaches)
- [Performance Benchmarks and Real-World Results](#performance-benchmarks-and-real-world-results)
- [Decision Framework: Which Subagent Model Fits Your Workflow](#decision-framework-which-subagent-model-fits-your-workflow)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

---

## What Are Subagents and Why Do They Exist?

Subagents are child agent processes that a parent agent spawns to handle a scoped piece of work independently. They exist because a single agent conversation has limits — context windows fill up, long tasks lose coherence, and sequential execution is slow when work can be parallelized.

The core idea is delegation. Instead of one agent doing everything in a single thread, the parent agent breaks work into pieces and hands each piece to a subagent. Each subagent gets its own context window, does its work, and returns a result to the parent.

This pattern emerged because real-world coding tasks are rarely monolithic. A feature might require changes across the API layer, the frontend, and the test suite. A refactor might touch dozens of files that share no dependencies. A code review might need to check style, security, and performance independently. **Multi-agent coding** makes these workflows faster and often more reliable, because each subagent can focus on a narrow task without context pollution from unrelated work.

But subagents are not free. Every subagent you spawn costs tokens, adds latency for coordination, and introduces the possibility that parallel changes conflict. The question is never "should I use subagents?" It is always "does this specific task benefit from delegation enough to justify the overhead?"

That is where the differences between **Codex subagents** and **Claude Code subagents** become critical. They handle isolation, cost, and coordination differently, and those differences change the answer to that question.

---

## How Codex Subagents Work

### The Codex Sandbox Model

Codex subagents operate inside OpenAI's cloud sandbox infrastructure, where each agent session runs in an isolated container. When the Codex CLI or Codex web interface spawns a subagent, that subagent gets its own sandboxed environment — a fresh container with a copy of your repository checked out.

The sandbox model is the defining characteristic of Codex's approach. Each subagent runs in what is essentially a microVM: an isolated Linux environment with its own filesystem, its own process space, and its own network restrictions. The parent agent communicates with the subagent through a structured message-passing interface, not through shared memory or a shared filesystem.

This means Codex subagents are **strongly isolated by default**. One subagent cannot see what another subagent is doing. They cannot read each other's files mid-execution. They each start from the same repository snapshot and diverge from there.

### Codex Subagent Configuration

Codex subagent behavior is controlled primarily through your `AGENTS.md` file and the task instructions passed when spawning. The `AGENTS.md` file at the root of your repository (or in subdirectories for scoped instructions) is loaded into every subagent's context automatically.

Here is how you configure subagent behavior in a typical Codex setup:

```markdown
<!-- AGENTS.md at repo root -->
# Agent Instructions

## General Rules
- Use TypeScript strict mode for all new files
- Run `npm test` before considering any task complete
- Never modify files outside the assigned directory scope

## Subagent-Specific Rules
When working as a subagent on a scoped task:
- Only modify files listed in the task description
- Do not install new dependencies without explicit instruction
- Report back with a summary of changes and test results
```

When spawning tasks via the Codex API or CLI, you specify the subagent's scope:

```bash
# Codex CLI: spawning parallel tasks
codex --task "Refactor the auth middleware in src/middleware/auth.ts to use JWT validation" \
      --sandbox

codex --task "Add unit tests for the user service in src/services/user.test.ts" \
      --sandbox
```

Each of these runs in its own sandbox. The `--sandbox` flag is the default for Codex cloud tasks — it ensures full isolation.

For more granular control, you can configure sandbox behavior in your project's Codex configuration:

```json
{
  "model": "codex-1",
  "sandbox": {
    "internet_access": false,
    "install_commands": ["npm install"],
    "environment_variables": {
      "NODE_ENV": "test"
    }
  },
  "agents_md": "./AGENTS.md"
}
```

### Context Inheritance in Codex

When a Codex subagent spins up, it inherits a specific set of context:

1. **The full repository snapshot** — a clone of the repo at the current commit
2. **The AGENTS.md file(s)** — root-level and directory-scoped instructions
3. **The task prompt** — the specific instructions from the parent
4. **Environment setup** — results of install commands configured in sandbox settings

What it does **not** inherit:

- The parent agent's conversation history
- Results from other subagents (unless explicitly passed)
- Runtime state, environment variables not in the config, or credentials not explicitly mapped

This clean separation is intentional. Codex's philosophy is that each subagent should be able to complete its task with only the repo and the task description. If a subagent needs more context, that context should be in the AGENTS.md or the task prompt.

---

## How Claude Code Subagents Work

### The Task Tool Architecture

Claude Code subagents are spawned using the **Task tool** — an internal tool that the parent agent invokes to delegate work. Unlike Codex's container-based isolation, Claude Code subagents run as child conversations within the same local environment. They share the same machine, the same filesystem, and the same set of configured tools.

When the parent Claude Code agent decides to delegate work, it calls the Task tool with a description of the work and an optional set of constraints. The subagent gets its own conversation context — a fresh context window — but operates on the same filesystem as the parent.

Here is what a Task tool invocation looks like from the parent's perspective:

```
Task: "Review src/api/routes.ts for security vulnerabilities. 
Check for SQL injection, XSS, and authentication bypass. 
Report findings with line numbers and severity ratings."
```

The subagent then operates independently, using the same tools the parent has access to: Read, Write, Edit, Bash, Grep, Glob, and any configured MCP tools. It reads files, runs commands, and produces a result that gets returned to the parent agent.

### Claude Code Subagent Configuration

Claude Code subagent behavior is shaped by several layers of configuration. The primary control mechanisms are the `CLAUDE.md` file (analogous to Codex's `AGENTS.md`), the project's `.claude/settings.json`, and the task prompt itself.

The `CLAUDE.md` file provides persistent instructions that every agent and subagent in the project follows:

```markdown
<!-- CLAUDE.md at repo root -->
# Project Instructions

## Code Standards
- All TypeScript files must pass strict type checking
- Use Zod for runtime validation on API boundaries
- Tests go in __tests__ directories colocated with source

## Subagent Guidelines
- When delegated a review task, check the full file, not just the diff
- When delegated a coding task, run the relevant test suite before returning
- Always report what files were modified in the final response
```

For more granular subagent control, Claude Code's settings allow you to configure tool permissions and allowed directories:

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Grep",
      "Glob",
      "Bash(npm test*)",
      "Bash(npx tsc --noEmit)"
    ],
    "deny": [
      "Bash(rm -rf*)",
      "Bash(git push*)"
    ]
  }
}
```

These permissions apply to subagents as well. A subagent cannot bypass the parent's permission model — if the parent is restricted from running `git push`, so is the subagent.

### Context Isolation in Claude Code

Claude Code subagents get **a fresh context window** but **shared filesystem access**. This is the fundamental architectural difference from Codex. Here is exactly what a Claude Code subagent inherits:

**Inherited:**
- The task prompt from the parent
- The CLAUDE.md instructions (root and directory-scoped)
- Full filesystem read/write access (same as parent)
- All configured tools and MCP servers
- Permission settings from .claude/settings.json

**Not inherited:**
- The parent's conversation history
- Results from sibling subagents (unless the parent passes them)
- The parent's in-memory reasoning or plan

The shared filesystem is both the greatest strength and the greatest risk. A Claude Code subagent can read any file the parent can read. It can also **write to files that another subagent is simultaneously modifying**. There is no built-in locking mechanism. If you spawn two subagents that both modify the same file, you will get a race condition.

This is why task scoping matters so much in Claude Code. The parent agent needs to ensure subagents are working on non-overlapping file sets, or use sequential execution for tasks that touch the same files.

---

## Context Isolation: Side-by-Side Comparison

### What Each Subagent Sees

The isolation model is where these two systems diverge most sharply. Understanding what each subagent can and cannot see is critical for designing reliable multi-agent workflows.

**Codex subagents** see a frozen snapshot of the repository. They work on a copy. Their changes are collected after execution and merged back. They cannot observe changes from sibling subagents in real time.

**Claude Code subagents** see the live filesystem. They work on the actual files. Their changes are immediately visible to any other subagent or the parent. There is no snapshot, no copy, no merge step.

This creates very different failure modes. Codex subagents can produce conflicting changes that need to be merged after the fact — you might get merge conflicts. Claude Code subagents can produce corrupted files if two subagents write to the same file concurrently — you might get garbled output.

### File System Access Models

Here is a concrete example to illustrate the difference. Suppose you spawn two subagents to work on a feature: one handles the API route, and the other handles the database migration.

**In Codex:**

```
Parent spawns Subagent A: "Create API route in src/routes/users.ts"
Parent spawns Subagent B: "Create migration in migrations/add-users-table.sql"

Subagent A gets: full repo copy (snapshot at commit abc123)
Subagent B gets: full repo copy (snapshot at commit abc123)

Subagent A creates src/routes/users.ts in its sandbox
Subagent B creates migrations/add-users-table.sql in its sandbox

Both complete. Parent receives two patches.
Parent applies patches to the real repo. No conflict (different files).
```

**In Claude Code:**

```
Parent spawns Subagent A: "Create API route in src/routes/users.ts"
Parent spawns Subagent B: "Create migration in migrations/add-users-table.sql"

Subagent A sees: the live repo filesystem
Subagent B sees: the live repo filesystem

Subagent A creates src/routes/users.ts directly on disk
Subagent B creates migrations/add-users-table.sql directly on disk

Both complete. Files already exist in the repo. No merge step needed.
```

When the tasks touch different files, both models work fine. The difference emerges when tasks overlap.

### Isolation Comparison Table

| Dimension | Codex Subagents | Claude Code Subagents |
|-----------|----------------|----------------------|
| **Execution environment** | Cloud sandbox (microVM) | Local machine (same as parent) |
| **Filesystem model** | Snapshot copy per subagent | Shared live filesystem |
| **Can subagents see each other's changes?** | No (isolated copies) | Yes (shared filesystem) |
| **Change application** | Patches merged post-execution | Changes applied in real time |
| **Conflict risk** | Merge conflicts after completion | Race conditions during execution |
| **Network access** | Configurable, default restricted | Same as parent environment |
| **Tool access** | Sandbox tools (bash, file ops) | All parent tools + MCP servers |
| **Conversation history from parent** | Not inherited | Not inherited |
| **AGENTS.md / CLAUDE.md loaded** | Yes, automatically | Yes, automatically |
| **Can run locally** | No (cloud-only sandboxes) | Yes (runs on your machine) |
| **Max concurrent subagents** | Limited by plan/API tier | Limited by machine resources |

---

## Cost Analysis: The Real Math Behind Parallel Agents

### Token Economics of Subagents

Every subagent has its own context window. This is the single most important cost factor to understand. When you spawn a subagent, you are not sharing the parent's context — you are starting a new context that gets billed independently.

This means that **system prompt tokens are duplicated across every subagent**. If your AGENTS.md or CLAUDE.md is 2,000 tokens, and you spawn 5 subagents, you are paying for 10,000 tokens of system prompt alone — before any actual work begins.

The task prompt, the file contents the subagent reads, the tool calls it makes, and the output it generates all add to the subagent's individual token count. None of this is shared with or deduplicated against the parent's context.

### Codex Cost Structure

Codex uses a task-based billing model for its cloud sandboxes. Each subagent task incurs:

1. **Model token costs** — input and output tokens at the codex-1 or specified model's rate
2. **Sandbox compute costs** — time-based charges for the container runtime
3. **Storage costs** — minimal, for the cloned repository in the sandbox

As of early 2026, the token rates for Codex models are:

```
codex-1 (codex-mini):
  Input:  $1.50 per 1M tokens
  Output: $6.00 per 1M tokens

Using o4-mini via Codex:
  Input:  $1.10 per 1M tokens
  Output: $4.40 per 1M tokens

Sandbox compute:
  ~$0.005 per minute of execution
```

A typical subagent task that reads 5 files, makes edits, and runs tests might consume:

```
System prompt (AGENTS.md):       ~2,000 tokens input
Task description:                ~500 tokens input
File reads (5 files):            ~8,000 tokens input
Model reasoning + tool calls:    ~3,000 tokens output
Test output processing:          ~1,500 tokens input
Final response:                  ~800 tokens output
Sandbox time:                    ~3 minutes

Total input:  ~12,000 tokens  → $0.018
Total output: ~3,800 tokens   → $0.023
Sandbox time: 3 min           → $0.015
                               --------
Per subagent cost:              ~$0.056
```

### Claude Code Cost Structure

Claude Code bills purely on tokens — there is no separate compute charge because subagents run on your local machine. The cost is determined by the model used and the tokens consumed.

```
Claude Sonnet 4 (default for subagents):
  Input:  $3.00 per 1M tokens
  Output: $15.00 per 1M tokens

Claude Opus 4:
  Input:  $15.00 per 1M tokens
  Output: $75.00 per 1M tokens

Claude Haiku:
  Input:  $0.80 per 1M tokens
  Output: $4.00 per 1M tokens
```

The same task profile on Claude Code:

```
System prompt (CLAUDE.md):       ~2,000 tokens input
Task description:                ~500 tokens input
File reads (5 files):            ~8,000 tokens input
Model reasoning + tool calls:    ~3,000 tokens output
Test output processing:          ~1,500 tokens input
Final response:                  ~800 tokens output

Total input:  ~12,000 tokens  → $0.036 (Sonnet)
Total output: ~3,800 tokens   → $0.057 (Sonnet)
                               --------
Per subagent cost:              ~$0.093 (Sonnet)
```

### Cost Comparison Table

Here is a direct comparison for common multi-agent scenarios, assuming Codex codex-1 vs Claude Code Sonnet 4:

| Scenario | Subagents | Codex Total | Claude Code Total | Difference |
|----------|-----------|-------------|-------------------|------------|
| **Simple: 2 parallel file edits** | 2 | ~$0.11 | ~$0.19 | Codex 42% cheaper |
| **Medium: 5 parallel test writers** | 5 | ~$0.28 | ~$0.47 | Codex 40% cheaper |
| **Complex: 3 agents + heavy file reads** | 3 | ~$0.25 | ~$0.39 | Codex 36% cheaper |
| **Large: 10 parallel review agents** | 10 | ~$0.56 | ~$0.93 | Codex 40% cheaper |
| **Sequential: 1 agent doing all 5 tasks** | 1 | ~$0.12 | ~$0.15 | Codex 20% cheaper |

The pattern is clear: **Codex subagents are consistently cheaper per token** because of lower model pricing. However, Claude Code subagents avoid sandbox compute charges and have no cold-start latency, which can matter for many small tasks.

If you switch Claude Code subagents to Haiku for lightweight tasks, the picture changes:

| Scenario | Claude Code (Haiku) | Codex (codex-1) |
|----------|-------------------|-----------------|
| **5 parallel lint checks** | ~$0.08 | ~$0.28 |
| **10 parallel file reviews** | ~$0.16 | ~$0.56 |

**Haiku subagents in Claude Code can be dramatically cheaper** for tasks that do not require heavy reasoning — basic file reviews, linting, formatting checks, and simple test generation.

### When Parallelism Saves Money vs When It Costs More

Parallelism is not inherently cheaper. It is **faster**, but it often costs more in total tokens because of duplicated context. Here is the math:

**Sequential (1 agent, 3 tasks):**
```
System prompt loaded once:        2,000 tokens
Task 1 work:                     15,000 tokens
Task 2 work (context carries over): 12,000 tokens
Task 3 work (context carries over): 10,000 tokens
Total:                           39,000 tokens
```

**Parallel (3 subagents, 1 task each):**
```
Subagent 1: system prompt + task 1:  17,000 tokens
Subagent 2: system prompt + task 2:  14,000 tokens
Subagent 3: system prompt + task 3:  12,000 tokens
Parent coordination overhead:         3,000 tokens
Total:                              46,000 tokens
```

The parallel approach uses **18% more tokens** in this example. That percentage grows as your system prompt gets larger relative to the task work, and shrinks as tasks get more complex relative to the system prompt.

**Parallelism saves total cost only when:**
- Tasks are large enough that the duplicated system prompt is a small fraction of total tokens
- Tasks benefit from isolated context (not carrying irrelevant context from previous tasks)
- The alternative is a single agent whose context window fills up, requiring summarization or context management that adds its own token overhead

**Parallelism costs more when:**
- Tasks are small and quick
- The system prompt is large relative to the task work
- Tasks share context that would be beneficial for subsequent tasks (e.g., understanding learned in task 1 helps with task 2)

---

## Parallel Execution: How Each Platform Handles Concurrency

### Codex Parallel Patterns

Codex handles parallelism at the infrastructure level. When you submit multiple tasks, each one gets its own sandbox, and they execute simultaneously in the cloud. The parent does not need to manage concurrency — it submits tasks and waits for results.

The typical Codex parallel pattern looks like:

```python
# Using Codex API for parallel subagent tasks
import openai

client = openai.OpenAI()

# Submit tasks in parallel
tasks = [
    {
        "prompt": "Add input validation to src/routes/users.ts",
        "sandbox": {"install_commands": ["npm install"]}
    },
    {
        "prompt": "Write unit tests for src/services/auth.ts",
        "sandbox": {"install_commands": ["npm install"]}
    },
    {
        "prompt": "Refactor src/utils/helpers.ts to remove deprecated functions",
        "sandbox": {"install_commands": ["npm install"]}
    }
]

# Each task runs in its own isolated sandbox
results = []
for task in tasks:
    response = client.codex.tasks.create(
        model="codex-1",
        prompt=task["prompt"],
        sandbox=task["sandbox"]
    )
    results.append(response)

# Collect results - each returns a patch/diff
for result in results:
    print(f"Task: {result.status}")
    print(f"Changes: {result.output.patch}")
```

The key constraint: Codex sandboxes have a startup time. Each sandbox needs to clone the repo, install dependencies, and initialize the environment. For a medium Node.js project, this cold start can be **15-45 seconds**. For a Python project with heavy dependencies, it can be longer.

This cold start means that for very quick tasks (under 30 seconds of actual work), the overhead of parallelism in Codex is proportionally large. Spawning 5 sandboxes to do 10 seconds of work each means you are spending more time on setup than on actual task execution.

### Claude Code Parallel Patterns

Claude Code handles parallelism differently. The parent agent can invoke the Task tool multiple times, and the subagents run as concurrent conversations on the local machine. There is no sandbox startup, no repo cloning, and no dependency installation — the subagents use the existing local environment.

When the parent agent decides to parallelize, it looks like this in practice:

```
Parent agent reasoning:
"I need to implement this feature across three layers. 
These are independent tasks that touch different files.
I'll spawn three subagents in parallel."

→ Task tool call 1: "Implement the /users endpoint in src/api/routes/users.ts. 
   Follow the patterns in src/api/routes/posts.ts for structure."

→ Task tool call 2: "Create the user service in src/services/userService.ts.
   It should handle CRUD operations using the Prisma client."

→ Task tool call 3: "Write integration tests for the user API in 
   tests/integration/users.test.ts. Test all CRUD endpoints."
```

Claude Code can launch these Task calls concurrently. Each subagent starts immediately — no cold start. They all read from the same filesystem, so if subagent 1 creates a file that subagent 3 needs, subagent 3 might or might not see it depending on timing.

The practical concurrency limit depends on your machine and your API rate limits. Running 3-5 Claude Code subagents in parallel is common. Running 10+ can hit rate limits or degrade local machine performance since each subagent is making API calls and running tools locally.

### Merge Conflicts and Coordination

**Codex** handles conflicts through its patch-based system. Each subagent produces a diff against the original repo snapshot. If two diffs modify the same lines, the system can detect this at merge time. The parent (or the user) needs to resolve the conflict manually or specify merge priority.

**Claude Code** has no built-in conflict resolution because changes happen live. Two subagents modifying the same file can produce corrupted results. The responsibility falls on the parent agent to scope tasks so they do not overlap.

Here are patterns that prevent conflicts in each system:

```markdown
# Codex: Conflict-safe parallel task design
## Rule: Each subagent gets a file allowlist

Task A scope: ONLY modify src/routes/users.ts, src/routes/users.test.ts
Task B scope: ONLY modify src/services/auth.ts, src/services/auth.test.ts
Task C scope: ONLY modify src/middleware/validation.ts

## If tasks must touch shared files, run them sequentially
```

```markdown
# Claude Code: Conflict-safe parallel task design
## Rule: Never assign overlapping file sets to parallel subagents

Task A: "Implement user routes. Only modify files in src/api/users/"
Task B: "Implement auth service. Only modify files in src/services/auth/"
Task C: "Write tests. Only modify files in tests/. Do NOT modify source files."

## Parent must explicitly partition the work before spawning
```

---

## When Parallel Agents Are Actually Worth It

### The Five Criteria for Beneficial Parallelism

Not every task benefits from **parallel coding agents**. Before spawning subagents, evaluate your task against these five criteria:

**1. Independence** — Can the tasks run without depending on each other's output? If task B needs the result of task A, they cannot run in parallel. This is the most basic requirement and the one most often violated.

**2. Non-overlapping scope** — Do the tasks modify different files? If two subagents need to modify the same file, parallelism introduces conflict risk that can negate the time savings. Codex can handle this with post-execution merge, but it still adds complexity.

**3. Sufficient complexity** — Is each task complex enough to justify the overhead? If a task takes 10 seconds of agent work, spending 30 seconds on sandbox startup (Codex) or 5 seconds on context initialization (Claude Code) makes parallelism a net negative.

**4. Context isolation benefit** — Does each task benefit from not seeing the others' context? Sometimes isolation is a feature: a security review subagent should not be influenced by the code author's comments in the same conversation. Other times, shared context is valuable, and isolation means repeating discovery work.

**5. Cost justification** — Does the time saved justify the extra token cost? If you are not time-constrained, sequential execution is almost always cheaper due to shared context and no duplication overhead.

### Tasks That Benefit From Parallel Subagents

These patterns consistently show positive ROI from parallelism:

**Multi-file code generation across independent modules.** When you need to create several new files that do not depend on each other — a new API route, its corresponding service, its database migration, and its test file — each can be generated in parallel. The files are independent at creation time even if they reference each other at runtime.

**Parallel code review with different lenses.** Spawning three review subagents — one checking for security issues, one for performance problems, one for style compliance — gives you specialized analysis without context contamination. A security reviewer that is also thinking about style tends to be worse at both.

**Monorepo cross-package changes.** If you need to update a shared type definition and then update five packages that consume it, the five package updates can run in parallel after the type change is complete. This is a sequential-then-parallel pattern.

**Test generation for independent modules.** Writing tests for five independent service files is embarrassingly parallel. Each subagent reads one service file, understands its API, and generates tests. No cross-file dependency.

**Large-scale search and analysis.** If you need to audit 50 files for a specific pattern, spawning 5 subagents that each handle 10 files is faster and does not require the agent to maintain context across all 50 files.

### Tasks That Should Stay Sequential

**Iterative feature development.** Building a feature where each step depends on the previous one — design the API, implement it, write tests that test the implementation, then fix bugs found by tests — is inherently sequential. Trying to parallelize this wastes tokens on speculative work.

**Debugging and investigation.** Root cause analysis requires following a chain of evidence. Subagent A finds a clue that directs subagent B's investigation. Parallelizing this means each subagent investigates blindly, duplicating work or missing the actual root cause.

**Refactoring with shared state.** Renaming a function and updating all its call sites cannot be safely parallelized. Every subagent needs to see the same definition and all the same call sites to make consistent changes.

**Small tasks.** If the total task takes under 2 minutes for a single agent, the overhead of parallelism (context duplication, coordination, potential conflicts) almost always exceeds the time savings.

---

## Practical Configuration Examples

### Codex Multi-Agent Setup

Here is a complete setup for running Codex subagents on a Node.js monorepo with three packages:

```markdown
<!-- AGENTS.md (root) -->
# Monorepo Agent Configuration

## Repository Structure
- packages/api — Express REST API
- packages/web — Next.js frontend  
- packages/shared — Shared types and utilities

## Global Rules
- Never modify package-lock.json directly
- Always run the relevant package's test suite after changes
- Use the shared package for any types used across packages

## Parallel Task Guidelines
Each subagent works on exactly one package. If changes span packages:
1. Start with shared/ changes (sequential, must complete first)
2. Then parallelize api/ and web/ changes
```

```markdown
<!-- packages/api/AGENTS.md -->
# API Package Instructions
- Framework: Express with TypeScript
- ORM: Prisma
- Test runner: Jest
- Run tests: `cd packages/api && npm test`
- Lint check: `cd packages/api && npm run lint`
```

```markdown
<!-- packages/web/AGENTS.md -->
# Web Package Instructions  
- Framework: Next.js 14 with App Router
- Styling: Tailwind CSS
- Test runner: Vitest
- Run tests: `cd packages/web && npm test`
- Lint check: `cd packages/web && npm run lint`
```

With this structure, Codex subagents spawned for API work automatically pick up the API-specific instructions, while frontend subagents get the web-specific instructions. Each runs in its own sandbox, installs its own dependencies, and cannot interfere with the other.

### Claude Code Multi-Agent Setup

The equivalent setup in Claude Code uses CLAUDE.md files and careful task scoping:

```markdown
<!-- CLAUDE.md (root) -->
# Monorepo Instructions

## Repository Structure
- packages/api — Express REST API (TypeScript, Prisma, Jest)
- packages/web — Next.js frontend (App Router, Tailwind, Vitest)
- packages/shared — Shared types and utilities

## Rules
- Never modify package-lock.json directly
- Always run the relevant test suite after changes
- Use packages/shared/ for cross-package types

## When Delegating to Subagents
- Assign each subagent to exactly one package directory
- Include the package name and test command in the task description
- Never assign two subagents to the same package simultaneously
```

```markdown
<!-- packages/api/CLAUDE.md -->
# API Package
Run tests: npm test (from this directory)
Lint: npm run lint
Framework: Express + TypeScript + Prisma
All routes in src/routes/, services in src/services/
```

```markdown
<!-- packages/web/CLAUDE.md -->
# Web Package
Run tests: npm test (from this directory)  
Lint: npm run lint
Framework: Next.js 14 App Router + Tailwind
Pages in app/, components in components/
```

When the parent agent needs to make cross-package changes, it orchestrates like this:

```
Parent agent plan:
1. First, update the shared types (sequential — must complete first)
   → Task: "Add the UserProfile type to packages/shared/src/types.ts 
     with fields: id (string), email (string), name (string), 
     avatarUrl (string | null). Export it from the package index."

2. Then, update API and web in parallel:
   → Task: "In packages/api/, update src/routes/users.ts to return 
     UserProfile objects. Import the type from @monorepo/shared. 
     Update existing tests. Run npm test from packages/api/."
   
   → Task: "In packages/web/, create a UserProfile component in 
     components/UserProfile.tsx that displays all UserProfile fields.
     Import the type from @monorepo/shared. Add a Vitest unit test.
     Run npm test from packages/web/."
```

The critical difference: in Claude Code, when the shared type is created in step 1, the parallel subagents in step 2 can immediately see it because they share the filesystem. In Codex, you would need to ensure the shared type change is committed to the repo before spawning step 2's subagents, since each gets a fresh snapshot.

### Hybrid Approaches

Some teams use both platforms for different types of work. A practical hybrid setup:

- **Codex subagents for risky or untrusted operations** — anything that touches infrastructure, runs unknown scripts, or might have side effects. The sandbox isolation provides safety.
- **Claude Code subagents for fast, iterative local work** — code generation, refactoring, test writing. The zero cold-start and shared filesystem makes iteration faster.
- **Codex for CI-triggered agent work** — code review bots, automated fix PRs, scheduled codebase maintenance. These benefit from cloud execution and do not need local environment access.
- **Claude Code for interactive development** — real-time pair programming where subagents handle background tasks while you work on the main task.

---

## Performance Benchmarks and Real-World Results

Performance varies significantly based on task type, repository size, and network conditions. Here are representative benchmarks from testing both systems on a medium-sized TypeScript monorepo (~50k lines of code, 3 packages):

| Task | Sequential (1 agent) | Codex (3 subagents) | Claude Code (3 subagents) |
|------|---------------------|--------------------|-----------------------------|
| **Generate 3 new API routes** | 4 min 30 sec | 2 min 45 sec (incl. startup) | 1 min 50 sec |
| **Write tests for 3 services** | 5 min 10 sec | 3 min 20 sec | 2 min 15 sec |
| **Review 3 files (security + perf + style)** | 3 min 40 sec | 2 min 10 sec | 1 min 25 sec |
| **Refactor 3 independent modules** | 6 min 00 sec | 3 min 30 sec | 2 min 40 sec |
| **Add feature across all 3 packages** | 8 min 20 sec | 5 min 50 sec | 4 min 10 sec |

Key observations:

**Claude Code subagents are consistently faster** for tasks under 5 minutes. The absence of sandbox cold-start time gives Claude Code a structural advantage for quick tasks. Codex sandboxes add 20-45 seconds of startup per subagent, which is a significant fraction of short task durations.

**Codex subagents scale better for large-scale parallelism.** When running 10+ subagents, Claude Code's local execution starts competing for machine resources and API rate limits. Codex distributes this load across cloud infrastructure.

**Wall-clock improvement from parallelism diminishes after 3-5 subagents** for most tasks. The coordination overhead and the longest-running subagent become the bottleneck. Three subagents finishing in 2, 1.5, and 3 minutes still takes 3 minutes total, plus coordination time.

**Shared filesystem makes Claude Code's multi-step workflows faster.** When step 2 depends on step 1's output, Claude Code subagents can proceed immediately because files are already on disk. Codex requires explicit state passing or recommitting between steps.

---

## Decision Framework: Which Subagent Model Fits Your Workflow

Use this framework to choose between **Codex subagents** and **Claude Code subagents** based on your specific situation:

**Choose Codex subagents when:**
- You need strong isolation guarantees (untrusted code, security-sensitive operations)
- You are running agent tasks in CI/CD pipelines or automated workflows
- You want reproducible environments (same sandbox every time, no local state leakage)
- Your tasks are long-running (5+ minutes each) where sandbox startup is a small fraction
- You are operating at high scale (10+ concurrent subagents regularly)
- Budget is the primary constraint and Codex's lower per-token cost matters at your volume

**Choose Claude Code subagents when:**
- You need fast iteration with zero cold-start overhead
- Your tasks share dependencies and build artifacts on the local filesystem
- You want subagents to access MCP tools (database connections, API clients, etc.)
- You are doing interactive development where subagents augment your current session
- Your tasks are short (under 3 minutes) where startup overhead would dominate
- You need subagents to access local services (databases, Docker containers, dev servers)

**Choose sequential execution (no subagents) when:**
- Tasks have strong dependencies on each other's outputs
- Total work is under 2-3 minutes
- You are debugging or investigating (context chain matters)
- Tasks modify the same files
- Token budget is extremely constrained

**Consider a hybrid approach when:**
- You have a mix of task types (some need isolation, some need speed)
- Different team members use different tools
- You want CI agents (Codex) and local agents (Claude Code) for different parts of the workflow

---

## Frequently Asked Questions

### Can Codex subagents share data with each other during execution?

No. Codex subagents run in isolated sandboxes and cannot see each other's changes until execution is complete. If subagent B needs the output of subagent A, you must run them sequentially — A completes, its changes are committed or passed to the parent, and then B is spawned with access to those changes.

### Can Claude Code subagents access MCP tools that the parent has configured?

Yes. Claude Code subagents inherit the full tool configuration from the parent, including all MCP servers configured in `.mcp.json` or the project settings. If the parent can query a database through an MCP server, so can the subagent. This is a significant advantage for tasks that require external data access.

### What happens if two Claude Code subagents edit the same file simultaneously?

You get a race condition. The last write wins, and the earlier subagent's changes are silently overwritten. There is no locking, no merge, and no warning. This is why task scoping to non-overlapping file sets is essential when running Claude Code subagents in parallel.

### How do I debug a failing subagent?

In **Codex**, you can inspect the sandbox logs and the complete conversation history for each subagent task. The web interface provides a detailed view of every tool call, file read, and command execution.

In **Claude Code**, subagent output is returned to the parent agent, and the full conversation is visible in the CLI output. You can also check the local filesystem to see what changes the subagent made. Using verbose mode (`--verbose`) provides detailed logging of subagent tool calls.

### Is there a maximum number of subagents I can run in parallel?

**Codex** limits are based on your API tier and plan. Free tier users have lower concurrency limits (typically 2-3 concurrent tasks). Paid tiers support higher concurrency, with enterprise plans allowing 20+ concurrent sandbox tasks.

**Claude Code** has no hard limit on subagents, but practical limits come from API rate limits (requests per minute for your Anthropic plan) and local machine resources. Running more than 5-7 subagents simultaneously on a typical developer workstation can cause slowdowns.

### Do subagents inherit the parent's conversation history?

Neither platform passes the full parent conversation history to subagents. The subagent receives only the task prompt and the project configuration files (AGENTS.md or CLAUDE.md). This is intentional — it keeps subagent context clean and focused. If the subagent needs specific context from the parent conversation, include it explicitly in the task prompt.

### Can I use different models for subagents vs the parent agent?

**Codex** allows you to specify the model per task, so subagent tasks can use a different model than the parent. You could use codex-1 for the parent and o4-mini for lightweight subagent tasks.

**Claude Code** allows subagents to use a different model tier. You can configure subagents to use Haiku for cost-sensitive tasks while the parent uses Sonnet or Opus. This is configured through the task invocation or project settings.

### Are subagents useful for solo developers or only for teams?

Subagents are useful for solo developers as well. The value is not about team size — it is about task parallelism. A solo developer working on a feature that requires changes across three independent modules benefits from parallel subagents just as much as a team would. The time savings are personal: you get your feature implemented in 2 minutes instead of 6.

### How do subagents handle environment variables and secrets?

**Codex** sandboxes receive only the environment variables explicitly configured in the sandbox settings. Secrets must be passed through Codex's secure configuration. Subagents cannot access your local `.env` file.

**Claude Code** subagents run on your local machine and can access any environment variable available in your shell. This means they can read `.env` files and access local credentials. This is convenient but carries security implications — a subagent running untrusted code has the same access as you do.

---

## Key Takeaways

**Codex subagents and Claude Code subagents solve the same problem — delegated parallel execution — but with fundamentally different architecture and tradeoffs.** Your choice should be driven by your specific needs around isolation, cost, speed, and workflow integration.

Here are the essential points:

1. **Context isolation is the core architectural difference.** Codex uses snapshot-based isolation (each subagent gets a copy of the repo). Claude Code uses shared-filesystem execution (all subagents see the same live files). Choose based on whether you need safety or speed.

2. **Codex is cheaper per token; Claude Code can be cheaper per task.** Codex's lower token rates win at scale, but Claude Code's zero cold-start and Haiku model option can make lightweight tasks dramatically cheaper.

3. **Parallel agents are only worth it when tasks are independent, non-overlapping, and complex enough to justify the overhead.** The five criteria — independence, non-overlapping scope, sufficient complexity, context isolation benefit, and cost justification — should be your checklist before spawning subagents.

4. **Three to five parallel subagents is the sweet spot for most workflows.** Beyond that, coordination overhead, rate limits, and the longest-running subagent become the bottleneck, and marginal gains diminish rapidly.

5. **The shared filesystem in Claude Code is both its greatest strength and greatest risk.** It enables fast multi-step workflows and zero-overhead task handoff, but it also means two subagents editing the same file will corrupt each other's work. Scope carefully.

6. **Sequential execution is still the right choice for many tasks.** Debugging, iterative development, and tasks with strong dependencies should not be parallelized. Subagents add value for embarrassingly parallel work, not for every task.

7. **Hybrid setups work.** Use Codex subagents for CI/CD and isolated execution, Claude Code subagents for interactive local development. They are not mutually exclusive.

The **multi-agent coding** landscape is evolving fast. Both platforms are adding features — better coordination primitives, smarter conflict resolution, and more granular cost controls. The architectural decisions you make now about how to structure your subagent workflows will carry forward as these tools mature.

Start by identifying 2-3 tasks in your daily workflow that are clearly parallelizable. Try running them with subagents on whichever platform you already use. Measure the time savings and cost difference against sequential execution. That real-world data will tell you more than any benchmark or comparison table about whether **parallel coding agents** fit your workflow.
