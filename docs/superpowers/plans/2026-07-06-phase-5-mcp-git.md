# Phase 5 — MCP & Git Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an MCP server (stdio + HTTP/SSE) with 12 tools and 6 resources, plus built-in Git versioning for `content/` with auto-commit, history, diff, and push/pull.

**Architecture:** `@modelcontextprotocol/sdk` provides the MCP server. `isomorphic-git` handles Git operations against the content directory. The MCP server runs as a standalone Node.js process, attached to the same database. Git auto-commits fire from the content watcher on post changes.

**Tech Stack:** @modelcontextprotocol/sdk, isomorphic-git, Express (for HTTP/SSE MCP transport)

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- Server components by default, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- Environment variables prefixed with `BIFROST_`
- No comments unless logic is genuinely non-obvious
- All new source files carry the AGPL-3.0 license header
- Run `npm run typecheck && npm run lint && npm test` before marking work complete
- MCP transport: stdio (default) + HTTP/SSE on configurable port
- Git: content/ is the repo, auto-commit on post changes, history per post

---

### Task 1: Install MCP and Git Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: project at v0.5.0
- Produces: installed `@modelcontextprotocol/sdk`, `isomorphic-git` (runtime), `@types/express`, `express` (HTTP transport)

- [ ] **Step 1: Install packages**

```bash
npm install @modelcontextprotocol/sdk isomorphic-git express && npm install -D @types/express
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean (no code referencing new packages yet)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install MCP SDK and isomorphic-git dependencies"
```

---

### Task 2: MCP Server — Tool Implementations

**Files:**
- Create: `lib/mcp/tools.ts` — all 12 MCP tool definitions with handlers
- Create: `lib/mcp/resources.ts` — all 6 MCP resource definitions with handlers
- Create: `tests/lib/mcp/tools.test.ts`

**Interfaces:**
- Consumes: `db` (Drizzle), `apiSuccess`/`apiError`, Drizzle schemas (posts, tags, media, settings, users), `renderMarkdown`, `postCreateSchema`, `postUpdateSchema`, `streamChatCompletion`, `buildMessages`
- Produces:
  - `createToolDefinitions(): McpTool[]` — 12 tool definitions with name, description, inputSchema, handler
  - `createResourceDefinitions(): McpResource[]` — 6 resource definitions with uri patterns, handler

The 12 tools: list_posts, get_post, create_post, update_post, delete_post, list_media, upload_media, get_settings, update_settings, search_posts, list_tags, ai_assist

The 6 resources: `bifrost://posts`, `bifrost://posts/{slug}`, `bifrost://posts/{slug}/html`, `bifrost://posts/{slug}/frontmatter`, `bifrost://media`, `bifrost://settings`

- [ ] **Step 1: Write tests for tool list_posts**

