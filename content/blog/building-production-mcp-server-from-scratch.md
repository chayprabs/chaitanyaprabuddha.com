---
title: "Building a Production MCP Server from Scratch"
description: "Step-by-step guide to building a production MCP server in Python: tool registration, input validation, error handling, authentication, and deployment."
date: "2026-03-29"
tags: ["AI Agents","MCP server tutorial","Model Context Protocol server Python"]
readTime: "20 min read"
ogImage: "/og/building-production-mcp-server-from-scratch.png"
canonical: "https://chaitanyaprabuddha.com/blog/building-production-mcp-server-from-scratch"
published: true
---

Every MCP tutorial shows you how to register a tool. None of them show you what happens when that tool gets called with malicious input.

Model Context Protocol (MCP) is Anthropic's open standard for connecting LLMs to external tools and data sources, released in November 2024. By early 2025, over 1,000 community-built MCP servers existed in the wild. The vast majority were built from the same toy examples in the official docs: a `list_tools` handler, a `call_tool` handler, and a `print("hello")` that proves it works.

That is fine for learning the protocol. It is not fine for shipping.

A production MCP server needs input validation that rejects malformed arguments before they reach your business logic. It needs error handling that returns useful messages to the LLM without leaking database credentials or stack traces. If it is remote, it needs authentication, rate limiting, and structured logging. And it needs tests you can run in CI.

We build all of that in Python, from an empty directory to a deployable Docker container, using the official `mcp` Python SDK throughout. You will have a server you can actually put in front of Claude.

## What MCP Is and How the Protocol Works

MCP (Model Context Protocol) is a standardized protocol that allows LLMs to interact with external tools and data sources through a unified interface. Before MCP, every AI application that needed tool access implemented its own bespoke integration: a different API shape for every provider, no interoperability, constant reinvention. MCP standardizes that layer.

An MCP server exposes three types of primitives to an LLM:

- **Tools**: Functions the LLM can invoke with arguments (search the web, query a database, send an email)
- **Resources**: Read-only data the LLM can access (file contents, API responses, live system state)
- **Prompts**: Reusable prompt templates the LLM can request and fill

The protocol uses JSON-RPC 2.0 as its message format. Two transports are supported:

- **stdio**: Standard input/output. The MCP host (Claude Desktop, your application) spawns the server as a subprocess and communicates over stdin/stdout. Used for local, trusted servers.
- **SSE/HTTP**: Server-Sent Events over HTTP. The server runs as a web service and clients connect over the network. Used for remote, shared servers.

> Choose stdio for local tools (filesystem access, local databases, developer utilities). Choose SSE/HTTP for shared infrastructure (multi-tenant SaaS tools, internal APIs that multiple Claude instances need to reach). The authentication and rate limiting sections apply to SSE/HTTP only.

The lifecycle of a tool call:
1. Claude sends a `tools/list` request; your server returns the tool definitions with their JSON Schema input specs
2. Claude decides to use a tool; it sends a `tools/call` request with the tool name and arguments
3. Your server validates the arguments, executes the tool, and returns a result
4. Claude incorporates the result into its response

That is the full loop. Every production concern here exists to make steps 3 and 4 safe and reliable.

## Project Setup

Create a new project directory and install dependencies:

```bash
mkdir my-mcp-server && cd my-mcp-server
python -m venv .venv && source .venv/bin/activate

pip install mcp pydantic structlog httpx
# For remote transport:
pip install starlette uvicorn slowapi
# For testing:
pip install pytest pytest-asyncio
```

Your project structure:

```plaintext
my-mcp-server/
├── server.py          # Main server definition
├── tools/
│   ├── __init__.py
│   └── web_search.py  # One file per tool or tool group
├── middleware/
│   ├── auth.py
│   └── rate_limit.py
├── tests/
│   └── test_tools.py
├── Dockerfile
└── pyproject.toml
```

Keeping tools in separate files pays off fast. MCP servers grow. A single `server.py` with 15 tools inline becomes unmanageable. Start with the structure.

## Registering Your First Tool

Here is the minimal working MCP server with one tool: a web search wrapper using the Brave Search API:

