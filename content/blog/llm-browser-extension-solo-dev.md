---
title: "Building an LLM Browser Extension as a Solo Dev: Architecture, Pitfalls, and What I Shipped"
description: "Nobody writes about building browser extensions anymore. The market moved to standalone apps, Electron wrappers, and web-based SaaS."
date: "2026-03-29"
tags: ["Dev Tools","LLM browser extension development","build AI Chrome extension"]
readTime: "16 min read"
ogImage: "/og/llm-browser-extension-solo-dev.png"
canonical: "https://chaitanyaprabuddha.com/blog/llm-browser-extension-solo-dev"
published: true
---

Nobody writes about building browser extensions anymore. The market moved to standalone apps, Electron wrappers, and web-based SaaS. Extensions feel like legacy territory. A 2015 thing.

Then LLMs happened. Suddenly the browser is the most powerful AI interface available. Every page the user visits is potential context. Every form, email, and document is something an LLM can act on. The distribution story is unbeatable: one Chrome Web Store listing, no infrastructure beyond an API key, and your tool is inside the app the user already has open.

I built an LLM-powered browser extension for Authos, a writing assistant that reads the page you're on and helps you adapt your content strategy to what's already ranking. It took six weeks solo, two false starts, and more hours debugging Manifest V3 quirks than I care to admit.

The architecture decisions that worked, the ones that didn't, and the specific pitfalls that burned me are all documented here. If you're building an LLM tool that lives in the browser, this is the map I wish I'd had.

## The ThreeLayer Architecture

An LLM browser extension has three distinct execution contexts that cannot communicate directly with each other. Understanding this saves days of debugging.

| Layer | Runs In | Can Access | Cannot Access |
| --- | --- | --- | --- |
| Content Script | Page context | DOM, page text, page events | Extension APIs (most), LLM APIs directly |
| Service Worker | Extension context | Extension APIs, external HTTP (LLM APIs) | DOM, page context |
| Side Panel / Popup | Extension UI context | Extension APIs, its own DOM | Page DOM directly |

Communication between layers happens via `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`. The service worker acts as the hub: it receives extracted context from the content script, calls the LLM API, and streams results back to the UI.

The message flow for a typical "summarize this page" action:
1. User clicks button in Side Panel → Side Panel sends message to Service Worker: `{action: "summarize"}`
2. Service Worker sends message to Content Script: `{action: "extractContent"}`
3. Content Script reads page DOM, sends back: `{text: "...", url: "..."}`
4. Service Worker calls Claude API with extracted content, streams response
5. Service Worker forwards streaming chunks to Side Panel via `chrome.runtime.sendMessage`
6. Side Panel renders tokens as they arrive

This seems straightforward. The complexity is in steps 4 and 5: streaming across extension contexts is not natively supported and requires a workaround.

## The Content Script: Your Eyes on the Page

The content script is injected into every page that matches your manifest's `matches` patterns. It runs in an isolated JavaScript environment: same DOM as the page, separate JS scope. This is your only way to read page content.

```
// content.js: injected into matching pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractContent") {
    const content = extractPageContent();
    sendResponse({ success: true, content });
    return true; // keep message channel open for async
  }
});

function extractPageContent() {
  // Remove noise: scripts, styles, nav, footer
  const clone = document.cloneNode(true);
  const noise = clone.querySelectorAll(
    "script, style, nav, footer, header, aside, [role='navigation']"
  );
  noise.forEach(el => el.remove());

  // Prefer semantic content elements
  const article = clone.querySelector("article, main, [role='main']");
  const targetEl = article || clone.body;

  const text = targetEl.innerText
    .replace(/\n{3,}/g, "\n\n")  // collapse excess whitespace
    .trim()
    .slice(0, 8000);              // stay within context window budget

  return {
    text,
    url: window.location.href,
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')
                       ?.getAttribute("content") || "",
  };
}
```

The 8,000-character slice is deliberate. A full-page extraction can easily exceed 50,000 tokens for a long article. For most LLM tasks (summarization, Q&A, rewriting), the first ~6,000 words (roughly 8,000 characters) contains everything useful. Sending more tokens costs more and rarely improves output quality.

**The DOM mutation problem:** For SPAs (React, Vue, Next.js apps), content loads after the initial page parse. A content script that runs immediately on `document_idle` may extract an empty or partial page. The fix is a `MutationObserver` that waits for the main content element to be populated before marking the page as ready.

## The Background Service Worker: LLM API Calls

