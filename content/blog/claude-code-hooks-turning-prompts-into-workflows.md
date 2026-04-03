---
title: "Claude Code Hooks: Turn Prompts Into Workflows"
description: "Learn how Claude Code hooks enforce real engineering workflows with PreToolUse, PostToolUse, and SessionStart."
date: "2026-04-02"
tags: ["Claude Code","Claude Code hooks","PreToolUse hook","PostToolUse hook","SessionStart hook","Claude automation","AI coding workflows","developer productivity","agentic coding","Claude settings.json"]
readTime: "39 min read"
ogImage: "/og/claude-code-hooks-turning-prompts-into-workflows.png"
canonical: "https://chaitanyaprabuddha.com/blog/claude-code-hooks-turning-prompts-into-workflows"
published: true
---

# Claude Code Hooks: Turning Prompts Into Real Engineering Workflows

Most developers use Claude Code as a smart assistant. You type a prompt, it writes some code, you review it, repeat. But **Claude Code hooks** change the game entirely. They turn Claude from a reactive assistant into an enforceable engineering workflow where every tool call, every file write, and every bash command passes through your rules before it executes.

Hooks are user-defined shell commands, HTTP endpoints, or LLM prompts that fire automatically at specific points in Claude Code's lifecycle. They can block dangerous operations, auto-approve safe ones, inject context, run linters, log everything, and enforce team-wide standards without relying on anyone to remember the rules.

This guide covers everything you need to know about Claude Code hooks. We will start with the fundamentals, then build up to real workflow patterns that go far beyond basic setup. By the end, you will have a working mental model for designing hook-driven workflows that make your engineering process repeatable, auditable, and enforceable.

---

## Table of Contents