```python
# server.py
import asyncio
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

app = Server("my-mcp-server")

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="search_web",
            description=(
                "Search the web for current information. "
                "Returns titles, URLs, and snippets for the top results. "
                "Use this when you need facts, news, or documentation "
                "that may have changed after your training cutoff."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Number of results to return (1-10)",
                        "default": 5,
                        "minimum": 1,
                        "maximum": 10
                    }
                },
                "required": ["query"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "search_web":
        return await handle_search(arguments)
    raise ValueError(f"Unknown tool: {name}")

async def handle_search(args: dict) -> list[types.TextContent]:
    query = args["query"]
    max_results = args.get("max_results", 5)

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"X-Subscription-Token": "YOUR_API_KEY"},
            params={"q": query, "count": max_results},
            timeout=10.0
        )
        resp.raise_for_status()
        data = resp.json()

    results = data.get("web", {}).get("results", [])
    formatted = "\n\n".join(
        f"**{r['title']}**\n{r['url']}\n{r.get('description', '')}"
        for r in results
    )
    return [types.TextContent(type="text", text=formatted or "No results found.")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

This works. Test it by adding it to Claude Desktop's config:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/absolute/path/to/server.py"]
    }
  }
}
```

Now let us make it production-ready.

## Input Validation: The Step Most Tutorials Skip

The JSON Schema in your tool definition tells the LLM what arguments to send. It does not prevent a malformed or adversarial request from reaching your handler. Claude generally follows your schema, but other MCP clients may not. Prompt injection attacks can cause Claude itself to construct unexpected argument shapes.

Validate every tool call before touching business logic. Use Pydantic:

```python
# tools/web_search.py
from pydantic import BaseModel, Field, field_validator

class SearchArgs(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    max_results: int = Field(default=5, ge=1, le=10)

    @field_validator("query")
    @classmethod
    def no_injection_patterns(cls, v: str) -> str:
        # Block attempts to pass shell commands or SQL through the query
        forbidden = ["--", ";DROP", "<script", "$(", "`"]
        for pattern in forbidden:
            if pattern.lower() in v.lower():
                raise ValueError(f"Query contains forbidden pattern: {pattern}")
        return v.strip()
```

Update `call_tool` to validate before dispatching:

```python
from pydantic import ValidationError
from tools.web_search import SearchArgs

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "search_web":
        try:
            args = SearchArgs(**arguments)
        except ValidationError as e:
            # Return validation errors to the LLM as readable text
            errors = "; ".join(
                f"{'.'.join(str(l) for l in err['loc'])}: {err['msg']}"
                for err in e.errors()
            )
            return [types.TextContent(
                type="text",
                text=f"Invalid arguments: {errors}"
            )]
        return await handle_search(args)

    raise ValueError(f"Unknown tool: {name}")
```

> Do not re-raise ValidationError to the MCP framework unhandled. Some MCP clients surface server errors directly to users. Return validation failures as TextContent with a clear message. The LLM can read this, understand what went wrong, and retry with corrected arguments.

Three categories of inputs that require specific attention:

**1. Strings used in queries or system calls**: Validate length, character set, and check for injection patterns before passing to databases, shell commands, or file paths.

**2. Numeric bounds**: Always enforce `ge`/`le` constraints. An `offset` of -1 passed to a paginated database query can produce unexpected results or expose data. A `limit` of 100,000 can OOM your server.

**3. File paths**: If any tool accepts a file path, canonicalize it and verify it falls within your allowed directory. The path traversal attack (`../../etc/passwd`) is trivial to construct and catastrophic to miss.

```python
import os
from pathlib import Path

ALLOWED_BASE = Path("/data/user-files").resolve()

def validate_path(raw_path: str) -> Path:
    candidate = (ALLOWED_BASE / raw_path).resolve()
    if not str(candidate).startswith(str(ALLOWED_BASE)):
        raise ValueError("Path traversal attempt detected")
    return candidate
```

## Error Handling That Does Not Leak Internals

The failure mode I see most often is when a tool raises an exception, the MCP server propagates that exception as a string, and the LLM includes `psycopg2.OperationalError: password authentication failed for user "prod_admin"` in its response to the user.

Every tool handler needs two layers of error handling: expected failures (the API returned a 404, the file does not exist) and unexpected failures (exceptions you did not anticipate).

```python
import logging
import traceback
from enum import Enum