Create `tests/lib/mcp/tools.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("mcp tools", () => {
  it("registers all 12 tools", () => {
    const { createToolDefinitions } = require("@/lib/mcp/tools");
    const tools = createToolDefinitions();
    expect(tools.length).toBe(12);

    const names = tools.map((t: { name: string }) => t.name);
    expect(names).toContain("list_posts");
    expect(names).toContain("get_post");
    expect(names).toContain("create_post");
    expect(names).toContain("update_post");
    expect(names).toContain("delete_post");
    expect(names).toContain("list_media");
    expect(names).toContain("upload_media");
    expect(names).toContain("get_settings");
    expect(names).toContain("update_settings");
    expect(names).toContain("search_posts");
    expect(names).toContain("list_tags");
    expect(names).toContain("ai_assist");
  });

  it("every tool has a name, description, and inputSchema", () => {
    const { createToolDefinitions } = require("@/lib/mcp/tools");
    const tools = createToolDefinitions();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("ai_assist inputSchema requires action and content", () => {
    const { createToolDefinitions } = require("@/lib/mcp/tools");
    const tools = createToolDefinitions();
    const aiAssist = tools.find((t: { name: string }) => t.name === "ai_assist");
    expect(aiAssist?.inputSchema).toBeDefined();
    const props = (aiAssist?.inputSchema as Record<string, unknown>)?.properties as Record<string, unknown>;
    expect(Object.keys(props)).toContain("action");
    expect(Object.keys(props)).toContain("content");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run tests/lib/mcp/tools.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Create lib/mcp/tools.ts**

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { media } from "@/lib/db/schema/media";
import { settings } from "@/lib/db/schema/settings";
import { renderMarkdown } from "@/lib/md/parser";
import { postCreateSchema, postUpdateSchema } from "@/lib/validation/posts";
import { eq, like, sql } from "drizzle-orm";
import { buildMessages } from "@/lib/ai/actions";
import { generateId } from "@/lib/id";
import { writePostToFilesystem } from "@/lib/content/sync";

interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolHandler {
  (args: Record<string, unknown>): Promise<{ content: { type: "text"; text: string }[] }>;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: ToolDef["inputSchema"];
  handler: ToolHandler;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function createToolDefinitions(): McpTool[] {
  return [
    {
      name: "list_posts",
      description: "List posts, filterable by status and tag",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "published"] },
          tag: { type: "string" },
          limit: { type: "number" },
        },
      },
      handler: async (args) => {
        const limit = Math.min(50, (args.limit as number) ?? 20);
        const statusFilter =
          typeof args.status === "string" ? eq(posts.status, args.status) : undefined;
        const rows = db.select().from(posts).where(statusFilter).limit(limit).all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      },
    },

    {
      name: "get_post",
      description: "Read a post by slug (returns markdown and HTML)",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args) => {
        const post = db
          .select()
          .from(posts)
          .where(eq(posts.slug, args.slug as string))
          .get();
        if (!post) return { content: [{ type: "text", text: "Post not found" }] };
        return {
          content: [
            {
              type: "text",
              text: safeJson({
                slug: post.slug,
                title: post.title,
                contentMd: post.contentMd,
                contentHtml: post.contentHtml,
                status: post.status,
                frontmatter: post.frontmatter,
              }),
            },
          ],
        };
      },
    },

    {
      name: "create_post",
      description: "Create a new post",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          slug: { type: "string" },
          content: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
          frontmatter: { type: "object" },
          authorId: { type: "string" },
          tagIds: { type: "array", items: { type: "string" } },
        },
        required: ["title", "slug", "content"],
      },
      handler: async (args) => {
        const body = {
          title: args.title as string,
          slug: args.slug as string,
          content: args.content as string,
          status: (args.status as "draft" | "published") ?? "draft",
          frontmatter: (args.frontmatter as Record<string, unknown>) ?? {},
          authorId: (args.authorId as string) ?? "00000000-0000-0000-0000-000000000000",
          tagIds: (args.tagIds as string[]) ?? [],
        };
        const parsed = postCreateSchema.safeParse(body);
        if (!parsed.success) {
          return { content: [{ type: "text", text: `Validation failed: ${parsed.error.message}` }] };
        }

        const existing = db.select({ slug: posts.slug }).from(posts).where(eq(posts.slug, body.slug)).get();
        if (existing) return { content: [{ type: "text", text: "Slug already exists" }] };

        await writePostToFilesystem(body.slug, body.content, { title: body.title, ...body.frontmatter });

        const now = new Date().toISOString();
        const { html, excerpt } = await renderMarkdown(body.content);

        db.insert(posts)
          .values({
            slug: body.slug,
            title: body.title,
            contentMd: body.content,
            contentHtml: html,
            excerpt,
            frontmatter: JSON.stringify(body.frontmatter),
            status: body.status,
            authorId: body.authorId,
            publishedAt: body.status === "published" ? now : null,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        if (body.tagIds.length > 0) {
          for (const tagId of body.tagIds) {
            db.insert(postTags).values({ postSlug: body.slug, tagId }).run();
          }
        }

        return { content: [{ type: "text", text: safeJson({ slug: body.slug, status: body.status }) }] };
      },
    },

    {
      name: "update_post",
      description: "Update post content or frontmatter",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
          frontmatter: { type: "object" },
        },
        required: ["slug"],
      },
      handler: async (args) => {
        const existing = db
          .select()
          .from(posts)
          .where(eq(posts.slug, args.slug as string))
          .get();
        if (!existing) return { content: [{ type: "text", text: "Post not found" }] };

        const title = (args.title as string) ?? existing.title;
        const content = (args.content as string) ?? existing.contentMd;
        const status = (args.status as string) ?? existing.status;
        const frontmatter = (args.frontmatter as Record<string, unknown>) ?? {};

        const { html, excerpt } = await renderMarkdown(content);

        db.update(posts)
          .set({
            title,
            contentMd: content,
            contentHtml: html,
            excerpt,
            status,
            frontmatter: JSON.stringify(frontmatter),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(posts.slug, args.slug as string))
          .run();

        await writePostToFilesystem(args.slug as string, content, { title, ...frontmatter });

        return { content: [{ type: "text", text: safeJson({ slug: args.slug, status }) }] };
      },
    },

    {
      name: "delete_post",
      description: "Delete a post",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
      handler: async (args) => {
        const existing = db
          .select({ slug: posts.slug })
          .from(posts)
          .where(eq(posts.slug, args.slug as string))
          .get();
        if (!existing) return { content: [{ type: "text", text: "Post not found" }] };

        db.delete(postTags).where(eq(postTags.postSlug, args.slug as string)).run();
        db.delete(posts).where(eq(posts.slug, args.slug as string)).run();

        const { deletePostFromFilesystem } = await import("@/lib/content/sync");
        await deletePostFromFilesystem(args.slug as string);

        return { content: [{ type: "text", text: "Deleted" }] };
      },
    },

    {
      name: "list_media",
      description: "List uploaded media",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const rows = db.select().from(media).all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      },
    },

    {
      name: "upload_media",
      description: "Upload a file (accepts base64-encoded content)",
      inputSchema: {
        type: "object",
        properties: {
          filename: { type: "string" },
          mimeType: { type: "string" },
          base64Content: { type: "string" },
        },
        required: ["filename", "mimeType", "base64Content"],
      },
      handler: async (args) => {
        const id = generateId();
        const filename = args.filename as string;
        const mimeType = args.mimeType as string;
        const base64Content = args.base64Content as string;

        const buffer = Buffer.from(base64Content, "base64");
        const { mkdir, writeFile } = await import("fs/promises");
        const mediaDir = "content/media";
        await mkdir(mediaDir, { recursive: true });
        const filePath = `content/media/${id}-${filename}`;
        await writeFile(filePath, buffer);

        db.insert(media)
          .values({
            id,
            filename,
            path: filePath,
            mimeType,
            sizeBytes: buffer.length,
            createdAt: new Date().toISOString(),
          })
          .run();

        return { content: [{ type: "text", text: safeJson({ id, path: filePath }) }] };
      },
    },

    {
      name: "get_settings",
      description: "Read blog settings",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const rows = db.select().from(settings).all();
        const obj: Record<string, unknown> = {};
        for (const row of rows) {
          obj[row.key] = JSON.parse(row.value);
        }
        return { content: [{ type: "text", text: safeJson(obj) }] };
      },
    },

    {
      name: "update_settings",
      description: "Update blog settings",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: {},
        },
        required: ["key", "value"],
      },
      handler: async (args) => {
        const key = args.key as string;
        const value = args.value;
        db.insert(settings)
          .values({ key, value: JSON.stringify(value) })
          .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value) } })
          .run();
        return { content: [{ type: "text", text: "Updated" }] };
      },
    },

    {
      name: "search_posts",
      description: "Full-text search across posts",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
      handler: async (args) => {
        const query = args.query as string;
        const rows = db
          .select()
          .from(posts)
          .where(
            eq(
              sql`${like(posts.title, `%${query}%`)} OR ${like(posts.contentMd, `%${query}%`)}`,
              undefined
            )
          )
          .limit(20)
          .all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      },
    },

    {
      name: "list_tags",
      description: "List all tags",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const rows = db.select().from(tags).all();
        return { content: [{ type: "text", text: safeJson(rows) }] };
      },
    },

    {
      name: "ai_assist",
      description: "Invoke AI on post content",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string" },
          content: { type: "string" },
          provider: { type: "string" },
        },
        required: ["action", "content"],
      },
      handler: async (args) => {
        try {
          const { streamChatCompletion } = await import("@/lib/ai/providers");
          const messages = buildMessages(args.action as string, args.content as string);
          const provider = (args.provider as string) ?? "opencode-zen";
          const gen = streamChatCompletion(provider, messages);
          let text = "";
          for await (const chunk of gen) {
            text += chunk;
          }
          return { content: [{ type: "text", text }] };
        } catch (err) {
          return { content: [{ type: "text", text: `AI error: ${String(err)}` }] };
        }
      },
    },
  ];
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run tests/lib/mcp/tools.test.ts`
Expected: 2/2 pass