- [What Are Claude Code Hooks?](#what-are-claude-code-hooks)
- [Why Hooks Matter: From Assistant to Workflow Engine](#why-hooks-matter-from-assistant-to-workflow-engine)
- [The Hook Lifecycle: Every Event Explained](#the-hook-lifecycle-every-event-explained)
- [Where Hooks Live: Configuration Scopes](#where-hooks-live-configuration-scopes)
- [Hook Configuration Anatomy](#hook-configuration-anatomy)
- [SessionStart Hook: Setting Up the Environment](#sessionstart-hook-setting-up-the-environment)
- [PreToolUse Hook: The Gatekeeper](#pretooluse-hook-the-gatekeeper)
- [PostToolUse Hook: Enforcing Standards After Execution](#posttooluse-hook-enforcing-standards-after-execution)
- [Stop and SubagentStop: Controlling How Work Ends](#stop-and-subagentstoponcontrolling-how-work-ends)
- [Matcher Patterns: Targeting the Right Events](#matcher-patterns-targeting-the-right-events)
- [Hook Handler Types: Commands, HTTP, Prompts, and Agents](#hook-handler-types-commands-http-prompts-and-agents)
- [Exit Codes and JSON Output: Communicating Decisions](#exit-codes-and-json-output-communicating-decisions)
- [Environment Variables Available to Hooks](#environment-variables-available-to-hooks)
- [Real Workflow Patterns: Beyond Basic Setup](#real-workflow-patterns-beyond-basic-setup)
- [Hooks in Team Settings: Sharing Across Engineers](#hooks-in-team-settings-sharing-across-engineers)
- [Debugging and Troubleshooting Hooks](#debugging-and-troubleshooting-hooks)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Key Takeaways](#key-takeaways)

---

## What Are Claude Code Hooks?

**Claude Code hooks are automation triggers that execute your code at specific points in Claude's lifecycle.** Every time Claude starts a session, calls a tool, writes a file, or finishes responding, hooks give you an interception point where your own logic runs.

Think of hooks like Git hooks, but for an AI coding agent. A pre-commit hook runs your linter before every commit. A **PreToolUse hook** runs your validation script before every tool call Claude makes. The mental model is the same: intercept, validate, decide.

Hooks are not prompt instructions. They are not suggestions that Claude might follow or might ignore. They are **hard enforcement points** that execute deterministically outside of Claude's reasoning. If your PreToolUse hook returns exit code 2, the tool call is blocked. Period. Claude does not get to argue. It does not get to "try again with a slightly different approach." The operation is stopped.

This distinction is critical. CLAUDE.md instructions are soft guidance. Hooks are hard rules.

---

## Why Hooks Matter: From Assistant to Workflow Engine

Hooks matter because **they close the gap between what you tell Claude to do and what Claude actually does.** Without hooks, your only enforcement mechanism is the prompt itself. And prompts are unreliable as policy.

### The Prompt Problem

Consider this scenario. You tell Claude: "Never use `rm -rf` on any directory outside the project root." Claude will follow that instruction most of the time. But on a complex task involving cleanup scripts, it might forget. Or a subagent might not have the same context. Or the instruction might get lost during context compaction.

With a **PreToolUse hook**, you write a five-line bash script that checks every Bash command for dangerous patterns. It does not matter what Claude's context window looks like. It does not matter how many subagents are spawned. Every single command passes through your gate.

### From Reactive to Proactive

Without hooks, your workflow is reactive. Claude does something, you review it, you fix it. With hooks, your workflow is proactive:

- **Before Claude writes a file**, your hook runs the linter on the proposed content.
- **Before Claude runs a command**, your hook validates it against a security allowlist.
- **After Claude edits code**, your hook runs the test suite and feeds failures back as context.
- **When a session starts**, your hook injects environment variables and project state.

This is the difference between "AI assistant" and "AI-powered engineering workflow." The assistant asks permission. The workflow enforces rules.

### Team-Wide Standards

The real power shows up at team scale. Check your hooks into `.claude/settings.json`, and every engineer on the team gets the same enforcement. No one forgets to run the linter. No one accidentally runs destructive commands. No one bypasses the security policy.

**Claude automation** through hooks means your standards are not documentation that people read and forget. They are executable code that runs every time.

---

## The Hook Lifecycle: Every Event Explained

Claude Code supports a comprehensive set of hook events that cover the entire session lifecycle. Here are the ones that matter most for building workflows.

| Event | When It Fires | Can Block? |
|-------|---------------|------------|
| `SessionStart` | Session begins or resumes | No |
| `UserPromptSubmit` | User submits a prompt, before processing | Yes |
| `PreToolUse` | Before a tool call executes | Yes |
| `PostToolUse` | After a tool call succeeds | Yes (feedback) |
| `PostToolUseFailure` | After a tool call fails | No |
| `PermissionRequest` | When a permission dialog appears | Yes |
| `PermissionDenied` | When auto mode denies a tool call | No |
| `Notification` | When Claude sends a notification | No |
| `SubagentStart` | When a subagent is spawned | No |
| `SubagentStop` | When a subagent finishes | Yes |
| `Stop` | When Claude finishes responding | Yes |
| `StopFailure` | When turn ends due to API error | No |
| `InstructionsLoaded` | When CLAUDE.md files are loaded | No |
| `ConfigChange` | When a configuration file changes | Yes |
| `CwdChanged` | When working directory changes | No |
| `FileChanged` | When a watched file changes on disk | No |
| `SessionEnd` | When a session terminates | No |

The **blocking events** are the most powerful ones for building workflows. `PreToolUse` and `UserPromptSubmit` can prevent actions before they happen. `Stop` and `SubagentStop` can prevent Claude from finishing until conditions are met.

The **non-blocking events** are valuable for observability, logging, context injection, and side effects like sending notifications or updating dashboards.

---

## Where Hooks Live: Configuration Scopes

Hooks are configured in JSON settings files. Claude Code uses a **scope hierarchy** that determines where configurations apply and who they affect.

| Scope | Location | Shared With Team? |
|-------|----------|-------------------|
| **User** | `~/.claude/settings.json` | No |
| **Project** | `.claude/settings.json` | Yes (committed to git) |
| **Local** | `.claude/settings.local.json` | No (gitignored) |
| **Managed** | Organization-level policy | Yes (deployed by IT) |

### Choosing the Right Scope

**Use project scope** for hooks that enforce team standards. Linter checks, security validation, test running. These go in `.claude/settings.json` and get committed to the repo. Every engineer on the team gets the same enforcement automatically.

**Use user scope** for personal workflow hooks. Notification integrations, personal logging, custom environment setup. These live in `~/.claude/settings.json` and only affect you.

**Use local scope** for project-specific personal overrides. Maybe you need a hook that references local paths or credentials. These go in `.claude/settings.local.json` and are gitignored by default.

**Managed scope** is for organization-wide security policies. If your company needs to enforce that certain commands are always blocked or certain endpoints are always called, managed settings handle that.

---

## Hook Configuration Anatomy

Every hook configuration follows a three-level nesting structure: **event**, **matcher group**, and **handler array**. Understanding this structure is essential before building any hook.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/validate-bash.sh",
            "timeout": 30
          }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/validate-writes.sh"
          }
        ]
      }
    ]
  }
}
```

### Level 1: The Event

The top-level key is the hook event name: `PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, etc. This determines when your hooks fire.

### Level 2: The Matcher Group

Each event contains an array of matcher groups. Each group has a `matcher` field (a regex pattern) and a `hooks` array. The matcher filters which specific tool calls or event types trigger the group.

Omitting the matcher or setting it to `"*"` means the group fires for every occurrence of that event.

### Level 3: The Handler Array

Each matcher group contains an array of hook handlers. These are the actual commands, HTTP requests, or prompts that execute. **Multiple handlers in the same group run sequentially.** If any handler blocks the operation, later handlers in the group do not run.

This three-level structure gives you precise control. You can have different validation logic for Bash commands versus file writes versus MCP tool calls, all within the same `PreToolUse` event.

---

## SessionStart Hook: Setting Up the Environment

The **Claude SessionStart** hook fires when a session begins, resumes, is cleared, or is compacted. It is the right place for environment setup, context injection, and initialization tasks.

### Why SessionStart Matters

Every Claude Code session starts in a relatively blank state. The model has its system prompt and your CLAUDE.md instructions, but it does not have runtime context like which services are running, what the current Git state is, or what environment variables are set.

SessionStart hooks fix this. They run before Claude processes any user input, giving you a chance to set up the environment and inject context.

### Basic SessionStart Configuration

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-init.sh"
          }
        ]
      }
    ]
  }
}
```

The matcher for SessionStart events can be `startup`, `resume`, `clear`, or `compact`, letting you run different logic depending on how the session started.

### Injecting Environment Variables

One of the most powerful SessionStart patterns is **persisting environment variables** using the `CLAUDE_ENV_FILE`. This special file path lets your hook set environment variables that persist for the entire session.

```bash
#!/bin/bash
# .claude/hooks/session-init.sh

# Persist environment variables for the session
if [ -n "$CLAUDE_ENV_FILE" ]; then
  # Detect Node version
  echo "export NODE_VERSION=$(node --version 2>/dev/null || echo 'not installed')" >> "$CLAUDE_ENV_FILE"

  # Set environment based on branch
  BRANCH=$(git branch --show-current 2>/dev/null)
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "production" ]; then
    echo 'export DEPLOY_ENV=production' >> "$CLAUDE_ENV_FILE"
  else
    echo 'export DEPLOY_ENV=development' >> "$CLAUDE_ENV_FILE"
  fi

  # Load .env file if it exists
  if [ -f "$CLAUDE_PROJECT_DIR/.env" ]; then
    while IFS='=' read -r key value; do
      [[ "$key" =~ ^#.*$ ]] && continue
      [[ -z "$key" ]] && continue
      echo "export $key=$value" >> "$CLAUDE_ENV_FILE"
    done < "$CLAUDE_PROJECT_DIR/.env"
  fi
fi

exit 0
```

### Injecting Context About Project State

SessionStart can also return context that gets added to Claude's conversation through `additionalContext` in the JSON output.

```bash
#!/bin/bash
# .claude/hooks/inject-project-state.sh

# Gather project state
GIT_STATUS=$(git status --porcelain 2>/dev/null | head -20)
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null)
RUNNING_SERVICES=$(docker ps --format "{{.Names}}: {{.Status}}" 2>/dev/null | head -10)

# Build context string
CONTEXT="## Current Project State
### Uncommitted Changes
$GIT_STATUS

### Recent Commits
$RECENT_COMMITS

### Running Services
$RUNNING_SERVICES"

# Return as JSON with additional context
jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
```

This means every time you start a Claude Code session, Claude already knows what is running, what has changed, and what was committed recently. No need to ask "what is the current state of things" every time.

### Performance Considerations

SessionStart hooks should be fast. They run before Claude can process any input, so a slow hook means a slow startup. Keep initialization under a second or two. If you need to do expensive setup, consider using the `async: true` flag to run the hook in the background.

```json
{
  "type": "command",
  "command": "/path/to/heavy-setup.sh",
  "async": true
}
```

Async hooks will not block session startup, but their results will not be available immediately either. Use async for side effects like logging or cache warming, and synchronous hooks for context injection.

---

## PreToolUse Hook: The Gatekeeper

The **PreToolUse hook** is the most important hook for building enforceable workflows. It fires before every tool call Claude makes, and it can **allow, deny, ask the user, or modify** the operation.

### How PreToolUse Works

When Claude decides to call a tool (Bash, Write, Edit, Read, Glob, Grep, WebFetch, or any MCP tool), the following happens:

1. Claude generates the tool call with its parameters.
2. The PreToolUse hook receives the full tool call as JSON on stdin.
3. Your hook script examines the parameters and decides what to do.
4. Based on the exit code and JSON output, the tool call proceeds, is blocked, or is modified.

The JSON input your hook receives includes the tool name and the complete tool input:

```json
{
  "session_id": "abc123",
  "cwd": "/home/user/my-project",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test",
    "description": "Run test suite",
    "timeout": 120000
  },
  "tool_use_id": "toolu_01ABC..."
}
```

### Blocking Dangerous Commands

The most common PreToolUse pattern is a **command validator** that blocks dangerous operations.

```bash
#!/bin/bash
# .claude/hooks/validate-bash.sh
# Block dangerous bash commands

INPUT=$(cat /dev/stdin)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Block destructive patterns
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+/|rm\s+-rf\s+~|mkfs\.|dd\s+if=|chmod\s+-R\s+777\s+/|:(){ :|:& };:'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Blocked: destructive system command detected"
    }
  }'
  exit 0