class ToolError(Exception):
    """Expected, user-facing tool failure. Safe to surface."""
    pass

async def handle_search(args: SearchArgs) -> list[types.TextContent]:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={"X-Subscription-Token": BRAVE_API_KEY},
                params={"q": args.query, "count": args.max_results},
                timeout=10.0
            )

            if resp.status_code == 429:
                raise ToolError("Search rate limit reached. Try again in 60 seconds.")
            if resp.status_code == 401:
                raise ToolError("Search service authentication failed.")
            resp.raise_for_status()

            data = resp.json()

    except httpx.TimeoutException:
        raise ToolError("Search timed out after 10 seconds. The query may be too broad.")

    except httpx.HTTPStatusError as e:
        # Log the real error internally, surface a safe message
        logging.error("Search HTTP error: %s", e, exc_info=True)
        raise ToolError(f"Search returned status {e.response.status_code}.")

    results = data.get("web", {}).get("results", [])
    if not results:
        return [types.TextContent(type="text", text="No results found for this query.")]

    formatted = "\n\n".join(
        f"**{r['title']}**\n{r['url']}\n{r.get('description', '')}"
        for r in results
    )
    return [types.TextContent(type="text", text=formatted)]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    try:
        if name == "search_web":
            args = SearchArgs(**arguments)
            return await handle_search(args)
        raise ToolError(f"Unknown tool: {name}")

    except ToolError as e:
        # Expected failure: return message directly to LLM
        return [types.TextContent(type="text", text=f"Tool error: {e}")]

    except Exception:
        # Unexpected failure: log full traceback, return generic message
        logging.error("Unexpected error in tool '%s': %s", name, traceback.format_exc())
        return [types.TextContent(
            type="text",
            text="An internal error occurred. The issue has been logged."
        )]
```

`ToolError` messages are user-facing and may reach end users through the LLM response. Every other exception type must be caught, logged internally with full detail, and surfaced as a generic message. Never let `traceback.format_exc()` reach the LLM response.

## Switching to Remote Transport (SSE/HTTP)

stdio is right for local tools. The moment you need your MCP server to be reachable by multiple clients, or by a cloud-hosted Claude deployment, you need SSE/HTTP transport.

```python
# server_remote.py
import uvicorn
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.routing import Mount, Route
from starlette.requests import Request

# Reuse the same `app` Server instance from server.py
from server import app

sse = SseServerTransport("/messages")

async def handle_sse(request: Request):
    async with sse.connect_sse(
        request.scope, request.receive, request._send
    ) as streams:
        await app.run(
            streams[0],
            streams[1],
            app.create_initialization_options()
        )

starlette_app = Starlette(
    routes=[
        Route("/sse", endpoint=handle_sse),
        Mount("/messages", app=sse.handle_post_message),
    ]
)

if __name__ == "__main__":
    uvicorn.run(starlette_app, host="0.0.0.0", port=8000)
```

The `/sse` endpoint is where MCP clients connect to receive server-sent events. The `/messages` mount handles the client-to-server POST messages. Both are required for the SSE transport to function.

## Authentication for Remote Servers

A remote MCP server without authentication is a public API for anyone who discovers the URL. Starlette middleware makes it straightforward to require API key authentication on every request.

```python
# middleware/auth.py
import hmac
import hashlib
import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Store API keys hashed (never compare plaintext keys directly)
VALID_KEY_HASHES: set[str] = {
    hashlib.sha256(key.encode()).hexdigest()
    for key in os.environ.get("MCP_API_KEYS", "").split(",")
    if key
}

def verify_api_key(api_key: str) -> bool:
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    # Use hmac.compare_digest to prevent timing attacks
    return any(
        hmac.compare_digest(key_hash, valid_hash)
        for valid_hash in VALID_KEY_HASHES
    )

class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Health check endpoint bypasses auth
        if request.url.path == "/health":
            return await call_next(request)

        api_key = request.headers.get("X-API-Key")
        if not api_key or not verify_api_key(api_key):
            return Response(
                content='{"error": "Unauthorized"}',
                status_code=401,
                media_type="application/json"
            )
        return await call_next(request)
```

Add the middleware and health check to your Starlette app:

```python
from starlette.middleware import Middleware
from middleware.auth import APIKeyAuthMiddleware