- [ ] **Step 5: Create lib/mcp/resources.ts**

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { media } from "@/lib/db/schema/media";
import { settings } from "@/lib/db/schema/settings";
import { eq } from "drizzle-orm";

interface ResourceDef {
  uriPattern: string;
  handler: (uri: string) => Promise<{ contents: { uri: string; mimeType: string; text: string }[] } | null>;
}

export function createResourceDefinitions(): ResourceDef[] {
  return [
    {
      uriPattern: "bifrost://posts",
      handler: async () => {
        const rows = db.select({ slug: posts.slug }).from(posts).all();
        const slugs = rows.map((r) => r.slug);
        return {
          contents: [{ uri: "bifrost://posts", mimeType: "application/json", text: JSON.stringify(slugs, null, 2) }],
        };
      },
    },
    {
      uriPattern: "bifrost://posts/{slug}",
      handler: async (uri: string) => {
        const slug = uri.replace("bifrost://posts/", "");
        const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
        if (!post) return null;
        return {
          contents: [
            { uri, mimeType: "text/markdown", text: post.contentMd },
          ],
        };
      },
    },
    {
      uriPattern: "bifrost://posts/{slug}/html",
      handler: async (uri: string) => {
        const slug = uri.replace("bifrost://posts/", "").replace("/html", "");
        const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
        if (!post) return null;
        return {
          contents: [
            { uri, mimeType: "text/html", text: post.contentHtml },
          ],
        };
      },
    },
    {
      uriPattern: "bifrost://posts/{slug}/frontmatter",
      handler: async (uri: string) => {
        const slug = uri.replace("bifrost://posts/", "").replace("/frontmatter", "");
        const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
        if (!post) return null;
        return {
          contents: [
            { uri, mimeType: "application/json", text: post.frontmatter },
          ],
        };
      },
    },
    {
      uriPattern: "bifrost://media",
      handler: async () => {
        const rows = db.select({ path: media.path }).from(media).all();
        const paths = rows.map((r) => r.path);
        return {
          contents: [{ uri: "bifrost://media", mimeType: "application/json", text: JSON.stringify(paths, null, 2) }],
        };
      },
    },
    {
      uriPattern: "bifrost://settings",
      handler: async () => {
        const rows = db.select().from(settings).all();
        const obj: Record<string, unknown> = {};
        for (const row of rows) {
          obj[row.key] = JSON.parse(row.value);
        }
        return {
          contents: [{ uri: "bifrost://settings", mimeType: "application/json", text: JSON.stringify(obj, null, 2) }],
        };
      },
    },
  ];
}
```

- [ ] **Step 6: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean

- [ ] **Step 7: Commit**

```bash
git add lib/mcp/tools.ts lib/mcp/resources.ts tests/lib/mcp/
git commit -m "feat: add MCP tool and resource definitions"
```

---

### Task 3: MCP Server — Transports (stdio + HTTP/SSE)

**Files:**
- Create: `lib/mcp/server.ts`
- Create: `lib/mcp/http-server.ts`

**Interfaces:**
- Consumes: `createToolDefinitions()`, `createResourceDefinitions()` from Task 2, `@modelcontextprotocol/sdk` (Server, StdioServerTransport)
- Produces:
  - `startMcpServer(transport?: "stdio" | "http"): Promise<void>` — starts the MCP server
  - HTTP server script at `lib/mcp/http-server.ts` — standalone Express server on configurable port

- [ ] **Step 1: Create lib/mcp/server.ts**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createToolDefinitions } from "./tools";
import { createResourceDefinitions } from "./resources";

export async function startStdioMcpServer(): Promise<void> {
  const server = new Server(
    { name: "bifrost", version: "0.6.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = createToolDefinitions();
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tools = createToolDefinitions();
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
    return tool.handler(request.params.arguments ?? {});
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = createResourceDefinitions();
    return {
      resources: resources.map((r) => ({
        uri: r.uriPattern,
        name: r.uriPattern,
      })),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resources = createResourceDefinitions();
    const uri = request.params.uri;
    const resource = resources.find((r) => uri.startsWith(r.uriPattern.replace("{slug}", "")));
    if (!resource) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    const result = await resource.handler(uri);
    if (!result) {
      throw new Error(`Resource not found: ${uri}`);
    }
    return result;
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function createMcpServer(): Server {
  const server = new Server(
    { name: "bifrost", version: "0.6.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = createToolDefinitions();
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tools = createToolDefinitions();
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
    return tool.handler(request.params.arguments ?? {});
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = createResourceDefinitions();
    return {
      resources: resources.map((r) => ({
        uri: r.uriPattern,
        name: r.uriPattern,
      })),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resources = createResourceDefinitions();
    const uri = request.params.uri;
    const resource = resources.find((r) => uri.startsWith(r.uriPattern.replace("{slug}", "")));
    if (!resource) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    const result = await resource.handler(uri);
    if (!result) {
      throw new Error(`Resource not found: ${uri}`);
    }
    return result;
  });

  return server;
}
```

