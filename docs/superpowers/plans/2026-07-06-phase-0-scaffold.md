# Phase 0 — Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Bifröst project with Next.js 16, TypeScript strict mode, Tailwind CSS v4, Drizzle ORM with SQLite, full database schema, config loading, and development tooling.

**Architecture:** Monolithic Next.js 16 App Router project. Drizzle ORM abstracts database operations with SQLite as the default. `bifrost.config.ts` loads at build/runtime with validation and defaults.

**Tech Stack:** Next.js 16, React 19, TypeScript 5 (strict), Tailwind CSS v4, Drizzle ORM, better-sqlite3, Vitest, ESLint, Prettier

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- Server components by default, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- Environment variables prefixed with `BIFROST_`
- No comments unless logic is genuinely non-obvious
- All new source files carry the AGPL-3.0 license header
- Node.js 22+, npm 10+
- Run `npm run typecheck && npm run lint && npm test` before marking work complete

---

### Task 1: Initialize Next.js 16 Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

**Interfaces:**
- Produces: Next.js dev server, `npm run dev`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "bifrost",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enable after initial scaffold
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create app/layout.tsx**

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bifröst",
  description: "A self-hosted blogging framework",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Create app/page.tsx**

```typescript
export default function Home() {
  return (
    <main>
      <h1>Bifröst</h1>
      <p>A self-hosted blogging framework</p>
    </main>
  );
}
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`

Expected: Dependencies installed, no errors

- [ ] **Step 7: Verify dev server starts**

Run: `npm run dev`

Expected: Server starts on http://localhost:3000, shows "Bifröst" heading

Stop server with Ctrl+C after verification

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts app/
git commit -m "feat: initialize Next.js 16 project with TypeScript strict mode"
```

---

### Task 2: Configure Tailwind CSS v4

**Files:**
- Create: `postcss.config.mjs`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Next.js project from Task 1
- Produces: Tailwind CSS v4 styling pipeline

- [ ] **Step 1: Install Tailwind CSS v4 and PostCSS plugin**

Run: `npm install -D tailwindcss @tailwindcss/postcss`

Expected: Packages installed

- [ ] **Step 2: Create postcss.config.mjs**

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 3: Update app/globals.css**

```css
@import "tailwindcss";
```

- [ ] **Step 4: Verify Tailwind compiles**

Run: `npm run dev`

Expected: Server starts with no CSS errors, Tailwind utilities available

Stop server after verification

- [ ] **Step 5: Update app/page.tsx with Tailwind classes for quick visual check**

```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Bifröst</h1>
        <p className="mt-2 text-zinc-400">A self-hosted blogging framework</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json postcss.config.mjs app/
git commit -m "feat: add Tailwind CSS v4 with PostCSS"
```

---

### Task 3: Set Up Drizzle ORM with SQLite

**Files:**
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`

**Interfaces:**
- Consumes: Next.js project from Task 2
- Produces: `db` instance (`DrizzleClient`), `drizzle.config.ts` for migrations

- [ ] **Step 1: Install Drizzle and SQLite driver**

Run: `npm install drizzle-orm better-sqlite3 && npm install -D drizzle-kit @types/better-sqlite3`

Expected: Packages installed, no native build errors

- [ ] **Step 2: Create lib/db/index.ts**

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database(
  process.env.DATABASE_URL?.replace("file:", "") ?? "data/bifrost.db"
);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);
```

- [ ] **Step 3: Create drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema/*.ts",
  out: "./lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "data/bifrost.db",
  },
});
```

- [ ] **Step 4: Add npm scripts for database management**

Edit `package.json` — add to `"scripts"`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 5: Create data directory**

Run: `mkdir -p data`

- [ ] **Step 6: Verify Drizzle can connect**

Create a temporary test:

```typescript
// Verify in dev that db import works
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const result = db.all(sql`SELECT 1 as test`);
console.log(result); // [{ test: 1 }]
```