fi

# Block commands that modify git history
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force|git\s+reset\s+--hard|git\s+clean\s+-fd'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Blocked: command modifies git history. Use non-destructive alternatives."
    }
  }'
  exit 0
fi

# All other commands proceed normally
exit 0
```

### Auto-Approving Safe Commands

The opposite pattern is equally useful. Instead of blocking bad commands, **auto-approve known safe ones** to reduce permission prompts and speed up workflows.

```bash
#!/bin/bash
# .claude/hooks/auto-approve-safe.sh
# Auto-approve safe commands to reduce friction

INPUT=$(cat /dev/stdin)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Auto-approve read-only and common dev commands for Bash
if [ "$TOOL_NAME" = "Bash" ]; then
  if echo "$COMMAND" | grep -qE '^(npm test|npm run lint|npm run build|npm run typecheck|npx tsc --noEmit|cargo test|cargo clippy|go test|pytest|make test|make lint)'; then
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: "Auto-approved: known safe development command"
      }
    }'
    exit 0
  fi
fi

# Defer to normal permission handling for everything else
exit 0
```

### Restricting File Write Locations

PreToolUse hooks can also validate Write and Edit operations to enforce that Claude only modifies files in expected locations.

```bash
#!/bin/bash
# .claude/hooks/validate-writes.sh
# Ensure writes only happen in allowed directories

INPUT=$(cat /dev/stdin)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only validate Write and Edit tools
if [ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "Edit" ]; then
  exit 0
fi

# Block writes outside project directory
if [[ "$FILE_PATH" != "$CLAUDE_PROJECT_DIR"* ]]; then
  jq -n --arg path "$FILE_PATH" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Blocked: cannot write to " + $path + " which is outside the project directory")
    }
  }'
  exit 0
fi

# Block writes to critical config files
BASENAME=$(basename "$FILE_PATH")
if echo "$BASENAME" | grep -qE '^\.(env|env\.local|env\.production)|package-lock\.json|yarn\.lock|pnpm-lock\.yaml$'; then
  jq -n --arg file "$BASENAME" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: ("Caution: modifying " + $file + " requires manual confirmation")
    }
  }'
  exit 0
fi

exit 0
```

Notice the use of `"ask"` for the permission decision. This does not block the operation outright. Instead, it forces a user confirmation prompt even in auto mode. This is useful for operations that are not necessarily dangerous but should be intentional.

### Modifying Tool Input

One of the most powerful **PreToolUse hook** capabilities is input modification. Your hook can change the tool's parameters before execution.

```bash
#!/bin/bash
# .claude/hooks/enforce-timeout.sh
# Ensure all bash commands have a reasonable timeout

INPUT=$(cat /dev/stdin)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
TIMEOUT=$(echo "$INPUT" | jq -r '.tool_input.timeout // 0')

if [ "$TOOL_NAME" = "Bash" ] && [ "$TIMEOUT" -gt 300000 ]; then
  # Cap timeout at 5 minutes
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Timeout capped at 5 minutes",
      updatedInput: {
        timeout: 300000
      }
    }
  }'
  exit 0
fi

exit 0
```

The `updatedInput` field merges with the original tool input, so you only need to specify the fields you want to change.

---

## PostToolUse Hook: Enforcing Standards After Execution

The **PostToolUse hook** fires after a tool call succeeds. It receives both the original input and the tool's response, making it ideal for validation, automated follow-up actions, and feedback loops.

### Running Linters After Every Write

The most common PostToolUse pattern is running a linter or formatter after Claude writes or edits a file.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-after-write.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/lint-after-write.sh
# Run linter on any file Claude just wrote or edited

INPUT=$(cat /dev/stdin)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')
EXTENSION="${FILE_PATH##*.}"

LINT_OUTPUT=""

case "$EXTENSION" in
  ts|tsx|js|jsx)
    LINT_OUTPUT=$(npx eslint "$FILE_PATH" --no-error-on-unmatched-pattern 2>&1) || true
    ;;
  py)
    LINT_OUTPUT=$(python -m ruff check "$FILE_PATH" 2>&1) || true
    ;;
  rs)
    LINT_OUTPUT=$(cargo clippy --message-format=short 2>&1 | head -20) || true
    ;;
  go)
    LINT_OUTPUT=$(golangci-lint run "$FILE_PATH" 2>&1 | head -20) || true
    ;;
esac

if [ -n "$LINT_OUTPUT" ]; then
  jq -n --arg lint "$LINT_OUTPUT" --arg file "$FILE_PATH" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("Lint issues found in " + $file + ":\n" + $lint + "\nPlease fix these issues.")
    }
  }'
else
  exit 0
fi
```