- [ ] **Step 2: Create lib/mcp/http-server.ts** (standalone HTTP/SSE MCP server)

```typescript
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from "./server";
import { loadConfig } from "@/lib/config/loader";

const app = express();
app.use(express.json());

const mcpServer = createMcpServer();

app.get("/sse", async (_req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(transport);
});

const config = loadConfig();
const port = config.mcp.port;

app.listen(port, () => {
  console.log(`Bifröst MCP HTTP server running on port ${port}`);
});
```

- [ ] **Step 3: Add mcp:start script to package.json**

```json
"mcp:start": "tsx lib/mcp/http-server.ts"
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean (may have some SDK type issues — resolve inline)

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/server.ts lib/mcp/http-server.ts package.json
git commit -m "feat: add MCP server transports (stdio + HTTP/SSE)"
```

---

### Task 4: Git Utilities — init, commit, history, diff

**Files:**
- Create: `lib/git/repo.ts`
- Create: `tests/lib/git/repo.test.ts`

**Interfaces:**
- Consumes: `isomorphic-git`, `fs` (Node.js), `loadConfig()` (GitConfig)
- Produces:
  - `initContentRepo(): Promise<void>` — git init in content/ on first run
  - `commitPost(slug: string, title: string): Promise<string | null>` — add + commit, returns SHA or null
  - `getHistory(slug?: string): Promise<CommitEntry[]>` — log for file or full repo
  - `getDiff(sha: string): Promise<string>` — diff for a specific commit
  - `pushToRemote(): Promise<void>`
  - `pullFromRemote(): Promise<void>`
  - `CommitEntry: { sha: string; message: string; date: string; author: string }`