async def health_check(request: Request):
    return Response('{"status": "ok"}', media_type="application/json")

starlette_app = Starlette(
    routes=[
        Route("/health", endpoint=health_check),
        Route("/sse", endpoint=handle_sse),
        Mount("/messages", app=sse.handle_post_message),
    ],
    middleware=[
        Middleware(APIKeyAuthMiddleware)
    ]
)
```

> Store API keys as environment variables, not in source code. Use `MCP_API_KEYS=key1,key2` in your deployment environment. Rotate keys without redeploying by updating the environment variable and restarting the process. Never bake secrets into your Docker image.

For multi-tenant deployments where different clients should have different access levels, extend `APIKeyAuthMiddleware` to look up the key in a database and attach a `user_id` and `permissions` to `request.state`. Downstream tool handlers can then enforce per-user rate limits and access controls.

## Rate Limiting and Timeouts

Without rate limiting, a single runaway agent can exhaust your upstream API quotas and degrade service for everyone else. Use `slowapi`, a rate limiting library built on top of `limits` that integrates cleanly with Starlette:

```python
# middleware/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import Response

limiter = Limiter(key_func=get_remote_address)

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return Response(
        content=f'{{"error": "Rate limit exceeded. Retry after {exc.retry_after}s."}}',
        status_code=429,
        media_type="application/json",
        headers={"Retry-After": str(exc.retry_after)}
    )
```

Apply rate limits per endpoint:

```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware

@limiter.limit("60/minute")
async def handle_sse(request: Request):
    async with sse.connect_sse(
        request.scope, request.receive, request._send
    ) as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())

starlette_app = Starlette(
    routes=[...],
    middleware=[
        Middleware(APIKeyAuthMiddleware),
        Middleware(SlowAPIMiddleware),
    ]
)
starlette_app.state.limiter = limiter
starlette_app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
```

Rate limits to start with: **60 requests/minute per IP** for the SSE connection endpoint. Adjust based on your upstream API limits and expected usage patterns.

**Tool-level timeouts** are separate from rate limiting. Wrap every external call in an `asyncio.wait_for`:

```python
import asyncio

async def handle_search(args: SearchArgs) -> list[types.TextContent]:
    try:
        result = await asyncio.wait_for(
            _do_search(args),
            timeout=15.0  # 15-second hard ceiling per tool call
        )
        return result
    except asyncio.TimeoutError:
        raise ToolError("Search timed out. Try a more specific query.")

async def _do_search(args: SearchArgs) -> list[types.TextContent]:
    # Actual search logic here
    ...
```

Set timeouts at the tool level (not just the HTTP client level) so that even a slow tool that does multiple slow operations will eventually terminate.

## Structured Logging and Observability

Print statements do not work in stdio transport. The server communicates over stdout, so any `print()` output corrupts the MCP message stream. Use stderr for all logging output, and use structured logging (JSON lines) so your logs are queryable.

```python
# logging_config.py
import sys
import structlog

def configure_logging():
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
        cache_logger_on_first_use=True,
    )

log = structlog.get_logger()
```

Log every tool call with enough context to debug failures:

```python
import time
from logging_config import log

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    start = time.monotonic()
    log.info("tool_call_start", tool=name, args_keys=list(arguments.keys()))

    try:
        result = await dispatch_tool(name, arguments)
        duration_ms = (time.monotonic() - start) * 1000
        log.info("tool_call_success", tool=name, duration_ms=round(duration_ms, 1))
        return result

    except ToolError as e:
        duration_ms = (time.monotonic() - start) * 1000
        log.warning("tool_call_user_error", tool=name, error=str(e),
                    duration_ms=round(duration_ms, 1))
        return [types.TextContent(type="text", text=f"Tool error: {e}")]

    except Exception:
        duration_ms = (time.monotonic() - start) * 1000
        log.error("tool_call_unexpected_error", tool=name,
                  duration_ms=round(duration_ms, 1), exc_info=True)
        return [types.TextContent(
            type="text", text="An internal error occurred. The issue has been logged."
        )]