The key insight here is `additionalContext`. This field injects text directly into Claude's context, so Claude sees the lint errors and can fix them immediately without you having to ask. The feedback loop is automatic.

### Running Tests After Code Changes

A more aggressive pattern is running the test suite after every code change and feeding results back.

```bash
#!/bin/bash
# .claude/hooks/run-tests-after-edit.sh
# Run related tests after Claude modifies source code

INPUT=$(cat /dev/stdin)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Only run for source files, not test files or configs
if echo "$FILE_PATH" | grep -qE '\.(test|spec)\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  exit 0
fi

# Find related test file
TEST_FILE=$(echo "$FILE_PATH" | sed 's/\.\(ts\|tsx\|js\|jsx\)$/.test.\1/')
if [ ! -f "$TEST_FILE" ]; then
  TEST_FILE=$(echo "$FILE_PATH" | sed 's/\.\(ts\|tsx\|js\|jsx\)$/.spec.\1/')
fi

if [ -f "$TEST_FILE" ]; then
  TEST_OUTPUT=$(npx jest "$TEST_FILE" --no-coverage 2>&1 | tail -30)
  TEST_EXIT=$?

  if [ $TEST_EXIT -ne 0 ]; then
    jq -n --arg output "$TEST_OUTPUT" --arg testFile "$TEST_FILE" '{
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: ("Tests failed in " + $testFile + ":\n" + $output + "\nPlease fix the failing tests.")
      }
    }'
    exit 0
  fi
fi

exit 0
```

This creates a tight feedback loop. Claude edits a file, the related tests run automatically, and if they fail, Claude sees the output and fixes the issue in the same turn. No manual intervention required.

### Logging All Tool Operations

PostToolUse is also valuable for **audit logging**. Every operation Claude performs can be logged to a file, database, or external service.

```bash
#!/bin/bash
# .claude/hooks/audit-log.sh
# Log all tool operations for audit trail

INPUT=$(cat /dev/stdin)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/logs"
mkdir -p "$LOG_DIR"

echo "{\"timestamp\":\"$TIMESTAMP\",\"session\":\"$SESSION_ID\",\"tool\":\"$TOOL_NAME\",\"input\":$TOOL_INPUT}" >> "$LOG_DIR/audit.jsonl"

exit 0
```

Since this hook exits with code 0 and produces no JSON output, it is completely transparent to Claude. The logging happens silently in the background of every tool call.

---

## Stop and SubagentStop: Controlling How Work Ends

The **Stop** hook fires when Claude finishes responding, and **SubagentStop** fires when a subagent completes. These hooks let you validate Claude's final output before the turn ends.

### Preventing Incomplete Work

A Stop hook can check whether Claude actually completed the task or just gave up.

```bash
#!/bin/bash
# .claude/hooks/validate-completion.sh
# Ensure Claude does not stop prematurely during multi-step tasks

INPUT=$(cat /dev/stdin)
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name')

# Check if there are uncommitted changes that suggest incomplete work
UNCOMMITTED=$(git diff --name-only 2>/dev/null | wc -l)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l)

if [ "$UNCOMMITTED" -gt 5 ] || [ "$UNTRACKED" -gt 3 ]; then
  jq -n --arg uncommitted "$UNCOMMITTED" --arg untracked "$UNTRACKED" '{
    decision: "block",
    reason: ("There are " + $uncommitted + " uncommitted changes and " + $untracked + " untracked files. Please review and organize these changes before finishing.")
  }'
  exit 0
fi

exit 0
```

When a Stop hook blocks with `decision: "block"`, Claude continues working instead of finishing. The `reason` is injected as context so Claude knows what to address.

### Validating Subagent Output

SubagentStop hooks are especially useful for ensuring subagents (spawned via the Agent tool) meet quality standards.

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-subagent.sh"
          }
        ]
      }
    ]
  }
}
```

The SubagentStop event provides the subagent's last message and transcript path, allowing your hook to analyze what the subagent actually accomplished.

---

## Matcher Patterns: Targeting the Right Events

Matchers are regex patterns that filter when hooks fire. They are the precision mechanism that keeps your hooks from being too broad or too narrow.

### Tool Name Matching

For `PreToolUse` and `PostToolUse`, the matcher matches against the tool name.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "/path/to/bash-validator.sh" }]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "/path/to/write-validator.sh" }]
      },
      {
        "matcher": "mcp__.*",
        "hooks": [{ "type": "command", "command": "/path/to/mcp-validator.sh" }]
      }
    ]
  }
}
```

Common tool names you will match against: `Bash`, `Write`, `Edit`, `Read`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `Agent`, `AskUserQuestion`.

### MCP Tool Matching

MCP tools follow the naming pattern `mcp__<server>__<tool>`. This means you can match against specific servers or specific tools within servers.

```json
{
  "matcher": "mcp__memory__.*",
  "hooks": [{ "type": "command", "command": "/path/to/memory-audit.sh" }]
}
```

This hooks into every tool call to the `memory` MCP server. You could also match a specific tool:

```json
{
  "matcher": "mcp__github__create_pull_request",
  "hooks": [{ "type": "command", "command": "/path/to/pr-validation.sh" }]
}
```

### SessionStart Matching

For `SessionStart`, the matcher matches against how the session started: `startup`, `resume`, `clear`, or `compact`.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [{ "type": "command", "command": "/path/to/full-init.sh" }]
      },
      {
        "matcher": "resume",
        "hooks": [{ "type": "command", "command": "/path/to/quick-refresh.sh" }]
      }
    ]
  }
}
```

This lets you run full initialization on fresh sessions but only a lightweight state refresh when resuming.

### The Conditional `if` Filter

For even finer control, command hooks support an `if` field that uses **permission rule syntax** to filter tool calls.

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "if": "Bash(rm *)",
      "command": "/path/to/block-rm.sh"
    }
  ]
}
```

The `if` field prevents the hook from even executing unless the tool call matches the pattern. This is more efficient than having the hook script do the filtering itself, because the hook process is never spawned for non-matching calls.

---

## Hook Handler Types: Commands, HTTP, Prompts, and Agents

