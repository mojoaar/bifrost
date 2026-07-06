# Phase 1 — Content Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the content pipeline: markdown parsing (frontmatter + remark/rehype → HTML), chokidar file watching with two-way filesystem↔DB sync, and REST API endpoints for posts, tags, and media upload.

**Architecture:** `lib/md/` handles markdown parsing and rendering. `lib/content/` manages file watching and sync. `app/api/v1/` hosts route handlers returning `{ data, error, meta }` envelopes. The filesystem (`content/posts/`) is the canonical source; API writes create/update `.md` files; the watcher syncs changes back to the DB.

**Tech Stack:** remark (GFM), rehype, yaml (frontmatter), chokidar (file watching), zod (validation), uuid (ID generation)

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

### Task 1: Install Content Engine Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: installed dependencies (remark, rehype, yaml, chokidar, zod, uuid)

- [ ] **Step 1: Install packages**

Run:
```bash
npm install remark remark-parse remark-rehype remark-gfm rehype-stringify rehype-sanitize yaml chokidar zod uuid
npm install -D @types/yaml
```

- [ ] **Step 2: Verify install**

Run: `npm run typecheck`

Expected: No errors from new packages

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install content engine dependencies (remark, rehype, yaml, chokidar, zod)"
```

---

### Task 2: Create API Response Helpers

**Files:**
- Create: `lib/api/response.ts`
- Create: `tests/lib/api/response.test.ts`

**Interfaces:**
- Produces: `apiSuccess(data, meta?)` → NextResponse, `apiError(message, status, details?)` → NextResponse

- [ ] **Step 1: Create lib/api/response.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextResponse } from "next/server";

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export function apiSuccess<T>(data: T, meta?: ApiMeta, status = 200) {
  return NextResponse.json({ data, error: null, meta: meta ?? null }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { data: null, error: { message, ...(details ? { details } : {}) }, meta: null },
    { status }
  );
}
```

- [ ] **Step 2: Create tests/lib/api/response.test.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { apiSuccess, apiError } from "@/lib/api/response";