```

Log the argument *keys* (not values) to avoid accidentally logging user data or API keys passed as arguments. Log durations on every call. When a tool starts taking 3x longer than usual, the timing data will tell you before user complaints do.

## Testing Your MCP Server

Most MCP server tests in the wild test tool logic directly, bypassing the protocol entirely. That is useful but not sufficient. You also need tests that exercise the MCP message layer, confirming that `list_tools` returns the right schema and that `call_tool` routes correctly.

Test tool logic directly with pytest:

```python
# tests/test_tools.py
import pytest
from unittest.mock import AsyncMock, patch
from tools.web_search import SearchArgs
from server import handle_search

@pytest.mark.asyncio
async def test_search_returns_results():
    mock_response = {
        "web": {
            "results": [
                {"title": "Result 1", "url": "https://example.com", "description": "Desc 1"}
            ]
        }
    }
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_response,
            raise_for_status=lambda: None
        )
        args = SearchArgs(query="test query", max_results=1)
        result = await handle_search(args)

    assert len(result) == 1
    assert "Result 1" in result[0].text
    assert "https://example.com" in result[0].text

@pytest.mark.asyncio
async def test_search_timeout_returns_tool_error():
    import httpx
    from server import ToolError

    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("timeout")):
        args = SearchArgs(query="slow query")
        with pytest.raises(ToolError, match="timed out"):
            await handle_search(args)

def test_search_args_rejects_empty_query():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        SearchArgs(query="")

def test_search_args_rejects_oversized_results():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        SearchArgs(query="test", max_results=100)
```

Test the full call_tool routing layer separately:

```python
@pytest.mark.asyncio
async def test_unknown_tool_returns_error_content():
    from server import call_tool
    result = await call_tool("nonexistent_tool", {})
    assert result[0].type == "text"
    assert "Unknown tool" in result[0].text or "Tool error" in result[0].text

@pytest.mark.asyncio
async def test_validation_error_returns_readable_message():
    from server import call_tool
    # Pass bad arguments that will fail Pydantic validation
    result = await call_tool("search_web", {"query": "", "max_results": 999})
    assert result[0].type == "text"
    assert "Invalid arguments" in result[0].text or "Tool error" in result[0].text
```

Run tests in CI with `pytest tests/ -v`. Add `--tb=short` for cleaner output. Coverage target is every tool handler should have at least a success path test, an input validation test, and a timeout/failure test.

## Deploying to Production

For remote MCP servers, Docker plus a process manager is the standard path.

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Copy application code
COPY . .

# Non-root user for security
RUN useradd -m -u 1000 mcpserver && chown -R mcpserver:mcpserver /app
USER mcpserver

EXPOSE 8000

# Health check so orchestrators know when the server is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "server_remote:starlette_app",
     "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

Pass secrets via environment variables, never baked into the image:

```bash
docker build -t my-mcp-server .
docker run -d \
  --name mcp-server \
  -p 8000:8000 \
  -e MCP_API_KEYS="key1,key2" \
  -e BRAVE_API_KEY="your-key" \
  --restart unless-stopped \
  my-mcp-server