Claude Code supports four types of hook handlers, each suited to different use cases.

### Command Hooks

Command hooks execute shell commands. They are the most common and most flexible type. The hook receives JSON on stdin and communicates via exit codes and stdout.

```json
{
  "type": "command",
  "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/my-hook.sh",
  "timeout": 30,
  "statusMessage": "Validating command safety..."
}
```

The `statusMessage` field controls what the user sees in the spinner while the hook runs. It is a small UX detail that makes hooks feel polished.

**Key fields:**

- `command` (required): The shell command to run.
- `timeout` (optional): Seconds before the hook is killed. Default is 600 (10 minutes), but most hooks should be much faster.
- `async` (optional): If true, runs in the background without blocking.
- `shell` (optional): `"bash"` (default) or `"powershell"` for Windows.
- `statusMessage` (optional): Custom spinner text.

### HTTP Hooks

HTTP hooks send the event JSON as a POST request to an endpoint. They are ideal for integrating with external services, CI/CD pipelines, or centralized validation servers.

```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/pre-tool-use",
  "headers": {
    "Authorization": "Bearer $API_TOKEN",
    "X-Project": "my-project"
  },
  "allowedEnvVars": ["API_TOKEN"],
  "timeout": 30
}
```

HTTP hooks follow the same decision protocol as command hooks, but through HTTP response codes and JSON bodies. A 2xx response with a blocking decision JSON blocks the operation. A 2xx with an empty body allows it.

### Prompt Hooks

Prompt hooks send a prompt to Claude for **single-turn evaluation**. This is useful when you want AI-powered validation that is too complex for a bash script.

```json
{
  "type": "prompt",
  "prompt": "Review this bash command for security issues. The command is: $ARGUMENTS. Respond with a JSON object containing permissionDecision: 'allow' or 'deny' and a reason.",
  "model": "fast-model",
  "timeout": 30
}
```

Prompt hooks use a separate, fast model evaluation. They do not consume your main conversation's context window.

### Agent Hooks

Agent hooks spawn a full subagent for complex verification tasks. Use these sparingly, as they are the most expensive hook type.

```json
{
  "type": "agent",
  "prompt": "Review the deployment configuration in $ARGUMENTS for security issues, missing environment variables, and potential downtime risks. Report any findings.",
  "timeout": 60
}
```

Agent hooks are best reserved for high-stakes operations like deployment validation or security audits where a simple script is insufficient.

---

## Exit Codes and JSON Output: Communicating Decisions

How your hook communicates its decision is the most important thing to get right. The exit code determines the broad category, and the JSON output provides fine-grained control.

### Exit Code Reference

| Exit Code | Meaning | Effect |
|-----------|---------|--------|
| `0` | Success | Stdout is parsed for JSON. If no JSON, operation proceeds. |
| `2` | Blocking error | Operation is blocked. Stderr is shown to Claude as context. |
| Any other | Non-blocking error | Stderr shown in verbose mode. Operation continues. |

### JSON Output for PreToolUse

The most detailed JSON output format is for PreToolUse hooks, where you have four decision options:

```bash
# Allow: skip permission prompt entirely
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    permissionDecisionReason: "Safe command auto-approved"
  }
}'

# Deny: block the operation
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "Command violates security policy"
  }
}'

# Ask: force user confirmation
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: "Sensitive operation requires manual approval"
  }
}'

# Modify and allow: change the input
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    permissionDecisionReason: "Command modified for safety",
    updatedInput: {
      command: "npm run test -- --bail"
    }
  }
}'
```

### Universal Output Fields

Several JSON fields work across all hook events:

```json
{
  "continue": false,
  "stopReason": "Critical policy violation detected",
  "suppressOutput": true,
  "systemMessage": "Warning: approaching rate limit"
}
```

- `continue: false` **stops Claude entirely**. The session ends. Use this for critical policy violations.
- `stopReason` provides the message shown when stopping.
- `suppressOutput: true` hides the hook's output from verbose mode.
- `systemMessage` shows a warning to the user without blocking anything.

### PostToolUse Decision Format

PostToolUse uses a simpler top-level decision format:

```bash
jq -n '{
  decision: "block",
  reason: "Generated code has lint errors. See additionalContext for details.",
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: "ESLint errors:\n- line 15: unused variable\n- line 23: missing semicolon"
  }
}'
```

When a PostToolUse hook blocks, it does not undo the operation (the tool already ran). Instead, the block reason is fed back to Claude as an error message, prompting Claude to fix the issue.

---

## Environment Variables Available to Hooks

Every hook has access to environment variables that provide context about the current session and project.

| Variable | Description | Available In |
|----------|-------------|--------------|
| `CLAUDE_PROJECT_DIR` | Absolute path to the project root | All hooks |
| `CLAUDE_ENV_FILE` | Path to write persistent env vars | SessionStart, CwdChanged, FileChanged |
| `CLAUDE_CODE_REMOTE` | `"true"` if running in remote web environment | All hooks |
| `CLAUDE_PLUGIN_ROOT` | Plugin installation directory | Plugin hooks |
| `CLAUDE_PLUGIN_DATA` | Plugin persistent data directory | Plugin hooks |

### Using CLAUDE_PROJECT_DIR

Always reference scripts using `$CLAUDE_PROJECT_DIR` rather than hardcoded paths. This ensures hooks work regardless of where the project is cloned.

```json
{
  "type": "command",
  "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate.sh"
}
```

Note the double quotes around the variable. This handles project directories with spaces in the path.

### Using CLAUDE_ENV_FILE

The `CLAUDE_ENV_FILE` is only available in `SessionStart`, `CwdChanged`, and `FileChanged` hooks. It is the only way to persist environment variables across an entire Claude Code session.

```bash
#!/bin/bash
# Set variables that persist for the entire session
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export DATABASE_URL=postgresql://localhost/mydb' >> "$CLAUDE_ENV_FILE"
  echo 'export REDIS_URL=redis://localhost:6379' >> "$CLAUDE_ENV_FILE"
fi
```

This is more reliable than setting variables in your shell profile because it specifically targets the Claude Code process and its child processes.

---

## Real Workflow Patterns: Beyond Basic Setup

Now that you understand the mechanics, let us look at **real workflow patterns** that combine multiple hooks into cohesive engineering workflows. These are the patterns that turn Claude Code from an assistant into an enforceable workflow engine.