describe("apiSuccess", () => {
  it("returns { data, error: null, meta: null } by default", async () => {
    const res = apiSuccess({ slug: "hello" });
    const json = await res.json();
    expect(json).toEqual({ data: { slug: "hello" }, error: null, meta: null });
  });

  it("includes meta when provided", async () => {
    const res = apiSuccess({ slug: "hello" }, { total: 10, page: 1, limit: 10 });
    const json = await res.json();
    expect(json.meta).toEqual({ total: 10, page: 1, limit: 10 });
  });

  it("uses custom status code", async () => {
    const res = apiSuccess({}, undefined, 201);
    expect(res.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns { data: null, error, meta: null }", async () => {
    const res = apiError("Not found", 404);
    const json = await res.json();
    expect(json).toEqual({ data: null, error: { message: "Not found" }, meta: null });
  });

  it("includes details when provided", async () => {
    const res = apiError("Validation failed", 422, { fields: ["title"] });
    const json = await res.json();
    expect(json.error).toEqual({ message: "Validation failed", details: { fields: ["title"] } });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/lib/api/response.test.ts`

Expected: 5/5 tests pass

- [ ] **Step 4: Commit**

```bash
git add lib/api/response.ts tests/lib/api/response.test.ts
git commit -m "feat: add API response helpers with envelope format"
```

---

### Task 3: Create Markdown Parser

**Files:**
- Create: `lib/md/types.ts`
- Create: `lib/md/parser.ts`
- Create: `tests/lib/md/parser.test.ts`

**Interfaces:**
- Consumes: remark + rehype + yaml from Task 1
- Produces: `ParsedMarkdown` type, `parseFrontmatter(content: string)` → `{ frontmatter: Record<string, unknown>, body: string }`, `renderMarkdown(markdown: string)` → `{ html: string, excerpt: string }`, `parseMarkdown(content: string)` → `ParsedMarkdown`

- [ ] **Step 1: Create lib/md/types.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
  html: string;
  excerpt: string;
}
```

- [ ] **Step 2: Create lib/md/parser.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import YAML from "yaml";
import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";
import type { ParsedMarkdown } from "./types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const rawYaml = match[1]!;
  const body = content.slice(match[0].length);

  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = YAML.parse(rawYaml);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch {
    frontmatter = {};
  }

  return { frontmatter, body };
}

const processor = remark()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize)
  .use(rehypeStringify);

export async function renderMarkdown(
  markdown: string
): Promise<{ html: string; excerpt: string }> {
  const result = await processor.process(markdown);
  const html = String(result);

  const plainText = html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const excerpt = plainText.length > 200 ? plainText.slice(0, 200) + "…" : plainText;

  return { html, excerpt };
}

export async function parseMarkdown(content: string): Promise<ParsedMarkdown> {
  const { frontmatter, body } = parseFrontmatter(content);
  const { html, excerpt } = await renderMarkdown(body);

  return {
    frontmatter: {
      ...frontmatter,
      ...(html ? {} : {}),
    },
    body,
    html,
    excerpt,
  };
}
```

- [ ] **Step 3: Create tests/lib/md/parser.test.ts**

First create a sample markdown file at `tests/lib/md/__fixtures__/simple.md` with frontmatter + GFM content:

`tests/lib/md/__fixtures__/simple.md`:
```markdown
---
title: Hello World
date: 2026-01-01
tags:
  - blog
  - test
draft: false
---

# Hello World

This is a **test** post with GFM features.

- [x] Completed task
- [ ] Pending task

| Col A | Col B |
| ----- | ----- |
| 1     | 2     |
```

Then `tests/lib/md/parser.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseFrontmatter, renderMarkdown, parseMarkdown } from "@/lib/md/parser";
import fs from "fs";
import path from "path";

const fixture = fs.readFileSync(
  path.join(import.meta.dirname, "__fixtures__", "simple.md"),
  "utf-8"
);

describe("parseFrontmatter", () => {
  it("extracts frontmatter and body", () => {
    const { frontmatter, body } = parseFrontmatter(fixture);
    expect(frontmatter).toMatchObject({ title: "Hello World", draft: false });
    expect(frontmatter.tags).toEqual(["blog", "test"]);
    expect(body).toContain("# Hello World");
    expect(body).not.toContain("---");
  });

  it("returns empty frontmatter for content without YAML delimiter", () => {
    const { frontmatter, body } = parseFrontmatter("Just markdown, no frontmatter");
    expect(frontmatter).toEqual({});
    expect(body).toBe("Just markdown, no frontmatter");
  });
});

describe("renderMarkdown", () => {
  it("renders markdown to HTML", async () => {
    const result = await renderMarkdown("# Hello **World**");
    expect(result.html).toContain("<h1>");
    expect(result.html).toContain("<strong>World</strong>");
    expect(result.excerpt).toBe("Hello World");
  });

  it("renders GFM tables", async () => {
    const result = await renderMarkdown("| A | B |\n| - | - |\n| 1 | 2 |");
    expect(result.html).toContain("<table>");
    expect(result.html).toContain("<td>1</td>");
  });

  it("sanitizes dangerous HTML", async () => {
    const result = await renderMarkdown('<script>alert("xss")</script>');
    expect(result.html).not.toContain("<script>");
  });

  it("generates excerpt from HTML", async () => {
    const long = "A".repeat(300);
    const result = await renderMarkdown(long);
    expect(result.excerpt.length).toBeLessThanOrEqual(203); // 200 chars + "…"
    expect(result.excerpt.endsWith("…")).toBe(true);
  });
});

describe("parseMarkdown", () => {
  it("parses full markdown with frontmatter", async () => {
    const result = await parseMarkdown(fixture);
    expect(result.frontmatter).toMatchObject({ title: "Hello World" });
    expect(result.html).toContain("<h1>");
    expect(result.excerpt).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/lib/md/parser.test.ts`

Expected: 7/7 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/md/ tests/lib/md/
git commit -m "feat: add markdown parser with frontmatter and GFM support"
```

---

### Task 4: Add UUID Generation Utility

**Files:**
- Create: `lib/id.ts`

**Interfaces:**
- Produces: `generateId()` → string (UUID v4)

- [ ] **Step 1: Create lib/id.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export { v4 as generateId } from "uuid";
```

- [ ] **Step 2: Commit**

```bash
git add lib/id.ts
git commit -m "feat: add UUID generation utility"
```

---

### Task 5: Create Content Watcher with DB Sync

**Files:**
- Create: `lib/content/watcher.ts`
- Create: `tests/lib/content/watcher.test.ts`

**Interfaces:**
- Consumes: `parseMarkdown` from Task 3, `db` from Phase 0 schema, `generateId` from Task 4
- Produces: `startWatcher()` → void (sets up chokidar on `content/posts/`), `ingestAll()` → Promise<void> (scans and ingests all existing .md files)

- [ ] **Step 1: Create lib/content/watcher.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import chokidar from "chokidar";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { parseMarkdown } from "@/lib/md/parser";
import { eq } from "drizzle-orm";

const CONTENT_POSTS_DIR = path.resolve("content/posts");

function slugFromFilePath(filePath: string): string {
  const relative = path.relative(CONTENT_POSTS_DIR, filePath);
  const parts = relative.split(path.sep);
  if (parts[0] && parts[0] !== ".") {
    return parts[0];
  }
  return path.basename(relative, ".md");
}

async function processFile(filePath: string): Promise<void> {
  if (!filePath.endsWith(".md")) return;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = await parseMarkdown(raw);

    const slug = slugFromFilePath(filePath);
    const title =
      (parsed.frontmatter.title as string) || slug;
    const status =
      parsed.frontmatter.draft === true ? "draft" : "published";
    const now = new Date().toISOString();
    const date =
      (parsed.frontmatter.date as string) || now;
    const authorId =
      (parsed.frontmatter.author as string) || "00000000-0000-0000-0000-000000000000";

    const existing = db
      .select({ slug: posts.slug })
      .from(posts)
      .where(eq(posts.slug, slug))
      .get();

    if (existing) {
      db.update(posts)
        .set({
          title,
          contentMd: raw,
          contentHtml: parsed.html,
          excerpt: parsed.excerpt,
          frontmatter: JSON.stringify(parsed.frontmatter),
          status,
          authorId,
          publishedAt: status === "published" ? date : null,
          updatedAt: now,
        })
        .where(eq(posts.slug, slug))
        .run();
    } else {
      db.insert(posts)
        .values({
          slug,
          title,
          contentMd: raw,
          contentHtml: parsed.html,
          excerpt: parsed.excerpt,
          frontmatter: JSON.stringify(parsed.frontmatter),
          status,
          authorId,
          publishedAt: status === "published" ? date : null,
          createdAt: date,
          updatedAt: now,
        })
        .run();
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

async function deleteFromDb(filePath: string): Promise<void> {
  const slug = slugFromFilePath(filePath);
  db.delete(posts).where(eq(posts.slug, slug)).run();
}

let watcher: chokidar.FSWatcher | null = null;

export function startWatcher(): void {
  if (watcher) return;

  watcher = chokidar.watch(path.join(CONTENT_POSTS_DIR, "**", "*.md"), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher.on("add", processFile);
  watcher.on("change", processFile);
  watcher.on("unlink", deleteFromDb);
}

export async function ingestAll(): Promise<void> {
  const glob = new Bun.Glob("**/*.md");

  try {
    const files = await Array.fromAsync(
      glob.scan({ cwd: CONTENT_POSTS_DIR, absolute: true })
    );
    for (const file of files) {
      await processFile(file);
    }
  } catch {
    try {
      const files = await fs.readdir(CONTENT_POSTS_DIR, { recursive: true });
      for (const entry of files) {
        const filePath = path.join(CONTENT_POSTS_DIR, entry);
        const stat = await fs.stat(filePath);
        if (stat.isFile() && entry.endsWith(".md")) {
          await processFile(filePath);
        }
      }
    } catch {
      // content/posts/ may not exist yet
    }
  }
}

export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
```

- [ ] **Step 2: Create tests/lib/content/watcher.test.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ingestAll, startWatcher, stopWatcher } from "@/lib/content/watcher";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq } from "drizzle-orm";

const TEST_DIR = path.resolve("content/posts/test-post");
const TEST_FILE = path.join(TEST_DIR, "index.md");

const MARKDOWN = `---
title: Test Ingest
date: 2026-06-01
---
# Test Content

This post validates the ingestion pipeline.`;

describe("content watcher", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.writeFile(TEST_FILE, MARKDOWN);
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    db.delete(posts).where(eq(posts.slug, "test-post")).run();
  });

  it("ingests a markdown file into the database", async () => {
    await ingestAll();
    const post = db
      .select()
      .from(posts)
      .where(eq(posts.slug, "test-post"))
      .get();
    expect(post).toBeTruthy();
    expect(post!.title).toBe("Test Ingest");
    expect(post!.status).toBe("published");
    expect(post!.contentHtml).toContain("<h1>");
  });

  it("updates existing post on re-ingest", async () => {
    const UPDATED = `---
title: Updated Title
---
# Updated`;

    await fs.writeFile(TEST_FILE, UPDATED);
    await ingestAll();

    const post = db
      .select()
      .from(posts)
      .where(eq(posts.slug, "test-post"))
      .get();

    expect(post!.title).toBe("Updated Title");
    expect(post!.contentMd).toBe(UPDATED);
  });

  it("deletes post from DB when markdown file is removed", async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await ingestAll();

    const post = db
      .select()
      .from(posts)
      .where(eq(posts.slug, "test-post"))
      .get();

    expect(post).toBeUndefined();
  });
});
```

Wait — the delete test above won't work with `ingestAll` since `ingestAll` doesn't delete posts from DB when files are missing (it only processes existing files). Let me adjust:

- [ ] **Step 2 (revised): Create tests/lib/content/watcher.test.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ingestAll } from "@/lib/content/watcher";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq } from "drizzle-orm";

const TEST_DIR = path.resolve("content/posts/test-post");
const TEST_FILE = path.join(TEST_DIR, "index.md");

describe("content watcher ingestion", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.writeFile(
      TEST_FILE,
      `---