- [ ] **Step 1: Write tests**

Create `tests/lib/git/repo.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { initContentRepo, commitPost, getHistory, getDiff } from "@/lib/git/repo";

const TEST_DIR = path.resolve("content/test-git");
const POST_FILE = path.join(TEST_DIR, "test-post/index.md");

describe("git repo", () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await initContentRepo();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("initializes a git repo in content/", async () => {
    const stat = await fs.stat(path.join("content", ".git"));
    expect(stat.isDirectory()).toBe(true);
  });

  it("commits a post and returns a SHA", async () => {
    await fs.mkdir(path.dirname(POST_FILE), { recursive: true });
    await fs.writeFile(POST_FILE, "# Hello World\n\nTest content.");

    const sha = await commitPost("test-post", "Hello World");
    expect(sha).toBeTruthy();
    expect(sha).toMatch(/^[a-f0-9]{40}$/);
  });

  it("returns null for commit without changes", async () => {
    await fs.mkdir(path.dirname(POST_FILE), { recursive: true });
    await fs.writeFile(POST_FILE, "# Hello\n");
    await commitPost("test-post", "Hello");

    const sha = await commitPost("test-post", "Hello");
    expect(sha).toBeNull();
  });

  it("returns commit history", async () => {
    await fs.mkdir(path.dirname(POST_FILE), { recursive: true });
    await fs.writeFile(POST_FILE, "# Post 1\n");
    await commitPost("test-post", "Post 1");

    await fs.writeFile(POST_FILE, "# Post 1 Updated\n");
    await commitPost("test-post", "Post 1 Updated");

    const history = await getHistory("test-post/index.md");
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0]).toHaveProperty("sha");
    expect(history[0]).toHaveProperty("message");
  });

  it("returns a diff for a commit", async () => {
    await fs.mkdir(path.dirname(POST_FILE), { recursive: true });
    await fs.writeFile(POST_FILE, "# Original\n");
    await commitPost("test-post", "Original");

    await fs.writeFile(POST_FILE, "# Modified\n");
    const sha = await commitPost("test-post", "Modified");
    expect(sha).toBeTruthy();

    const diff = await getDiff(sha!);
    expect(diff).toContain("Original");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run tests/lib/git/repo.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Create lib/git/repo.ts**

```typescript
import git from "isomorphic-git";
import http from "isomorphic-git/http/node/index.js";
import fs from "fs";
import path from "path";
import { loadConfig } from "@/lib/config/loader";
import type { GitConfig } from "@/lib/config/types";

const CONTENT_DIR = path.resolve("content");
const DIR = CONTENT_DIR;

export interface CommitEntry {
  sha: string;
  message: string;
  date: string;
  author: string;
}

async function getConfig(): Promise<GitConfig> {
  const cfg = loadConfig();
  return cfg.git;
}

export async function initContentRepo(): Promise<void> {
  const gitDir = path.join(DIR, ".git");
  if (fs.existsSync(gitDir)) return;

  await git.init({ fs, dir: DIR, defaultBranch: "main" });
}