### Pattern 1: The Full Lint-Test-Format Pipeline

This pattern ensures every file Claude writes passes linting, formatting, and related tests automatically.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format-file.sh",
            "timeout": 15,
            "statusMessage": "Formatting..."
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-file.sh",
            "timeout": 30,
            "statusMessage": "Linting..."
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-related-tests.sh",
            "timeout": 60,
            "statusMessage": "Running related tests..."
          }
        ]
      }
    ]
  }
}
```

The three hooks run sequentially after every Write or Edit. First format, then lint, then test. If the linter finds issues, Claude sees them as `additionalContext` and fixes them immediately.

```bash
#!/bin/bash
# .claude/hooks/format-file.sh
# Auto-format the file Claude just wrote

INPUT=$(cat /dev/stdin)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')
EXTENSION="${FILE_PATH##*.}"

case "$EXTENSION" in
  ts|tsx|js|jsx|json|css|scss|md)
    npx prettier --write "$FILE_PATH" 2>/dev/null
    ;;
  py)
    python -m black "$FILE_PATH" 2>/dev/null
    ;;
  rs)
    rustfmt "$FILE_PATH" 2>/dev/null
    ;;
  go)
    gofmt -w "$FILE_PATH" 2>/dev/null
    ;;
esac

exit 0
```

### Pattern 2: Security-First Bash Execution

This pattern creates a layered security model for all Bash commands Claude runs. It combines PreToolUse blocking with PostToolUse auditing.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/security-gate.sh",
            "timeout": 5,
            "statusMessage": "Security check..."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/audit-command.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/security-gate.sh
# Multi-layered security validation for bash commands

INPUT=$(cat /dev/stdin)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# Layer 1: Hard blocks - never allow these
HARD_BLOCKS='rm\s+-rf\s+/|mkfs\.|dd\s+if=/dev|chmod\s+-R\s+777\s+/|curl.*\|\s*bash|wget.*\|\s*sh'
if echo "$COMMAND" | grep -qE "$HARD_BLOCKS"; then
  echo "BLOCKED: Destructive or unsafe command pattern detected" >&2
  exit 2
fi

# Layer 2: Network restrictions - block outbound data exfiltration
if echo "$COMMAND" | grep -qE 'curl\s+.*-d\s|curl\s+.*--data|wget\s+--post'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: "Command sends data to external service. Please confirm this is intentional."
    }
  }'
  exit 0
fi

# Layer 3: Auto-approve known safe commands
SAFE_PATTERNS='^(ls|cat|head|tail|wc|find|grep|rg|git\s+(status|log|diff|branch|show)|npm\s+(test|run|list)|node\s+--version|python\s+--version)'
if echo "$COMMAND" | grep -qE "$SAFE_PATTERNS"; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Auto-approved: safe read-only command"
    }
  }'
  exit 0
fi

# Layer 4: Everything else goes through normal permission flow
exit 0
```

This layered approach gives you hard blocks for dangerous commands, user confirmation for suspicious commands, auto-approval for safe commands, and normal permissions for everything else.

### Pattern 3: Environment-Aware Session Initialization

This pattern uses SessionStart to detect the project environment and configure Claude's behavior accordingly.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/detect-environment.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/detect-environment.sh
# Detect project type and inject relevant context

PROJECT_DIR="$CLAUDE_PROJECT_DIR"
CONTEXT_PARTS=()

# Detect package manager and project type
if [ -f "$PROJECT_DIR/package.json" ]; then
  if [ -f "$PROJECT_DIR/pnpm-lock.yaml" ]; then
    PKG_MANAGER="pnpm"
  elif [ -f "$PROJECT_DIR/yarn.lock" ]; then
    PKG_MANAGER="yarn"
  else
    PKG_MANAGER="npm"
  fi

  # Get available scripts
  SCRIPTS=$(jq -r '.scripts | keys[]' "$PROJECT_DIR/package.json" 2>/dev/null | tr '\n' ', ')
  CONTEXT_PARTS+=("Package manager: $PKG_MANAGER")
  CONTEXT_PARTS+=("Available scripts: $SCRIPTS")

  # Check for TypeScript
  if [ -f "$PROJECT_DIR/tsconfig.json" ]; then
    CONTEXT_PARTS+=("TypeScript project detected")
  fi

  # Check for common frameworks
  DEPS=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' "$PROJECT_DIR/package.json" 2>/dev/null)
  if echo "$DEPS" | grep -q "next"; then
    CONTEXT_PARTS+=("Framework: Next.js")
  elif echo "$DEPS" | grep -q "react"; then
    CONTEXT_PARTS+=("Framework: React")
  elif echo "$DEPS" | grep -q "vue"; then
    CONTEXT_PARTS+=("Framework: Vue")
  fi
fi

if [ -f "$PROJECT_DIR/Cargo.toml" ]; then
  CONTEXT_PARTS+=("Rust project (Cargo)")
fi

if [ -f "$PROJECT_DIR/go.mod" ]; then
  MODULE=$(head -1 "$PROJECT_DIR/go.mod" | awk '{print $2}')
  CONTEXT_PARTS+=("Go module: $MODULE")
fi

if [ -f "$PROJECT_DIR/pyproject.toml" ] || [ -f "$PROJECT_DIR/setup.py" ]; then
  CONTEXT_PARTS+=("Python project")
  if [ -f "$PROJECT_DIR/.python-version" ]; then
    PY_VERSION=$(cat "$PROJECT_DIR/.python-version")
    CONTEXT_PARTS+=("Python version: $PY_VERSION")
  fi
fi

# Git state
BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null)
if [ -n "$BRANCH" ]; then
  CONTEXT_PARTS+=("Git branch: $BRANCH")
  AHEAD=$(git -C "$PROJECT_DIR" rev-list --count HEAD...origin/$BRANCH 2>/dev/null || echo "unknown")
  CONTEXT_PARTS+=("Commits ahead of remote: $AHEAD")
fi

# Docker state
if [ -f "$PROJECT_DIR/docker-compose.yml" ] || [ -f "$PROJECT_DIR/docker-compose.yaml" ]; then
  RUNNING=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --format "{{.Name}}: {{.Status}}" 2>/dev/null | head -5)
  if [ -n "$RUNNING" ]; then
    CONTEXT_PARTS+=("Running containers: $RUNNING")
  else
    CONTEXT_PARTS+=("Docker Compose project detected but no containers running")
  fi
