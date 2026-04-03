---
title: "Make Coding Agents Cite Docs, Not Hallucinate"
description: "Learn how Docs MCP servers and instruction files like AGENTS.md force AI coding agents to cite real documentation."
date: "2026-04-02"
tags: ["OpenAI Docs MCP","AI coding hallucinations","AGENTS.md","MCP servers","docs-first coding agent","Claude Code","Codex","Cursor","AI-assisted development"]
readTime: "32 min read"
ogImage: "/og/how-to-make-coding-agents-cite-docs-instead-of-hallucinating.png"
canonical: "https://chaitanyaprabuddha.com/blog/how-to-make-coding-agents-cite-docs-instead-of-hallucinating"
published: true
---

# How to Make Coding Agents Cite Docs Instead of Hallucinating

Every developer who has spent meaningful time with an AI coding agent has encountered the same gut-drop moment: you ship code that the agent confidently generated, only to discover that the API method it called does not exist. **AI coding hallucinations** are not edge cases. They are the default behavior when a model reaches beyond its training data and fills the gap with plausible-sounding fiction. The fix is not "better prompting" alone. The fix is architecture: give the agent a live pipeline to real documentation and explicit instructions to use it. That is exactly what **OpenAI Docs MCP** servers and instruction files like **AGENTS.md** are built to do, forming the backbone of a **docs-first coding agent** workflow.

This guide walks through the full strategy, from understanding why agents hallucinate to configuring a production-grade setup where every code suggestion is traceable to an authoritative source. You will get working configuration files, prompt templates, before-and-after examples, and a repeatable playbook you can apply to any AI-assisted development environment.

## Table of Contents

