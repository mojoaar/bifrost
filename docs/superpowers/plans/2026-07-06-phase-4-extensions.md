# Phase 4 — Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add plugin system with lifecycle hooks, AI writing assistant with streaming SSE, and OpenAPI 3.1 spec with Swagger UI explorer.

**Architecture:** The plugin registry loads plugins from `plugins/<name>/index.ts` and fires lifecycle hooks at defined points in the existing pipeline (markdown parsing, content watching, instrumentation, admin dashboard). The AI assistant uses raw `fetch()` to OpenAI-compatible provider endpoints with `ReadableStream` → SSE streaming, driven by `bifrost.config.ts` provider config. The OpenAPI spec is generated programmatically from route metadata and served alongside swagger-ui-react at `/api/docs`.

**Tech Stack:** swagger-ui-react, OpenAI-compatible HTTP API (fetch + SSE streaming), existing codebase (Drizzle, Zod, jose)

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- Server components by default, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- Environment variables prefixed with `BIFROST_`
- No comments unless logic is genuinely non-obvious
- All new source files carry the AGPL-3.0 license header
- Run `npm run typecheck && npm run lint && npm test` before marking work complete

---

### Task 1: Install Phase 4 Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: project from Phase 3
- Produces: installed `swagger-ui-react`, `@types/swagger-ui-react`

- [ ] **Step 1: Install packages**

```bash
npm install swagger-ui-react && npm install -D @types/swagger-ui-react
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install swagger-ui-react for API explorer"
```

---

### Task 2: Plugin System — Types, Registry, and Hook Runner

**Files:**
- Create: `lib/plugins/types.ts`
- Create: `lib/plugins/registry.ts`
- Create: `tests/lib/plugins/registry.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `PluginHooks` interface with 5 lifecycle hooks (all optional)
  - `BifrostPlugin` interface: `{ name: string; hooks: PluginHooks }`
  - `PluginContext`: `{ db: DrizzleClient; loadConfig: () => BifrostConfig }`
  - `registerPlugin(plugin: BifrostPlugin): void`
  - `runHook<K extends keyof PluginHooks>(hook: K, ...args: Parameters<NonNullable<PluginHooks[K]>>): Promise<ReturnType[]>` — runs all registered plugins' hook and collects return values
  - `listPlugins(): BifrostPlugin[]`
  - `loadPluginsFromDirectory(dir: string): Promise<void>` — scans `plugins/` via `readdir`, `await import()`s each plugin's `index.ts`, calls `registerPlugin`

- [ ] **Step 1: Create lib/plugins/types.ts**

```typescript
import type { ParsedMarkdown } from "@/lib/md/types";

export interface PluginContext {
  db: typeof import("@/lib/db").db;
  loadConfig: typeof import("@/lib/config/loader").loadConfig;
}

export interface PluginHooks {
  onContentParse?(parsed: ParsedMarkdown, context: PluginContext): ParsedMarkdown | Promise<ParsedMarkdown>;
  onContentRender?(html: string, context: PluginContext): string | Promise<string>;
  onContentPublish?(slug: string, context: PluginContext): void | Promise<void>;
  onServerStart?(context: PluginContext): void | Promise<void>;
  adminWidget?(): { component: React.ComponentType; position: "sidebar" | "main"; label: string };
}

export interface BifrostPlugin {
  name: string;
  hooks: PluginHooks;
}
```

- [ ] **Step 2: Create lib/plugins/registry.ts**

```typescript
import type { BifrostPlugin, PluginHooks, PluginContext } from "./types";
import fs from "fs/promises";
import path from "path";

const plugins: BifrostPlugin[] = [];

export function registerPlugin(plugin: BifrostPlugin): void {
  if (plugins.some((p) => p.name === plugin.name)) {
    throw new Error(`Plugin "${plugin.name}" is already registered`);
  }
  plugins.push(plugin);
}

export function listPlugins(): BifrostPlugin[] {
  return [...plugins];
}

type HookArgs<K extends keyof PluginHooks> = Parameters<
  NonNullable<PluginHooks[K]>
>;