fi

# Set environment variables
if [ -n "$CLAUDE_ENV_FILE" ]; then
  [ -n "$PKG_MANAGER" ] && echo "export PKG_MANAGER=$PKG_MANAGER" >> "$CLAUDE_ENV_FILE"
  [ -n "$BRANCH" ] && echo "export GIT_BRANCH=$BRANCH" >> "$CLAUDE_ENV_FILE"
fi

# Build and output context
FULL_CONTEXT=$(printf '%s\n' "${CONTEXT_PARTS[@]}")
jq -n --arg ctx "$FULL_CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
```

This hook means Claude immediately knows the project type, available scripts, current branch, and running services. No need for the "let me explore the project" phase that wastes the first few turns of every session.

### Pattern 4: Notification Integration

This pattern routes Claude Code notifications to external systems like Slack or a desktop notification daemon.

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt|idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/notify-slack.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/notify-slack.sh
# Send Claude Code notifications to Slack

INPUT=$(cat /dev/stdin)
MESSAGE=$(echo "$INPUT" | jq -r '.message')
TITLE=$(echo "$INPUT" | jq -r '.title // "Claude Code"')
TYPE=$(echo "$INPUT" | jq -r '.notification_type')

SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
if [ -z "$SLACK_WEBHOOK" ]; then
  exit 0
fi

PAYLOAD=$(jq -n \
  --arg text "*$TITLE*\n$MESSAGE\n_Type: $TYPE_" \
  '{text: $text}')

curl -s -X POST "$SLACK_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" > /dev/null 2>&1

exit 0
```

The `async: true` flag is important here. You do not want a Slack webhook call to block Claude's workflow. The notification fires in the background, and Claude continues working.

### Pattern 5: Protected Branch Workflow

This pattern prevents Claude from making direct commits or pushes to protected branches, enforcing a PR-based workflow.

```bash
#!/bin/bash
# .claude/hooks/protect-branches.sh
# Block direct commits and pushes to protected branches

INPUT=$(cat /dev/stdin)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
PROTECTED_BRANCHES="main|master|production|staging|release"

# Check if on a protected branch
if ! echo "$CURRENT_BRANCH" | grep -qE "^($PROTECTED_BRANCHES)$"; then
  exit 0
fi

# Block direct commits to protected branches
if echo "$COMMAND" | grep -qE '^git\s+commit'; then
  jq -n --arg branch "$CURRENT_BRANCH" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Cannot commit directly to " + $branch + ". Create a feature branch first with: git checkout -b feature/your-feature")
    }
  }'
  exit 0
fi

# Block pushes to protected branches
if echo "$COMMAND" | grep -qE '^git\s+push'; then
  jq -n --arg branch "$CURRENT_BRANCH" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Cannot push directly to " + $branch + ". Use a pull request workflow.")
    }
  }'
  exit 0
fi

exit 0
```

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(git *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-branches.sh"
          }
        ]
      }
    ]
  }
}
```

The `if` filter ensures this hook only runs for git-related commands, not for every Bash call.

### Pattern 6: Cost-Conscious Subagent Control

This pattern limits how many subagents Claude can spawn and how long they run, preventing runaway costs.

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/track-subagents.sh"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/cleanup-subagent-tracking.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/track-subagents.sh
# Track active subagents and warn if too many are running

INPUT=$(cat /dev/stdin)
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')

TRACKING_DIR="/tmp/claude-subagents-$SESSION_ID"
mkdir -p "$TRACKING_DIR"

# Record this subagent
echo "$(date +%s)" > "$TRACKING_DIR/$AGENT_ID"

# Count active subagents
ACTIVE_COUNT=$(ls "$TRACKING_DIR" 2>/dev/null | wc -l)

if [ "$ACTIVE_COUNT" -gt 5 ]; then
  jq -n --arg count "$ACTIVE_COUNT" '{
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: ("Warning: " + $count + " subagents are now active. Consider reducing parallelism to control costs.")
    }
  }'
  exit 0
fi

exit 0
```

---

## Hooks in Team Settings: Sharing Across Engineers

One of the most powerful aspects of **Claude Code hooks** is that they can be shared through version control. When you put hooks in `.claude/settings.json`, every team member gets the same enforcement automatically.

### Project Structure for Team Hooks

Here is a recommended directory structure for team-shared hooks:

```
your-project/
  .claude/
    settings.json          # Hook configuration (committed)
    settings.local.json    # Personal overrides (gitignored)
    hooks/
      session-init.sh      # SessionStart hook
      validate-bash.sh     # PreToolUse Bash validator
      validate-writes.sh   # PreToolUse Write validator
      lint-after-write.sh  # PostToolUse linter
      audit-log.sh         # PostToolUse audit logger
      protect-branches.sh  # PreToolUse branch protection
```

### The Complete Team Configuration

Here is what a production `.claude/settings.json` looks like with all the patterns combined:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-init.sh",
            "statusMessage": "Initializing environment..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/security-gate.sh",
            "timeout": 5,
            "statusMessage": "Security check..."
          },
          {
            "type": "command",
            "if": "Bash(git *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-branches.sh",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-writes.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format-file.sh",
            "timeout": 15,
            "statusMessage": "Formatting..."
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-file.sh",
            "timeout": 30,
            "statusMessage": "Linting..."
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/audit-log.sh",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ]
  }
}
```

### Gitignore Setup

Make sure your `.gitignore` includes the local settings file but not the shared one:

```
# .gitignore
.claude/settings.local.json
.claude/logs/
```

The `.claude/settings.json` and `.claude/hooks/` directory should be committed and reviewed like any other code.

---

## Debugging and Troubleshooting Hooks

Hooks run as external processes, which means they can fail silently or produce unexpected behavior. Here are the most common issues and how to fix them.

### Use the /hooks Menu

Type `/hooks` in Claude Code to see all configured hooks. This menu shows every hook event, the hook type, matcher pattern, and source file. It is the fastest way to verify your configuration is loaded correctly.

### JSON Validation Errors

The most common hook failure is invalid JSON output. If your shell profile prints messages on startup (like "Welcome to zsh" or conda environment notices), those messages contaminate the JSON output.

**Fix:** Redirect startup output in your hook scripts:

```bash
#!/bin/bash
# Suppress any shell startup output
exec 2>/dev/null