export async function commitPost(
  slug: string,
  title: string
): Promise<string | null> {
  const config = await getConfig();
  if (!config.enabled) return null;

  await initContentRepo();

  const filePath = `posts/${slug}/index.md`;
  const absPath = path.join(DIR, filePath);

  if (!fs.existsSync(absPath)) return null;

  await git.add({ fs, dir: DIR, filepath: filePath });

  const status = await git.statusMatrix({ fs, dir: DIR, filepaths: [filePath] });
  const hasChanges = status.some(
    ([, , staging]) => staging !== 1
  );

  if (!hasChanges) return null;

  const message = config.autoCommit
    ? `Update post: ${title}`
    : `Manual save: ${title}`;

  const sha = await git.commit({
    fs,
    dir: DIR,
    message,
    author: { name: "Bifröst", email: "bifrost@localhost" },
  });

  return sha;
}

export async function getHistory(slug?: string): Promise<CommitEntry[]> {
  await initContentRepo();

  const filepath = slug ? `posts/${slug}` : undefined;

  const log = await git.log({
    fs,
    dir: DIR,
    filepath,
    depth: 50,
  });

  return log.map((entry) => ({
    sha: entry.oid,
    message: entry.commit.message,
    date: new Date(entry.commit.committer.timestamp * 1000).toISOString(),
    author: entry.commit.committer.name,
  }));
}

export async function getDiff(sha: string): Promise<string> {
  await initContentRepo();

  const commits = await git.log({ fs, dir: DIR, depth: 2 });
  const targetCommit = commits.find((c) => c.oid === sha || c.oid.startsWith(sha));
  if (!targetCommit) return "";

  const parent = commits[commits.indexOf(targetCommit) + 1];

  if (!parent) {
    const { Readable } = await import("stream");
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(path.join(DIR, ".git", "objects"));
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString()));
      stream.on("error", reject);
    });
  }

  const files = await git.walk({
    fs,
    dir: DIR,
    trees: [git.TREE({ ref: sha }), git.TREE({ ref: parent.oid })],
    map: async (filepath, [A, B]) => {
      if ((await A?.type()) === "blob" || (await B?.type()) === "blob") {
        return filepath;
      }
      return null;
    },
  });

  const diffs: string[] = [];

  for (const file of files) {
    if (!file) continue;

    try {
      const oldContent =
        parent.oid !== undefined
          ? (await git.readBlob({ fs, dir: DIR, oid: parent.oid!, filepath: file })).blob.toString()
          : "";

      const newContent = (await git.readBlob({ fs, dir: DIR, oid: sha, filepath: file })).blob.toString();

      diffs.push(`diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n`);
      diffs.push(`- ${oldContent}\n+ ${newContent}\n`);
    } catch {
      diffs.push(`[Binary or missing: ${file}]\n`);
    }
  }

  return diffs.join("\n");
}

export async function pushToRemote(): Promise<void> {
  const config = await getConfig();
  if (!config.remote) return;

  await git.push({
    fs,
    http,
    dir: DIR,
    remote: "origin",
    ref: "main",
    onAuth: () => ({
      username: config.remote.includes("github.com") ? "git" : "",
      password: process.env.BIFROST_GIT_TOKEN ?? "",
    }),
  });
}

