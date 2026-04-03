---
title: "MCP for Coding Agents Explained Simply"
description: "Learn how Model Context Protocol powers coding agents like Claude Code, Cursor, and Codex with tools and data."
date: "2026-04-02"
tags: ["MCP","Model Context Protocol","coding agents","Claude Code","Cursor","Codex","AI tools","developer productivity","agentic coding"]
readTime: "30 min read"
ogImage: "/og/mcp-for-coding-agents-explained.png"
canonical: "https://chaitanyaprabuddha.com/blog/mcp-for-coding-agents-explained"
published: true
---

# MCP for Coding Agents, Explained Simply

If you have been using AI coding agents lately, you have probably seen the term **MCP** everywhere. MCP for coding agents is quickly becoming the backbone of how tools like Claude Code, Cursor, and Codex connect to the outside world. But what is MCP, really? Why should you care? And how do you actually set it up?

This guide breaks down the **Model Context Protocol** from scratch. We will start with the fundamentals, then go deep into practical integration with the coding agents you already use. By the end, you will know how to configure MCP servers, build your own, and understand why this protocol is reshaping agentic development workflows.

---

## Table of Contents

- [What Is the Model Context Protocol (MCP)?](#what-is-the-model-context-protocol-mcp)
- [Why MCP Matters for Coding Agents](#why-mcp-matters-for-coding-agents)
- [How MCP Works: Architecture and Core Concepts](#how-mcp-works-architecture-and-core-concepts)
- [MCP Primitives: Tools, Resources, and Prompts](#mcp-primitives-tools-resources-and-prompts)
- [Transport Mechanisms: Stdio vs. Streamable HTTP](#transport-mechanisms-stdio-vs-streamable-http)
- [Setting Up MCP in Claude Code](#setting-up-mcp-in-claude-code)
- [Setting Up MCP in Cursor](#setting-up-mcp-in-cursor)
- [Setting Up MCP in Codex CLI](#setting-up-mcp-in-codex-cli)
- [Building Your Own MCP Server](#building-your-own-mcp-server)
- [MCP Tool Definitions: The JSON Schema That Powers Everything](#mcp-tool-definitions-the-json-schema-that-powers-everything)
- [Real-World MCP Workflows for Developers](#real-world-mcp-workflows-for-developers)
- [MCP Security Considerations](#mcp-security-considerations)
- [Common Mistakes and How to Avoid Them](#common-mistakes-and-how-to-avoid-them)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

---

## What Is the Model Context Protocol (MCP)?

The **Model Context Protocol (MCP)** is an open-source standard for connecting AI applications to external tools, data sources, and workflows. Think of it as **USB-C for AI**: a single, standardized interface that lets any AI application talk to any external system.

Before MCP, every AI coding tool had to build its own bespoke integrations. Want your agent to query a database? Custom code. Want it to read from Jira? Another custom integration. Want it to access Sentry error logs? Yet another one-off solution.

MCP eliminates that fragmentation. A tool developer builds one MCP server, and it works with Claude Code, Cursor, Codex, VS Code Copilot, and every other MCP-compatible client. A coding agent developer implements the MCP client protocol once, and they get access to an entire ecosystem of servers.

The protocol was originally created by Anthropic and is now an open standard supported by OpenAI, Microsoft, Google, and hundreds of tool vendors. The specification lives at [modelcontextprotocol.io](https://modelcontextprotocol.io) and is actively developed by the community.

---

## Why MCP Matters for Coding Agents

MCP matters because **coding agents are only as useful as the context they can access**. Without external data, even the most sophisticated model is working blind.

### The Problem MCP Solves

Consider what a coding agent needs to do its job well:

- **Read issue trackers** to understand what to build
- **Access databases** to understand schemas and data
- **Query monitoring tools** to debug production issues
- **Interact with Git hosting platforms** to create PRs and review code
- **Read design files** to implement UI accurately
- **Search documentation** to find API references

Without MCP, each of these requires a separate, tool-specific integration maintained by the agent vendor. With MCP, a single protocol handles all of them.

### Benefits by Role

For **developers using coding agents**, MCP means your agent can do more. Connect it to your issue tracker, your database, your monitoring stack, and your design tool. The agent goes from "smart autocomplete" to "full-stack teammate."

For **tool vendors**, MCP means build one server and reach every coding agent. A Sentry MCP server works in Claude Code, Cursor, Codex, and any future MCP-compatible tool. No more maintaining separate plugins for each editor.

For **teams**, MCP means shared configurations. Check an `.mcp.json` file into your repo, and every team member gets the same set of tools when they open the project. No per-person setup, no configuration drift.

---

## How MCP Works: Architecture and Core Concepts

MCP follows a **client-server architecture** built on JSON-RPC 2.0. Understanding three key participants is essential before going further.

### Hosts, Clients, and Servers

**MCP Host** is the AI application itself. Claude Code, Cursor, and Codex are all MCP hosts. The host coordinates everything and is responsible for managing connections to MCP servers.

**MCP Client** is a component inside the host that maintains a dedicated connection to one MCP server. When Claude Code connects to three MCP servers (say, GitHub, Sentry, and a database), it creates three separate MCP client instances, one per server.

**MCP Server** is the program that exposes tools, data, or prompts to the client. It can be a local process running on your machine or a remote service accessible over HTTP.

```
+---------------------------------------------+
|           MCP Host (e.g. Claude Code)        |
|                                              |
|  +------------+  +------------+  +--------+  |
|  | MCP Client |  | MCP Client |  | MCP    |  |
|  |     1       |  |     2       |  | Client |  |
|  +------+-----+  +------+-----+  | 3      |  |
|         |               |        +---+----+  |
+---------+---------------+-----------+--------+
          |               |           |
          v               v           v
   +------+-----+  +------+-----+  +-+----------+
   | MCP Server  |  | MCP Server  |  | MCP Server |
   | (GitHub)    |  | (Sentry)    |  | (Database)  |
   +-------------+  +-------------+  +------------+
```

### The Two Layers

MCP consists of two layers that work together:

**The Data Layer** handles the actual protocol messages using JSON-RPC 2.0. It manages lifecycle events (initialization, capability negotiation, shutdown), defines the core primitives (tools, resources, prompts), and handles notifications for real-time updates.

**The Transport Layer** handles how messages physically move between client and server. MCP supports two transport mechanisms: stdio for local processes and Streamable HTTP for remote services. The transport layer abstracts communication details so the same JSON-RPC messages work regardless of how they are delivered.

### Connection Lifecycle

Every MCP connection follows the same lifecycle:

1. **Initialize**: The client sends an `initialize` request. Both sides exchange their supported protocol version and declare their capabilities.
2. **Ready**: The client sends a `notifications/initialized` message to signal it is ready to communicate.
3. **Operation**: The client discovers tools, calls them, reads resources, and receives notifications.
4. **Shutdown**: The connection is terminated gracefully.

Here is what the initialization handshake looks like on the wire:

```json
// Client -> Server: Initialize request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "elicitation": {}
    },
    "clientInfo": {
      "name": "claude-code",
      "version": "2.1.0"
    }
  }
}

// Server -> Client: Initialize response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": {}
    },
    "serverInfo": {
      "name": "my-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

The key thing to notice is the **capabilities** field. The server declares what it supports (tools, resources, or both), and the client declares what it can handle (elicitation, sampling, etc.). This negotiation ensures both sides know what the other can do before any work begins.

---

## MCP Primitives: Tools, Resources, and Prompts

MCP servers expose three core primitives. Each serves a different purpose in giving AI agents the context they need.

### Tools

**Tools are executable functions** that the AI model can invoke. They are the most commonly used primitive in coding agent workflows. When you hear "MCP gives my agent access to Sentry," that typically means an MCP server is exposing Sentry-related tools.

Tools are **model-controlled**: the language model decides when to call them based on the user's request and the tool's description. The agent discovers available tools at connection time, then selects and invokes them as needed during conversation.

Each tool has a name, a description, and an input schema defined using JSON Schema. Here is an example of what a tool definition looks like in an MCP response:

```json
{
  "name": "query_database",
  "title": "Database Query Tool",
  "description": "Execute a read-only SQL query against the connected database",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "SQL query to execute (SELECT only)"
      },
      "database": {
        "type": "string",
        "description": "Target database name",
        "default": "production"
      }
    },
    "required": ["query"]
  }
}
```

When the model decides to use this tool, it constructs a `tools/call` request with the appropriate arguments, and the server executes the function and returns structured results.

### Resources

**Resources are data sources** that provide contextual information. Unlike tools, which perform actions, resources are more like read-only files that the agent can reference. They are identified by URIs and can contain text, structured data, or binary content.

Resources are **application-driven**, meaning the host application decides how to incorporate them. In Claude Code, you can reference MCP resources using `@` mentions, similar to how you reference files.

Examples of resources include database schemas, API documentation, configuration files, or any structured data that provides useful context.

### Prompts

**Prompts are reusable templates** for structuring interactions. They help users accomplish specific tasks by providing pre-written starting points. In Claude Code, MCP prompts become available as slash commands.

For coding agent workflows, prompts are less commonly used than tools and resources, but they can be powerful for standardizing common operations like "review this PR" or "create an issue from this error."

### How They Differ

| Primitive | Purpose | Controlled By | Example |
|-----------|---------|---------------|---------|
| **Tools** | Execute actions | AI model | Query a database, create a PR |
| **Resources** | Provide context data | Host application | Database schema, file contents |
| **Prompts** | Structure interactions | User | PR review template, issue creator |

---

## Transport Mechanisms: Stdio vs. Streamable HTTP

MCP supports two ways for clients and servers to communicate. Choosing the right transport depends on where your server runs.

### Stdio Transport

**Stdio (standard input/output) is for local servers** that run as processes on your machine. The MCP host spawns the server process and communicates by writing JSON-RPC messages to its stdin and reading responses from its stdout.

Stdio is the most common transport for coding agents because many useful tools operate on local data. A file system server, a local database connector, or a custom script that processes your project files would all use stdio.

**Advantages**: No network overhead, simple to set up, no authentication needed (it runs as your user).

**Limitations**: Only works for local processes. The server must be installed on the same machine as the host.

### Streamable HTTP Transport

**Streamable HTTP is for remote servers** accessible over the network. The client sends HTTP POST requests to the server and can optionally receive streaming responses via Server-Sent Events (SSE).

Remote MCP servers are hosted by service providers. Sentry, GitHub, Notion, Figma, and many others run remote MCP servers that your coding agent connects to over HTTPS.

**Advantages**: Works with cloud services, supports standard HTTP authentication (OAuth, API keys, bearer tokens).

**Limitations**: Requires network access, authentication setup, and the server must be publicly accessible or reachable from your network.

### Quick Comparison

| Feature | Stdio | Streamable HTTP |
|---------|-------|-----------------|
| **Location** | Local process | Remote service |
| **Network** | None required | HTTPS |
| **Authentication** | Inherits OS user | OAuth / API keys |
| **Latency** | Minimal | Network-dependent |
| **Use case** | Local tools, scripts | Cloud services, SaaS |

---

## Setting Up MCP in Claude Code

**Claude Code MCP** integration is the most mature among coding agents. It supports tools, resources, prompts, elicitation, dynamic tool updates, and multiple server scopes.

### Adding a Remote HTTP Server

The most common setup is connecting to a remote MCP server. Use the `claude mcp add` command with the `--transport http` flag:

```bash
# Connect to GitHub MCP server
claude mcp add --transport http github https://api.githubcopilot.com/mcp/

# Connect to Sentry for error monitoring
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# Connect to Notion for documentation
claude mcp add --transport http notion https://mcp.notion.com/mcp

# With Bearer token authentication
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

After adding, authenticate if needed by running `/mcp` inside Claude Code and following the browser flow.

### Adding a Local Stdio Server

For servers that run as local processes:

```bash
# Add a PostgreSQL database server
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:pass@localhost:5432/mydb"

# Add a filesystem server with environment variables
claude mcp add --transport stdio --env API_KEY=your-key myserver \
  -- npx -y @some/mcp-package
```

On **Windows**, wrap npx commands with `cmd /c` to avoid connection errors:

```bash
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package
```

### Server Scopes

Claude Code supports three configuration scopes:

**Local scope** (default): Private to you, only available in the current project. Configuration stored in `~/.claude.json`.

```bash
claude mcp add --transport http stripe --scope local https://mcp.stripe.com
```

**Project scope**: Shared with the team via `.mcp.json` in your project root. Check this into version control.

```bash
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp
```

**User scope**: Available across all your projects. Stored in `~/.claude.json`.

```bash
claude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic
```

### The `.mcp.json` Configuration File

When you use project scope, Claude Code creates or updates a `.mcp.json` file at your project root. This is the file your team checks into version control:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp"
    },
    "database": {
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "${DB_CONNECTION_STRING}"],
      "env": {
        "DB_CONNECTION_STRING": "${DB_CONNECTION_STRING:-postgresql://localhost:5432/dev}"
      }
    }
  }
}
```

Notice the **environment variable expansion** syntax. `${DB_CONNECTION_STRING}` pulls from the environment, and `${DB_CONNECTION_STRING:-default}` provides a fallback. This lets you share config without hardcoding credentials.

### Managing Servers

```bash
# List all configured servers
claude mcp list

# Get details for a specific server
claude mcp get github

# Remove a server
claude mcp remove github

# Inside Claude Code, check server status
/mcp
```

### Tool Search (Context Optimization)

Claude Code has a powerful feature called **Tool Search** that keeps your context window clean. Instead of loading every MCP tool definition upfront, it defers them and only loads tool schemas when the model actually needs them.

This means you can connect to dozens of MCP servers without bloating your context. Only the tool names are loaded at startup; full schemas are fetched on demand.

```bash
# Configure tool search behavior
ENABLE_TOOL_SEARCH=auto:5 claude   # Load upfront if fits in 5% of context
ENABLE_TOOL_SEARCH=false claude    # Disable, load all tools upfront
```

---

## Setting Up MCP in Cursor

**Cursor MCP** support lets you connect MCP servers to the Cursor IDE, giving the AI assistant access to external tools and data sources during coding sessions.

### Configuration File

Cursor reads MCP configuration from a JSON file. You can configure servers at the project level or globally:

**Project-level**: Create `.cursor/mcp.json` in your project root.

**Global**: Configure through Cursor Settings under the MCP section.

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    }
  }
}
```

### Supported Features

Cursor supports **MCP tools** as its primary integration point. When you connect an MCP server that exposes tools, those tools become available to Cursor's AI agent during chat and Composer sessions.

The agent can discover tools, call them, and use the results as context for code generation and editing. This is how Cursor connects to services like GitHub, databases, and monitoring tools through MCP.

### Adding a Stdio Server in Cursor

For local MCP servers in Cursor, specify the command and arguments directly in the configuration:

```json
{
  "mcpServers": {
    "my-database": {
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "postgresql://localhost:5432/mydb"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

### Adding an HTTP Server in Cursor

For remote servers, use the `type` and `url` fields:

```json
{
  "mcpServers": {
    "notion": {
      "type": "http",
      "url": "https://mcp.notion.com/mcp"
    }
  }
}
```

Cursor handles OAuth flows for servers that require authentication. Follow the prompts in the IDE when connecting to authenticated servers.

### Verifying Your Setup

After adding servers, open Cursor's MCP panel to verify connections are active. You should see green indicators for each connected server and a list of available tools.

---

## Setting Up MCP in Codex CLI

**Codex MCP** integration allows OpenAI's Codex CLI to connect to external tools and services. Codex supports both stdio and Streamable HTTP servers.

### Configuration File

Codex reads MCP configuration from a TOML file. You can configure at the user level or project level:

**User-level**: `~/.codex/config.toml`

**Project-level**: `.codex/config.toml` in your project root.

```toml
# Connect to Context7 for documentation lookups
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]

# Connect to Figma for design references
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"

# Connect to Playwright for browser automation
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
```

### CLI Commands

Codex provides CLI commands for managing MCP servers:

```bash
# Add a new MCP server
codex mcp add my-server -- npx -y @some/mcp-package

# List configured servers
codex mcp --help

# OAuth login for remote servers
codex mcp login my-server

# Inside the TUI, check server status
/mcp
```

### Server Configuration Options

Codex supports granular control over each server:

```toml
[mcp_servers.database]
command = "npx"
args = ["-y", "@bytebase/dbhub", "--dsn", "postgresql://localhost:5432/mydb"]
startup_timeout_sec = 15
tool_timeout_sec = 30
enabled = true

# Selectively enable/disable specific tools
enabled_tools = ["query", "list_tables"]
disabled_tools = ["drop_table"]
```

The `enabled_tools` and `disabled_tools` fields let you restrict which tools from a server your agent can actually use. This is valuable for limiting the blast radius of powerful servers.

### HTTP Servers with Authentication

```toml
[mcp_servers.sentry]
url = "https://mcp.sentry.dev/mcp"

[mcp_servers.private-api]
url = "https://internal.company.com/mcp"
bearer_token_env_var = "INTERNAL_API_TOKEN"

[mcp_servers.custom-headers]
url = "https://api.service.com/mcp"
http_headers = { "X-Custom-Header" = "value" }
```

---

## Building Your Own MCP Server

One of MCP's greatest strengths is that **building a server is straightforward**. If you have a tool, API, or data source you want your coding agent to access, you can wrap it in an MCP server in under an hour.

### Python Server with FastMCP

The Python SDK provides `FastMCP`, a high-level class that uses type hints and docstrings to automatically generate tool definitions.

```python
# server.py
from typing import Any
from mcp.server.fastmcp import FastMCP

# Initialize the server
mcp = FastMCP("my-project-tools")


@mcp.tool()
async def search_codebase(query: str, file_type: str = "py") -> str:
    """Search the project codebase for a pattern.

    Args:
        query: Search pattern (supports regex)
        file_type: File extension to filter by (e.g., py, ts, rs)
    """
    import subprocess
    result = subprocess.run(
        ["rg", "--type", file_type, query, "."],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return f"No matches found for '{query}' in *.{file_type} files."
    return result.stdout[:5000]  # Limit output size


@mcp.tool()
async def run_tests(test_path: str = "", verbose: bool = False) -> str:
    """Run project tests and return results.

    Args:
        test_path: Specific test file or directory (empty for all tests)
        verbose: Include verbose output
    """
    import subprocess
    cmd = ["pytest", "--tb=short"]
    if verbose:
        cmd.append("-v")
    if test_path:
        cmd.append(test_path)

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    output = result.stdout + result.stderr
    return output[:8000]


@mcp.tool()
async def get_git_diff(branch: str = "main") -> str:
    """Get the git diff between current branch and a target branch.

    Args:
        branch: Target branch to diff against
    """
    import subprocess
    result = subprocess.run(
        ["git", "diff", f"{branch}...HEAD", "--stat"],
        capture_output=True, text=True
    )
    return result.stdout or "No differences found."


if __name__ == "__main__":
    mcp.run(transport="stdio")
```

### TypeScript Server with the MCP SDK

The TypeScript SDK uses `McpServer` with Zod schemas for input validation:

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";

const server = new McpServer({
  name: "project-tools",
  version: "1.0.0",
});

server.registerTool(
  "search_codebase",
  {
    description: "Search the project codebase for a pattern using ripgrep",
    inputSchema: {
      query: z.string().describe("Search pattern (supports regex)"),
      fileType: z
        .string()
        .optional()
        .describe("File extension filter (e.g., ts, py, rs)"),
    },
  },
  async ({ query, fileType }) => {
    try {
      const typeFlag = fileType ? `--type ${fileType}` : "";
      const output = execSync(`rg ${typeFlag} "${query}" .`, {
        encoding: "utf-8",
        timeout: 30000,
      });
      return {
        content: [{ type: "text", text: output.slice(0, 5000) }],
      };
    } catch {
      return {
        content: [{ type: "text", text: `No matches found for '${query}'.` }],
      };
    }
  }
);

server.registerTool(
  "list_recent_commits",
  {
    description: "List recent git commits with messages and authors",
    inputSchema: {
      count: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("Number of commits to show"),
    },
  },
  async ({ count }) => {
    try {
      const output = execSync(
        `git log --oneline --no-decorate -n ${count}`,
        { encoding: "utf-8" }
      );
      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: "Failed to retrieve git log." }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Project Tools MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### Connecting Your Custom Server

Once built, register it with your coding agent:

**Claude Code:**

```bash
# Python server
claude mcp add --transport stdio project-tools -- uv run server.py

# TypeScript server (after npm run build)
claude mcp add --transport stdio project-tools -- node build/index.js
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "project-tools": {
      "command": "node",
      "args": ["./mcp-servers/build/index.js"]
    }
  }
}
```

**Codex** (`.codex/config.toml`):

```toml
[mcp_servers.project-tools]
command = "node"
args = ["./mcp-servers/build/index.js"]
```

---

## MCP Tool Definitions: The JSON Schema That Powers Everything

Understanding how MCP tool definitions work is crucial for both building servers and debugging integration issues. **The tool definition is the contract** between your server and the AI model.

### Anatomy of a Tool Definition

Every MCP tool definition follows this structure:

```json
{
  "name": "create_github_issue",
  "title": "GitHub Issue Creator",
  "description": "Create a new issue in a GitHub repository with a title, body, and optional labels",
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": {
        "type": "string",
        "description": "Repository owner (organization or username)"
      },
      "repo": {
        "type": "string",
        "description": "Repository name"
      },
      "title": {
        "type": "string",
        "description": "Issue title"
      },
      "body": {
        "type": "string",
        "description": "Issue body in Markdown format"
      },
      "labels": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Labels to apply to the issue"
      }
    },
    "required": ["owner", "repo", "title"]
  }
}
```

### Why Descriptions Matter

The `description` field on both the tool and each property is not just documentation. **The AI model reads these descriptions to decide when and how to use the tool.** A vague description leads to the model using the tool incorrectly or not using it at all.

Good descriptions are specific and action-oriented:

- **Bad**: `"description": "Does stuff with issues"`
- **Good**: `"description": "Create a new issue in a GitHub repository with a title, body, and optional labels"`

### Tool Results

When a tool executes, it returns a structured result:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Issue #42 created successfully: https://github.com/owner/repo/issues/42"
    }
  ],
  "isError": false
}
```

Results can include multiple content items of different types: text, images, audio, resource links, or embedded resources. The `isError` flag signals whether the tool execution failed, allowing the model to handle errors gracefully.

### Output Schemas

MCP also supports **output schemas** for tools that return structured data. This helps the model parse and use the result more effectively:

```json
{
  "name": "get_test_results",
  "description": "Run tests and return structured results",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Test file or directory" }
    },
    "required": ["path"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "passed": { "type": "number", "description": "Number of passed tests" },
      "failed": { "type": "number", "description": "Number of failed tests" },
      "errors": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Error messages from failed tests"
      }
    },
    "required": ["passed", "failed", "errors"]
  }
}
```

---

## Real-World MCP Workflows for Developers

Theory is helpful, but seeing how MCP transforms real workflows makes its value concrete. Here are five workflows that become dramatically better with MCP for coding agents.

### Workflow 1: Issue-to-PR Pipeline

Connect your issue tracker and Git hosting platform via MCP, then ask your agent:

> "Implement the feature described in JIRA issue ENG-4521 and create a PR on GitHub."

The agent reads the issue details through the Jira MCP server, understands the requirements, writes the code, creates a branch, commits, and opens a PR through the GitHub MCP server. What used to take context-switching across four tools now happens in a single conversation.

### Workflow 2: Production Debugging

Connect Sentry and your database:

```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:pass@prod.db.com:5432/analytics"
```

Then ask: "What are the most common errors in the last 24 hours, and can you trace the root cause in our database?"

The agent queries Sentry for error data, cross-references with database records, and provides a diagnosis with suggested fixes.

### Workflow 3: Design-to-Code

Connect Figma:

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

Then ask: "Implement the checkout page based on the latest Figma designs."

The agent reads design specifications, extracts component structures, colors, and typography, then generates matching code.

### Workflow 4: Database Schema Understanding

When starting on a new codebase, connect a database MCP server and ask: "Show me the schema for the users and orders tables and explain the relationships."

The agent queries the database schema, maps out foreign key relationships, and provides a clear explanation -- faster than manually navigating a database GUI.

### Workflow 5: Multi-Tool Automated Workflows

The real power emerges when multiple MCP servers work together. With GitHub, a database, and Gmail connected:

> "Find the 10 users most affected by the bug in PR #456, draft an apology email, and create a follow-up issue."

The agent uses the GitHub server to understand the bug, the database server to find affected users, and the Gmail server to draft the emails. MCP makes this multi-tool coordination seamless.

---

## MCP Security Considerations

Security is not optional when giving AI agents access to external systems. MCP has security built into its design, but you still need to configure it thoughtfully.

### Human-in-the-Loop

The MCP specification explicitly states that there **should always be a human in the loop** with the ability to deny tool invocations. Claude Code, Cursor, and Codex all implement confirmation prompts for sensitive operations. Do not bypass these.

### Principle of Least Privilege

Only connect the MCP servers your agent actually needs. If you are working on frontend code, you probably do not need a production database connection.

**Use read-only credentials** wherever possible. If your agent only needs to read from a database, give it a read-only connection string. If it only needs to view GitHub issues, use a token with read-only permissions.

### Environment Variable Handling

Never hardcode credentials in MCP configuration files, especially those checked into version control. Use environment variable expansion:

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

### Tool Filtering

Both Codex and Claude Code support restricting which tools from a server your agent can use. In Codex, use `enabled_tools` and `disabled_tools` in your config. In Claude Code, use permission settings to deny specific tools:

```json
{
  "permissions": {
    "deny": ["dangerous_tool_name"]
  }
}
```

### Managed MCP for Organizations

For enterprise teams, Claude Code supports **managed MCP configuration** that gives IT administrators centralized control. Deploy a `managed-mcp.json` file to a system directory to define the exact set of MCP servers employees can use:

```json
// C:\Program Files\ClaudeCode\managed-mcp.json (Windows)
// /Library/Application Support/ClaudeCode/managed-mcp.json (macOS)
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "company-internal": {
      "type": "stdio",
      "command": "/usr/local/bin/company-mcp-server",
      "args": ["--config", "/etc/company/mcp-config.json"]
    }
  }
}
```

When this file exists, users cannot add or modify MCP servers. This prevents unauthorized data access and ensures compliance.

### Third-Party Server Risks

Not all MCP servers are created equal. Be cautious with community-built servers, especially those that fetch untrusted content. **MCP servers that process external data can be vectors for prompt injection attacks.** Only install servers from trusted sources and review their code when possible.

---

## Common Mistakes and How to Avoid Them

After helping developers set up MCP across different coding agents, these are the most frequent issues I see.

### Mistake 1: Forgetting `cmd /c` on Windows

On native Windows (not WSL), local MCP servers that use `npx` require the `cmd /c` wrapper:

```bash
# Wrong - will get "Connection closed" errors on Windows
claude mcp add --transport stdio my-server -- npx -y @some/package

# Correct for Windows
claude mcp add --transport stdio my-server -- cmd /c npx -y @some/package
```

### Mistake 2: Using `console.log` in Stdio Servers

If you are building an MCP server that uses the stdio transport, **never write to stdout**. Stdout is reserved for JSON-RPC messages. Writing anything else to stdout corrupts the protocol stream and breaks the connection.

```typescript
// Wrong - breaks stdio MCP servers
console.log("Processing request");

// Correct - stderr is safe
console.error("Processing request");
```

### Mistake 3: Overly Vague Tool Descriptions

Your tool descriptions are how the AI model understands what tools do. A description like "database tool" gives the model almost nothing to work with. Be specific about what the tool does, what inputs it expects, and when it should be used.

### Mistake 4: Not Setting Timeouts

Some MCP operations can hang indefinitely. Configure appropriate timeouts:

```bash
# Claude Code: Set MCP server startup timeout
MCP_TIMEOUT=10000 claude  # 10 seconds

# Codex: Per-server timeouts
# In .codex/config.toml:
# startup_timeout_sec = 15
# tool_timeout_sec = 30
```

### Mistake 5: Loading Too Many Tools Without Tool Search

If you connect to many MCP servers without tool search enabled, you may exhaust your context window with tool definitions alone. In Claude Code, tool search is enabled by default and manages this automatically. If you have disabled it, consider re-enabling it or being selective about which servers you connect.

### Mistake 6: Hardcoding Paths in Shared Config

When sharing `.mcp.json` with your team, use environment variables instead of absolute paths:

```json
{
  "mcpServers": {
    "project-server": {
      "command": "${HOME}/tools/my-server",
      "args": ["--config", "${PROJECT_ROOT:-./config.json}"]
    }
  }
}
```

---

## Frequently Asked Questions

### What is MCP in the context of AI coding agents?

MCP (Model Context Protocol) is an open-source standard that lets AI coding agents like Claude Code, Cursor, and Codex connect to external tools, databases, APIs, and services through a unified protocol. It provides a standardized way for agents to discover, invoke, and receive results from external tools without requiring custom integrations for each service.

### Is MCP only for Anthropic products?

No. While Anthropic created MCP, it is an open standard supported by OpenAI (Codex, ChatGPT), Microsoft (VS Code, GitHub Copilot), Google, Cursor, and many others. Any AI application can implement the MCP client protocol, and any tool vendor can build an MCP server. The specification is publicly available at modelcontextprotocol.io.

### What is the difference between MCP tools and MCP resources?

Tools are executable functions that the AI model calls to perform actions, like querying a database or creating a GitHub issue. Resources are read-only data sources that provide context, like a database schema or API documentation. Tools are model-controlled (the AI decides when to call them), while resources are application-controlled (the host application decides how to include them).

### Do I need to know how to code to use MCP?

Not for basic usage. Adding pre-built MCP servers to Claude Code, Cursor, or Codex requires only running a configuration command or editing a JSON/TOML file. Building your own MCP server does require programming knowledge (Python or TypeScript are the most common), but the SDKs make it straightforward.

### How does MCP handle authentication?

MCP supports multiple authentication methods depending on the transport. Remote HTTP servers commonly use OAuth 2.0, bearer tokens, or API keys passed through HTTP headers. Local stdio servers inherit your operating system user permissions, so no additional authentication is typically needed. Claude Code and Codex both handle OAuth flows automatically when connecting to servers that require it.

### Can MCP servers run remotely?

Yes. MCP servers using the Streamable HTTP transport run as remote services. Major platforms like Sentry, GitHub, Notion, and Figma host their own MCP servers that your coding agent connects to over HTTPS. Stdio servers, however, must run locally on the same machine as the host application.

### What happens if an MCP server goes down during a session?

MCP hosts handle server disconnections gracefully. If a server becomes unreachable, the tools from that server become unavailable, but your coding agent session continues working with the remaining servers. Most hosts will attempt to reconnect automatically and will notify you of the disconnection.

### Is there a performance impact from using many MCP servers?

With tool search enabled (the default in Claude Code), the impact is minimal. Only tool names are loaded at startup, and full schemas are fetched on demand. Without tool search, connecting to many servers can consume significant context window space. Codex lets you set per-server timeouts and selectively enable tools to manage performance.

### Can I use the same MCP server config across Claude Code, Cursor, and Codex?

Not directly, because each tool uses a slightly different configuration format. Claude Code uses `.mcp.json` (JSON), Cursor uses `.cursor/mcp.json` (JSON), and Codex uses `.codex/config.toml` (TOML). However, the server connection information (URL, command, arguments) is the same. You just need to express it in each tool's format.

### What is the difference between MCP and function calling?

Function calling (or tool use) is a feature of individual LLM APIs that lets the model invoke predefined functions. MCP is a protocol layer that sits on top of function calling. It standardizes how tools are discovered, described, invoked, and how results are returned. MCP also adds lifecycle management, dynamic tool updates, multiple primitive types, and transport abstraction that raw function calling does not provide.

---

## Key Takeaways

**MCP for coding agents** is not a passing trend. It is the emerging standard for how AI development tools connect to the world beyond their own capabilities. Here is what matters most:

1. **MCP is USB-C for AI.** One protocol to connect any AI application to any external tool. Build once, integrate everywhere.

2. **Three primitives power everything.** Tools (executable functions), resources (contextual data), and prompts (interaction templates) cover the full spectrum of what coding agents need from external systems.

3. **Configuration is straightforward.** Whether you use Claude Code (`claude mcp add`), Cursor (`.cursor/mcp.json`), or Codex (`.codex/config.toml`), connecting to MCP servers takes minutes, not hours.

4. **Building servers is accessible.** The Python SDK's `FastMCP` and the TypeScript SDK's `McpServer` let you wrap any tool or API in an MCP server with minimal boilerplate. If you can write a function, you can build a server.

5. **Security requires intentional design.** Use read-only credentials, environment variables for secrets, tool filtering, and managed configurations for teams. Never bypass human-in-the-loop confirmations.

6. **The ecosystem is growing fast.** GitHub, Sentry, Notion, Figma, Slack, PostgreSQL, Playwright, and hundreds more tools already have MCP servers. If a tool you use does not have one yet, building it is a weekend project.

The shift happening right now is clear: coding agents are evolving from isolated text generators into connected systems that can read your issues, query your data, call your APIs, and take action on your behalf. **MCP is the protocol making that possible.**

If you have not connected your first MCP server yet, start with one that matches your daily workflow. Add GitHub if you live in pull requests. Add Sentry if you are debugging production. Add your database if you are writing data-driven features. Start small, see the impact, and expand from there.

The agents are ready. The protocol is ready. Your tools are waiting to be connected.