# Your hook logic here
INPUT=$(cat /dev/stdin)
# ...
```

Or better, ensure your hook scripts produce clean output by only writing to stdout when you intentionally return JSON.

### Hook Not Running

If a hook is not running, check these things in order:

1. **Matcher pattern**: Does the regex match the actual tool name? Tool names are case-sensitive. `bash` will not match `Bash`.
2. **File permissions**: On Linux/macOS, your hook scripts need execute permission: `chmod +x .claude/hooks/my-hook.sh`.
3. **`if` condition**: If you use the `if` field, verify the permission rule syntax matches the actual tool call.
4. **Scope**: Is the hook in the right settings file? Project hooks go in `.claude/settings.json`, not `~/.claude/settings.json`.

### Testing Hooks Locally

You can test hook scripts outside of Claude Code by piping JSON to stdin:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"hook_event_name":"PreToolUse"}' | bash .claude/hooks/security-gate.sh
echo "Exit code: $?"
```

This lets you iterate on your hook logic without waiting for Claude to trigger it.

### Large Output Handling

Hook outputs larger than 10,000 characters are truncated. If your hook produces verbose output (like full test suite results), pipe through `tail` or `head` to keep the output manageable.

```bash
TEST_OUTPUT=$(npm test 2>&1 | tail -30)
```

### Disabling Hooks Temporarily

If a hook is causing problems, you can disable all hooks without removing the configuration:

```json
{
  "disableAllHooks": true
}
```

Add this to your `.claude/settings.local.json` to disable hooks locally without affecting the team.

---

## Frequently Asked Questions

### What is a Claude Code hook?

A Claude Code hook is a user-defined shell command, HTTP endpoint, or LLM prompt that executes automatically at specific points in Claude Code's lifecycle. Hooks can validate, block, modify, or log every operation Claude performs. They are configured in `settings.json` and run deterministically outside of Claude's reasoning.

### How do I create my first hook?

Create a `.claude/settings.json` file in your project root with a hook configuration. Start with a simple PostToolUse hook that logs operations:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"Tool used: $(cat /dev/stdin | jq -r .tool_name)\" >> /tmp/claude-log.txt"
          }
        ]
      }
    ]
  }
}
```

### Can hooks modify what Claude does?

Yes. PreToolUse hooks can modify tool inputs through the `updatedInput` field. For example, you can change a Bash command, modify a file path, or adjust timeout values before the tool executes. PostToolUse hooks cannot undo operations but can provide feedback that causes Claude to make corrections.

### Do hooks work with subagents?

Yes. Hooks fire for all tool calls, including those made by subagents spawned via the Agent tool. Additionally, `SubagentStart` and `SubagentStop` hooks let you intercept subagent creation and completion specifically.

### What happens if a hook times out?

If a command hook exceeds its `timeout` value (default 600 seconds), it is killed and treated as a non-blocking error. The original operation proceeds as if the hook had not run. Set explicit timeouts on your hooks to prevent long hangs.

### Can hooks access the full conversation history?

Yes. Every hook receives the `transcript_path` field in its input JSON, which points to the full conversation transcript as a JSONL file. Your hook can read this file to analyze conversation context, though this is an advanced use case.

### Do hooks slow down Claude Code?

Synchronous hooks add latency to every matched operation. A hook with a 30-second timeout that runs on every Bash call will be noticeable. Keep hooks fast (under 1-2 seconds for PreToolUse hooks), use `async: true` for non-blocking side effects, and use specific matchers to avoid running hooks on irrelevant operations.

### What is the difference between hooks and CLAUDE.md instructions?

CLAUDE.md instructions are soft guidance that Claude follows through its reasoning. They can be ignored, forgotten during long conversations, or lost during context compaction. Hooks are hard enforcement points that execute deterministically outside of Claude's reasoning. A hook that blocks `rm -rf` will always block it, regardless of what Claude's context window looks like.

### Can I use hooks in headless or CI mode?

Yes. Hooks work with `claude -p` (non-interactive/piped mode) and in CI environments. The `defer` permission decision is specifically designed for CI/SDK integrations where a calling process handles permission decisions externally.

### How do I share hooks with my team?

Put your hook configuration in `.claude/settings.json` and your hook scripts in `.claude/hooks/`. Commit both to version control. Every team member who clones the repo gets the same hooks automatically. Use `$CLAUDE_PROJECT_DIR` in command paths to keep hooks portable.

---

## Key Takeaways

**Claude Code hooks transform Claude from a chat assistant into an enforceable engineering workflow.** Here is what you should remember:

1. **Hooks are hard rules, not soft suggestions.** Unlike prompt instructions, hooks execute deterministically. A PreToolUse hook that blocks a command will always block it.

2. **Start with PreToolUse and PostToolUse.** These two events cover the most important workflow patterns: validating operations before they happen and enforcing standards after they complete.

3. **Use SessionStart for environment setup.** Inject context, set environment variables, and detect project configuration so Claude starts every session fully informed.

4. **Matchers give you precision.** Use regex patterns to target specific tools, MCP servers, or event types. Do not run expensive hooks on every operation.

5. **Exit code 2 blocks, exit code 0 allows (or returns JSON).** Master this protocol and you can build any validation logic.

6. **Share hooks through version control.** Put them in `.claude/settings.json` and `.claude/hooks/`, commit them, and every team member gets the same enforcement.

7. **Keep hooks fast.** Synchronous hooks add latency. Aim for under 1-2 seconds for PreToolUse hooks, and use `async: true` for side effects.

8. **Layer your security.** Combine hard blocks for dangerous patterns, user confirmation for sensitive operations, auto-approval for safe operations, and normal permissions for everything else.

**Claude Code hooks** are the mechanism that closes the gap between "AI that writes code" and "AI-powered engineering workflow." The prompts tell Claude what to do. The hooks ensure it is done right.

If you are using Claude Code without hooks, you are leaving enforcement on the table. Start with a single PreToolUse hook that blocks one dangerous pattern. Then add a PostToolUse hook that runs your linter. Then add a SessionStart hook that injects your project context. Build up from there.

The goal is not to restrict Claude. The goal is to make Claude's output reliably match your engineering standards every single time, without anyone having to remember the rules.