- [Why AI Coding Agents Hallucinate](#why-ai-coding-agents-hallucinate)
- [What Is a Docs-First Coding Agent](#what-is-a-docs-first-coding-agent)
- [Understanding the Model Context Protocol](#understanding-the-model-context-protocol)
- [OpenAI Docs MCP: Your Agent's Documentation Pipeline](#openai-docs-mcp-your-agents-documentation-pipeline)
- [Setting Up Docs MCP Across Editors and Agents](#setting-up-docs-mcp-across-editors-and-agents)
- [AGENTS.md: The Instruction File That Forces Citation](#agentsmd-the-instruction-file-that-forces-citation)
- [CLAUDE.md and Other Instruction File Formats](#claudemd-and-other-instruction-file-formats)
- [Writing Prompts That Demand Documentation References](#writing-prompts-that-demand-documentation-references)
- [Before and After: Hallucination vs. Cited Output](#before-and-after-hallucination-vs-cited-output)
- [Combining Docs MCP with Instruction Files: The Full Stack](#combining-docs-mcp-with-instruction-files-the-full-stack)
- [Advanced Patterns for Docs-First Development](#advanced-patterns-for-docs-first-development)
- [Measuring and Reducing Hallucination Rates](#measuring-and-reducing-hallucination-rates)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

## Why AI Coding Agents Hallucinate

AI coding hallucinations happen when a model generates code that references APIs, methods, parameters, or behaviors that do not exist in the actual library or framework. The root cause is straightforward: large language models are statistical pattern machines trained on a snapshot of the internet. They do not "know" anything. They predict what text is likely to come next.

### The Training Data Cutoff Problem

Every model has a knowledge cutoff date. Code libraries, frameworks, and APIs change constantly. A model trained on data from early 2025 has no awareness of breaking changes, new methods, or deprecated patterns introduced after that date. When you ask it about a recently updated API, it fills in the blanks using patterns from older versions.

This is not a minor inconvenience. It leads to code that compiles but behaves incorrectly, or code that references methods removed two versions ago. The agent delivers it with the same confidence it uses for well-documented, stable APIs.

### Confident Fabrication of API Surfaces

The second failure mode is pure invention. Ask a model to use a niche library it has seen only a handful of times in training data, and it will cheerfully construct method signatures that look plausible but are entirely fabricated. It might combine naming conventions from similar libraries, or extrapolate from a partial memory of the real API.

**The core problem is not that the model is wrong.** The problem is that it has no mechanism to check whether it is right. Without access to live documentation, it cannot distinguish between a correct API call and a hallucinated one. This is the gap that Docs MCP and instruction files are designed to close.

### The Cost of Undetected Hallucinations

Hallucinated code is expensive in ways that go beyond a failed build. It can:

- Introduce subtle runtime bugs that pass initial testing
- Create security vulnerabilities by misusing authentication or encryption APIs
- Waste hours of debugging time chasing methods that never existed
- Erode team trust in AI-assisted workflows, slowing adoption

The solution is not to abandon AI coding agents. It is to build a system where they always have access to the truth.

## What Is a Docs-First Coding Agent

A **docs-first coding agent** is an AI coding assistant that is architecturally configured to consult authoritative documentation before generating code. Instead of relying solely on parametric memory (what the model "learned" during training), it retrieves current, verified information from documentation servers and uses that as the basis for its output.

### The Docs-First Principle

The principle is simple: **no code generation without documentation grounding.** When a docs-first agent needs to call an API, it first searches the relevant documentation, retrieves the current method signatures and parameters, and then generates code that matches the retrieved documentation exactly.

This is fundamentally different from the default behavior of most coding agents, which generate code from memory and only consult documentation if explicitly asked.

### What Makes It Work

Two components make this architecture practical:

1. **A live documentation pipeline** via MCP servers that give the agent real-time access to current docs
2. **Instruction files** (AGENTS.md, CLAUDE.md, .cursorrules) that tell the agent to always use that pipeline before writing code

Neither component works well in isolation. A Docs MCP server without instructions is a tool the agent might ignore. Instructions without a documentation source are just words with no mechanism to fulfill them. Together, they create a closed loop where the agent is both told to cite docs and given the means to do so.

## Understanding the Model Context Protocol

The Model Context Protocol (MCP) is an open-source standard for connecting AI applications to external systems. Think of it as a universal adapter that lets any AI agent talk to any data source, tool, or documentation server through a single, standardized interface.

### How MCP Works

MCP uses a client-server architecture. The AI application (called the "host") creates MCP clients that connect to MCP servers. Each server exposes capabilities through three core primitives:

- **Tools**: Executable functions the AI can invoke (search docs, query databases, run commands)
- **Resources**: Data sources that provide contextual information (file contents, documentation pages, database records)
- **Prompts**: Reusable templates that structure interactions with the model

When a coding agent connects to a Docs MCP server, it gains access to tools like `search_docs` and `get_page_content`. The agent can invoke these tools during a conversation to retrieve real documentation before generating code.

### The Architecture in Practice

```
┌─────────────────────────────────┐
│     AI Coding Agent (Host)      │
│                                 │
│  ┌───────────┐  ┌───────────┐  │
│  │ MCP Client│  │ MCP Client│  │
│  │    #1     │  │    #2     │  │
│  └─────┬─────┘  └─────┬─────┘  │
└────────┼───────────────┼────────┘
         │               │
         ▼               ▼
   ┌───────────┐   ┌───────────┐
   │ Docs MCP  │   │ GitHub    │
   │  Server   │   │ MCP Server│
   └───────────┘   └───────────┘
```

The host application (Codex, Claude Code, Cursor, VS Code with Copilot) manages the connections. Each MCP client maintains a dedicated link to its server. The agent can query multiple MCP servers in a single session, pulling documentation from one server while managing files through another.

### Why MCP Matters for Documentation

Before MCP, giving an AI agent access to documentation meant pasting docs into the prompt, using RAG pipelines with custom embeddings, or relying on the model's training data. Each approach had serious limitations:

- **Pasting docs** burns context window tokens and requires manual effort
- **Custom RAG** is expensive to build and maintain
- **Training data** goes stale and cannot be verified

MCP solves this by providing a **standardized, live connection to documentation sources** that the agent can query on demand. The documentation is always current, the queries are targeted (no wasted context), and the results are traceable back to specific pages and sections.

## OpenAI Docs MCP: Your Agent's Documentation Pipeline

**OpenAI Docs MCP** is a public MCP server hosted at `https://developers.openai.com/mcp` that provides read-only access to developer documentation. It serves as the reference implementation for how documentation MCP servers should work, and it demonstrates the core pattern that any organization can replicate for their own docs.

### What It Does

The OpenAI Docs MCP server exposes two primary capabilities:

1. **Search**: Query documentation using natural language or keywords and get relevant results
2. **Retrieve**: Fetch the full content of a specific documentation page

This is a documentation-only server. It does not call the OpenAI API on your behalf. It does not execute code. It strictly serves as an information retrieval tool, which is exactly what you want for grounding agent outputs in verified sources.

### Why This Pattern Matters Beyond OpenAI

The OpenAI Docs MCP server is specifically for OpenAI's own documentation. But the pattern it establishes is universal. Any organization can build or host a Docs MCP server for their own API documentation, internal wikis, or framework references. Community-built MCP servers like Context7 already provide access to documentation for hundreds of popular libraries.

The key insight is that **documentation servers are the foundation of hallucination-free coding**. Every library, framework, or API your team uses should have a corresponding documentation source that your coding agent can query in real time.

## Setting Up Docs MCP Across Editors and Agents

The practical power of MCP is that the same documentation server works across every major AI coding environment. Here is how to configure the OpenAI Docs MCP server in each one. The same pattern applies to any MCP server you want to add.

### Codex CLI Configuration

Add the OpenAI Docs MCP server to Codex using the CLI:

```bash
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
```

Or configure it manually in `~/.codex/config.toml`:

```toml
[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"
```

For local MCP servers that run as processes (like Context7 for third-party library docs), use the STDIO transport:

```bash
codex mcp add context7 -- npx -y @upstash/context7-mcp
```

You can verify your MCP servers are active by typing `/mcp` in the Codex TUI.

### VS Code with GitHub Copilot

Create or edit `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "openaiDeveloperDocs": {
      "type": "http",
      "url": "https://developers.openai.com/mcp"
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

This configuration is project-scoped, meaning every developer on the team gets the same documentation sources when they open the repo. Commit it to version control.

### Cursor Configuration

Create or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "openaiDeveloperDocs": {
      "url": "https://developers.openai.com/mcp"
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

For project-specific configuration, place the file at `.cursor/mcp.json` within the repository.

### Claude Code Configuration

Claude Code supports MCP servers through its settings. Add servers using the CLI:

```bash
claude mcp add openaiDeveloperDocs --transport http --url https://developers.openai.com/mcp
```

Or configure them in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

### Multi-Server Configuration Strategy

In practice, you want multiple documentation MCP servers covering your full technology stack. Here is what a well-equipped configuration looks like:

```toml
# ~/.codex/config.toml — example multi-server setup

[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"

[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

[mcp_servers.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_PERSONAL_ACCESS_TOKEN = "ghp_your_token" }
```

The pattern is the same regardless of how many servers you add. Each one extends the agent's ability to ground its output in real, current documentation.

## AGENTS.md: The Instruction File That Forces Citation

Having a Docs MCP server available is necessary but not sufficient. The agent also needs explicit instructions to use it. This is where **AGENTS.md** comes in. It is the instruction file that Codex reads before doing any work, and it is where you encode the behavioral rules that transform a generic coding agent into a **docs-first coding agent**.

### What AGENTS.md Is

AGENTS.md is a markdown file that provides persistent instructions and context to OpenAI's Codex agent. Codex reads these files before performing any task. They act as a behavioral contract: "Here is how you must work on this project."

The file supports a hierarchical discovery system:

1. **Global scope**: `~/.codex/AGENTS.md` applies to all projects
2. **Project scope**: `AGENTS.md` at the repository root applies to that project
3. **Directory scope**: Nested `AGENTS.md` files in subdirectories override parent rules for that directory

More specific files take precedence. A `services/payments/AGENTS.override.md` overrides the root `AGENTS.md` for everything under the payments directory.

### Writing AGENTS.md for Documentation-First Behavior

Here is a production-ready AGENTS.md that forces the agent to cite documentation:

```markdown
# AGENTS.md

## Documentation-First Development Rules

### Mandatory Documentation Lookup
- Before writing ANY code that uses an external API, SDK, or library,
  you MUST search the relevant documentation using available MCP servers.
- Never rely on your training data for API signatures, method names,
  or parameter types. Always verify against live documentation.
- If no documentation MCP server is available for a library, explicitly
  state that you are working from training data and flag the output
  as unverified.

### Citation Requirements
- When generating code that calls external APIs, include a comment
  citing the documentation source. Format:
  `// Ref: <doc-page-title> — <url-or-server-name>`
- If a documentation page contradicts your training data, always
  follow the documentation.
- When answering questions about API behavior, quote the relevant
  section of the documentation directly.

### MCP Server Usage
- Always use the OpenAI developer documentation MCP server if you
  need to work with the OpenAI API, ChatGPT Apps SDK, or Codex
  without me having to explicitly ask.
- Use Context7 or equivalent MCP servers for third-party library
  documentation (React, Next.js, Prisma, etc.).
- If a search returns no results, try alternative search terms
  before falling back to training data.

### Error Handling
- If you cannot find documentation for a specific API method,
  do not invent the method signature. Instead, tell me that
  documentation was not found and suggest I verify manually.
- Never silently guess at parameter names, types, or return values.

## Code Style and Testing
- Run `npm test` after modifying any source file.
- Use TypeScript strict mode for all new files.
- Prefer named exports over default exports.
```

### Why This Structure Works

Each rule is **specific and verifiable**. "Always search documentation before writing API code" is a concrete behavior the agent can follow. Compare that to vague instructions like "be accurate" or "check your work," which give the agent no actionable guidance.

The rules are also **layered**. The mandatory lookup rule is the foundation. The citation requirement makes verification possible. The error handling section addresses the case where documentation is unavailable. Together, they close every escape route the agent might use to skip the documentation step.

### AGENTS.md MCP Integration Pattern

The most powerful pattern is explicitly connecting your **AGENTS.md** to your **MCP** configuration. The instruction file tells the agent what to do; the MCP server gives it the means to do it. Here is how they reference each other:

```markdown
# AGENTS.md

## Available Documentation Sources

The following MCP servers are configured for this project.
Use them proactively — do not wait to be asked.

| MCP Server           | Use For                          |
|----------------------|----------------------------------|
| openaiDeveloperDocs  | OpenAI API, Assistants, Codex    |
| context7             | React, Next.js, Prisma, Stripe   |
| github               | Repository issues and PRs        |

When writing code that interacts with any of these services,
query the corresponding MCP server FIRST. Only proceed to
code generation after retrieving the relevant documentation.
```

This table makes it unambiguous which server to consult for which library. The agent does not have to guess.

## CLAUDE.md and Other Instruction File Formats

AGENTS.md is the instruction format for OpenAI Codex. Other coding agents use different file names but serve the same purpose. Understanding the landscape helps you build a docs-first setup regardless of which agent your team uses.

### CLAUDE.md for Claude Code

Claude Code reads `CLAUDE.md` files, not `AGENTS.md`. The file serves the same purpose: persistent instructions loaded at the start of every session. Claude Code supports a rich hierarchy of instruction sources:

| Scope              | Location                          | Purpose                            |
|--------------------|-----------------------------------|------------------------------------|
| Managed policy     | System-level path                 | Organization-wide rules            |
| Project            | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared project instructions |
| User               | `~/.claude/CLAUDE.md`             | Personal preferences               |
| Rules directory    | `.claude/rules/*.md`              | Modular, topic-specific rules      |

Claude Code also supports `@path/to/file` import syntax, which lets you pull in external files. This means you can maintain a single source of truth:

```markdown
# CLAUDE.md

@AGENTS.md

## Claude Code Specific Rules

Use plan mode for changes under `src/billing/`.
Always verify API calls against MCP documentation servers before generating code.
When citing documentation, include the page title and a brief quote from the relevant section.
```

This approach is ideal for teams that use both Codex and Claude Code. The shared rules live in `AGENTS.md`, and each agent's instruction file imports them while adding agent-specific overrides.

### .cursorrules for Cursor

Cursor uses `.cursorrules` files (or the newer Rules for AI system) to provide persistent instructions. The same docs-first principles apply:

```markdown
# .cursorrules

## Documentation-First Rules

- Before generating code for any external library, search the
  documentation using available MCP servers.
- Cite the documentation source in code comments.
- If docs are unavailable, flag the output as unverified.
- Never fabricate API method signatures.
```

### GitHub Copilot Custom Instructions

GitHub Copilot supports custom instructions through `.github/copilot-instructions.md`. While Copilot's MCP support is newer, the instruction file pattern is the same:

```markdown
# .github/copilot-instructions.md

When generating code that calls external APIs:
1. Use MCP documentation servers to verify method signatures.
2. Include a citation comment referencing the documentation source.
3. If documentation is unavailable, note that the code is unverified.
```

### Unifying Instructions Across Agents

For teams that use multiple coding agents, the cleanest approach is to maintain one canonical instruction file and import it everywhere:

```
project-root/
├── AGENTS.md                    # Canonical rules (Codex reads directly)
├── CLAUDE.md                    # Imports AGENTS.md + Claude-specific rules
├── .cursorrules                 # Imports or mirrors AGENTS.md content
├── .github/
│   └── copilot-instructions.md  # Mirrors key rules for Copilot
└── .vscode/
    └── mcp.json                 # MCP server configuration
```

The canonical AGENTS.md contains every rule that applies universally. Agent-specific files import it and add only the overrides unique to that agent.

## Writing Prompts That Demand Documentation References

Instruction files set the baseline behavior, but individual prompts can reinforce the docs-first pattern. Here are prompt templates that explicitly demand documentation citation.

### The Documentation-First Prompt Template

```
I need to implement [feature] using [library/API].

Before writing any code:
1. Search the documentation for [library/API] using the docs MCP server.
2. Retrieve the relevant pages for [specific methods/endpoints].
3. Show me the key documentation excerpts.
4. Then write the implementation based ONLY on what the docs say.

Include a citation comment above each API call referencing
the documentation source.
```

### The Verification Prompt

Use this when you suspect the agent may have hallucinated in a previous response:

```
Review the code you just generated. For each external API call:
1. Search the documentation MCP server for the exact method name.
2. Verify the parameter names, types, and return values match the docs.
3. If any call does not match the documentation, fix it and explain
   what was wrong.
```

### The "Show Your Sources" Prompt

```
Implement a [feature] using the [library] API.

Requirements:
- Before each code block, show the documentation excerpt you are
  basing the implementation on.
- Format citations as: [Doc: page-title] followed by the relevant quote.
- If you cannot find documentation for a specific method, stop and
  tell me rather than guessing.
```

### The Comparative Prompt

This is useful when migrating between API versions:

```
I need to migrate from [library v2] to [library v3].

1. Search the docs MCP server for the v3 migration guide.
2. For each method I'm currently using, find the v3 equivalent
   in the documentation.
3. Show me a side-by-side comparison with documentation citations
   for both versions.
4. Only include changes that are verified in the documentation.
```

These prompts work because they make documentation consultation an explicit step in the workflow, not an afterthought. The agent cannot skip to code generation without first completing the research phase.

## Before and After: Hallucination vs. Cited Output

The difference between a default coding agent and a docs-first coding agent is stark. Here are concrete examples.

### Example 1: OpenAI API Call

**Without Docs MCP (Hallucinated):**

```python
# The agent generates this from training data
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-5",
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=500,
    temperature=0.7,
    presence_penalty=0.6,
    stream_options={"include_usage": True},
    response_format={"type": "json_strict"}  # Hallucinated parameter value
)

# The agent confidently uses 'response_format' with a value
# that may not exist in the actual API
```

The problem here is subtle. Most of the code looks correct, but `"json_strict"` as a `response_format` type may not be a valid value. The agent invented a plausible-sounding option based on patterns in its training data.

**With Docs MCP + AGENTS.md (Cited):**

```python
# Ref: OpenAI Chat Completions API — openaiDeveloperDocs MCP
# Verified parameters: model, messages, max_tokens, temperature,
# response_format with type "json_object" or "json_schema"
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4.1",
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=500,
    temperature=0.7,
    response_format={"type": "json_object"}  # Verified against docs
)
```

The cited version uses verified parameter values. The comment traces every parameter back to its documentation source. If the docs change next week, the agent will pick up the new values on the next query.

### Example 2: React Hook Usage

**Without Docs MCP (Hallucinated):**

```jsx
import { useServerAction } from 'react';

function SubmitButton() {
  const [state, dispatch] = useServerAction(submitForm, {
    onSuccess: (result) => console.log(result),
    onError: (error) => console.error(error),
  });

  return <button onClick={dispatch}>Submit</button>;
}
```

This looks reasonable, but `useServerAction` with these exact options may not exist in React's actual API. The agent constructed a plausible hook based on naming patterns it has seen.

**With Docs MCP + AGENTS.md (Cited):**

```jsx
// Ref: React useActionState documentation — context7 MCP
// "useActionState is a Hook that allows you to update state
//  based on the result of a form action."
import { useActionState } from 'react';

function SubmitButton() {
  const [state, formAction, isPending] = useActionState(
    submitForm,
    initialState
  );

  return (
    <form action={formAction}>
      <button type="submit" disabled={isPending}>
        Submit
      </button>
    </form>
  );
}
```

The docs-first version uses the correct hook name (`useActionState`, not `useServerAction`), the correct return signature (three values, not two), and the correct usage pattern (form action, not click handler). Every detail is traceable to the documentation.

### Example 3: Database ORM Query

**Without Docs MCP (Hallucinated):**

```typescript
const users = await prisma.user.findMany({
  where: {
    email: { endsWith: "@company.com" },
    role: "admin",
  },
  include: {
    posts: {
      orderBy: { createdAt: "desc" },
      take: 5,
      where: { published: true },
    },
  },
  orderBy: { name: "asc" },
  paginate: { page: 1, perPage: 20 },  // Hallucinated option
});
```

The `paginate` option does not exist in Prisma. Prisma uses `skip` and `take` for pagination. The agent invented a convenience API that does not exist.

**With Docs MCP + AGENTS.md (Cited):**

```typescript
// Ref: Prisma Client findMany — context7 MCP
// Pagination uses 'skip' and 'take' parameters
const users = await prisma.user.findMany({
  where: {
    email: { endsWith: "@company.com" },
    role: "admin",
  },
  include: {
    posts: {
      orderBy: { createdAt: "desc" },
      take: 5,
      where: { published: true },
    },
  },
  orderBy: { name: "asc" },
  skip: 0,
  take: 20,
});
```

Small difference. Massive impact. The hallucinated version would throw a runtime error that might take significant debugging time to trace.

## Combining Docs MCP with Instruction Files: The Full Stack

The most reliable docs-first setup combines MCP servers, instruction files, and prompt discipline into a single, cohesive system. Here is the complete architecture.

### Layer 1: MCP Server Configuration

This is the infrastructure layer. It gives the agent the ability to query documentation.

```json
// .vscode/mcp.json — committed to version control
{
  "servers": {
    "openaiDeveloperDocs": {
      "type": "http",
      "url": "https://developers.openai.com/mcp"
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

### Layer 2: Instruction Files

This is the behavioral layer. It tells the agent to use the infrastructure.

```markdown
# AGENTS.md

## Documentation-First Rules

1. Before writing code that calls any external API, SDK, or library
   method, search the relevant MCP documentation server.
2. If the method/endpoint exists in the docs, use the documented
   signature exactly.
3. If the method/endpoint is NOT found in docs, tell the user
   explicitly and do not fabricate a call.
4. Include citation comments in generated code referencing the
   doc page consulted.

## Available MCP Documentation Servers

| Server              | Covers                                |
|---------------------|---------------------------------------|
| openaiDeveloperDocs | OpenAI API, Assistants, Embeddings    |
| context7            | React, Next.js, Prisma, Stripe, etc.  |

## Anti-Hallucination Checklist

Before presenting code to the user, verify:
- [ ] Every external API call has a documentation source
- [ ] Parameter names match the official docs exactly
- [ ] Return types match the official docs
- [ ] No convenience methods were invented
- [ ] Deprecated methods were not used if alternatives exist
```

### Layer 3: Prompt Discipline

This is the operational layer. It reinforces the rules at the point of interaction.

Your team should adopt standard prompt patterns. The most effective ones include:

- Always state the library and version when making a request
- Ask the agent to show documentation excerpts before code
- Request citations in code comments
- Use verification prompts after receiving complex outputs

### How the Layers Interact

When a developer asks the agent to implement a feature:

1. The **instruction file** (AGENTS.md/CLAUDE.md) activates the docs-first behavior
2. The agent queries the **MCP documentation server** for relevant API details
3. The agent generates code based on the retrieved documentation
4. The **citation comments** in the output make verification trivial
5. The developer can trace any line of code back to its documentation source

This closed loop eliminates the two main vectors for hallucination: stale training data and fabricated API surfaces. The agent always has access to current documentation, and it is always instructed to use it.

## Advanced Patterns for Docs-First Development

Once the basic setup is working, several advanced patterns can further reduce hallucination rates and improve the quality of AI-generated code.

### Path-Scoped Documentation Rules

Not every directory in your project uses the same libraries. Claude Code's rules system supports path-scoped instructions that only activate when working with matching files:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

When working in the API layer:
- Always consult the OpenAI Docs MCP before generating any
  API client code.
- Use the Stripe documentation MCP for anything under
  src/api/billing/.
- Every API handler must include JSDoc with a @see tag
  linking to the relevant documentation page.
```

```markdown
---
paths:
  - "src/components/**/*.tsx"
---

# Frontend Component Rules

When working with React components:
- Consult Context7 MCP for React and Next.js API usage.
- Verify hook signatures against documentation before use.
- Do not use experimental or canary APIs without explicit
  approval from the developer.
```

This approach keeps rules relevant and prevents context window bloat. The agent only sees the documentation rules that matter for the files it is currently editing.

### Documentation Freshness Verification

Add a rule that makes the agent check documentation dates:

```markdown
## Freshness Verification

When retrieving documentation from MCP servers:
- Note the last-updated date of the documentation page.
- If the page was last updated more than 6 months ago, warn the
  user that the documentation may be stale.
- If multiple documentation pages conflict, prefer the more
  recently updated one.
```

### Automated Citation Validation

For teams that want to enforce citations programmatically, add a lint rule or pre-commit hook that checks for citation comments:

```javascript
// .eslintrc.js — custom rule concept
module.exports = {
  rules: {
    // Flag API calls without citation comments
    "require-api-citation": "warn",
  },
};
```

While a full ESLint plugin for this is beyond the scope of this article, the concept is straightforward: any line that calls an external API should have a citation comment within the preceding three lines. This can be implemented as a simple regex-based check in a pre-commit hook:

```bash
#!/bin/bash
# pre-commit hook: check for uncited API calls

# Pattern: lines calling common API methods without a preceding Ref: comment
git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|py)$' | while read file; do
  if grep -n 'client\.\|api\.\|fetch(' "$file" | while read line; do
    linenum=$(echo "$line" | cut -d: -f1)
    # Check if a citation comment exists within 3 lines above
    start=$((linenum - 3))
    [ $start -lt 1 ] && start=1
    if ! sed -n "${start},${linenum}p" "$file" | grep -q 'Ref:'; then
      echo "WARNING: Uncited API call in $file:$linenum"
    fi
  done; then
    true
  fi
done
```

### Multi-Agent Documentation Chains

For complex tasks, chain multiple agents with documentation verification between steps:

1. **Agent 1** (Research): Search docs MCP servers and compile a documentation brief
2. **Agent 2** (Implementation): Generate code using only the documentation brief as context
3. **Agent 3** (Verification): Cross-check generated code against the documentation MCP servers

This pattern is especially powerful for critical code paths like authentication, payment processing, or data encryption where hallucinated API usage could create security vulnerabilities.

### Team-Wide Documentation MCP Standards

Establish a team standard for which MCP servers must be configured for your project. Document it in your AGENTS.md and your project's contributing guide:

```markdown
## Required MCP Servers

All contributors must have the following MCP servers configured:

1. **openaiDeveloperDocs** — Required for any OpenAI API work
2. **context7** — Required for frontend and ORM work
3. **github** — Required for issue and PR references

Run `codex mcp list` or check `/mcp` in the TUI to verify
your configuration. If a server is missing, run:

    codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
    codex mcp add context7 -- npx -y @upstash/context7-mcp
```

## Measuring and Reducing Hallucination Rates

You cannot improve what you do not measure. Here is how to track whether your docs-first setup is actually reducing hallucinations.

### Manual Audit Process

Once a week, review a sample of AI-generated code from your team:

1. Select 10-15 code blocks that call external APIs
2. For each block, check whether the API call matches the current documentation
3. Track: correct calls, incorrect calls, and calls with citations vs. without
4. Calculate a hallucination rate: `(incorrect calls) / (total calls) * 100`

Teams typically see hallucination rates drop from 15-25% to under 3% after implementing a docs-first setup with MCP servers and instruction files.

### Automated Verification

Build a CI step that spot-checks API calls against documentation:

```yaml
# .github/workflows/doc-verify.yml
name: Documentation Verification
on: pull_request

jobs:
  verify-citations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for citation comments
        run: |
          # Count API calls and citations
          api_calls=$(grep -r -c 'client\.\|api\.\|fetch(' src/ | awk -F: '{sum+=$2} END{print sum}')
          citations=$(grep -r -c '// Ref:' src/ | awk -F: '{sum+=$2} END{print sum}')
          echo "API calls: $api_calls"
          echo "Citations: $citations"
          ratio=$(echo "scale=2; $citations / $api_calls * 100" | bc)
          echo "Citation coverage: ${ratio}%"
```

### Key Metrics to Track

| Metric                    | Target         | How to Measure                                   |
|---------------------------|----------------|--------------------------------------------------|
| Hallucination rate        | Under 3%       | Manual audit of API calls vs. documentation      |
| Citation coverage         | Over 80%       | Automated count of citation comments             |
| Docs MCP query rate       | Increasing     | Server logs or agent session transcripts         |
| Time to debug API errors  | Decreasing     | Issue tracker resolution times                   |

### The Feedback Loop

When you find a hallucination that slipped through, add it to your AGENTS.md as a specific rule:

```markdown
## Known Hallucination Patterns

- Do NOT use `prisma.user.paginate()` — this method does not exist.
  Use `skip` and `take` parameters with `findMany()` instead.
- Do NOT use `response_format: { type: "json_strict" }` with
  the OpenAI API. Valid values are "json_object" and "json_schema".
- The React hook is `useActionState`, not `useServerAction`.
  Always verify against the React docs MCP before using hooks.
```

This creates a learning system. Every hallucination that gets caught becomes a rule that prevents it from happening again. Over time, your instruction file accumulates institutional knowledge about your specific hallucination patterns.

## Frequently Asked Questions

### What is the difference between Docs MCP and RAG?

Docs MCP is a real-time, standardized protocol for querying documentation servers. RAG (Retrieval Augmented Generation) is a broader technique that typically involves embedding documents into a vector database and retrieving similar chunks. Docs MCP is simpler to set up, requires no infrastructure beyond the MCP server, and provides structured search and retrieval rather than similarity matching. For documentation specifically, Docs MCP is more precise because it queries the official source directly rather than matching against embeddings that may lose nuance.

### Does the OpenAI Docs MCP server only work with Codex?

No. The OpenAI Docs MCP server works with any MCP-compatible client, including Claude Code, Cursor, VS Code with GitHub Copilot, and any other tool that supports the Model Context Protocol. The server is hosted at `https://developers.openai.com/mcp` and communicates over standard HTTP. The content it serves is OpenAI's developer documentation, but the protocol is universal.

### Can I build a Docs MCP server for my own company's documentation?

Absolutely. MCP is an open standard with SDKs available in Python, TypeScript, Java, Kotlin, C#, and other languages. You can build a Docs MCP server that indexes your internal API documentation, wiki pages, or any other documentation source. The server exposes search and retrieval tools, and any MCP-compatible coding agent can connect to it. This is one of the highest-impact investments a platform team can make for developer productivity.

### What happens when the Docs MCP server is down or unreachable?

When a configured MCP server is unavailable, the agent falls back to its training data. This is why the instruction file rules are critical. A well-written AGENTS.md includes a fallback rule: "If the documentation MCP server is unreachable, explicitly tell the user that you are working from training data and flag the output as unverified." Without this rule, the agent silently falls back to training data and the developer has no way of knowing which outputs are grounded and which are not.

### How is AGENTS.md different from CLAUDE.md?

AGENTS.md is the instruction file format for OpenAI's Codex agent. CLAUDE.md is the format for Anthropic's Claude Code. They serve the same purpose (persistent instructions loaded at session start) but are read by different tools. Claude Code can import AGENTS.md into a CLAUDE.md file using the `@AGENTS.md` syntax, so teams that use both tools can maintain a single source of truth. The behavioral rules inside the files are identical in structure and intent.

### Do I need both Docs MCP and instruction files?

Yes. They serve complementary functions. The Docs MCP server gives the agent the ability to query documentation. The instruction file (AGENTS.md, CLAUDE.md) tells the agent to use that ability proactively. Without the MCP server, the instruction file is a rule with no mechanism. Without the instruction file, the MCP server is a tool the agent may never use unless explicitly prompted. Together, they create an automatic docs-first behavior that does not depend on the developer remembering to ask.

### How many MCP servers can I configure at once?

There is no hard protocol limit on the number of MCP servers. Practical limits depend on your host application (Codex, Claude Code, Cursor, etc.) and the overhead of maintaining connections. Most teams configure between three and eight servers, covering their primary documentation sources, GitHub, and sometimes specialized tools like Figma or Sentry.

### Will this slow down code generation?

Documentation lookups via MCP add a small latency to each interaction, typically one to three seconds per query depending on the server. However, the time saved by not debugging hallucinated code vastly outweighs this cost. A single hallucinated API call can cost hours of debugging. A one-second documentation lookup that prevents it is an excellent trade.

### Can I use this approach with local/self-hosted models?

Yes, as long as your local model runs within an MCP-compatible host application. MCP is a protocol, not a model feature. If your IDE or agent framework supports MCP clients, it can connect to Docs MCP servers regardless of which model powers the generation. The documentation grounding happens at the application layer, not the model layer.

## Key Takeaways

AI coding hallucinations are a solved problem for teams willing to invest in the right architecture. The solution is not better models or cleverer prompts. It is a documentation-first system that ensures every API call is grounded in verified, current documentation.

Here is the playbook:

1. **Configure Docs MCP servers** for every library and API your project uses. Start with the OpenAI Docs MCP server and Context7 for broad coverage. Add specialized servers for your own APIs.

2. **Write an AGENTS.md** (or CLAUDE.md, .cursorrules) that explicitly requires documentation lookup before code generation. Make the rules specific, verifiable, and layered with fallback behavior.

3. **Use prompt patterns** that reinforce the docs-first behavior. Ask the agent to show documentation excerpts before code, request citations, and verify outputs against docs.

4. **Measure your hallucination rate** and track it over time. Audit AI-generated code weekly. Add caught hallucinations to your instruction file as explicit rules.

5. **Commit your configuration to version control.** MCP server configs and instruction files should be part of your repository so every team member and every CI pipeline gets the same docs-first behavior.

The combination of **OpenAI Docs MCP**, **AGENTS.md instruction files**, and deliberate prompt discipline transforms a coding agent from a confident guesser into a documentation-citing professional. The technology exists today. The setup takes less than an hour. The reduction in debugging time and hallucination-related bugs pays for itself within the first week.

Stop letting your coding agents guess. Make them cite their sources.