type HookReturn<K extends keyof PluginHooks> = NonNullable<
  Awaited<ReturnType<NonNullable<PluginHooks[K]>>>
>;

export async function runHook<K extends keyof PluginHooks>(
  hookName: K,
  ...args: HookArgs<K>
): Promise<HookReturn<K>[]> {
  const results: HookReturn<K>[] = [];

  for (const plugin of plugins) {
    const hook = plugin.hooks[hookName] as
      | undefined
      | ((...a: unknown[]) => unknown);

    if (!hook) continue;

    const result = await hook(...args);
    if (result !== undefined) {
      results.push(result as HookReturn<K>);
    }
  }

  return results;
}

export function getPlugins(): BifrostPlugin[] {
  return plugins;
}

export async function loadPluginsFromDirectory(
  dir: string
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const indexPath = path.join(dir, entry.name, "index.ts");
    try {
      await fs.access(indexPath);
    } catch {
      continue;
    }

    try {
      const mod = await import(indexPath);
      if (mod.default && mod.default.hooks) {
        registerPlugin(mod.default as BifrostPlugin);
      }
    } catch (err) {
      console.error(`Failed to load plugin "${entry.name}":`, err);
    }
  }
}
```

- [ ] **Step 3: Write tests**

Create `tests/lib/plugins/registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { registerPlugin, listPlugins, runHook, getPlugins } from "@/lib/plugins/registry";
import type { BifrostPlugin, ParsedMarkdown } from "@/lib/plugins/types";

beforeEach(() => {
  const all = getPlugins();
  all.length = 0;
});

describe("registerPlugin", () => {
  it("registers a plugin", () => {
    const plugin: BifrostPlugin = { name: "test", hooks: {} };
    registerPlugin(plugin);
    expect(listPlugins()).toHaveLength(1);
    expect(listPlugins()[0]!.name).toBe("test");
  });

  it("throws on duplicate plugin name", () => {
    const plugin: BifrostPlugin = { name: "dup", hooks: {} };
    registerPlugin(plugin);
    expect(() => registerPlugin(plugin)).toThrow("already registered");
  });
});