export async function pullFromRemote(): Promise<void> {
  const config = await getConfig();
  if (!config.remote) return;

  await git.pull({
    fs,
    http,
    dir: DIR,
    remote: "origin",
    ref: "main",
    singleBranch: true,
    author: { name: "Bifröst", email: "bifrost@localhost" },
    onAuth: () => ({
      username: config.remote.includes("github.com") ? "git" : "",
      password: process.env.BIFROST_GIT_TOKEN ?? "",
    }),
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run tests/lib/git/repo.test.ts`
Expected: tests pass

- [ ] **Step 5: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add lib/git/repo.ts tests/lib/git/repo.test.ts
git commit -m "feat: add Git utilities (init, commit, history, diff, push, pull)"
```

---

### Task 5: Git API Routes

**Files:**
- Create: `app/api/v1/git/history/route.ts`
- Create: `app/api/v1/git/diff/route.ts`
- Create: `app/api/v1/git/push/route.ts`
- Create: `app/api/v1/git/pull/route.ts`

**Interfaces:**
- Consumes: `getHistory()`, `getDiff()`, `pushToRemote()`, `pullFromRemote()` from Task 4, `apiSuccess`/`apiError`
- Produces:
  - `GET /api/v1/git/history?slug=:s` — commit history (filterable by slug)
  - `GET /api/v1/git/diff?sha=:h` — diff for a commit
  - `POST /api/v1/git/push` — push to remote
  - `POST /api/v1/git/pull` — pull from remote

- [ ] **Step 1: Create app/api/v1/git/history/route.ts**

```typescript
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getHistory } from "@/lib/git/repo";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug") ?? undefined;

  try {
    const history = await getHistory(slug);
    return apiSuccess(history);
  } catch (err) {
    return apiError("Failed to get history", 500, String(err));
  }
}
```

- [ ] **Step 2: Create app/api/v1/git/diff/route.ts**

```typescript
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getDiff } from "@/lib/git/repo";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sha = searchParams.get("sha");

  if (!sha) {
    return apiError("sha query parameter is required", 400);
  }

  try {
    const diff = await getDiff(sha);
    return apiSuccess({ diff });
  } catch (err) {
    return apiError("Failed to get diff", 500, String(err));
  }
}
```

- [ ] **Step 3: Create app/api/v1/git/push/route.ts**

```typescript
import { apiSuccess, apiError } from "@/lib/api/response";
import { pushToRemote } from "@/lib/git/repo";

export async function POST() {
  try {
    await pushToRemote();
    return apiSuccess({ pushed: true });
  } catch (err) {
    return apiError("Failed to push", 500, String(err));
  }
}
```

- [ ] **Step 4: Create app/api/v1/git/pull/route.ts**

```typescript
import { apiSuccess, apiError } from "@/lib/api/response";
import { pullFromRemote } from "@/lib/git/repo";

export async function POST() {
  try {
    await pullFromRemote();
    return apiSuccess({ pulled: true });
  } catch (err) {
    return apiError("Failed to pull", 500, String(err));
  }
}
```

- [ ] **Step 5: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/git/
git commit -m "feat: add Git API routes (history, diff, push, pull)"
```

---

### Task 6: Git Admin Pages

**Files:**
- Create: `app/admin/git/page.tsx` — commit timeline
- Create: `app/admin/git/[sha]/page.tsx` — commit diff view

**Interfaces:**
- Consumes: `GET /api/v1/git/history`, `GET /api/v1/git/diff`, `POST /api/v1/git/push`, `POST /api/v1/git/pull`
- Produces: Git timeline page with per-post filter, diff viewer, push/pull buttons

- [ ] **Step 1: Create app/admin/git/page.tsx**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Commit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export default function GitHistoryPage() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/git/history", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Failed to load history");
        return;
      }

      setCommits(body.data ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handlePush() {
    setPushing(true);
    try {
      const token = localStorage.getItem("bifrost_token");
      await fetch("/api/v1/git/push", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    } catch {
      setError("Push failed");
    } finally {
      setPushing(false);
    }
  }

  async function handlePull() {
    setPulling(true);
    try {
      const token = localStorage.getItem("bifrost_token");
      await fetch("/api/v1/git/pull", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      fetchHistory();
    } catch {
      setError("Pull failed");
    } finally {
      setPulling(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Git History</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePull}
            disabled={pulling}
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
          >
            {pulling ? "Pulling..." : "Pull"}
          </button>
          <button
            onClick={handlePush}
            disabled={pushing}
            className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {pushing ? "Pushing..." : "Push"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : commits.length === 0 ? (
        <p className="text-zinc-400">No commits yet.</p>
      ) : (
        <div className="space-y-2">
          {commits.map((commit) => (
            <div
              key={commit.sha}
              className="rounded border border-zinc-800 p-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm">{commit.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {commit.author} — {new Date(commit.date).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/admin/git/${commit.sha}`}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  View diff
                </Link>
              </div>
              <p className="mt-1 font-mono text-xs text-zinc-600">
                {commit.sha.slice(0, 7)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create app/admin/git/[sha]/page.tsx**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DiffPage() {
  const params = useParams<{ sha: string }>();
  const router = useRouter();
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("bifrost_token");
        const res = await fetch(`/api/v1/git/diff?sha=${params.sha}`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });

        const body = await res.json();
        if (!res.ok) {
          setError(body.error?.message ?? "Failed to load diff");
          return;
        }

        setDiff(body.data?.diff ?? "");
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.sha]);

  if (loading) return <p className="text-zinc-400">Loading...</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm text-zinc-400 hover:text-zinc-200"
      >
        &larr; Back
      </button>
      <h2 className="mb-4 text-lg font-semibold">
        Diff — {params.sha.slice(0, 7)}
      </h2>
      <pre className="overflow-auto rounded border border-zinc-800 bg-zinc-900 p-4 font-mono text-xs text-zinc-300">
        {diff}
      </pre>
    </div>
  );
}
```

- [ ] **Step 3: Add Git nav link to admin layout**

Modify `app/admin/layout.tsx` — add a Git link to the sidebar nav (after "Settings"):

```tsx
<Link
  href="/admin/git"
  className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