All external API calls must go through the service worker. Content scripts and UI contexts cannot make cross-origin requests to LLM APIs directly; they are blocked by CSP. The service worker has full network access.

```
// service-worker.js
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: await chrome.storage.local.get("apiKey").then(r => r.apiKey),
  dangerouslyAllowBrowser: false, // We're in service worker, not browser page
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "callLLM") {
    handleLLMCall(message.payload, sender.tab?.id).catch(console.error);
    return true; // async response
  }
});

async function handleLLMCall(payload, tabId) {
  const { prompt, context, systemPrompt } = payload;

  // Stream the response back to the side panel
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: "user", content: `${context}\n\n${prompt}` }
    ],
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta") {
      // Send each token chunk to the side panel
      chrome.runtime.sendMessage({
        action: "streamChunk",
        delta: chunk.delta.text,
      });
    }
  }

  chrome.runtime.sendMessage({ action: "streamComplete" });
}
```

> Manifest V3 service workers are ephemeral. They are spun down after 30 seconds of inactivity and do not persist state between invocations. Do not store conversation history or the Anthropic client instance in a module-level variable expecting it to persist. Re-initialize on every message, or use `chrome.storage.session` for short-lived state.

## Side Panel vs Popup: Choosing Your UI

You have two primary UI options: a popup (appears when the extension icon is clicked, closes when focus leaves) or a side panel (persistent panel that stays open while browsing).

For LLM extensions, the side panel wins in almost every case. LLM responses take 2–10 seconds to generate. A popup that closes when the user clicks back to the page (which they almost certainly will) kills the in-flight request and discards the partial response. The side panel stays open.

```
// manifest.json: enabling side panel
{
  "manifest_version": 3,
  "name": "Your LLM Extension",
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab",
    "scripting"
  ],
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  }
}
```

```
// Open the side panel when the extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});
```

The side panel API was introduced in Chrome 114 (mid-2023) and is now broadly supported. Firefox does not support it. If Firefox compatibility matters, you need a separate sidebar implementation using the `browser.sidebarAction` API and a polyfill for the differences.

## Streaming LLM Responses in an Extension

Streaming is the biggest UX differentiator in an LLM extension. Without it, users stare at a spinner for 8 seconds then see the full response appear. With it, tokens appear as they are generated, and the experience feels instant.

The challenge: `chrome.runtime.sendMessage` does not support streaming. Each call sends one discrete message. For token-by-token streaming, you send one message per token chunk.

In the side panel, listen for chunk messages and append to the UI:

```
// sidepanel.js
let responseBuffer = "";
const responseEl = document.getElementById("response");

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "streamChunk") {
    responseBuffer += message.delta;
    responseEl.textContent = responseBuffer;
    responseEl.scrollTop = responseEl.scrollHeight; // auto-scroll
  }

  if (message.action === "streamComplete") {
    // Enable the submit button, hide spinner
    document.getElementById("submit").disabled = false;
    document.getElementById("spinner").hidden = true;
  }

  if (message.action === "streamError") {
    responseEl.textContent = `Error: ${message.error}`;
    document.getElementById("submit").disabled = false;
  }
});
```

**Performance note:** Sending one `chrome.runtime.sendMessage` per token can cause jank for fast models. Claude Sonnet generates at about 80 tokens/second, which is 80 inter-process messages per second. Batch chunks into 50ms windows:

```
// In service-worker.js: batch chunks to reduce IPC overhead
let chunkBuffer = "";
let flushTimeout = null;

function scheduleFlush(tabId) {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    if (chunkBuffer) {
      chrome.runtime.sendMessage({ action: "streamChunk", delta: chunkBuffer });
      chunkBuffer = "";
    }
    flushTimeout = null;
  }, 50); // flush every 50ms
}

// In the streaming loop:
chunkBuffer += chunk.delta.text;
scheduleFlush(tabId);
```

This smooths rendering significantly and reduces IPC overhead at high token rates.

## Extracting Useful Context from Any Page

The quality of your LLM responses depends on the quality of context you extract. A generic `document.body.innerText` extraction includes navigation menus, cookie banners, footer links, and advertisement text. This noise wastes tokens and degrades output quality.

A better extraction strategy uses a priority order:

```
function extractPageContent() {
  // Priority 1: article or main content element
  const semanticContent = document.querySelector(
    "article, [role='main'], main, .post-content, .article-body, #content"
  );

  // Priority 2: largest text-dense div (heuristic for non-semantic pages)
  if (!semanticContent) {
    const divs = [...document.querySelectorAll("div, section")];
    const largest = divs
      .map(el => ({ el, textLength: el.innerText.trim().length }))
      .filter(({ textLength }) => textLength > 500)
      .sort((a, b) => b.textLength - a.textLength)[0];

    if (largest) return cleanText(largest.el.innerText);
  }

  // Priority 3: fall back to body with noise removed
  return cleanText(semanticContent?.innerText || document.body.innerText);
}

function cleanText(raw) {
  return raw
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 8000);
}
```

For pages where the user has selected text, always prefer the selection over full-page extraction. Selected text is explicit user intent about what context matters:

```
const selectedText = window.getSelection()?.toString().trim();
if (selectedText && selectedText.length > 50) {
  return { text: selectedText, source: "selection" };
}
// fall through to full-page extraction
```

## CSP and CORS: The Walls You Will Hit

Content Security Policy (CSP) is the most common source of mysterious failures in LLM extension development.

**Content scripts** run in the page's origin but in an isolated JS scope. They cannot make fetch requests to external origins (like `api.anthropic.com`). These are blocked by the page's CSP. This is by design: a malicious page should not be able to use your extension as a proxy to make authenticated API calls.

**Service workers** run in the extension's origin (`chrome-extension://[id]`) and can make any fetch request, including to `api.anthropic.com`. All LLM API calls must go here.

**Side panel / popup** scripts run in the extension's origin and CAN make fetch calls if you declare the host in `manifest.json`:

```
{
  "host_permissions": [
    "https://api.anthropic.com/*"
  ]
}
```

However, for API key security (see next section), keep all LLM calls in the service worker even if the UI could technically make them directly.

**The injection CSP problem:** If you inject a UI element into the page DOM (rather than using a side panel), the page's own CSP applies to your injected content. Pages with strict CSP (`default-src 'self'`) will block your injected scripts and styles. The side panel avoids this: it renders in the extension's origin, not the page's.

## Manifest V3 Constraints That Affect LLM Extensions

Manifest V3 (MV3) replaced V2 as Chrome's required extension standard in 2023. Several of its constraints specifically affect LLM extensions.

**Service workers terminate after 30 seconds of inactivity.** LLM API calls can take 10–30 seconds for long responses. If the service worker starts a stream and the user switches tabs, the worker may be terminated mid-stream. Use `chrome.storage.session` to save partial state:

```
// Keep service worker alive during long LLM calls with a keep-alive ping
let keepAliveInterval;

function startLLMCall() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {}); // no-op that prevents termination
  }, 20000);
}

function endLLMCall() {
  clearInterval(keepAliveInterval);
}
```

**No `eval()` or dynamic code execution.** Some LLM output rendering libraries use `eval()` for markdown parsing or code highlighting. These are blocked in MV3. Use static markdown parsers (marked.js with the `mangle: false` option works in MV3) and syntax highlighters that do not use eval. Prism.js is MV3-safe; highlight.js requires configuration.

**Remote code is disallowed.** You cannot load scripts from CDNs at runtime. All JavaScript must be bundled into the extension. This means using a build tool (Vite, webpack, or esbuild) and bundling your Claude SDK rather than loading it from a CDN.

## API Key Storage Done Right

LLM extensions that ship with a hardcoded API key will have that key extracted and abused within days of Web Store publication. The correct model: users supply their own API key, stored in `chrome.storage.local` (encrypted by Chrome, scoped to the extension).

```
// settings.js: API key management
const STORAGE_KEY = "anthropic_api_key";

async function saveApiKey(key) {
  // Basic validation before storing
  if (!key.startsWith("sk-ant-")) {
    throw new Error("Invalid Anthropic API key format");
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: key });
}

async function getApiKey() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || null;
}

async function clearApiKey() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

// In service-worker.js: retrieve key per request (don't cache in module scope)
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.action === "callLLM") {
    const apiKey = await getApiKey();
    if (!apiKey) {
      chrome.runtime.sendMessage({
        action: "streamError",
        error: "No API key configured. Open extension settings to add your Anthropic key."
      });
      return;
    }
    // proceed with API call
  }
});
```

`chrome.storage.local` is encrypted at rest on all platforms. It is more secure than `localStorage` (accessible to page scripts) or hardcoded keys. Never log the API key, never include it in error messages, and never send it anywhere except the API endpoint.

## Shipping to the Chrome Web Store

The review process is worth planning for. Google's automated and manual review caught three issues in my first submission:

1. **Broad host permissions trigger review.** `"<all_urls>"` in `host_permissions` flags the extension for enhanced review. Scope permissions to exactly what you need: `"https://api.anthropic.com/*"` and optionally `"https://*/*"` only if you need to inject content scripts on all pages.

2. **Privacy policy is mandatory** for extensions that transmit any user data externally. Page content sent to the Claude API counts as user data. Write a simple privacy policy (what data is sent, where, for what purpose, retention policy) and host it at a permanent URL.

3. **Store listing descriptions matter for discoverability.** The Chrome Web Store has its own search algorithm. Include your primary keyword in the extension name and description. Screenshots showing the extension in use on real pages improve install conversion far more than generic UI screenshots.

Review took 5 business days for my initial submission and 2 days for updates. Build this into your launch timeline.

## Key Takeaways

- LLM browser extensions have three distinct execution contexts (content script, service worker, side panel/popup) that communicate via message passing. All LLM API calls must go through the service worker; content scripts cannot make cross-origin requests.

- The side panel is the correct UI for LLM extensions because it persists across page navigation, keeping in-flight streaming requests alive. Popups close on focus loss and kill active API calls.

- Streaming LLM responses requires sending one message per token chunk via chrome.runtime.sendMessage. Batch chunks into 50ms windows to prevent jank at high token rates.

- Manifest V3 service workers terminate after 30 seconds of inactivity. Use a keep-alive ping during long LLM API calls and never store state in service worker module-level variables expecting it to persist.

- Store API keys in chrome.storage.local (encrypted, extension-scoped). Never hardcode keys or store them in localStorage. Require users to supply their own keys for public extensions.

- Content extraction quality determines LLM output quality. Prioritize semantic elements (article, main, [role='main']), prefer user-selected text over full-page extraction, and truncate to ~8,000 characters to stay within practical context window budgets.

## FAQ

### Can a Chrome extension call the Claude API directly?

Yes, but only from the service worker context, not from content scripts or the side panel UI. Content scripts run in the page's origin and are subject to the page's Content Security Policy, which blocks cross-origin requests to api.anthropic.com. The service worker runs in the extension's origin and can make any fetch request after declaring the host in manifest.json's host_permissions. Route all LLM API calls through the service worker and use chrome.runtime.sendMessage to relay results to your UI.

### How do you stream LLM responses in a browser extension?

Streaming in a browser extension requires sending individual token chunks as messages from the service worker to the UI via chrome.runtime.sendMessage. The service worker opens a streaming connection to the LLM API, and for each token chunk received, sends a message to the side panel or popup which appends it to the rendered output. Since chrome.runtime.sendMessage does not natively support streaming, you emit one message per chunk. For high-throughput models (80+ tokens/second), batch chunks into 50ms windows before sending to prevent IPC overhead from causing jank.

### What is the difference between Manifest V2 and V3 for LLM extensions?

Manifest V3 replaced persistent background pages with ephemeral service workers that terminate after 30 seconds of inactivity, a significant constraint for long LLM API calls. V3 also prohibits remotely-hosted code and eval(), requiring all JavaScript (including SDKs) to be bundled into the extension. The migration from V2 to V3 became mandatory in 2023. For LLM extensions, the key adaptations are: use a keep-alive ping during long API calls to prevent service worker termination, bundle all dependencies with a build tool, and avoid markdown parsers or syntax highlighters that use eval().

### How do you handle page context extraction for different website types?

Use a priority-order extraction strategy. First check for semantic HTML elements (article, main, [role='main']) which most publishing platforms and SPAs use. Fall back to the largest text-dense div for non-semantic pages (detected by finding divs with more than 500 characters of inner text). Finally fall back to body text with navigation, footer, and script elements removed. Always prefer user-selected text over full-page extraction when a selection exists. For SPAs that load content after initial parse, use a MutationObserver to wait for the main content container to be populated before extracting. Truncate all extraction to 8,000 characters to stay within practical context budgets.

The browser extension opportunity for LLM tools is underexplored. Most developers default to web apps or CLI tools because the browser extension model feels unfamiliar. That friction is the moat.

An extension that lives in the browser, reads what the user is reading, and acts where the user is working has zero switching cost and zero context-copy friction. This is a distribution and UX advantage that standalone tools cannot replicate. The user is already there.

The architecture is learnable in a week. The MV3 constraints are annoying but navigable. The Chrome Web Store gives you distribution without ad spend. For a solo developer building an LLM-powered productivity tool, the extension model deserves serious consideration before defaulting to another SaaS with a login screen.

Build the content script first. Get the context extraction right. Everything else follows from there.