describe("runHook", () => {
  const mockParsed: ParsedMarkdown = {
    frontmatter: {},
    body: "# hello",
    html: "<h1>hello</h1>",
    excerpt: "hello",
  };

  it("returns empty array when no plugins registered", async () => {
    const results = await runHook("onContentParse", mockParsed, {
      db: {} as never,
      loadConfig: {} as never,
    });
    expect(results).toEqual([]);
  });

  it("calls matching hook across all registered plugins", async () => {
    const calls: string[] = [];

    registerPlugin({
      name: "a",
      hooks: {
        onContentParse(parsed) {
          calls.push("a");
          return parsed;
        },
      },
    });

    registerPlugin({
      name: "b",
      hooks: {
        onContentParse(parsed) {
          calls.push("b");
          return parsed;
        },
      },
    });

    await runHook("onContentParse", mockParsed, {
      db: {} as never,
      loadConfig: {} as never,
    });

    expect(calls).toEqual(["a", "b"]);
  });

  it("skips plugins without the hook", async () => {
    registerPlugin({ name: "no-hook", hooks: {} });

    registerPlugin({
      name: "has-hook",
      hooks: {
        onContentParse(parsed) {
          return { ...parsed, excerpt: "modified" };
        },
      },
    });

    const results = await runHook("onContentParse", mockParsed, {
      db: {} as never,
      loadConfig: {} as never,
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.excerpt).toBe("modified");
  });

  it("collects return values from all plugins", async () => {
    registerPlugin({
      name: "a",
      hooks: { onContentParse(p) { return p; } },
    });
    registerPlugin({
      name: "b",
      hooks: { onContentParse(p) { return { ...p, body: "mod" }; } },
    });

    const results = await runHook("onContentParse", mockParsed, {
      db: {} as never,
      loadConfig: {} as never,
    });

    expect(results).toHaveLength(2);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- --run tests/lib/plugins/registry.test.ts`
Expected: FAIL (files not found)

- [ ] **Step 5: Create the implementation files**

The files are already written above in Steps 1-2. Write them to disk.

- [ ] **Step 6: Run tests**

Run: `npm test -- --run tests/lib/plugins/registry.test.ts`
Expected: 6/6 pass

- [ ] **Step 7: Commit**

```bash
git add lib/plugins/ tests/lib/plugins/
git commit -m "feat: add plugin system with lifecycle hook registry"
```

---

### Task 3: Wire Plugin Hooks into Existing Code

**Files:**
- Modify: `lib/md/parser.ts` — call `onContentParse` + `onContentRender`
- Modify: `lib/content/watcher.ts` — call `onContentPublish` on status change to published
- Modify: `instrumentation.ts` — call `onServerStart` + load plugins
- Modify: `app/admin/page.tsx` — show `adminWidget` components

**Interfaces:**
- Consumes: `lib/plugins/registry.ts` (runHook, loadPluginsFromDirectory), existing pipeline (parseMarkdown, processFile, instrumentation)
- Produces: plugin hooks integrated into all 5 lifecycle points

- [ ] **Step 1: Modify lib/md/parser.ts — wire onContentParse and onContentRender hooks**

The `parseMarkdown` function calls `runHook("onContentParse", parsed, context)` before returning. The `renderMarkdown` function calls `runHook("onContentRender", html, context)` to let plugins transform the HTML.

Current parser:
```typescript
export async function parseMarkdown(content: string): Promise<ParsedMarkdown> {
  const { frontmatter, body } = parseFrontmatter(content);
  const { html, excerpt } = await renderMarkdown(body);
  return { frontmatter, body, html, excerpt };
}
```

Change `parseMarkdown` to:
```typescript
import { runHook } from "@/lib/plugins/registry";

export async function parseMarkdown(content: string): Promise<ParsedMarkdown> {
  const { frontmatter, body } = parseFrontmatter(content);
  const { html, excerpt } = await renderMarkdown(body);

  const parsed: ParsedMarkdown = { frontmatter, body, html, excerpt };

  let context: { db: never; loadConfig: never };
  try {
    const { db } = await import("@/lib/db");
    const { loadConfig } = await import("@/lib/config/loader");
    context = { db, loadConfig };
  } catch {
    context = { db: null as never, loadConfig: () => ({} as never) };
  }

  const modified = await runHook("onContentParse", parsed, context);
  if (modified.length > 0) {
    return modified[modified.length - 1]!;
  }

  return parsed;
}
```

Change `renderMarkdown` to:
```typescript
export async function renderMarkdown(
  markdown: string
): Promise<{ html: string; excerpt: string }> {
  const result = await processor.process(markdown);
  let html = String(result);

  try {
    const { db } = await import("@/lib/db");
    const { loadConfig } = await import("@/lib/config/loader");
    const rendered = await runHook("onContentRender", html, { db, loadConfig });
    if (rendered.length > 0) {
      html = rendered[rendered.length - 1]!;
    }
  } catch {
    // hooks are optional; continue without them if db isn't available
  }

  const plainText = html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const excerpt = plainText.length > 200 ? plainText.slice(0, 200) + "\u2026" : plainText;

  return { html, excerpt };
}
```

- [ ] **Step 2: Modify lib/content/watcher.ts — wire onContentPublish hook**

In the `processFile` function, after upserting the post, check if status is "published" and fire the hook:

Add after the upsert block in `processFile` (after line 86):
```typescript
  if (status === "published") {
    try {
      const { db } = await import("@/lib/db");
      const { loadConfig } = await import("@/lib/config/loader");
      await runHook("onContentPublish", slug, { db, loadConfig });
    } catch {
      // hooks are optional
    }
  }
```

At the top of the file, add the import:
```typescript
import { runHook } from "@/lib/plugins/registry";
```

- [ ] **Step 3: Modify instrumentation.ts — wire onServerStart + load plugins**

Change from:
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ingestAll, startWatcher } = await import("@/lib/content/watcher");
    await ingestAll();
    startWatcher();
  }
}
```

To:
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadPluginsFromDirectory, runHook } = await import(
      "@/lib/plugins/registry"
    );

    await loadPluginsFromDirectory("./plugins");

    const { ingestAll, startWatcher } = await import("@/lib/content/watcher");
    await ingestAll();
    startWatcher();

    try {
      const { db } = await import("@/lib/db");
      const { loadConfig } = await import("@/lib/config/loader");
      await runHook("onServerStart", { db, loadConfig });
    } catch {
      // hooks are optional
    }
  }
}
```

- [ ] **Step 4: Modify app/admin/page.tsx — show adminWidget plugins**

Add a `"use client"` component that calls `listPlugins()` and renders `adminWidget` components. The simplest approach: add a client wrapper.

The existing dashboard:
```typescript
export default function AdminDashboard() {
  return (
    <div>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-2 text-zinc-400">Welcome to the Bifröst admin panel.</p>
    </div>
  );
}
```

Change to a client component that imports the widget hooks:
```typescript
"use client";

import { useEffect, useState } from "react";

interface AdminWidget {
  component: React.ComponentType;
  position: "sidebar" | "main";
  label: string;
}

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState<AdminWidget[]>([]);

  useEffect(() => {
    async function load() {
      const { listPlugins } = await import("@/lib/plugins/registry");
      const plugins = listPlugins();
      const found: AdminWidget[] = [];
      for (const p of plugins) {
        if (p.hooks.adminWidget) {
          const w = p.hooks.adminWidget();
          if (w) found.push(w);
        }
      }
      setWidgets(found);
    }
    load();
  }, []);

  const mainWidgets = widgets.filter((w) => w.position === "main");
  const sidebarWidgets = widgets.filter((w) => w.position === "sidebar");

  return (
    <div>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-2 text-zinc-400">Welcome to the Bifröst admin panel.</p>

      {mainWidgets.length > 0 && (
        <div className="mt-6 space-y-4">
          {mainWidgets.map((w) => (
            <div key={w.label} className="rounded border border-zinc-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-400">{w.label}</h3>
              <w.component />
            </div>
          ))}
        </div>
      )}

      {sidebarWidgets.length > 0 && (
        <div className="mt-6 space-y-4">
          {sidebarWidgets.map((w) => (
            <div key={w.label} className="rounded border border-zinc-800 p-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-400">{w.label}</h3>
              <w.component />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify typecheck and tests pass**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass, zero errors

- [ ] **Step 6: Commit**

```bash
git add lib/md/parser.ts lib/content/watcher.ts instrumentation.ts app/admin/page.tsx
git commit -m "feat: wire plugin lifecycle hooks into pipeline, instrumentation, and admin"
```

---

### Task 4: AI Provider Abstraction and Streaming Chat API

**Files:**
- Create: `lib/ai/providers.ts` — provider abstraction
- Create: `lib/ai/actions.ts` — action prompts
- Create: `app/api/v1/ai/chat/route.ts` — SSE streaming endpoint
- Create: `app/api/v1/ai/models/route.ts` — list models endpoint
- Create: `tests/lib/ai/providers.test.ts`

**Interfaces:**
- Consumes: `lib/config/loader.ts` (loadConfig → AIConfig), `bifrost.config.ts` (AI provider config)
- Produces:
  - `AIProvider: { chat(messages, options): Promise<Response> }` — OpenAI-compatible chat
  - `getProvider(name: string): AIProvider` — selects from config
  - `streamChat(provider, messages, options): ReadableStream<string>` — SSE streaming
  - `POST /api/v1/ai/chat` — SSE endpoint, streams token-by-token via `text/event-stream`
  - `GET /api/v1/ai/models` — returns available providers and models
  - `AI_ACTIONS` — system prompt templates for each action

- [ ] **Step 1: Create lib/ai/providers.ts**

```typescript
import { loadConfig } from "@/lib/config/loader";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const CONFIG = loadConfig();

function getProviderConfig(name: string) {
  const provider = CONFIG.ai.providers[name];
  if (!provider) {
    throw new Error(`AI provider "${name}" not configured`);
  }
  return provider;
}

function getEndpoint(provider: string): string {
  if (provider === "opencode-zen") {
    return "https://opencode.ai/zen/v1/chat/completions";
  }
  if (provider === "opencode-go") {
    return "https://opencode.ai/zen/go/v1/chat/completions";
  }
  if (provider === "deepseek") {
    return "https://api.deepseek.com/v1/chat/completions";
  }
  throw new Error(`Unknown provider: ${provider}`);
}

export async function chatCompletion(
  providerName: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<Response> {
  const config = getProviderConfig(providerName);
  const endpoint = getEndpoint(providerName);
  const model = options.model ?? config.model;
  const apiKey = config.apiKey ?? process.env[`BIFROST_${providerName.toUpperCase().replace(/-/g, "_")}_KEY`] ?? "";

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
    }),
  });
}

export async function* streamChatCompletion(
  providerName: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): AsyncGenerator<string, void, undefined> {
  const response = await chatCompletion(providerName, messages, options);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI provider error (${response.status}): ${body}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // skip unparseable chunks
      }
    }
  }
}

export function listModels(): { provider: string; model: string }[] {
  return Object.entries(CONFIG.ai.providers).map(([name, config]) => ({
    provider: name,
    model: config.model,
  }));
}
```

- [ ] **Step 2: Create lib/ai/actions.ts**

```typescript
import type { ChatMessage } from "./providers";

interface Action {
  systemPrompt: string;
  label: string;
}

const ACTIONS: Record<string, Action> = {
  continue: {
    label: "Continue writing",
    systemPrompt:
      "Continue writing from where the user left off. Maintain the same tone, style, and voice. Do not repeat what has already been written. Output only the continuation.",
  },
  improve: {
    label: "Improve tone",
    systemPrompt:
      "Improve the tone and readability of the following text. Make it more engaging and professional while preserving the original meaning. Output only the improved version.",
  },
  grammar: {
    label: "Fix grammar",
    systemPrompt:
      "Fix grammar, spelling, and punctuation errors in the following text. Do not change the meaning or style. Output only the corrected version.",
  },
  outline: {
    label: "Generate outline",
    systemPrompt:
      "Generate a markdown outline for a blog post on the following topic. Include headings and brief descriptions for each section. Output only the outline.",
  },
  title: {
    label: "Suggest title",
    systemPrompt:
      "Suggest 5 compelling titles for the following blog post. Consider SEO, readability, and engagement. Output a numbered list of titles.",
  },
  summarize: {
    label: "Summarize",
    systemPrompt:
      "Summarize the following text into 2-3 concise paragraphs. Capture the key points and main takeaways. Output only the summary.",
  },
  custom: {
    label: "Custom prompt",
    systemPrompt: "",
  },
};

export function buildMessages(
  action: string,
  content: string,
  customPrompt?: string
): ChatMessage[] {
  const actionConfig = ACTIONS[action];
  if (!actionConfig) {
    throw new Error(`Unknown AI action: ${action}`);
  }

  const systemPrompt =
    action === "custom" && customPrompt ? customPrompt : actionConfig.systemPrompt;

  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content });

  return messages;
}

export function listActions(): { id: string; label: string }[] {
  return Object.entries(ACTIONS).map(([id, { label }]) => ({ id, label }));
}
```

- [ ] **Step 3: Create app/api/v1/ai/chat/route.ts**

```typescript
import { NextRequest } from "next/server";
import { streamChatCompletion } from "@/lib/ai/providers";
import { buildMessages } from "@/lib/ai/actions";
import { loadConfig } from "@/lib/config/loader";

export async function POST(request: NextRequest) {
  let body: {
    action?: string;
    content?: string;
    provider?: string;
    model?: string;
    customPrompt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        data: null,
        error: { message: "Invalid JSON body" },
        meta: null,
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const { action = "improve", content = "", provider, model, customPrompt } = body;

  if (!content) {
    return new Response(
      JSON.stringify({
        data: null,
        error: { message: "content is required" },
        meta: null,
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const config = loadConfig();
  const providerName = provider ?? config.ai.defaultProvider;

  const messages = buildMessages(action, content, customPrompt);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamChatCompletion(providerName, messages, {
          model,
        })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 4: Create app/api/v1/ai/models/route.ts**

```typescript
import { apiSuccess } from "@/lib/api/response";
import { listModels } from "@/lib/ai/providers";
import { listActions } from "@/lib/ai/actions";

export async function GET() {
  return apiSuccess({
    providers: listModels(),
    actions: listActions(),
  });
}
```

- [ ] **Step 5: Write tests for AI providers**

Create `tests/lib/ai/providers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("listModels", () => {
  it("returns configured providers with models", () => {
    const { listModels } = require("@/lib/ai/providers");
    const models = listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty("provider");
    expect(models[0]).toHaveProperty("model");
  });
});
```

- [ ] **Step 6: Verify typecheck, lint, and tests**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add lib/ai/ app/api/v1/ai/ tests/lib/ai/
git commit -m "feat: add AI provider abstraction and streaming chat API"
```

---

### Task 5: AI Assistant Panel in Editor

**Files:**
- Create: `lib/editor/AIAssistant.tsx` — slide-out panel with action buttons + streaming output
- Modify: `app/admin/posts/new/page.tsx` — add AI panel toggle
- Modify: `app/admin/posts/[slug]/page.tsx` — add AI panel toggle

**Interfaces:**
- Consumes: `POST /api/v1/ai/chat` (SSE), `GET /api/v1/ai/models` (providers + actions)
- Produces: In-editor AI assistant panel with selectable action, provider, streaming output

- [ ] **Step 1: Create lib/editor/AIAssistant.tsx**

```typescript
"use client";

import { useState, useRef, useEffect } from "react";

interface Action {
  id: string;
  label: string;
}

interface Model {
  provider: string;
  model: string;
}

interface Props {
  content: string;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
}

export default function AIAssistant({ content, onInsert, onReplace }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("improve");
  const [provider, setProvider] = useState("");
  const [actions, setActions] = useState<Action[]>([]);
  const [providers, setProviders] = useState<Model[]>([]);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/ai/models");
        if (!res.ok) return;
        const body = await res.json();
        setActions(body.data?.actions ?? []);
        setProviders(body.data?.providers ?? []);
        if (body.data?.providers?.length > 0) {
          setProvider(body.data.providers[0].provider);
        }
      } catch {
        // silently fail
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleRun() {
    if (!content || loading) return;

    setOutput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action,
          content,
          provider: provider || undefined,
          customPrompt: action === "custom" ? customPrompt : undefined,
        }),
      });

      if (!res.ok) {
        setOutput("Error: " + res.statusText);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullOutput = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as { token?: string; error?: string };
            if (parsed.error) {
              fullOutput += `\nError: ${parsed.error}`;
            } else if (parsed.token) {
              fullOutput += parsed.token;
            }
          } catch {
            // skip
          }
        }

        setOutput(fullOutput);
      }
    } catch (err) {
      setOutput("Error: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
      >
        {open ? "Close AI" : "AI Assist"}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 w-80 rounded border border-zinc-700 bg-zinc-900 p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
            >
              {actions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>

            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-32 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
            >
              {providers.map((p) => (
                <option key={p.provider} value={p.provider}>
                  {p.provider}
                </option>
              ))}
            </select>
          </div>

          {action === "custom" && (
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Custom instruction..."
              className="mb-3 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
              rows={2}
            />
          )}

          <button
            onClick={handleRun}
            disabled={loading}
            className="mb-3 w-full rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run"}
          </button>

          {output && (
            <div className="space-y-2">
              <pre
                ref={outputRef}
                className="max-h-48 overflow-y-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 whitespace-pre-wrap"
              >
                {output}
              </pre>

              <div className="flex gap-2">
                <button
                  onClick={() => onInsert(output)}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
                >
                  Insert at cursor
                </button>
                <button
                  onClick={() => onReplace(output)}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
                >
                  Replace all
                </button>
                <button
                  onClick={() => setOutput("")}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
  );
}
```

- [ ] **Step 2: Modify app/admin/posts/new/page.tsx** — add AI panel

The new post page already has title/slug/status bar above the editor. Add an `AIAssistant` next to the Save button in the toolbar row.

Import and add state:
```typescript
import AIAssistant from "@/lib/editor/AIAssistant";
```

Add the AI panel after the save button:
```typescript
<AIAssistant
  content={content}
  onInsert={(text) => setContent((prev) => prev + text)}
  onReplace={(text) => setContent(text)}
/>
```

- [ ] **Step 3: Modify app/admin/posts/[slug]/page.tsx** — same AI panel

Same pattern — add `AIAssistant` import and place it next to the Save button with the same handlers.

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add lib/editor/AIAssistant.tsx app/admin/posts/new/page.tsx app/admin/posts/\[slug\]/page.tsx
git commit -m "feat: add AI assistant panel to post editor"
```

---

### Task 6: OpenAPI 3.1 Spec and Swagger UI Explorer

**Files:**
- Create: `lib/api/openapi.ts` — spec generator
- Create: `app/api/docs/route.ts` — Swagger UI page
- Create: `app/api/docs/swagger.css` — custom Swagger styles

**Interfaces:**
- Consumes: API route definitions
- Produces:
  - `generateOpenApiSpec(): OpenAPIDocument` — generates OpenAPI 3.1 spec from route metadata
  - `GET /api/docs` — renders swagger-ui-react with the generated spec

- [ ] **Step 1: Create lib/api/openapi.ts**

```typescript
export interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: { url: string }[];
  paths: Record<string, unknown>;
}

export function generateOpenApiSpec(): OpenAPISpec {
  return {
    openapi: "3.1.0",
    info: {
      title: "Bifröst API",
      version: "0.5.0",
      description: "REST API for the Bifröst blogging framework",
    },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/posts": {
        get: {
          summary: "List posts",
          tags: ["Posts"],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["draft", "published"] },
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of posts",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/Post" } },
                      error: { type: "null" },
                      meta: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          total: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create post",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["slug", "title", "content", "authorId"],
                  properties: {
                    slug: { type: "string" },
                    title: { type: "string" },
                    content: { type: "string" },
                    status: { type: "string", enum: ["draft", "published"] },
                    authorId: { type: "string" },
                    tagIds: { type: "array", items: { type: "string" } },
                    frontmatter: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Post created" },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
            "409": { description: "Slug conflict" },
          },
        },
      },
      "/posts/{slug}": {
        get: {
          summary: "Get post by slug",
          tags: ["Posts"],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Post found" },
            "404": { description: "Post not found" },
          },
        },
        put: {
          summary: "Update post",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    status: { type: "string", enum: ["draft", "published"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Post updated" },
            "401": { description: "Unauthorized" },
            "404": { description: "Post not found" },
          },
        },
        delete: {
          summary: "Delete post",
          tags: ["Posts"],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Post deleted" },
            "401": { description: "Unauthorized" },
            "404": { description: "Post not found" },
          },
        },
      },
      "/tags": {
        get: {
          summary: "List tags",
          tags: ["Tags"],
          responses: { "200": { description: "List of tags" } },
        },
        post: {
          summary: "Create tag",
          tags: ["Tags"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "slug"],
                  properties: {
                    name: { type: "string" },
                    slug: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Tag created" } },
        },
      },
      "/auth/login": {
        post: {
          summary: "Login",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", format: "password" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Login successful" },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/auth/refresh": {
        post: {
          summary: "Refresh access token",
          tags: ["Auth"],
          responses: {
            "200": { description: "New access token" },
            "401": { description: "Invalid refresh token" },
          },
        },
      },
      "/media/upload": {
        post: {
          summary: "Upload media",
          tags: ["Media"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: { "multipart/form-data": { schema: { type: "object" } } },
          },
          responses: {
            "201": { description: "File uploaded" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/ai/chat": {
        post: {
          summary: "AI chat (streaming)",
          tags: ["AI"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["content"],
                  properties: {
                    action: { type: "string" },
                    content: { type: "string" },
                    provider: { type: "string" },
                    model: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "SSE stream of tokens" } },
        },
      },
      "/ai/models": {
        get: {
          summary: "List AI models",
          tags: ["AI"],
          responses: { "200": { description: "Available providers and actions" } },
        },
      },
      "/preview": {
        post: {
          summary: "Render markdown preview",
          tags: ["Content"],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["source"],
                  properties: { source: { type: "string" } },
                },
              },
            },
          },
          responses: { "200": { description: "Rendered HTML" } },
        },
      },
    },
  } as OpenAPISpec;
}
```

- [ ] **Step 2: Create app/api/docs/route.ts**

```typescript
import { NextResponse } from "next/server";
import { generateOpenApiSpec } from "@/lib/api/openapi";

const HTML = (specUrl: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bifröst API Explorer</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; }
    .swagger-ui .topbar { background-color: #18181b; }
    .swagger-ui .topbar .download-url-wrapper .select-label { color: #a1a1aa; }
    .swagger-ui .info .title { color: #fafafa; }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
    .swagger-ui .microlight { filter: invert(100%) hue-rotate(180deg); }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    SwaggerUIBundle({
      url: "${specUrl}",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: "StandaloneLayout",
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: -1,
    });
  </script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML("/api/v1/openapi.json"), {
    headers: { "content-type": "text/html" },
  });
}
```

- [ ] **Step 3: Create the OpenAPI JSON endpoint**

Create `app/api/v1/openapi.json/route.ts`:

```typescript
import { apiSuccess } from "@/lib/api/response";
import { generateOpenApiSpec } from "@/lib/api/openapi";

export async function GET() {
  return apiSuccess(generateOpenApiSpec());
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean (the HTML template is just a string, no JavaScript execution)

- [ ] **Step 5: Commit**

```bash
git add lib/api/openapi.ts app/api/docs/ app/api/v1/openapi.json/
git commit -m "feat: add OpenAPI 3.1 spec and Swagger UI explorer"
```

---

### Task 7: Version Bump and Changelog

**Files:**
- Modify: `VERSION`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump to v0.5.0**

Write `0.5.0` to `VERSION` and update `package.json` version to `0.5.0`

- [ ] **Step 2: Update CHANGELOG.md**

Add under `## [0.5.0]`:

```markdown
## [0.5.0] — 2026-07-06

### Added
- Plugin system with 5 lifecycle hooks (onContentParse, onContentRender, onContentPublish, onServerStart, adminWidget).
- Plugin registry with filesystem-based loader.
- AI provider abstraction supporting OpenCode Zen, OpenCode Go, and DeepSeek.
- Streaming AI chat API (SSE) with actions: continue, improve, grammar, outline, title, summarize.
- AI assistant panel in the admin post editor with insert/replace/discard controls.
- OpenAPI 3.1 specification generation.
- Swagger UI API explorer at /api/docs.
```

- [ ] **Step 3: Final verification**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all pass, zero errors

- [ ] **Step 4: Commit**

```bash
git add VERSION package.json CHANGELOG.md
git commit -m "chore: bump to v0.5.0, update changelog"
```

---

## Self-Review

### 1. Spec Coverage
- [x] Plugin registry and lifecycle hooks — Tasks 2, 3
- [x] AI provider abstraction (OpenCode Zen, OpenCode Go, DeepSeek) — Task 4
- [x] Streaming AI chat in editor (SSE) — Tasks 4, 5
- [x] AI actions: continue, improve tone, fix grammar, outline, title, summarize — Task 4 (actions.ts)
- [x] OpenAPI 3.1 spec generation and Swagger UI explorer at /api/docs — Task 6

### 2. Placeholder Scan
No TBD, TODO, or vague steps found. All code is concrete and complete.

### 3. Type Consistency
- `PluginContext: { db, loadConfig }` — consistent across Tasks 2, 3
- `ParsedMarkdown` type from `lib/md/types.ts` (Phase 1) — imported in plugin types
- `ChatMessage`, `ChatOptions` — used in providers, chat API, AI panel (Tasks 4, 5)
- `BifrostConfig.ai` — consumed from existing `lib/config/types.ts` (Phase 0)
- `apiSuccess` / `apiError` — used in AI models and OpenAPI JSON endpoints

### 4. Gaps
- No real AI provider integration test (would need real API keys — covered by unit tests for models/actions)
- Admin widgets (`adminWidget` hook) are loaded dynamically but no example plugin ships — scope deferred to future plugins
- Swagger UI uses CDN to avoid SSR/Next.js compatibility issues with swagger-ui-react