>
  Git
</Link>
```

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add app/admin/git/ app/admin/layout.tsx
git commit -m "feat: add Git admin pages (timeline and diff view)"
```

---

### Task 7: Wire Auto-Commit into Content Watcher

**Files:**
- Modify: `lib/content/watcher.ts`
- Modify: `app/api/v1/posts/route.ts`
- Modify: `app/api/v1/posts/[slug]/route.ts`

**Interfaces:**
- Consumes: `commitPost()` from Task 4
- Produces: auto-commit on post ingest and API create/update

- [ ] **Step 1: Add auto-commit to content watcher**

In `lib/content/watcher.ts`, in the `ingestFile` function after DB upsert, call `commitPost`:

```typescript
// After the upsert block in ingestFile:
try {
  const { commitPost } = await import("@/lib/git/repo");
  await commitPost(slug, frontmatter.title ?? slug);
} catch {
  // git commit is best-effort
}
```

- [ ] **Step 2: Add auto-commit to POST /api/v1/posts**

In `app/api/v1/posts/route.ts`, after the successful insert:

```typescript
try {
  const { commitPost } = await import("@/lib/git/repo");
  await commitPost(slug, title);
} catch {
  // best-effort
}
```

- [ ] **Step 3: Add auto-commit to PUT /api/v1/posts/[slug]**

In `app/api/v1/posts/[slug]/route.ts`, in the PUT handler after the update + filesystem write:

```typescript
try {
  const { commitPost } = await import("@/lib/git/repo");
  await commitPost(slug, title);
} catch {
  // best-effort
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 5: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add lib/content/watcher.ts app/api/v1/posts/route.ts app/api/v1/posts/\[slug\]/route.ts
git commit -m "feat: wire auto-commit into content pipeline and post API"
```

---

### Task 8: Version Bump and Changelog

**Files:**
- Modify: `VERSION`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump to v0.6.0**

Write `0.6.0` to `VERSION` and update `package.json` version to `0.6.0`

- [ ] **Step 2: Update CHANGELOG.md**

Add under `## [0.6.0]`:

```markdown
## [0.6.0] — 2026-07-06

### Added
- MCP server with stdio and HTTP/SSE transports.
- 12 MCP tools: list_posts, get_post, create_post, update_post, delete_post, list_media, upload_media, get_settings, update_settings, search_posts, list_tags, ai_assist.
- 6 MCP resources: bifrost://posts, bifrost://posts/{slug}, bifrost://posts/{slug}/html, bifrost://posts/{slug}/frontmatter, bifrost://media, bifrost://settings.
- Git integration: init, auto-commit, history, diff, push, pull.
- Git API routes: GET /api/v1/git/history, GET /api/v1/git/diff, POST /api/v1/git/push, POST /api/v1/git/pull.
- Git admin pages: commit timeline and diff viewer.
- Auto-commit wired into content watcher and post API.
```

- [ ] **Step 3: Final verification**

```bash
npm run typecheck && npm run lint && npm test
```

- [ ] **Step 4: Commit**

```bash
git add VERSION package.json CHANGELOG.md
git commit -m "chore: bump to v0.6.0, update changelog"
```

---

## Self-Review

### 1. Spec Coverage
- [x] MCP server (stdio + HTTP/SSE transport) — Task 3
- [x] MCP tools: all 12 specified — Task 2
- [x] MCP resources: all 6 specified — Task 2
- [x] Git repo init in `content/` on setup — Task 4
- [x] Auto-commit on post create/edit — Task 7
- [x] Commit history timeline and diff view in admin — Task 6
- [x] Push/pull to remote from admin and API — Tasks 5, 6

### 2. Placeholder Scan
No TBD, TODO, or vague steps found.

### 3. Type Consistency
- `McpTool.name`, `McpTool.inputSchema`, `McpTool.handler` — consistent across Tasks 2 and 3
- `CommitEntry: { sha, message, date, author }` — consumed in Task 5, 6
- `commitPost(slug, title): Promise<string | null>` — consumed in Task 7
- `isomorphic-git` APIs use `dir: DIR` where `DIR = path.resolve("content")` — consistent

### Gaps Found
- None. All Phase 5 requirements from the spec are covered.