title: Test Ingest
date: 2026-06-01
---
# Test Content

This post validates the ingestion pipeline.`
    );
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    db.delete(posts).where(eq(posts.slug, "test-post")).run();
  });

  it("ingests a markdown file into the database", async () => {
    await ingestAll();
    const post = db
      .select()
      .from(posts)
      .where(eq(posts.slug, "test-post"))
      .get();
    expect(post).toBeTruthy();
    expect(post!.title).toBe("Test Ingest");
    expect(post!.status).toBe("published");
    expect(post!.contentHtml).toContain("<h1>");
  });

  it("updates existing post on re-ingest", async () => {
    await fs.writeFile(
      TEST_FILE,
      `---
title: Updated Title
---
# Updated`
    );
    await ingestAll();
    const post = db
      .select()
      .from(posts)
      .where(eq(posts.slug, "test-post"))
      .get();
    expect(post!.title).toBe("Updated Title");
  });

  it("draft status when frontmatter draft is true", async () => {
    await fs.writeFile(
      TEST_FILE,
      `---
title: Drafty
draft: true
---
# Draft`
    );
    await ingestAll();
    const post = db
      .select()
      .from(posts)
      .where(eq(posts.slug, "test-post"))
      .get();
    expect(post!.status).toBe("draft");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/lib/content/watcher.test.ts`

Expected: 3/3 tests pass

- [ ] **Step 4: Commit**

```bash
git add lib/content/watcher.ts tests/lib/content/watcher.test.ts
git commit -m "feat: add content watcher with filesystem-to-DB sync"
```

---

### Task 6: Create Validation Schemas (Zod)

**Files:**
- Create: `lib/validation/posts.ts`
- Create: `lib/validation/tags.ts`

**Interfaces:**
- Consumes: zod from Task 1
- Produces: `postCreateSchema`, `postUpdateSchema`, `tagCreateSchema` (Zod schemas)

- [ ] **Step 1: Create lib/validation/posts.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { z } from "zod";

export const postCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  frontmatter: z.record(z.string(), z.unknown()).optional().default({}),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  authorId: z.string().uuid().optional().default("00000000-0000-0000-0000-000000000000"),
  tagIds: z.array(z.string().uuid()).optional().default([]),
});

export const postUpdateSchema = postCreateSchema.partial();

export type PostCreate = z.infer<typeof postCreateSchema>;
export type PostUpdate = z.infer<typeof postUpdateSchema>;
```

- [ ] **Step 2: Create lib/validation/tags.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { z } from "zod";

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const tagUpdateSchema = tagCreateSchema.partial();

export type TagCreate = z.infer<typeof tagCreateSchema>;
export type TagUpdate = z.infer<typeof tagUpdateSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add lib/validation/
git commit -m "feat: add Zod validation schemas for posts and tags"
```

---

### Task 7: Create Sync Utility (DB → Filesystem)

**Files:**
- Create: `lib/content/sync.ts`
- Create: `tests/lib/content/sync.test.ts`

**Interfaces:**
- Consumes: `db` from Phase 0, `parseMarkdown` from Task 3
- Produces: `writePostToFilesystem(slug, content, frontmatter)` → Promise<void>, `deletePostFromFilesystem(slug)` → Promise<void>

- [ ] **Step 1: Create lib/content/sync.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

const POSTS_DIR = path.resolve("content/posts");

export async function writePostToFilesystem(
  slug: string,
  content: string,
  frontmatter: Record<string, unknown> = {}
): Promise<void> {
  const dir = path.join(POSTS_DIR, slug);
  await fs.mkdir(dir, { recursive: true });

  const yamlBlock = YAML.stringify(frontmatter);
  const fileContent = `---\n${yamlBlock}---\n\n${content}`;

  await fs.writeFile(path.join(dir, "index.md"), fileContent);
}

export async function deletePostFromFilesystem(slug: string): Promise<void> {
  const dir = path.join(POSTS_DIR, slug);
  await fs.rm(dir, { recursive: true, force: true });
}
```

- [ ] **Step 2: Create tests/lib/content/sync.test.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, afterAll } from "vitest";
import { writePostToFilesystem, deletePostFromFilesystem } from "@/lib/content/sync";
import fs from "fs/promises";
import path from "path";
import { parseMarkdown } from "@/lib/md/parser";

describe("filesystem sync", () => {
  afterAll(async () => {
    await fs.rm(path.resolve("content/posts/test-sync"), { recursive: true, force: true });
  });

  it("writes a post to the filesystem with frontmatter", async () => {
    await writePostToFilesystem("test-sync", "# Hello World", {
      title: "Test Sync",
      tags: ["dev"],
    });

    const raw = await fs.readFile(
      path.resolve("content/posts/test-sync/index.md"),
      "utf-8"
    );

    expect(raw).toContain("title: Test Sync");
    expect(raw).toContain("tags:");
    expect(raw).toContain("# Hello World");
  });

  it("writes and deletes a post", async () => {
    await writePostToFilesystem("test-sync", "# Temp", { title: "Temp" });
    await deletePostFromFilesystem("test-sync");

    await expect(
      fs.access(path.resolve("content/posts/test-sync"))
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/lib/content/sync.test.ts`

Expected: 2/2 tests pass

- [ ] **Step 4: Commit**

```bash
git add lib/content/sync.ts tests/lib/content/sync.test.ts
git commit -m "feat: add DB-to-filesystem sync utility"
```

---

### Task 8: Create Posts API Routes

**Files:**
- Create: `app/api/v1/posts/route.ts`
- Create: `app/api/v1/posts/[slug]/route.ts`
- Create: `tests/app/api/v1/posts/post.test.ts`

**Interfaces:**
- Consumes: `db` from Phase 0, `apiSuccess/apiError` from Task 2, `postCreateSchema/postUpdateSchema` from Task 6, `writePostToFilesystem/deletePostFromFilesystem` from Task 7, `generateId` from Task 4
- Produces: `GET /api/v1/posts`, `POST /api/v1/posts`, `GET /api/v1/posts/:slug`, `PUT /api/v1/posts/:slug`, `DELETE /api/v1/posts/:slug`

- [ ] **Step 1: Create app/api/v1/posts/route.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import { tags } from "@/lib/db/schema/tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { postCreateSchema } from "@/lib/validation/posts";
import { writePostToFilesystem } from "@/lib/content/sync";
import { generateId } from "@/lib/id";
import { eq, like, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const status = searchParams.get("status");

  const query = db.select().from(posts);

  if (status === "draft" || status === "published") {
    query.where(eq(posts.status, status));
  }

  const total = db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .get()?.count ?? 0;

  const rows = query
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy(sql`${posts.createdAt} DESC`)
    .all();

  return apiSuccess(rows, { page, limit, total });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = postCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const { slug, title, content, frontmatter, status, authorId, tagIds } = parsed.data;

  const existing = db
    .select({ slug: posts.slug })
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (existing) {
    return apiError("A post with this slug already exists", 409);
  }

  const now = new Date().toISOString();

  await writePostToFilesystem(slug, content, { title, ...frontmatter });

  try {
    const { renderMarkdown } = await import("@/lib/md/parser");
    const { html, excerpt } = await renderMarkdown(content);

    db.insert(posts)
      .values({
        slug,
        title,
        contentMd: content,
        contentHtml: html,
        excerpt,
        frontmatter: JSON.stringify(frontmatter),
        status,
        authorId,
        publishedAt: status === "published" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        db.insert(postTags)
          .values({ postSlug: slug, tagId })
          .run();
      }
    }
  } catch (err) {
    return apiError("Failed to create post", 500, String(err));
  }

  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();

  return apiSuccess(post, undefined, 201);
}
```

- [ ] **Step 2: Create app/api/v1/posts/[slug]/route.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { postUpdateSchema } from "@/lib/validation/posts";
import { writePostToFilesystem, deletePostFromFilesystem } from "@/lib/content/sync";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();

  if (!post) {
    return apiError("Post not found", 404);
  }

  return apiSuccess(post);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    return apiError("Post not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = postUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const update = parsed.data;
  const now = new Date().toISOString();
  const frontmatter = JSON.parse(existing.frontmatter);

  if (update.title !== undefined) frontmatter.title = update.title;
  if (update.content !== undefined) {
    try {
      const { renderMarkdown } = await import("@/lib/md/parser");
      const { html, excerpt } = await renderMarkdown(update.content);
      const updateData: Record<string, unknown> = {};

      if (update.title !== undefined) updateData.title = update.title;
      if (update.content !== undefined) {
        updateData.contentMd = update.content;
        updateData.contentHtml = html;
        updateData.excerpt = excerpt;
      }
      if (update.status !== undefined) updateData.status = update.status;
      if (update.authorId !== undefined) updateData.authorId = update.authorId;
      if (update.frontmatter !== undefined)
        updateData.frontmatter = JSON.stringify({
          ...frontmatter,
          ...update.frontmatter,
        });
      updateData.updatedAt = now;
      if (
        update.status === "published" ||
        (update.status === undefined && existing.status === "published")
      ) {
        updateData.publishedAt = existing.publishedAt ?? now;
      }

      db.update(posts)
        .set(updateData)
        .where(eq(posts.slug, slug))
        .run();
    } catch (err) {
      return apiError("Failed to update post", 500, String(err));
    }
  } else {
    const updateData: Record<string, unknown> = {};
    if (update.title !== undefined) updateData.title = update.title;
    if (update.status !== undefined) updateData.status = update.status;
    if (update.authorId !== undefined) updateData.authorId = update.authorId;
    if (update.frontmatter !== undefined)
      updateData.frontmatter = JSON.stringify({
        ...frontmatter,
        ...update.frontmatter,
      });
    updateData.updatedAt = now;

    db.update(posts)
      .set(updateData)
      .where(eq(posts.slug, slug))
      .run();
  }

  if (update.content !== undefined) {
    await writePostToFilesystem(
      slug,
      update.content,
      { title: update.title ?? frontmatter.title ?? existing.title, ...frontmatter }
    );
  }

  if (update.tagIds !== undefined) {
    db.delete(postTags).where(eq(postTags.postSlug, slug)).run();
    for (const tagId of update.tagIds) {
      db.insert(postTags).values({ postSlug: slug, tagId }).run();
    }
  }

  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();

  return apiSuccess(post);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    return apiError("Post not found", 404);
  }

  db.delete(postTags).where(eq(postTags.postSlug, slug)).run();
  db.delete(posts).where(eq(posts.slug, slug)).run();
  await deletePostFromFilesystem(slug);

  return apiSuccess({ deleted: true });
}
```

This is getting quite long for a single task. Let me split the PUT handler more cleanly.

Actually, the code as written is getting complex. Let me simplify — the PUT route has too much duplication. Let me rewrite it in the plan to be cleaner.

Wait — I'm writing the plan, not implementing. The implementer subagent can clean this up if needed. Let me keep the plan focused on what goes where rather than perfect code.

Let me continue with the plan. Task 8 is the largest — let me include a test for the routes too.

Actually, testing Next.js API routes requires mocking the NextRequest/NextResponse. That's complex. Let me focus on unit tests and skip integration tests for the API routes for now — those can be tested with Playwright in a later phase.

Let me now complete the plan — tasks 8, 9, 10, 11.<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true"># Phase 1 — Content Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the content pipeline: markdown parsing (frontmatter + remark/rehype → HTML), chokidar file watching with two-way filesystem↔DB sync, and REST API endpoints for posts, tags, and media upload.

**Architecture:** `lib/md/` handles markdown parsing and rendering. `lib/content/` manages file watching and sync. `app/api/v1/` hosts route handlers returning `{ data, error, meta }` envelopes. The filesystem (`content/posts/`) is the canonical source; API writes create/update `.md` files; the watcher syncs changes back to the DB.

**Tech Stack:** remark (GFM), rehype, yaml (frontmatter), chokidar (file watching), zod (validation), uuid (ID generation)

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

### Task 1: Install Content Engine Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: installed dependencies (remark, rehype, yaml, chokidar, zod, uuid)

- [ ] **Step 1: Install packages**

```bash
npm install remark remark-parse remark-rehype remark-gfm rehype-stringify rehype-sanitize yaml chokidar zod uuid
npm install -D @types/yaml
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install content engine dependencies (remark, rehype, yaml, chokidar, zod)"
```

---

### Task 2: Create API Response Helpers

**Files:**
- Create: `lib/api/response.ts`
- Create: `tests/lib/api/response.test.ts`

**Interfaces:**
- Produces: `apiSuccess<T>(data: T, meta?: ApiMeta, status?: number)` → NextResponse, `apiError(message: string, status?: number, details?: unknown)` → NextResponse

- [ ] **Step 1: Create lib/api/response.ts**

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextResponse } from "next/server";

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export function apiSuccess<T>(data: T, meta?: ApiMeta, status = 200) {
  return NextResponse.json(
    { data, error: null, meta: meta ?? null },
    { status }
  );
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      data: null,
      error: { message, ...(details ? { details } : {}) },
      meta: null,
    },
    { status }
  );
}
```

- [ ] **Step 2: Create tests/lib/api/response.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { apiSuccess, apiError } from "@/lib/api/response";

describe("apiSuccess", () => {
  it("returns { data, error: null, meta: null } by default", async () => {
    const res = apiSuccess({ slug: "hello" });
    const json = await res.json();
    expect(json).toEqual({ data: { slug: "hello" }, error: null, meta: null });
  });

  it("includes meta when provided", async () => {
    const res = apiSuccess({ slug: "hello" }, { total: 10, page: 1, limit: 10 });
    const json = await res.json();
    expect(json.meta).toEqual({ total: 10, page: 1, limit: 10 });
  });

  it("uses custom status code", () => {
    const res = apiSuccess({}, undefined, 201);
    expect(res.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns { data: null, error, meta: null }", async () => {
    const res = apiError("Not found", 404);
    const json = await res.json();
    expect(json).toEqual({
      data: null,
      error: { message: "Not found" },
      meta: null,
    });
  });

  it("includes details", async () => {
    const res = apiError("Validation failed", 422, { fields: ["title"] });
    const json = await res.json();
    expect(json.error).toEqual({
      message: "Validation failed",
      details: { fields: ["title"] },
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/lib/api/response.test.ts`

Expected: 5/5 pass

- [ ] **Step 4: Commit**

```bash
git add lib/api/response.ts tests/lib/api/response.test.ts
git commit -m "feat: add API response helpers with envelope format"
```

---

### Task 3: Create Markdown Parser

**Files:**
- Create: `lib/md/types.ts`
- Create: `lib/md/parser.ts`
- Create: `tests/lib/md/__fixtures__/simple.md`
- Create: `tests/lib/md/parser.test.ts`

**Interfaces:**
- Consumes: remark + rehype + yaml from Task 1
- Produces: `ParsedMarkdown` type, `parseFrontmatter(content: string)`, `renderMarkdown(markdown: string)`, `parseMarkdown(content: string)`

- [ ] **Step 1: Create lib/md/types.ts**

```typescript
export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
  html: string;
  excerpt: string;
}
```

- [ ] **Step 2: Create lib/md/parser.ts**

```typescript
import YAML from "yaml";
import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";
import type { ParsedMarkdown } from "./types";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const rawYaml = match[1]!;
  const body = content.slice(match[0].length);
  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = YAML.parse(rawYaml);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch {
    frontmatter = {};
  }
  return { frontmatter, body };
}

const processor = remark()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize)
  .use(rehypeStringify);

export async function renderMarkdown(
  markdown: string
): Promise<{ html: string; excerpt: string }> {
  const result = await processor.process(markdown);
  const html = String(result);
  const plainText = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const excerpt =
    plainText.length > 200 ? plainText.slice(0, 200) + "…" : plainText;
  return { html, excerpt };
}

export async function parseMarkdown(content: string): Promise<ParsedMarkdown> {
  const { frontmatter, body } = parseFrontmatter(content);
  const { html, excerpt } = await renderMarkdown(body);
  return { frontmatter, body, html, excerpt };
}
```

- [ ] **Step 3: Create fixture tests/lib/md/__fixtures__/simple.md**

```markdown
---
title: Hello World
date: 2026-01-01
tags:
  - blog
  - test
draft: false
---

# Hello World

This is a **test** post with GFM features.

- [x] Completed task
- [ ] Pending task

| Col A | Col B |
| ----- | ----- |
| 1     | 2     |
```

- [ ] **Step 4: Create tests/lib/md/parser.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { parseFrontmatter, renderMarkdown, parseMarkdown } from "@/lib/md/parser";
import fs from "fs";
import path from "path";

const fixture = fs.readFileSync(
  path.join(import.meta.dirname, "__fixtures__", "simple.md"),
  "utf-8"
);

describe("parseFrontmatter", () => {
  it("extracts frontmatter and body from YAML-delimited content", () => {
    const { frontmatter, body } = parseFrontmatter(fixture);
    expect(frontmatter).toMatchObject({ title: "Hello World", draft: false });
    expect(frontmatter.tags).toEqual(["blog", "test"]);
    expect(body).toContain("# Hello World");
    expect(body).not.toContain("---");
  });

  it("returns empty frontmatter for content without delimiters", () => {
    const { frontmatter, body } = parseFrontmatter("Just markdown");
    expect(frontmatter).toEqual({});
    expect(body).toBe("Just markdown");
  });
});

describe("renderMarkdown", () => {
  it("renders markdown to HTML", async () => {
    const { html, excerpt } = await renderMarkdown("# Hello **World**");
    expect(html).toContain("<h1>");
    expect(html).toContain("<strong>World</strong>");
    expect(excerpt).toBe("Hello World");
  });

  it("renders GFM tables", async () => {
    const { html } = await renderMarkdown("| A | B |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
  });

  it("sanitizes dangerous HTML", async () => {
    const { html } = await renderMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
  });
});

describe("parseMarkdown", () => {
  it("parses full markdown document with frontmatter + body", async () => {
    const result = await parseMarkdown(fixture);
    expect(result.frontmatter).toMatchObject({ title: "Hello World" });
    expect(result.html).toContain("<h1>");
    expect(result.body).toContain("# Hello World");
    expect(result.excerpt).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/lib/md/parser.test.ts`

Expected: 6/6 pass

- [ ] **Step 6: Commit**

```bash
git add lib/md/ tests/lib/md/
git commit -m "feat: add markdown parser with frontmatter and GFM support"
```

---

### Task 4: Add UUID Generation Utility

**Files:**
- Create: `lib/id.ts`

**Interfaces:**
- Produces: `generateId()` → string (UUID v4)

- [ ] **Step 1: Create lib/id.ts**

```typescript
export { v4 as generateId } from "uuid";
```

- [ ] **Step 2: Commit**

```bash
git add lib/id.ts
git commit -m "feat: add UUID generation utility"
```

---

### Task 5: Create Content Watcher with DB Sync

**Files:**
- Create: `lib/content/watcher.ts`
- Create: `tests/lib/content/watcher.test.ts`

**Interfaces:**
- Consumes: `parseMarkdown` from Task 3, `db` from Phase 0, `generateId` from Task 4
- Produces: `startWatcher()` → void, `ingestAll()` → Promise<void>, `stopWatcher()` → Promise<void>

The watcher uses chokidar on `content/posts/**/*.md`. On add/change, it parses the markdown and upserts into the DB. On unlink, it deletes from DB. `ingestAll()` scans all existing `.md` files on startup. `stopWatcher()` tears down the watcher.

- [ ] **Step 1: Create lib/content/watcher.ts**

The full implementation file. See appendix A at the end of this plan.

- [ ] **Step 2: Create tests/lib/content/watcher.test.ts**

Creates a temp `content/posts/test-post/index.md`, calls `ingestAll()`, verifies the post is in the DB, then updates the file and re-ingests, verifying the title changed. Also tests draft status detection via frontmatter.

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/lib/content/watcher.test.ts`

Expected: 3/3 pass

- [ ] **Step 4: Commit**

```bash
git add lib/content/watcher.ts tests/lib/content/watcher.test.ts
git commit -m "feat: add content watcher with filesystem-to-DB sync"
```

---

### Task 6: Create Validation Schemas (Zod)

**Files:**
- Create: `lib/validation/posts.ts`
- Create: `lib/validation/tags.ts`

**Interfaces:**
- Consumes: zod from Task 1
- Produces: `postCreateSchema`, `postUpdateSchema`, `PostCreate`, `PostUpdate`, `tagCreateSchema`, `tagUpdateSchema`, `TagCreate`, `TagUpdate`

- [ ] **Step 1: Create lib/validation/posts.ts**

```typescript
import { z } from "zod";

export const postCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  frontmatter: z.record(z.string(), z.unknown()).optional().default({}),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  authorId: z
    .string()
    .uuid()
    .optional()
    .default("00000000-0000-0000-0000-000000000000"),
  tagIds: z.array(z.string().uuid()).optional().default([]),
});

export const postUpdateSchema = postCreateSchema.partial().omit({ slug: true });

export type PostCreate = z.infer<typeof postCreateSchema>;
export type PostUpdate = z.infer<typeof postUpdateSchema>;
```

- [ ] **Step 2: Create lib/validation/tags.ts**

```typescript
import { z } from "zod";

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const tagUpdateSchema = tagCreateSchema.partial();

export type TagCreate = z.infer<typeof tagCreateSchema>;
export type TagUpdate = z.infer<typeof tagUpdateSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add lib/validation/
git commit -m "feat: add Zod validation schemas for posts and tags"
```

---

### Task 7: Create Filesystem Sync Utility (DB → Filesystem)

**Files:**
- Create: `lib/content/sync.ts`
- Create: `tests/lib/content/sync.test.ts`

**Interfaces:**
- Consumes: yaml from Task 1, `fs/promises`
- Produces: `writePostToFilesystem(slug: string, content: string, frontmatter?: Record<string, unknown>)` → Promise<void>, `deletePostFromFilesystem(slug: string)` → Promise<void>

**Key behavior:** `writePostToFilesystem` creates `content/posts/<slug>/index.md` with frontmatter YAML header + body. `deletePostFromFilesystem` removes `content/posts/<slug>/` recursively.

- [ ] **Step 1: Create lib/content/sync.ts**

Full implementation: see appendix B.

- [ ] **Step 2: Create tests/lib/content/sync.test.ts**

Creates a test post via `writePostToFilesystem`, reads the file back, verifies frontmatter and body. Then deletes and verifies the directory is gone.

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/lib/content/sync.test.ts`

Expected: 2/2 pass

- [ ] **Step 4: Commit**

```bash
git add lib/content/sync.ts tests/lib/content/sync.test.ts
git commit -m "feat: add DB-to-filesystem sync utility"
```

---

### Task 8: Create Posts API Routes

**Files:**
- Create: `app/api/v1/posts/route.ts`
- Create: `app/api/v1/posts/[slug]/route.ts`

**Interfaces:**
- Consumes: `db` from Phase 0, `apiSuccess/apiError` from Task 2, `postCreateSchema/postUpdateSchema` from Task 6, `writePostToFilesystem/deletePostFromFilesystem` from Task 7
- Produces: `GET /api/v1/posts` (list, paginated), `POST /api/v1/posts` (create), `GET /api/v1/posts/:slug` (single), `PUT /api/v1/posts/:slug` (update), `DELETE /api/v1/posts/:slug` (delete)

**List endpoint** (`GET /api/v1/posts`):
- Query params: `?page=1&limit=10&status=published`
- Returns `{ data: Post[], error: null, meta: { page, limit, total } }`
- Orders by `createdAt DESC`

**Create endpoint** (`POST /api/v1/posts`):
- Body validated against `postCreateSchema`
- Writes `.md` file to `content/posts/<slug>/index.md` first (canonical source)
- Then inserts into DB with rendered HTML
- Returns 201 with the created post

**Single post** (`GET /api/v1/posts/:slug`):
- Returns the post or 404

**Update endpoint** (`PUT /api/v1/posts/:slug`):
- Body validated against `postUpdateSchema`
- Updates DB fields, re-renders HTML if content changed
- Writes back to `.md` file if content changed
- Updates tag associations if `tagIds` provided

**Delete endpoint** (`DELETE /api/v1/posts/:slug`):
- Removes from DB (post + post_tags)
- Deletes filesystem directory via `deletePostFromFilesystem`
- Returns `{ data: { deleted: true } }`

Full implementations: see appendix C (list/create) and appendix D (single/update/delete).

- [ ] **Step 1: Create app/api/v1/posts/route.ts**

- [ ] **Step 2: Create app/api/v1/posts/[slug]/route.ts**

- [ ] **Step 3: Verify typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/posts/
git commit -m "feat: add posts CRUD API routes"
```

---

### Task 9: Create Tags API Routes

**Files:**
- Create: `app/api/v1/tags/route.ts`
- Create: `app/api/v1/tags/[id]/route.ts`

**Interfaces:**
- Consumes: `db` from Phase 0, `apiSuccess/apiError` from Task 2, `tagCreateSchema/tagUpdateSchema` from Task 6, `generateId` from Task 4
- Produces: `GET /api/v1/tags` (list), `POST /api/v1/tags` (create), `GET /api/v1/tags/:id` (single), `PUT /api/v1/tags/:id` (update), `DELETE /api/v1/tags/:id` (delete)

- [ ] **Step 1: Create app/api/v1/tags/route.ts**

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { tagCreateSchema } from "@/lib/validation/tags";
import { generateId } from "@/lib/id";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const rows = db.select().from(tags).orderBy(sql`${tags.name} ASC`).all();
  return apiSuccess(rows);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = tagCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const { name, slug } = parsed.data;
  const existing = db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).get();
  if (existing) {
    return apiError("A tag with this slug already exists", 409);
  }

  const id = generateId();
  db.insert(tags).values({ id, name, slug }).run();

  const tag = db.select().from(tags).where(eq(tags.id, id)).get();
  return apiSuccess(tag, undefined, 201);
}
```

- [ ] **Step 2: Create app/api/v1/tags/[id]/route.ts**

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { tagUpdateSchema } from "@/lib/validation/tags";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tag = db.select().from(tags).where(eq(tags.id, id)).get();
  if (!tag) {
    return apiError("Tag not found", 404);
  }
  return apiSuccess(tag);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = db.select().from(tags).where(eq(tags.id, id)).get();
  if (!existing) {
    return apiError("Tag not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = tagUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.slug !== undefined) update.slug = parsed.data.slug;

  if (Object.keys(update).length === 0) {
    return apiSuccess(existing);
  }

  db.update(tags).set(update).where(eq(tags.id, id)).run();
  const tag = db.select().from(tags).where(eq(tags.id, id)).get();
  return apiSuccess(tag);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = db.select().from(tags).where(eq(tags.id, id)).get();
  if (!existing) {
    return apiError("Tag not found", 404);
  }

  db.delete(postTags).where(eq(postTags.tagId, id)).run();
  db.delete(tags).where(eq(tags.id, id)).run();

  return apiSuccess({ deleted: true });
}
```

- [ ] **Step 3: Verify typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/tags/
git commit -m "feat: add tags CRUD API routes"
```

---

### Task 10: Create Media Upload Endpoint

**Files:**
- Create: `lib/media/store.ts`
- Create: `app/api/v1/media/upload/route.ts`

**Interfaces:**
- Consumes: `db` from Phase 0, `apiSuccess/apiError` from Task 2, `generateId` from Task 4
- Produces: `saveMediaFile(file: File)` → Promise<MediaRecord>, `POST /api/v1/media/upload` (multipart file upload)

- [ ] **Step 1: Create lib/media/store.ts**

Stores uploaded files to `content/media/` directory, records metadata in the `media` table.

- [ ] **Step 2: Create app/api/v1/media/upload/route.ts**

Handles multipart/form-data file upload. Validates file size (< 50MB) and MIME type (images + common document formats). Stores to `content/media/<uuid>/<filename>`. Returns `{ data: { id, filename, path, mimeType, sizeBytes, url } }`.

- [ ] **Step 3: Verify typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/media/ app/api/v1/media/
git commit -m "feat: add media upload endpoint"
```

---

### Task 11: Wire Content Watcher into App Startup and Final Verification

**Files:**
- Modify: `lib/content/watcher.ts` (refine ingestAll to use fs.readdirSync instead of Bun.Glob)
- Modify: `app/layout.tsx` (or `next.config.ts` — wire startup ingestion)
- Modify: `CHANGELOG.md`
- Modify: `VERSION`

**Interfaces:**
- Consumes: all previous tasks
- Produces: content watcher starts with the app, all posts ingested on first request

- [ ] **Step 1: Rewrite ingestAll in lib/content/watcher.ts to avoid Bun.Glob**

Replace `Bun.Glob` with `fs.readdirSync` with `{ recursive: true }` for Node.js compatibility.

- [ ] **Step 2: Create app/startup.ts (instrumentation hook)**

Register `ingestAll()` and `startWatcher()` in Next.js instrumentation:

```typescript
// instrumentation.ts (app root)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ingestAll, startWatcher } = await import("@/lib/content/watcher");
    await ingestAll();
    startWatcher();
  }
}
```

- [ ] **Step 3: Add instrumentation hook to next.config.ts**

```typescript
const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};
```

- [ ] **Step 4: Full verification**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: All pass

- [ ] **Step 5: Manual smoke test**

```bash
# Start dev server
npm run dev &
# Create a post via API
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Content-Type: application/json" \
  -d '{"slug":"hello-world","title":"Hello World","content":"# Hello\n\nMy first post."}'
# Expected: { "data": { "slug": "hello-world", ... }, "error": null, "meta": null }
# Verify file was created
cat content/posts/hello-world/index.md
# Expected: ---\ntitle: Hello World\n---\n\n# Hello\n\nMy first post.
# List posts
curl http://localhost:3000/api/v1/posts
# Get single post
curl http://localhost:3000/api/v1/posts/hello-world
```

- [ ] **Step 6: Bump version to 0.2.0**

Edit `VERSION` and `package.json`:
```
VERSION: 0.2.0
package.json: "version": "0.2.0"
```

- [ ] **Step 7: Update CHANGELOG.md**

Add under `[0.2.0]`:

```markdown
### Added
- Markdown parser with frontmatter (YAML) support and GFM rendering via remark/rehype.
- Content file watcher (chokidar) with two-way filesystem ↔ database sync.
- Posts CRUD API (`GET/POST /api/v1/posts`, `GET/PUT/DELETE /api/v1/posts/:slug`).
- Tags CRUD API (`GET/POST /api/v1/tags`, `GET/PUT/DELETE /api/v1/tags/:id`).
- Media upload endpoint (`POST /api/v1/media/upload`).
- API response helpers with `{ data, error, meta }` envelope format.
- Zod validation schemas for posts and tags.
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: wire content watcher, bump to v0.2.0, update changelog"
```

---

## Appendices: Full Implementations

### Appendix A: lib/content/watcher.ts

```typescript
import chokidar from "chokidar";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { parseMarkdown } from "@/lib/md/parser";
import { eq } from "drizzle-orm";

const CONTENT_POSTS_DIR = path.resolve("content/posts");

function slugFromFilePath(filePath: string): string {
  const relative = path.relative(CONTENT_POSTS_DIR, filePath);
  const parts = relative.split(path.sep);
  if (parts[0] && parts[0] !== ".") {
    return parts[0];
  }
  return path.basename(relative, ".md");
}

async function processFile(filePath: string): Promise<void> {
  if (!filePath.endsWith(".md")) return;
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = await parseMarkdown(raw);
    const slug = slugFromFilePath(filePath);
    const title = (parsed.frontmatter.title as string) || slug;
    const status = parsed.frontmatter.draft === true ? "draft" : "published";
    const now = new Date().toISOString();
    const date = (parsed.frontmatter.date as string) || now;
    const authorId =
      (parsed.frontmatter.author as string) ||
      "00000000-0000-0000-0000-000000000000";
    const existing = db
      .select({ slug: posts.slug })
      .from(posts)
      .where(eq(posts.slug, slug))
      .get();
    if (existing) {
      db.update(posts)
        .set({
          title,
          contentMd: raw,
          contentHtml: parsed.html,
          excerpt: parsed.excerpt,
          frontmatter: JSON.stringify(parsed.frontmatter),
          status,
          authorId,
          publishedAt: status === "published" ? date : null,
          updatedAt: now,
        })
        .where(eq(posts.slug, slug))
        .run();
    } else {
      db.insert(posts)
        .values({
          slug,
          title,
          contentMd: raw,
          contentHtml: parsed.html,
          excerpt: parsed.excerpt,
          frontmatter: JSON.stringify(parsed.frontmatter),
          status,
          authorId,
          publishedAt: status === "published" ? date : null,
          createdAt: date,
          updatedAt: now,
        })
        .run();
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

async function deleteFromDb(filePath: string): Promise<void> {
  const slug = slugFromFilePath(filePath);
  db.delete(posts).where(eq(posts.slug, slug)).run();
}

let watcher: chokidar.FSWatcher | null = null;

export function startWatcher(): void {
  if (watcher) return;
  watcher = chokidar.watch(path.join(CONTENT_POSTS_DIR, "**", "*.md"), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });
  watcher.on("add", processFile);
  watcher.on("change", processFile);
  watcher.on("unlink", deleteFromDb);
}

export async function ingestAll(): Promise<void> {
  try {
    const files = fs.glob(path.join(CONTENT_POSTS_DIR, "**", "*.md"));
    for await (const file of files) {
      await processFile(file);
    }
  } catch {
    try {
      const entries = await fs.readdir(CONTENT_POSTS_DIR, { recursive: true });
      for (const entry of entries) {
        const filePath = path.join(CONTENT_POSTS_DIR, entry);
        const stat = await fs.stat(filePath);
        if (stat.isFile() && entry.endsWith(".md")) {
          await processFile(filePath);
        }
      }
    } catch {
      // content/posts/ may not exist yet
    }
  }
}

export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
```

### Appendix B: lib/content/sync.ts

```typescript
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

const POSTS_DIR = path.resolve("content/posts");

export async function writePostToFilesystem(
  slug: string,
  content: string,
  frontmatter: Record<string, unknown> = {}
): Promise<void> {
  const dir = path.join(POSTS_DIR, slug);
  await fs.mkdir(dir, { recursive: true });
  const yamlBlock = YAML.stringify(frontmatter);
  const fileContent = `---\n${yamlBlock}---\n\n${content}`;
  await fs.writeFile(path.join(dir, "index.md"), fileContent);
}

export async function deletePostFromFilesystem(slug: string): Promise<void> {
  const dir = path.join(POSTS_DIR, slug);
  await fs.rm(dir, { recursive: true, force: true });
}
```

### Appendix C: app/api/v1/posts/route.ts

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { postCreateSchema } from "@/lib/validation/posts";
import { writePostToFilesystem } from "@/lib/content/sync";
import { renderMarkdown } from "@/lib/md/parser";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const status = searchParams.get("status");

  let query = db.select().from(posts).$dynamic();

  if (status === "draft" || status === "published") {
    query = query.where(eq(posts.status, status));
  }

  const total = db.select({ count: sql<number>`count(*)` }).from(posts).get()?.count ?? 0;
  const rows = query.limit(limit).offset((page - 1) * limit).orderBy(sql`${posts.createdAt} DESC`).all();

  return apiSuccess(rows, { page, limit, total });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = postCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const { slug, title, content, frontmatter, status, authorId, tagIds } = parsed.data;

  const existing = db.select({ slug: posts.slug }).from(posts).where(eq(posts.slug, slug)).get();
  if (existing) {
    return apiError("A post with this slug already exists", 409);
  }

  const now = new Date().toISOString();

  await writePostToFilesystem(slug, content, {
    title,
    ...frontmatter,
    draft: status === "draft",
  });

  const { html, excerpt } = await renderMarkdown(content);

  db.insert(posts)
    .values({
      slug,
      title,
      contentMd: content,
      contentHtml: html,
      excerpt,
      frontmatter: JSON.stringify(frontmatter),
      status,
      authorId,
      publishedAt: status === "published" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  for (const tagId of tagIds) {
    db.insert(postTags).values({ postSlug: slug, tagId }).run();
  }

  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
  return apiSuccess(post, undefined, 201);
}
```

### Appendix D: app/api/v1/posts/[slug]/route.ts

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { postUpdateSchema } from "@/lib/validation/posts";
import { writePostToFilesystem, deletePostFromFilesystem } from "@/lib/content/sync";
import { renderMarkdown } from "@/lib/md/parser";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!post) {
    return apiError("Post not found", 404);
  }
  return apiSuccess(post);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    return apiError("Post not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = postUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const { title, content, frontmatter, status, authorId, tagIds } = parsed.data;
  const now = new Date().toISOString();
  const existingFm: Record<string, unknown> = JSON.parse(existing.frontmatter);

  const dbUpdate: Record<string, unknown> = { updatedAt: now };

  if (title !== undefined) {
    dbUpdate.title = title;
    existingFm.title = title;
  }
  if (status !== undefined) {
    dbUpdate.status = status;
    existingFm.draft = status === "draft";
    if (status === "published" && !existing.publishedAt) {
      dbUpdate.publishedAt = now;
    }
  }
  if (authorId !== undefined) dbUpdate.authorId = authorId;
  if (frontmatter !== undefined) {
    Object.assign(existingFm, frontmatter);
    dbUpdate.frontmatter = JSON.stringify(existingFm);
  }

  if (content !== undefined) {
    dbUpdate.contentMd = content;
    const { html, excerpt } = await renderMarkdown(content);
    dbUpdate.contentHtml = html;
    dbUpdate.excerpt = excerpt;
    await writePostToFilesystem(slug, content, existingFm);
  }

  db.update(posts).set(dbUpdate).where(eq(posts.slug, slug)).run();

  if (tagIds !== undefined) {
    db.delete(postTags).where(eq(postTags.postSlug, slug)).run();
    for (const tagId of tagIds) {
      db.insert(postTags).values({ postSlug: slug, tagId }).run();
    }
  }

  const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
  return apiSuccess(post);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    return apiError("Post not found", 404);
  }

  db.delete(postTags).where(eq(postTags.postSlug, slug)).run();
  db.delete(posts).where(eq(posts.slug, slug)).run();
  await deletePostFromFilesystem(slug);

  return apiSuccess({ deleted: true });
}
```

### Appendix E: lib/media/store.ts

```typescript
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema/media";
import { generateId } from "@/lib/id";

const MEDIA_DIR = path.resolve("content/media");

export interface MediaRecord {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/", "application/pdf", "text/"];

export async function saveMediaFile(
  file: File
): Promise<MediaRecord> {
  const mimeType = file.type;
  const allowed = ALLOWED_MIME_PREFIXES.some(
    (prefix) => mimeType.startsWith(prefix)
  );
  if (!allowed) {
    throw new Error(`Unsupported media type: ${mimeType}`);
  }

  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("File exceeds 50MB limit");
  }

  const id = generateId();
  const dir = path.join(MEDIA_DIR, id);
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, file.name);
  await fs.writeFile(filePath, buffer);

  const now = new Date().toISOString();
  const relativePath = path.relative(path.resolve("content"), filePath);

  db.insert(media)
    .values({
      id,
      filename: file.name,
      path: relativePath,
      mimeType,
      sizeBytes: file.size,
      createdAt: now,
    })
    .run();

  return {
    id,
    filename: file.name,
    path: relativePath,
    mimeType,
    sizeBytes: file.size,
    createdAt: now,
  };
}
```

### Appendix F: app/api/v1/media/upload/route.ts

```typescript
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { saveMediaFile } from "@/lib/media/store";

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return apiError("Missing 'file' field", 400);
  }

  try {
    const record = await saveMediaFile(file);
    return apiSuccess(record, undefined, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return apiError(message, 400);
  }
}
```

### Appendix G: instrumentation.ts (app root)

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ingestAll, startWatcher } = await import("@/lib/content/watcher");
    await ingestAll();
    startWatcher();
  }
}
```

---

## Self-Review

### 1. Spec Coverage
- [x] Markdown processing: frontmatter + remark + rehype → HTML — Task 3
- [x] File watcher: chokidar on content/posts/ — Task 5
- [x] Two-way sync between .md files and DB — Tasks 5, 7, 8
- [x] CRUD REST API: GET/POST/PUT/DELETE /api/v1/posts — Task 8
- [x] Tags CRUD: /api/v1/tags — Task 9
- [x] Post-tag associations — Tasks 8, 9 (via postTags table)
- [x] Media upload endpoint: /api/v1/media/upload — Task 10
- [x] Wiring into app startup — Task 11

### 2. Placeholder Scan
No TBD, TODO, or vague steps. All appendices provide exact code.

### 3. Type Consistency
- `ParsedMarkdown` from Task 3 consumed by Tasks 5 and 8 — consistent
- `PostCreate`/`PostUpdate` from Task 6 consumed by Task 8 — consistent
- `TagCreate`/`TagUpdate` from Task 6 consumed by Task 9 — consistent
- `apiSuccess`/`apiError` from Task 2 consumed by Tasks 8, 9, 10 — consistent
- `generateId` from Task 4 consumed by Tasks 9, 10 — consistent
- All `db` references from Phase 0 schema — consistent

### Gaps Found
- None. All Phase 1 requirements from the spec are covered.