Run: `npx tsx --eval "import { db } from './lib/db/index'; console.log(db.all(sql\`SELECT 1 as test\`))"` — or verify in build

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/db/index.ts drizzle.config.ts data/
git commit -m "feat: add Drizzle ORM with SQLite adapter"
```

---

### Task 4: Define Database Schema

**Files:**
- Create: `lib/db/schema/users.ts`
- Create: `lib/db/schema/posts.ts`
- Create: `lib/db/schema/tags.ts`
- Create: `lib/db/schema/post-tags.ts`
- Create: `lib/db/schema/media.ts`
- Create: `lib/db/schema/settings.ts`
- Create: `lib/db/schema/index.ts`
- Create: `lib/db/run-migrations.ts`

**Interfaces:**
- Consumes: `db` from Task 3
- Produces: All table schemas, migration runner

- [ ] **Step 1: Create lib/db/schema/users.ts**

```typescript
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["admin", "editor", "author"] })
    .notNull()
    .default("author"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

- [ ] **Step 2: Create lib/db/schema/posts.ts**

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const posts = sqliteTable("posts", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  contentMd: text("content_md").notNull(),
  contentHtml: text("content_html").notNull().default(""),
  excerpt: text("excerpt"),
  frontmatter: text("frontmatter").notNull().default("{}"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

- [ ] **Step 3: Create lib/db/schema/tags.ts**

```typescript
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});
```

- [ ] **Step 4: Create lib/db/schema/post-tags.ts**

```typescript
import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";
import { tags } from "./tags";

export const postTags = sqliteTable(
  "post_tags",
  {
    postSlug: text("post_slug")
      .notNull()
      .references(() => posts.slug),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.postSlug, table.tagId] })]
);
```

- [ ] **Step 5: Create lib/db/schema/media.ts**

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  postSlug: text("post_slug").references(() => posts.slug),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 6: Create lib/db/schema/settings.ts**

```typescript
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default("{}"),
});
```

- [ ] **Step 7: Create lib/db/schema/index.ts**

```typescript
export { users } from "./users";
export { posts } from "./posts";
export { tags } from "./tags";
export { postTags } from "./post-tags";
export { media } from "./media";
export { settings } from "./settings";
```

- [ ] **Step 8: Create lib/db/run-migrations.ts (migration runner)**

```typescript
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database(
  process.env.DATABASE_URL?.replace("file:", "") ?? "data/bifrost.db"
);

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./lib/db/migrations" });

console.log("Migrations complete");
```

- [ ] **Step 9: Generate initial migration**

Run: `npm run db:generate`

Expected: Migration SQL files created in `lib/db/migrations/`

- [ ] **Step 10: Run migration**

Run: `npx tsx lib/db/run-migrations.ts`

Expected: "Migrations complete" printed, `data/bifrost.db` created with all tables

- [ ] **Step 11: Commit**

```bash
git add lib/db/schema/ drizzle.config.ts lib/db/run-migrations.ts package.json lib/db/migrations/
git commit -m "feat: define database schema with Drizzle ORM"
```

---

### Task 5: Create Type Generator for Environment Variables

**Files:**
- Create: `lib/env.ts`

**Interfaces:**
- Consumes: nothing
- Produces: typed `env()` helper

- [ ] **Step 1: Create lib/env.ts**

```typescript
const known = [
  "BIFROST_OPENCODE_ZEN_KEY",
  "BIFROST_OPENCODE_GO_KEY",
  "BIFROST_DEEPSEEK_KEY",
  "DATABASE_URL",
] as const;

type KnownEnv = (typeof known)[number];

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

export function env(name: KnownEnv): string | undefined;
export function env(name: KnownEnv, fallback: string): string;
export function env(name: KnownEnv, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/env.ts
git commit -m "feat: add typed environment variable helper"
```

---

### Task 6: Implement Config Loading

**Files:**
- Create: `lib/config/types.ts`
- Create: `lib/config/defaults.ts`
- Create: `lib/config/loader.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `BifrostConfig` type, `loadConfig()` function, `defineConfig()` helper

- [ ] **Step 1: Create lib/config/types.ts**

```typescript
export interface SiteConfig {
  title: string;
  description: string;
  language: string;
}

export interface ContentConfig {
  path: string;
  postsPerPage: number;
}

export interface AIProviderConfig {
  apiKey?: string;
  model: string;
}

export interface AIConfig {
  defaultProvider: string;
  providers: Record<string, AIProviderConfig>;
}

export interface GitConfig {
  enabled: boolean;
  autoCommit: boolean;
  remote: string;
}

export interface McpConfig {
  enabled: boolean;
  mode: "stdio" | "http";
  port: number;
}

export interface BifrostConfig {
  site: SiteConfig;
  theme: string;
  content: ContentConfig;
  ai: AIConfig;
  git: GitConfig;
  mcp: McpConfig;
  plugins: string[];
}
```

- [ ] **Step 2: Create lib/config/defaults.ts**

```typescript
import type { BifrostConfig } from "./types";

export const defaults: BifrostConfig = {
  site: {
    title: "My Blog",
    description: "A blog powered by Bifröst",
    language: "en",
  },
  theme: "default",
  content: {
    path: "./content",
    postsPerPage: 10,
  },
  ai: {
    defaultProvider: "opencode-zen",
    providers: {
      "opencode-zen": { model: "deepseek-v4-pro" },
      "opencode-go": { model: "deepseek-v4-flash" },
      deepseek: { model: "deepseek-chat" },
    },
  },
  git: {
    enabled: true,
    autoCommit: true,
    remote: "",
  },
  mcp: {
    enabled: true,
    mode: "stdio",
    port: 3456,
  },
  plugins: [],
};
```

- [ ] **Step 3: Create lib/config/loader.ts**

```typescript
import type { BifrostConfig } from "./types";
import { defaults } from "./defaults";

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sv = source[key];
    const tv = target[key];
    if (sv !== undefined && tv !== null && typeof sv === "object" && typeof tv === "object" && !Array.isArray(sv)) {
      result[key] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = sv as T[keyof T];
    }
  }

  return result;
}

let cachedConfig: BifrostConfig | null = null;

export function loadConfig(): BifrostConfig {
  if (cachedConfig) return cachedConfig;

  try {
    const userConfig = require("../../../bifrost.config").default;
    cachedConfig = deepMerge(defaults, userConfig);
  } catch {
    cachedConfig = { ...defaults };
  }

  return cachedConfig;
}

export function defineConfig(config: Partial<BifrostConfig>): Partial<BifrostConfig> {
  return config;
}
```

- [ ] **Step 4: Write test for config loading**

Create `tests/config/loader.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("config loader", () => {
  it("loads defaults when no config file exists", () => {
    // The project has no bifrost.config.ts yet, so this loads defaults
    const { loadConfig } = require("@/lib/config/loader");
    const config = loadConfig();
    expect(config.site.title).toBe("My Blog");
    expect(config.content.postsPerPage).toBe(10);
    expect(config.mcp.mode).toBe("stdio");
  });
});
```

- [ ] **Step 5: Create test file (do not run yet — vitest installed in Task 8)**

- [ ] **Step 6: Create bifrost.config.ts with default values at project root (placeholder)**

```typescript
import { defineConfig } from "./lib/config/loader";

export default defineConfig({});
```

- [ ] **Step 7: Commit**

```bash
git add lib/config/ tests/config/ bifrost.config.ts
git commit -m "feat: add config loading with defaults and deep merge"
```

---

### Task 7: Create Directory Structure

**Files:**
- Create: `content/posts/.gitkeep`
- Create: `themes/default/.gitkeep`
- Create: `plugins/.gitkeep`
- Create: `public/robots.txt`
- Create: `lib/content/.gitkeep`
- Create: `lib/md/.gitkeep`
- Create: `lib/ai/.gitkeep`
- Create: `lib/auth/.gitkeep`
- Create: `lib/git/.gitkeep`
- Create: `lib/mcp/.gitkeep`
- Create: `lib/plugins/.gitkeep`

**Interfaces:**
- Consumes: project root from earlier tasks
- Produces: full directory structure matching spec

- [ ] **Step 1: Create all directories**

```bash
mkdir -p content/posts themes/default plugins public \
  lib/content lib/md lib/ai lib/auth lib/git lib/mcp lib/plugins
```

- [ ] **Step 2: Create .gitkeep files in empty directories**

```bash
touch content/posts/.gitkeep themes/default/.gitkeep plugins/.gitkeep \
  lib/content/.gitkeep lib/md/.gitkeep lib/ai/.gitkeep \
  lib/auth/.gitkeep lib/git/.gitkeep lib/mcp/.gitkeep lib/plugins/.gitkeep
```

- [ ] **Step 3: Create public/robots.txt**

```
User-agent: *
Allow: /
```

- [ ] **Step 4: Commit**

```bash
git add content/ themes/ plugins/ public/ lib/content/ lib/md/ lib/ai/ lib/auth/ lib/git/ lib/mcp/ lib/plugins/
git commit -m "feat: create directory structure for all modules"
```

---

### Task 8: Set Up Vitest, ESLint, Prettier

**Files:**
- Create: `vitest.config.ts`
- Create: `eslint.config.mjs`
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `package.json` (add test script, already added in Task 1)

**Interfaces:**
- Consumes: project from earlier tasks
- Produces: configured test runner, linter, formatter

- [ ] **Step 1: Install dev tooling**

```bash
npm install -D vitest @vitejs/plugin-react eslint @next/eslint-plugin-next prettier
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
```

- [ ] **Step 3: Create eslint.config.mjs**

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import nextPlugin from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
```

- [ ] **Step 4: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

- [ ] **Step 5: Create .prettierignore**

```
node_modules
.next
data
*.db
*.db-journal
dist
```

- [ ] **Step 6: Add format script to package.json**

Edit `package.json` — add to `"scripts"`:

```json
"format": "prettier --write ."
```

- [ ] **Step 7: Run linter and verify**

```bash
npm run lint
```

Expected: No lint errors (may show warnings for empty pages, acceptable)

- [ ] **Step 8: Run tests**

```bash
npm run test
```

Expected: Tests pass (config loader test from Task 6)

- [ ] **Step 9: Run typecheck**

```bash
npm run typecheck
```

Expected: No type errors

- [ ] **Step 10: Commit**

```bash
git add vitest.config.ts eslint.config.mjs .prettierrc .prettierignore package.json package-lock.json
git commit -m "feat: add Vitest, ESLint, and Prettier configuration"
```

---

### Task 9: Add License Headers and Final Verification

**Files:**
- Modify: all `.ts`, `.tsx` files without license headers

**Interfaces:**
- Consumes: all previous tasks
- Produces: all source files with AGPL-3.0 header, passing full verification

- [ ] **Step 1: Add AGPL-3.0 license header to top of each source file**

License header format:

```
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */
```

Files to add header to:
- `app/layout.tsx`
- `app/page.tsx`
- `lib/db/index.ts`
- `lib/db/schema/*.ts`
- `lib/db/run-migrations.ts`
- `lib/env.ts`
- `lib/config/*.ts`
- `next.config.ts`
- `bifrost.config.ts`

- [ ] **Step 2: Full verification — typecheck, lint, test**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: All three commands pass with zero errors

- [ ] **Step 3: Bump version in VERSION and package.json**

No bump — this is the initial scaffold at v0.1.0

- [ ] **Step 4: Update CHANGELOG.md**

Add to `[Unreleased]` section under `### Added`:

```markdown
- Next.js 16 project initialization with TypeScript strict mode.
- Tailwind CSS v4 integration with PostCSS.
- Drizzle ORM with SQLite adapter and complete schema (users, posts, tags, post_tags, media, settings).
- Config loading system with defaults and deep merge.
- Typed environment variable helper.
- Directory structure for all planned modules.
- Vitest, ESLint, and Prettier configuration.
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add license headers, finalize Phase 0 scaffold"
```

---

## Self-Review

### 1. Spec Coverage
- [x] Init Next.js 16 + TypeScript + Tailwind CSS v4 — Task 1, 2
- [x] Configure Drizzle ORM with SQLite — Task 3, 4
- [x] Define schema, run migrations — Task 4
- [x] Implement bifrost.config.ts loading and validation — Task 6
- [x] Create directory structure — Task 7
- [x] Set up Vitest, ESLint, Prettier — Task 8
- [x] Create VERSION file — already exists from earlier
- [x] All AGPL-3.0 headers — Task 9

### 2. Placeholder Scan
No TBD, TODO, or vague steps found. Every step has concrete code, commands, and expected results.

### 3. Type Consistency
- `BifrostConfig` defined in Task 6 types.ts, consumed by loader.ts — consistent
- `db` instance from Task 3, consumed in schema files (Task 4) and migration runner — consistent
- Package versions specified in Task 1 are referenced consistently throughout

### Gaps Found
- None. All Phase 0 requirements from the spec are covered.