```

For Claude Desktop to use a remote server, add it to the MCP config:

```json
{
  "mcpServers": {
    "my-remote-server": {
      "url": "http://your-server:8000/sse",
      "headers": {
        "X-API-Key": "your-api-key"
      }
    }
  }
}
```

**Three production checklist items before going live:**

1. **Confirm logs go to stderr, not stdout**: In stdio transport, a single `print()` statement silently corrupts every subsequent MCP message. Run `python server.py 2>/dev/null` and verify the process does not error. If it does, a stray print is outputting to stdout.

2. **Test graceful shutdown**: Send `SIGTERM` to your server process and verify it completes in-flight tool calls before exiting. Add a signal handler if it does not: `signal.signal(signal.SIGTERM, lambda s, f: asyncio.get_event_loop().stop())`.

3. **Verify your error messages contain no secrets**: Run your server with intentionally broken credentials and inspect every error response it returns. Any response that includes a connection string, API key fragment, or stack trace needs to be fixed before deployment.

## Key Takeaways

- MCP (Model Context Protocol) uses JSON-RPC 2.0 over stdio (local) or SSE/HTTP (remote) to expose tools, resources, and prompts to LLMs. Choose the transport based on whether your server needs to be shared across multiple clients.

- Validate every tool call with Pydantic before it reaches your business logic. The JSON Schema in your tool definition constrains Claude but not other MCP clients or adversarial inputs.

- Use two error categories: ToolError for expected user-facing failures (safe to surface to the LLM), and a catch-all for unexpected exceptions (log internally, return a generic message). Never let stack traces or credentials reach the response.

- Remote MCP servers require API key authentication with timing-safe comparison, rate limiting per client, and tool-level timeouts. All three are necessary; none are optional for production deployments.

- In stdio transport, all logging must go to stderr. A single print() to stdout silently corrupts the MCP message stream. Use structlog with a stderr logger and JSON output.

- Test the full call_tool routing layer, not just individual tool handlers. Validation failures and unknown tool names should return readable TextContent, not unhandled exceptions.

## FAQ

### What is an MCP server?

An MCP (Model Context Protocol) server is a process that exposes tools, resources, and prompts to LLMs through Anthropic's standardized protocol. Tools are callable functions (like web search or database queries), resources are read-only data sources, and prompts are reusable templates. The server communicates via JSON-RPC 2.0 over either stdio (for local use) or SSE/HTTP (for remote, shared deployments). MCP allows LLMs like Claude to use the same tool interface regardless of the underlying implementation, replacing bespoke per-integration APIs.

### What is the difference between MCP stdio and SSE transport?

Stdio transport runs the MCP server as a subprocess, communicating over standard input/output. It is used for local, trusted tools (filesystem access, local databases, developer utilities) and requires no authentication since the server only receives connections from the host process that spawned it. SSE/HTTP transport runs the server as a web service that clients connect to over the network using Server-Sent Events. It is used for shared, remote servers and requires authentication, rate limiting, and HTTPS. For most production deployments serving multiple users or cloud-hosted Claude instances, SSE/HTTP is the right choice.

### How do you secure an MCP server?

MCP server security has four layers: input validation (use Pydantic to validate all tool arguments before touching business logic, check for path traversal in file arguments), error handling (never surface stack traces or credentials in tool responses, catch unexpected exceptions and return generic messages), authentication (require API keys on all endpoints using timing-safe comparison to prevent timing attacks), and rate limiting (cap requests per IP or per API key to prevent quota exhaustion). For remote servers, also add HTTPS via a reverse proxy (nginx, Caddy). Never serve MCP over plain HTTP in production.

### Can I build an MCP server without the official SDK?

Yes. MCP is an open protocol built on JSON-RPC 2.0, and you can implement it directly in any language. The message format is documented at modelcontextprotocol.io. However, the official SDKs (Python and TypeScript) handle protocol details including initialization handshake, capability negotiation, and message framing, which saves significant implementation work. Community-maintained SDKs exist for Go, Rust, Java, and several other languages. For new projects, start with the official SDK in Python or TypeScript. The lower-level implementation is only worthwhile if you have specific performance requirements or language constraints.

### How do you test an MCP server?

Test MCP servers at two levels: unit tests for individual tool handler functions (mock external API calls, verify correct output for valid inputs and correct error handling for invalid inputs) and integration tests for the call_tool routing layer (verify unknown tools return readable errors, validation failures produce TextContent not unhandled exceptions, and timeouts are handled gracefully). Use pytest with pytest-asyncio for async handlers. For end-to-end testing, the MCP Inspector tool (available via npx @modelcontextprotocol/inspector) provides a UI to send real MCP messages to your server and inspect responses without connecting to Claude.

The gap between a working MCP server and a production-ready one is not large in terms of code: roughly 150 lines of middleware, validation, and error handling on top of the core tool logic. But those 150 lines are what separate a server you can demo from one you can ship.

The patterns here (Pydantic validation on every tool call, two-tier error handling, API key auth with timing-safe comparison, structured logging to stderr, tool-level timeouts) are not MCP-specific. They apply to any tool-calling infrastructure. MCP is the interface; the production concerns are the same ones you would solve for any API that accepts external input and calls external services.

The next step is security hardening: understanding tool poisoning attacks, where a malicious tool description in a multi-server setup causes Claude to use a tool in unintended ways. That is the attack surface MCP opens that most tutorials do not address.

Build the server. Then think hard about what you are connecting it to.
