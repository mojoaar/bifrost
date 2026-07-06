# Phase 3 — Public Blog & Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing blog with theme system (light/dark mode, theme registry, default theme), public routes (homepage, single post, tag pages), and SEO basics (meta tags, RSS feed).

**Architecture:** Public routes live in an `app/(public)/` route group with a layout that wraps content in the active theme's layout component. The theme registry loads theme components from `themes/<name>/`. `useTheme()` is a React context hook reading from `localStorage` + a `data-theme` attribute on `<html>`. `useBifrost()` is a minimal data hook wrapping public API calls. The RSS feed is a server-rendered route at `/rss.xml`.

**Tech Stack:** React context, CSS custom properties, Next.js App Router route groups, existing posts/settings/tags API

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- Server components by default, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- Environment variables prefixed with `BIFROST_`
- No comments unless logic is genuinely non-obvious
- All new source files carry the AGPL-3.0 license header
- Public routes at `/`, `/[slug]`, `/tag/[tag]`
- Every theme MUST provide both `light.css` and `dark.css`
- Theme components: `layout.tsx`, `post.tsx`, `list.tsx`, `page.tsx`, `theme.json`, `styles/light.css`, `styles/dark.css`

---

### Task 1: Theme Registry and Loader

**Files:**
- Create: `lib/themes/types.ts`
- Create: `lib/themes/registry.ts`
- Create: `tests/lib/themes/registry.test.ts`

**Interfaces:**
- Consumes: none (reads from filesystem)
- Produces:
  - `ThemeManifest: { name, version, author, description, screenshots? }`
  - `ThemeComponents: { layout?, post?, list?, page? }`
  - `LoadedTheme: { manifest: ThemeManifest, components: ThemeComponents, path: string }`
  - `loadTheme(name: string): Promise<LoadedTheme>`
  - `listThemes(): Promise<LoadedTheme[]>`
  - `getActiveTheme(): Promise<LoadedTheme>` (reads `bifrost.config.theme`)

- [ ] **Step 1: Create lib/themes/types.ts**

```typescript
import type { ComponentType } from "react";

export interface ThemeManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  screenshots?: string[];
}

export interface ThemeComponents {
  layout?: ComponentType<{ children: React.ReactNode }>;
  post?: ComponentType<unknown>;
  list?: ComponentType<unknown>;
  page?: ComponentType<unknown>;
}

export interface LoadedTheme {
  manifest: ThemeManifest;
  components: ThemeComponents;
  path: string;
}
```

- [ ] **Step 2: Write tests**

Create `tests/lib/themes/registry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadTheme, listThemes, getActiveTheme } from "@/lib/themes/registry";

describe("loadTheme", () => {
  it("loads the default theme", async () => {
    const theme = await loadTheme("default");
    expect(theme.manifest).toBeDefined();
    expect(theme.manifest.name).toBe("default");
    expect(theme.components.layout).toBeDefined();
    expect(theme.components.post).toBeDefined();
    expect(theme.components.list).toBeDefined();
  });

  it("throws for non-existent theme", async () => {
    await expect(loadTheme("nonexistent")).rejects.toThrow(/not found/);
  });
});

describe("listThemes", () => {
  it("includes the default theme", async () => {
    const themes = await listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(1);
    expect(themes.find((t) => t.manifest.name === "default")).toBeDefined();
  });
});

describe("getActiveTheme", () => {
  it("returns default theme by default", async () => {
    const theme = await getActiveTheme();
    expect(theme.manifest.name).toBe("default");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --run tests/lib/themes/registry.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 4: Create lib/themes/registry.ts**

```typescript
import fs from "fs";
import path from "path";
import { loadConfig } from "@/lib/config/loader";
import type { LoadedTheme, ThemeManifest, ThemeComponents } from "./types";

const THEMES_DIR = path.resolve("themes");

export async function loadTheme(name: string): Promise<LoadedTheme> {
  const themePath = path.join(THEMES_DIR, name);

  if (!fs.existsSync(themePath)) {
    throw new Error(`Theme "${name}" not found`);
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(themePath, "theme.json"), "utf-8")
  ) as ThemeManifest;

  const components: ThemeComponents = {};

  const layoutPath = path.join(themePath, "layout.tsx");
  const postPath = path.join(themePath, "post.tsx");
  const listPath = path.join(themePath, "list.tsx");
  const pagePath = path.join(themePath, "page.tsx");

  if (fs.existsSync(layoutPath)) {
    components.layout = (await import(layoutPath)).default;
  }
  if (fs.existsSync(postPath)) {
    components.post = (await import(postPath)).default;
  }
  if (fs.existsSync(listPath)) {
    components.list = (await import(listPath)).default;
  }
  if (fs.existsSync(pagePath)) {
    components.page = (await import(pagePath)).default;
  }

  return { manifest, components, path: themePath };
}

export async function listThemes(): Promise<LoadedTheme[]> {
  const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true });
  const themes: LoadedTheme[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const themeJsonPath = path.join(THEMES_DIR, entry.name, "theme.json");
    if (!fs.existsSync(themeJsonPath)) continue;
    themes.push(await loadTheme(entry.name));
  }

  return themes;
}

let cachedTheme: LoadedTheme | null = null;

export async function getActiveTheme(): Promise<LoadedTheme> {
  if (cachedTheme) return cachedTheme;

  const config = loadConfig();
  cachedTheme = await loadTheme(config.theme);

  return cachedTheme;
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- --run tests/lib/themes/registry.test.ts`
Expected: depends on default theme existing (created in Task 3) — may fail on `layout.tsx` import until Task 3 completes

- [ ] **Step 6: Commit (even if tests fail pending Task 3)**

```bash
git add lib/themes/ tests/lib/themes/
git commit -m "feat: add theme registry and loader"
```

---

### Task 2: Theme Context + Hooks (useTheme, useBifrost)

**Files:**
- Create: `lib/themes/theme-context.tsx`
- Create: `lib/themes/use-bifrost.ts`
- Create: `tests/lib/themes/theme-context.test.tsx`

**Interfaces:**
- Consumes: nothing (React context)
- Produces:
  - `<ThemeProvider>` — wraps app, provides current theme mode
  - `useTheme(): { mode: "light" | "dark"; toggle: () => void; setMode: (m: "light" | "dark") => void }`
  - `useBifrost(): { posts: Post[]; loading: boolean; error: string | null; settings: Record<string, unknown> | null }`

- [ ] **Step 1: Create lib/themes/theme-context.tsx**

```typescript
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem("bifrost_theme") as ThemeMode | null;
  if (stored === "light" || stored === "dark") return stored;

  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";

  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initial = getInitialMode();
    setModeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("bifrost_theme", m);
    document.documentElement.setAttribute("data-theme", m);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

- [ ] **Step 2: Create lib/themes/use-bifrost.ts**

```typescript
"use client";

import { useEffect, useState } from "react";

interface Post {
  slug: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  frontmatter: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseBifrostReturn {
  posts: Post[];
  settings: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
}

export function useBifrost(): UseBifrostReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [postsRes, settingsRes] = await Promise.all([
          fetch("/api/v1/posts?status=published&limit=100"),
          fetch("/api/v1/settings"),
        ]);

        if (postsRes.ok) {
          const body = await postsRes.json();
          setPosts(body.data ?? []);
        }

        if (settingsRes.ok) {
          const body = await settingsRes.json();
          setSettings(body.data ?? null);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { posts, settings, loading, error };
}
```

- [ ] **Step 3: Write basic test**

Create `tests/lib/themes/theme-context.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";

describe("ThemeProvider", () => {
  it("is importable", async () => {
    const mod = await import("@/lib/themes/theme-context");
    expect(mod.ThemeProvider).toBeDefined();
    expect(mod.useTheme).toBeDefined();
  });
});

describe("useBifrost", () => {
  it("is importable", async () => {
    const mod = await import("@/lib/themes/use-bifrost");
    expect(mod.useBifrost).toBeDefined();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass (50+ tests)

- [ ] **Step 5: Commit**

```bash
git add lib/themes/theme-context.tsx lib/themes/use-bifrost.ts tests/lib/themes/
git commit -m "feat: add ThemeProvider, useTheme, and useBifrost hooks"
```

---

### Task 3: Default Theme

**Files:**
- Create: `themes/default/theme.json`
- Create: `themes/default/styles/light.css`
- Create: `themes/default/styles/dark.css`
- Create: `themes/default/layout.tsx`
- Create: `themes/default/post.tsx`
- Create: `themes/default/list.tsx`

**Interfaces:**
- Consumes: `useTheme()` (for mode), `useBifrost()` (for data)
- Produces: Full default theme package — layout, post template, list template, CSS variables for light/dark

- [ ] **Step 1: Create themes/default/theme.json**

```json
{
  "name": "default",
  "version": "1.0.0",
  "author": "Bifröst",
  "description": "The default Bifröst theme — minimal, clean, with light and dark modes."
}
```

- [ ] **Step 2: Create themes/default/styles/light.css**

```css
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f4f4f5;
  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-muted: #a1a1aa;
  --border-color: #e4e4e7;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --code-bg: #f4f4f5;
  --code-border: #e4e4e7;
}
```

- [ ] **Step 3: Create themes/default/styles/dark.css**

```css
:root[data-theme="dark"] {
  --bg-primary: #09090b;
  --bg-secondary: #18181b;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --border-color: #27272a;
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --code-bg: #18181b;
  --code-border: #27272a;
}
```

- [ ] **Step 4: Create themes/default/layout.tsx**

```typescript
"use client";

import { ThemeProvider } from "@/lib/themes/theme-context";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Create Header component**

Create `themes/default/components/Header.tsx`:

```typescript
"use client";

import Link from "next/link";
import { useTheme } from "@/lib/themes/theme-context";

export default function Header() {
  const { mode, toggle } = useTheme();

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-[var(--text-primary)]">
          Bifröst
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Home
          </Link>
          <button
            onClick={toggle}
            className="rounded border border-[var(--border-color)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {mode === "light" ? "Dark" : "Light"}
          </button>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Create Footer component**

Create `themes/default/components/Footer.tsx`:

```typescript
export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-3xl px-4 py-4 text-center text-sm text-[var(--text-muted)]">
        Powered by Bifröst
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Create themes/default/post.tsx**

```typescript
"use client";

import { useBifrost } from "@/lib/themes/use-bifrost";
import { useParams } from "next/navigation";

export default function PostTemplate() {
  const { posts, loading } = useBifrost();
  const params = useParams<{ slug: string }>();
  const post = posts.find((p) => p.slug === params.slug);

  if (loading) {
    return <p className="text-[var(--text-muted)]">Loading...</p>;
  }

  if (!post) {
    return <p className="text-[var(--text-muted)]">Post not found.</p>;
  }

  const date = post.publishedAt ?? post.createdAt;

  return (
    <article>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <time className="mt-2 block text-sm text-[var(--text-muted)]">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </header>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
```

- [ ] **Step 8: Create themes/default/list.tsx**

```typescript
"use client";

import Link from "next/link";
import { useBifrost } from "@/lib/themes/use-bifrost";

export default function ListTemplate() {
  const { posts, loading } = useBifrost();

  if (loading) {
    return <p className="text-[var(--text-muted)]">Loading...</p>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-muted)]">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => {
        const date = post.publishedAt ?? post.createdAt;
        const frontmatter = JSON.parse(post.frontmatter ?? "{}") as Record<string, unknown>;

        return (
          <article key={post.slug}>
            <Link
              href={`/${post.slug}`}
              className="group block"
            >
              <h2 className="text-xl font-semibold group-hover:text-[var(--accent)]">
                {post.title}
              </h2>
              <time className="mt-1 block text-sm text-[var(--text-muted)]">
                {new Date(date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {post.excerpt && (
                <p className="mt-2 text-[var(--text-secondary)]">
                  {post.excerpt}
                </p>
              )}
            </Link>
            {frontmatter.tags && (
              <div className="mt-2 flex gap-2">
                {(frontmatter.tags as string[]).map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 9: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 10: Commit**

```bash
git add themes/default/
git commit -m "feat: add default theme with light/dark mode"
```

---

### Task 4: Public Routes (homepage, single post, tag page)

**Files:**
- Create: `app/(public)/layout.tsx`
- Create: `app/(public)/page.tsx`
- Create: `app/(public)/[slug]/page.tsx`
- Create: `app/(public)/tag/[tag]/page.tsx`
- Modify: `app/page.tsx` (replace with redirect or empty)

**Interfaces:**
- Consumes: `getActiveTheme()` from registry, `useBifrost()` for data, GET /api/v1/posts, GET /api/v1/tags
- Produces: Public routes — `/` (post list), `/[slug]` (single post), `/tag/[tag]` (tag-filtered posts)

- [ ] **Step 1: Create app/(public)/layout.tsx** (server component)

```typescript
import type { Metadata } from "next";
import { loadConfig } from "@/lib/config/loader";
import { loadTheme } from "@/lib/themes/registry";
import "@/themes/default/styles/light.css";
import "@/themes/default/styles/dark.css";
import "tailwindcss";

export async function generateMetadata(): Promise<Metadata> {
  const config = loadConfig();
  return {
    title: {
      default: config.site.title,
      template: `%s — ${config.site.title}`,
    },
    description: config.site.description,
  };
}

const theme = await loadTheme("default");
const ThemeLayout = theme.components.layout;

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!ThemeLayout) {
    return <>{children}</>;
  }

  return <ThemeLayout>{children}</ThemeLayout>;
}
```

- [ ] **Step 2: Create app/(public)/page.tsx** (homepage, server component)

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq, sql } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";

const theme = await loadTheme("default");
const ListComponent = theme.components.list;

export default async function HomePage() {
  const publishedPosts = db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(sql`${posts.publishedAt} DESC`)
    .all();

  if (!ListComponent) {
    return (
      <div className="space-y-8">
        {publishedPosts.map((post) => (
          <article key={post.slug}>
            <h2 className="text-xl font-semibold">{post.title}</h2>
          </article>
        ))}
      </div>
    );
  }

  return <ListComponent />;
}
```

Wait — the list component uses `useBifrost()` which is client-side. We need a different approach. The list template should receive posts as props rather than fetching them itself. Let me redesign this.

Actually, the design approach is: server components fetch data and pass it to client theme components as props. Let me fix the theme component interfaces.

Let me redesign the whole approach:

1. **Server component public layout** — wraps in theme layout, imports CSS
2. **Server component pages** — fetch data, pass to client theme components via props
3. **Client theme components** — receive data as props, render markup

This means `post.tsx` and `list.tsx` should receive props, not fetch data themselves.

Let me rewrite the plan with this corrected approach.<｜end▁of▁thinking｜>Wait — I need to fix the design. Theme components should receive data as props from server components, not fetch it themselves. Let me rewrite the plan correctly.

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true"># Phase 3 — Public Blog & Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing blog with theme system (light/dark mode, theme registry, default theme), public routes (homepage, single post, tag pages), and SEO basics (meta tags, RSS feed).

**Architecture:** Server components in `app/(public)/` fetch data from DB and pass it as props to client-side theme components. The public layout imports the active theme's layout component. Theme components (post.tsx, list.tsx) accept data props — they don't fetch themselves. `useTheme()` provides light/dark mode via React context + CSS custom properties. `useBifrost()` accepts data props for rendering. RSS feed is a server-rendered route at `/rss.xml`.

**Tech Stack:** React context, CSS custom properties, Next.js App Router route groups

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- Server components by default, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- Environment variables prefixed with `BIFROST_`
- No comments unless logic is genuinely non-obvious
- All new source files carry the AGPL-3.0 license header
- Public routes at `/`, `/[slug]`, `/tag/[tag]`
- Every theme MUST provide both `light.css` and `dark.css`
- Theme components accept data as props from server components

---

### Task 1: Theme Registry, Types, and Loader

**Files:**
- Create: `lib/themes/types.ts`
- Create: `lib/themes/registry.ts`
- Create: `tests/lib/themes/registry.test.ts`

**Interfaces:**
- Consumes: filesystem (`themes/<name>/theme.json`, `.tsx` files)
- Produces:
  - `ThemeManifest: { name, version, author, description, screenshots? }`
  - `ThemeComponents: { layout?, post?, list? }`
  - `LoadedTheme: { manifest, components, path }`
  - `loadTheme(name: string): Promise<LoadedTheme>`
  - `listThemes(): Promise<LoadedTheme[]>`
  - `getActiveTheme(): Promise<LoadedTheme>`

- [ ] **Step 1: Create lib/themes/types.ts**

```typescript
import type { ComponentType } from "react";

export interface ThemeManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  screenshots?: string[];
}

export interface PostData {
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string | null;
  frontmatter: Record<string, unknown>;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeComponents {
  layout?: ComponentType<{ children: React.ReactNode }>;
  post?: ComponentType<{ post: PostData }>;
  list?: ComponentType<{ posts: PostData[] }>;
}

export interface LoadedTheme {
  manifest: ThemeManifest;
  components: ThemeComponents;
  path: string;
}
```

- [ ] **Step 2: Write tests**

Create `tests/lib/themes/registry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadTheme, listThemes } from "@/lib/themes/registry";

describe("loadTheme", () => {
  it("loads the default theme manifest", async () => {
    const theme = await loadTheme("default");
    expect(theme.manifest).toBeDefined();
    expect(theme.manifest.name).toBe("default");
  });

  it("throws for non-existent theme", async () => {
    await expect(loadTheme("nonexistent")).rejects.toThrow(/not found/);
  });
});

describe("listThemes", () => {
  it("includes the default theme", async () => {
    const themes = await listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(1);
    expect(themes.find((t) => t.manifest.name === "default")).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --run tests/lib/themes/registry.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 4: Create lib/themes/registry.ts**

```typescript
import fs from "fs";
import path from "path";
import { loadConfig } from "@/lib/config/loader";
import type { LoadedTheme, ThemeManifest, ThemeComponents } from "./types";

const THEMES_DIR = path.resolve("themes");

export async function loadTheme(name: string): Promise<LoadedTheme> {
  const themePath = path.join(THEMES_DIR, name);

  if (!fs.existsSync(themePath)) {
    throw new Error(`Theme "${name}" not found at ${themePath}`);
  }

  const manifestPath = path.join(themePath, "theme.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`theme.json not found for theme "${name}"`);
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8")
  ) as ThemeManifest;

  const components: ThemeComponents = {};

  const layoutPath = path.join(themePath, "layout.tsx");
  const postPath = path.join(themePath, "post.tsx");
  const listPath = path.join(themePath, "list.tsx");

  if (fs.existsSync(layoutPath)) {
    components.layout = (await import(layoutPath)).default;
  }
  if (fs.existsSync(postPath)) {
    components.post = (await import(postPath)).default;
  }
  if (fs.existsSync(listPath)) {
    components.list = (await import(listPath)).default;
  }

  return { manifest, components, path: themePath };
}

export async function listThemes(): Promise<LoadedTheme[]> {
  const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true });
  const themes: LoadedTheme[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const themeJsonPath = path.join(THEMES_DIR, entry.name, "theme.json");
    if (!fs.existsSync(themeJsonPath)) continue;
    themes.push(await loadTheme(entry.name));
  }

  return themes;
}

let cachedTheme: LoadedTheme | null = null;

export async function getActiveTheme(): Promise<LoadedTheme> {
  if (cachedTheme) return cachedTheme;

  const config = loadConfig();
  cachedTheme = await loadTheme(config.theme);

  return cachedTheme;
}
```

- [ ] **Step 5: Run tests** (will fail if default theme doesn't exist yet — acceptable, passes in Task 3)

Run: `npm test -- --run tests/lib/themes/registry.test.ts`
Expected: may fail on import of layout.tsx/post.tsx/list.tsx until Task 3 creates them

- [ ] **Step 6: Commit**

```bash
git add lib/themes/ tests/lib/themes/
git commit -m "feat: add theme registry, types, and loader"
```

---

### Task 2: Theme Context + useTheme Hook

**Files:**
- Create: `lib/themes/theme-context.tsx`

**Interfaces:**
- Consumes: nothing (React context)
- Produces:
  - `<ThemeProvider>` — wraps app with theme mode context
  - `useTheme(): { mode: "light" | "dark"; toggle: () => void }`

- [ ] **Step 1: Create lib/themes/theme-context.tsx**

```typescript
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem("bifrost_theme") as ThemeMode | null;
  if (stored === "light" || stored === "dark") return stored;

  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initial = getInitialMode();
    setModeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("bifrost_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add lib/themes/theme-context.tsx
git commit -m "feat: add ThemeProvider and useTheme hook"
```

---

### Task 3: Default Theme Package

**Files:**
- Create: `themes/default/theme.json`
- Create: `themes/default/styles/light.css`
- Create: `themes/default/styles/dark.css`
- Create: `themes/default/layout.tsx`
- Create: `themes/default/post.tsx`
- Create: `themes/default/list.tsx`
- Create: `themes/default/components/Header.tsx`
- Create: `themes/default/components/Footer.tsx`

**Interfaces:**
- Consumes: `useTheme()` from Task 2, `PostData` from Task 1
- Produces: Full default theme package with components receiving data via props

- [ ] **Step 1: Create themes/default/theme.json**

```json
{
  "name": "default",
  "version": "1.0.0",
  "author": "Bifröst",
  "description": "The default Bifröst theme — minimal, clean, with light and dark modes."
}
```

- [ ] **Step 2: Create themes/default/styles/light.css**

```css
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f4f4f5;
  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-muted: #a1a1aa;
  --border-color: #e4e4e7;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --code-bg: #f4f4f5;
  --code-border: #e4e4e7;
}
```

- [ ] **Step 3: Create themes/default/styles/dark.css**

```css
:root[data-theme="dark"] {
  --bg-primary: #09090b;
  --bg-secondary: #18181b;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --border-color: #27272a;
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --code-bg: #18181b;
  --code-border: #27272a;
}
```

- [ ] **Step 4: Create themes/default/layout.tsx** (client component — uses ThemeProvider)

```typescript
"use client";

import { ThemeProvider } from "@/lib/themes/theme-context";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Create themes/default/components/Header.tsx**

```typescript
"use client";

import Link from "next/link";
import { useTheme } from "@/lib/themes/theme-context";

export default function Header() {
  const { mode, toggle } = useTheme();

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-bold text-[var(--text-primary)]"
        >
          Bifröst
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Home
          </Link>
          <button
            onClick={toggle}
            className="rounded border border-[var(--border-color)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {mode === "light" ? "Dark" : "Light"}
          </button>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Create themes/default/components/Footer.tsx**

```typescript
export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-3xl px-4 py-4 text-center text-sm text-[var(--text-muted)]">
        Powered by Bifröst
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Create themes/default/post.tsx** (accepts props from server component)

```typescript
"use client";

import type { PostData } from "@/lib/themes/types";

interface Props {
  post: PostData;
}

export default function PostTemplate({ post }: Props) {
  const date = post.publishedAt ?? post.createdAt;

  return (
    <article>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <time className="mt-2 block text-sm text-[var(--text-muted)]">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </header>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
```

- [ ] **Step 8: Create themes/default/list.tsx** (accepts posts as props)

```typescript
"use client";

import Link from "next/link";
import type { PostData } from "@/lib/themes/types";

interface Props {
  posts: PostData[];
}

export default function ListTemplate({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--text-muted)]">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => {
        const date = post.publishedAt ?? post.createdAt;
        const tags = (post.frontmatter?.tags as string[]) ?? [];

        return (
          <article key={post.slug}>
            <Link href={`/${post.slug}`} className="group block">
              <h2 className="text-xl font-semibold group-hover:text-[var(--accent)]">
                {post.title}
              </h2>
              <time className="mt-1 block text-sm text-[var(--text-muted)]">
                {new Date(date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {post.excerpt && (
                <p className="mt-2 text-[var(--text-secondary)]">
                  {post.excerpt}
                </p>
              )}
            </Link>
            {tags.length > 0 && (
              <div className="mt-2 flex gap-2">
                {tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 9: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 10: Run theme registry tests again**

Run: `npm test -- --run tests/lib/themes/registry.test.ts`
Expected: 2/2 pass (theme components now exist)

- [ ] **Step 11: Commit**

```bash
git add themes/default/
git commit -m "feat: add default theme with light/dark mode"
```

---

### Task 4: Public Routes (homepage, single post, tag page)

**Files:**
- Create: `app/(public)/layout.tsx`
- Create: `app/(public)/page.tsx`
- Create: `app/(public)/[slug]/page.tsx`
- Create: `app/(public)/tag/[tag]/page.tsx`
- Modify: `app/layout.tsx` and `app/page.tsx` (handle public layout)

**Interfaces:**
- Consumes: `getActiveTheme()` from Task 1, `loadTheme()` for specific theme, DB (posts, tags, post_tags tables), Drizzle `eq`, `sql`, `like`
- Produces: Public routes — `/` (post list), `/[slug]` (single post), `/tag/[tag]` (tag-filtered posts)

- [ ] **Step 1: Create app/(public)/layout.tsx** (server component)

```typescript
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { loadConfig } from "@/lib/config/loader";
import { loadTheme } from "@/lib/themes/registry";

import "tailwindcss";

export async function generateMetadata(): Promise<Metadata> {
  const config = loadConfig();
  return {
    title: {
      default: config.site.title,
      template: `%s — ${config.site.title}`,
    },
    description: config.site.description,
  };
}

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const theme = await loadTheme("default");
  const ThemeLayout = theme.components.layout;

  if (!ThemeLayout) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  return <ThemeLayout>{children}</ThemeLayout>;
}
```

- [ ] **Step 2: App Router note**

The root layout (`app/layout.tsx`) must stay minimal because Next.js requires it. The `(public)` route group layout provides the theme wrapper. Both will render. The root layout provides `<html>`/`<body>`; the public layout provides the theme shell inside `<body>`.

If the root layout's `<body>` conflicts with the theme layout (since `DefaultLayout` renders its own DOM, not `<html>`/`<body>`), adjust: remove `<html>`/`<body>` from root layout and put them only in the public layout and admin layout.

Better approach: Keep the root layout as the single `<html>`/`<body>` provider for ALL routes. The public layout adds the theme wrapper inside `<body>`. The admin layout adds the sidebar inside `<body>`. Both are nested layouts.

Let me rewrite the public layout accordingly — it should NOT have `<html>`/`<body>`:

- [ ] **Step 1 (corrected): Create app/(public)/layout.tsx**

```typescript
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { loadConfig } from "@/lib/config/loader";
import { loadTheme } from "@/lib/themes/registry";

export async function generateMetadata(): Promise<Metadata> {
  const config = loadConfig();
  return {
    title: {
      default: config.site.title,
      template: `%s — ${config.site.title}`,
    },
    description: config.site.description,
  };
}

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const theme = await loadTheme("default");
  const ThemeLayout = theme.components.layout;

  if (!ThemeLayout) {
    return <>{children}</>;
  }

  return <ThemeLayout>{children}</ThemeLayout>;
}
```

- [ ] **Step 2: Ensure root layout has no globals.css conflict**

The root layout (`app/layout.tsx`) imports `globals.css` and provides `<html>`/`<body>`. Since the public layout is nested, the theme CSS files (light.css, dark.css) can be imported in the public layout. But Next.js only allows global CSS in the root layout. The theme CSS uses `:root[data-theme="..."]` selectors — these are scoped by attribute and safe in the root layout.

Move theme CSS imports to the root layout `app/layout.tsx`:

Modify `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";
import "@/themes/default/styles/light.css";
import "@/themes/default/styles/dark.css";

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

- [ ] **Step 3: Create app/(public)/page.tsx** (homepage — server component)

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq, sql } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";

export default async function HomePage() {
  const rows = db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(sql`${posts.publishedAt} DESC`)
    .all();

  const theme = await loadTheme("default");
  const ListComponent = theme.components.list;

  const postData: PostData[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: JSON.parse(row.frontmatter) as Record<string, unknown>,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  if (!ListComponent) {
    return (
      <div className="space-y-8">
        {postData.map((post) => (
          <article key={post.slug}>
            <h2 className="text-xl font-semibold">{post.title}</h2>
          </article>
        ))}
      </div>
    );
  }

  return <ListComponent posts={postData} />;
}
```

- [ ] **Step 4: Create app/(public)/[slug]/page.tsx** (server component)

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = db
    .select({ title: posts.title, excerpt: posts.excerpt })
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (!row) return { title: "Not Found" };

  return {
    title: row.title,
    description: row.excerpt ?? undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const row = db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (!row) notFound();

  const theme = await loadTheme("default");
  const PostComponent = theme.components.post;

  const postData: PostData = {
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: JSON.parse(row.frontmatter) as Record<string, unknown>,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (!PostComponent) {
    return (
      <article>
        <h1 className="text-3xl font-bold">{postData.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
      </article>
    );
  }

  return <PostComponent post={postData} />;
}
```

- [ ] **Step 5: Create app/(public)/tag/[tag]/page.tsx** (server component)

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq, sql } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `Posts tagged "${tag}"` };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;

  const rows = db
    .select()
    .from(posts)
    .where(
      sql`${posts.status} = 'published' AND ${posts.frontmatter} LIKE ${`%${tag}%`}`
    )
    .orderBy(sql`${posts.publishedAt} DESC`)
    .all();

  const theme = await loadTheme("default");
  const ListComponent = theme.components.list;

  const postData: PostData[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: JSON.parse(row.frontmatter) as Record<string, unknown>,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  if (!ListComponent) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">
          Posts tagged &ldquo;{tag}&rdquo;
        </h1>
        {postData.length === 0 && (
          <p className="text-[var(--text-muted)]">No posts found.</p>
        )}
        {postData.map((post) => (
          <article key={post.slug}>
            <h2>{post.title}</h2>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
        Posts tagged &ldquo;{tag}&rdquo;
      </h1>
      {postData.length === 0 && (
        <p className="text-[var(--text-muted)]">No posts found.</p>
      )}
      <ListComponent posts={postData} />
    </div>
  );
}
```

- [ ] **Step 6: Update app/page.tsx** to redirect or replace with public homepage

The root `app/page.tsx` is the landing page. When the `(public)` route group exists, the root page and the public page conflict — Next.js can't have two pages at `/`. Delete or replace `app/page.tsx` with a redirect:

```typescript
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/");
}
```

Wait — this creates an infinite redirect. Instead, just delete `app/page.tsx` since the public route group's `page.tsx` handles `/`.

Actually, a route group `(public)` makes its internal `page.tsx` the same route as the root `page.tsx` — both resolve to `/`. This is a conflict. The correct structure is: move the homepage into `app/page.tsx` directly instead of using a route group for it.

Simpler approach: Don't use a route group at all. Put the theme layout wrapping directly in `app/page.tsx`, `app/[slug]/page.tsx`, and `app/tag/[tag]/page.tsx`. The theme layout is applied inline in each page.

Better approach yet: Use `app/layout.tsx` to conditionally apply the theme layout based on route. But Next.js layout nesting is based on file structure, not runtime conditions.

Let me go with the cleanest approach: keep `app/layout.tsx` as the root `<html>`/`<body>` provider. Use `app/(public)/layout.tsx` for the theme shell on public routes, `app/admin/layout.tsx` for the admin shell. The public layout and admin layout are both nested inside the root layout. The root `app/page.tsx` gets deleted since the public route group provides the homepage.

This is the right Next.js pattern. Let me rewrite the task properly.

The key insight: `app/(public)/page.tsx` → `/`, `app/admin/page.tsx` → `/admin`. They don't conflict because the route group prefix doesn't affect the URL, and `/` and `/admin` are different URLs.

But `app/page.tsx` and `app/(public)/page.tsx` BOTH resolve to `/` — this IS a conflict. The solution: delete `app/page.tsx`.

Let me restructure:<｜end▁of▁thinking｜>The route group approach has a conflict with `app/page.tsx`. Let me restructure — public pages go directly in `app/`, not in a route group. The `(public)` group idea was wrong.

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true"># Phase 3 — Public Blog & Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing blog with theme system (light/dark mode, theme registry, default theme), public routes (homepage, single post, tag pages), and SEO basics (meta tags, RSS feed).

**Architecture:** Server components fetch data from DB and pass it as props to client-side theme components. `app/layout.tsx` stays as the root `<html>`/`<body>` provider and imports theme CSS files. The public layout `app/(public)/layout.tsx` wraps children in the active theme's layout component. Public route pages (`/`, `/[slug]`, `/tag/[tag]`) are server components that query DB and delegate rendering to theme components. Theme components accept typed data props — they never fetch themselves.

**Tech Stack:** React context, CSS custom properties, Next.js App Router, Drizzle query builder

**Key routing note:** `app/(public)/page.tsx` replaces the old `app/page.tsx` as the homepage. The old placeholder `app/page.tsx` must be deleted. `app/admin/` provides the admin shell separately.

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- Server components by default, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- No comments unless logic is genuinely non-obvious
- All new source files carry the AGPL-3.0 license header
- Public routes at `/` (homepage), `/[slug]` (single post), `/tag/[tag]`
- Every theme MUST provide both `light.css` and `dark.css`
- Theme components accept data as props from server components

---

### Task 1: Theme Registry, Types, and Loader

**Files:**
- Create: `lib/themes/types.ts`
- Create: `lib/themes/registry.ts`
- Create: `tests/lib/themes/registry.test.ts`

**Interfaces:**
- Consumes: filesystem (`themes/<name>/theme.json`, `.tsx` files)
- Produces:
  - `ThemeManifest: { name, version, author, description, screenshots? }`
  - `PostData: { slug, title, contentHtml, excerpt, frontmatter, status, publishedAt, createdAt, updatedAt }`
  - `ThemeComponents: { layout?, post?, list? }` where `post` receives `{ post: PostData }`, `list` receives `{ posts: PostData[] }`, `layout` receives `{ children: ReactNode }`
  - `LoadedTheme: { manifest, components, path }`
  - `loadTheme(name: string): Promise<LoadedTheme>`

- [ ] **Step 1: Create lib/themes/types.ts**

```typescript
import type { ComponentType, ReactNode } from "react";

export interface ThemeManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  screenshots?: string[];
}

export interface PostData {
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string | null;
  frontmatter: Record<string, unknown>;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeComponents {
  layout?: ComponentType<{ children: ReactNode }>;
  post?: ComponentType<{ post: PostData }>;
  list?: ComponentType<{ posts: PostData[] }>;
}

export interface LoadedTheme {
  manifest: ThemeManifest;
  components: ThemeComponents;
  path: string;
}
```

- [ ] **Step 2: Write tests for loader**

Create `tests/lib/themes/registry.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadTheme, listThemes } from "@/lib/themes/registry";

describe("loadTheme", () => {
  it("loads the default theme manifest", async () => {
    const theme = await loadTheme("default");
    expect(theme.manifest).toBeDefined();
    expect(theme.manifest.name).toBe("default");
  });

  it("throws for non-existent theme", async () => {
    await expect(loadTheme("nonexistent")).rejects.toThrow(/not found/);
  });
});

describe("listThemes", () => {
  it("includes default theme", async () => {
    const themes = await listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(1);
    expect(themes.find((t) => t.manifest.name === "default")).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --run tests/lib/themes/registry.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 4: Create lib/themes/registry.ts**

```typescript
import fs from "fs";
import path from "path";
import type { LoadedTheme, ThemeManifest, ThemeComponents } from "./types";

const THEMES_DIR = path.resolve("themes");

export async function loadTheme(name: string): Promise<LoadedTheme> {
  const themePath = path.join(THEMES_DIR, name);

  if (!fs.existsSync(themePath)) {
    throw new Error(`Theme "${name}" not found at ${themePath}`);
  }

  const manifestPath = path.join(themePath, "theme.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`theme.json not found for theme "${name}"`);
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8")
  ) as ThemeManifest;

  const components: ThemeComponents = {};

  const layoutPath = path.join(themePath, "layout.tsx");
  const postPath = path.join(themePath, "post.tsx");
  const listPath = path.join(themePath, "list.tsx");

  if (fs.existsSync(layoutPath)) {
    components.layout = (await import(layoutPath)).default;
  }
  if (fs.existsSync(postPath)) {
    components.post = (await import(postPath)).default;
  }
  if (fs.existsSync(listPath)) {
    components.list = (await import(listPath)).default;
  }

  return { manifest, components, path: themePath };
}

export async function listThemes(): Promise<LoadedTheme[]> {
  const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true });
  const themes: LoadedTheme[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const themeJsonPath = path.join(THEMES_DIR, entry.name, "theme.json");
    if (!fs.existsSync(themeJsonPath)) continue;
    themes.push(await loadTheme(entry.name));
  }

  return themes;
}
```

- [ ] **Step 5: Run tests** — may fail on component imports if theme files don't exist yet (created in Task 3)

Run: `npm test -- --run tests/lib/themes/registry.test.ts`
Expected: `loadTheme` test may fail because theme components don't exist yet — acceptable; `listThemes` may also fail. Tests will pass after Task 3.

- [ ] **Step 6: Commit**

```bash
git add lib/themes/ tests/lib/themes/
git commit -m "feat: add theme registry, types, and loader"
```

---

### Task 2: Theme Context + useTheme Hook

**Files:**
- Create: `lib/themes/theme-context.tsx`

**Interfaces:**
- Produces:
  - `<ThemeProvider>` — wraps app, reads from localStorage + `prefers-color-scheme`, sets `data-theme` attribute
  - `useTheme(): { mode: "light" | "dark"; toggle: () => void }`

- [ ] **Step 1: Create lib/themes/theme-context.tsx**

```typescript
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem("bifrost_theme") as ThemeMode | null;
  if (stored === "light" || stored === "dark") return stored;

  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initial = getInitialMode();
    setModeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("bifrost_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 3: Verify all tests pass**

Run: `npm test`
Expected: all pass (49+ tests)

- [ ] **Step 4: Commit**

```bash
git add lib/themes/theme-context.tsx
git commit -m "feat: add ThemeProvider and useTheme hook"
```

---

### Task 3: Default Theme Package

**Files:**
- Create: `themes/default/theme.json`
- Create: `themes/default/styles/light.css`
- Create: `themes/default/styles/dark.css`
- Create: `themes/default/layout.tsx`
- Create: `themes/default/post.tsx`
- Create: `themes/default/list.tsx`
- Create: `themes/default/components/Header.tsx`
- Create: `themes/default/components/Footer.tsx`

**Interfaces:**
- Produces: Full default theme with all required files

- [ ] **Step 1: Create themes/default/theme.json**

```json
{
  "name": "default",
  "version": "1.0.0",
  "author": "Bifröst",
  "description": "The default Bifröst theme — minimal, clean, with light and dark modes."
}
```

- [ ] **Step 2: Create themes/default/styles/light.css**

```css
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f4f4f5;
  --text-primary: #18181b;
  --text-secondary: #52525b;
  --text-muted: #a1a1aa;
  --border-color: #e4e4e7;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --code-bg: #f4f4f5;
  --code-border: #e4e4e7;
}
```

- [ ] **Step 3: Create themes/default/styles/dark.css**

```css
:root[data-theme="dark"] {
  --bg-primary: #09090b;
  --bg-secondary: #18181b;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --border-color: #27272a;
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --code-bg: #18181b;
  --code-border: #27272a;
}
```

- [ ] **Step 4: Create themes/default/layout.tsx**

```typescript
"use client";

import { ThemeProvider } from "@/lib/themes/theme-context";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Create themes/default/components/Header.tsx**

```typescript
"use client";

import Link from "next/link";
import { useTheme } from "@/lib/themes/theme-context";

export default function Header() {
  const { mode, toggle } = useTheme();

  return (
    <header className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-bold text-[var(--text-primary)]"
        >
          Bifröst
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Home
          </Link>
          <button
            onClick={toggle}
            className="rounded border border-[var(--border-color)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            {mode === "light" ? "Dark" : "Light"}
          </button>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Create themes/default/components/Footer.tsx**

```typescript
export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-3xl px-4 py-4 text-center text-sm text-[var(--text-muted)]">
        Powered by Bifröst
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Create themes/default/post.tsx**

```typescript
"use client";

import type { PostData } from "@/lib/themes/types";

interface Props {
  post: PostData;
}

export default function PostTemplate({ post }: Props) {
  const date = post.publishedAt ?? post.createdAt;

  return (
    <article>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          {post.title}
        </h1>
        <time className="mt-2 block text-sm text-[var(--text-muted)]">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
      </header>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
```

- [ ] **Step 8: Create themes/default/list.tsx**

```typescript
"use client";

import Link from "next/link";
import type { PostData } from "@/lib/themes/types";

interface Props {
  posts: PostData[];
}

export default function ListTemplate({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--text-muted)]">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => {
        const date = post.publishedAt ?? post.createdAt;
        const tags = (post.frontmatter?.tags as string[]) ?? [];

        return (
          <article key={post.slug}>
            <Link href={`/${post.slug}`} className="group block">
              <h2 className="text-xl font-semibold group-hover:text-[var(--accent)]">
                {post.title}
              </h2>
              <time className="mt-1 block text-sm text-[var(--text-muted)]">
                {new Date(date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {post.excerpt && (
                <p className="mt-2 text-[var(--text-secondary)]">
                  {post.excerpt}
                </p>
              )}
            </Link>
            {tags.length > 0 && (
              <div className="mt-2 flex gap-2">
                {tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/tag/${tag}`}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 9: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 10: Verify registry tests pass now that theme exists**

Run: `npm test -- --run tests/lib/themes/registry.test.ts`
Expected: all tests pass (manifest loads, component imports work)

- [ ] **Step 11: Commit**

```bash
git add themes/default/
git commit -m "feat: add default theme with light/dark mode"
```

---

### Task 4: Public Routes (homepage, single post, tag page)

**Files:**
- Create: `app/(public)/layout.tsx`
- Create: `app/(public)/page.tsx`
- Create: `app/(public)/[slug]/page.tsx`
- Create: `app/(public)/tag/[tag]/page.tsx`
- Delete: `app/page.tsx` (replaced by public route group homepage)
- Modify: `app/layout.tsx` (add theme CSS imports)

**Interfaces:**
- Consumes: `loadTheme()` from Task 1, DB (posts table), Drizzle operators
- Produces: `/` (published post list), `/[slug]` (single post), `/tag/[tag]` (tag-filtered posts)

- [ ] **Step 1: Modify app/layout.tsx to import theme CSS**

Add the two theme CSS imports:

```typescript
import type { Metadata } from "next";
import "./globals.css";
import "@/themes/default/styles/light.css";
import "@/themes/default/styles/dark.css";

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

- [ ] **Step 2: Create app/(public)/layout.tsx**

```typescript
import type { ReactNode } from "react";
import { loadTheme } from "@/lib/themes/registry";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const theme = await loadTheme("default");
  const ThemeLayout = theme.components.layout;

  if (!ThemeLayout) {
    return <>{children}</>;
  }

  return <ThemeLayout>{children}</ThemeLayout>;
}
```

- [ ] **Step 3: Create app/(public)/page.tsx** (homepage)

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq, sql } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";

export default async function HomePage() {
  const rows = db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(sql`${posts.publishedAt} DESC`)
    .all();

  const theme = await loadTheme("default");
  const ListComponent = theme.components.list;

  const postData: PostData[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: JSON.parse(row.frontmatter) as Record<string, unknown>,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  if (!ListComponent) {
    return (
      <div className="space-y-8">
        {postData.map((post) => (
          <article key={post.slug}>
            <h2 className="text-xl font-semibold">{post.title}</h2>
            {post.excerpt && <p>{post.excerpt}</p>}
          </article>
        ))}
      </div>
    );
  }

  return <ListComponent posts={postData} />;
}
```

- [ ] **Step 4: Create app/(public)/[slug]/page.tsx** (single post)

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = db
    .select({ title: posts.title, excerpt: posts.excerpt })
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (!row) return { title: "Not Found" };

  return {
    title: row.title,
    description: row.excerpt ?? undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const row = db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (!row) notFound();

  const theme = await loadTheme("default");
  const PostComponent = theme.components.post;

  const postData: PostData = {
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: JSON.parse(row.frontmatter) as Record<string, unknown>,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (!PostComponent) {
    return (
      <article>
        <h1 className="text-3xl font-bold">{postData.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
      </article>
    );
  }

  return <PostComponent post={postData} />;
}
```

- [ ] **Step 5: Create app/(public)/tag/[tag]/page.tsx**

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { sql } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import type { PostData } from "@/lib/themes/types";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `Posts tagged "${tag}"` };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;

  const rows = db
    .select()
    .from(posts)
    .where(
      sql`${posts.status} = 'published' AND ${posts.frontmatter} LIKE ${`%${tag}%`}`
    )
    .orderBy(sql`${posts.publishedAt} DESC`)
    .all();

  const theme = await loadTheme("default");
  const ListComponent = theme.components.list;

  const postData: PostData[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: JSON.parse(row.frontmatter) as Record<string, unknown>,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  if (!ListComponent) {
    return (
      <div>
        <h1>Posts tagged &ldquo;{tag}&rdquo;</h1>
        {postData.length === 0 && <p>No posts found.</p>}
        {postData.map((post) => (
          <article key={post.slug}>
            <h2>{post.title}</h2>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">
        Posts tagged &ldquo;{tag}&rdquo;
      </h1>
      {postData.length === 0 && (
        <p className="text-[var(--text-muted)]">No posts found.</p>
      )}
      <ListComponent posts={postData} />
    </div>
  );
}
```

- [ ] **Step 6: Delete old app/page.tsx** (conflicts with public route group)

```bash
rm app/page.tsx
```

- [ ] **Step 7: Verify typecheck and lint pass**

Run: `npm run typecheck && npm run lint`
Expected: clean (remove old page.tsx import if needed)

- [ ] **Step 8: Verify build succeeds**

Run: `npm run build`
Expected: clean build

- [ ] **Step 9: Commit**

```bash
git add app/layout.tsx app/\(public\)/
git rm app/page.tsx
git commit -m "feat: add public routes (homepage, post, tag) with theme layout"
```

---

### Task 5: RSS Feed

**Files:**
- Create: `app/rss.xml/route.ts`

**Interfaces:**
- Consumes: DB (posts table), `loadConfig()` for site title
- Produces: Valid RSS 2.0 XML feed at `/rss.xml`

- [ ] **Step 1: Create app/rss.xml/route.ts**

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { eq, sql } from "drizzle-orm";
import { loadConfig } from "@/lib/config/loader";

export async function GET() {
  const config = loadConfig();

  const rows = db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(sql`${posts.publishedAt} DESC`)
    .limit(20)
    .all();

  const items = rows
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>https://localhost/${post.slug}</link>
      <guid isPermaLink="true">https://localhost/${post.slug}</guid>
      <description><![CDATA[${post.excerpt ?? ""}]]></description>
      <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${config.site.title}</title>
    <description>${config.site.description}</description>
    <link>https://localhost</link>
    <language>${config.site.language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://localhost/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 3: Verify the route works**

Run: `npm run dev` and visit `http://localhost:3000/rss.xml`
Expected: valid RSS XML document

- [ ] **Step 4: Commit**

```bash
git add app/rss.xml/
git commit -m "feat: add RSS feed at /rss.xml"
```

---

### Task 6: Version Bump and Changelog

**Files:**
- Modify: `VERSION`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump to v0.4.0**

Write `0.4.0` to `VERSION` and update `package.json` version to `0.4.0`

- [ ] **Step 2: Update CHANGELOG.md**

Add under `## [0.4.0]`:

```markdown
## [0.4.0] — 2026-07-06

### Added
- Theme registry with types, loader, and validation.
- Default theme with light/dark CSS variables, layout, post template, and list template.
- ThemeProvider context and useTheme hook (localStorage + prefers-color-scheme).
- Light/dark mode toggle in default theme header.
- Public blog homepage showing published posts with pagination.
- Single post route at /[slug] with server-rendered metadata.
- Tag-filtered post list at /tag/[tag].
- RSS 2.0 feed at /rss.xml.
- Public layout wrapping all public routes in the active theme.
```

- [ ] **Step 3: Final verification**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all pass, zero errors

- [ ] **Step 4: Commit**

```bash
git add VERSION package.json CHANGELOG.md
git commit -m "chore: bump to v0.4.0, update changelog"
```

---

## Self-Review

### 1. Spec Coverage
- [x] Theme system: registry, loader, default theme — Tasks 1, 3
- [x] Light/dark mode via CSS variables, useTheme() hook, toggle — Tasks 2, 3
- [x] Public routes: homepage, /[slug], /tag/[tag] — Task 4
- [x] Themes access data via props from server components — Task 4
- [x] SEO basics: meta tags — Task 4 (generateMetadata on post + tag pages)
- [x] RSS feed — Task 5

### 2. Placeholder Scan
No TBD, TODO, or vague steps found. All code is concrete with exact file paths.

### 3. Type Consistency
- `PostData` defined in Task 1, consumed in Tasks 3 and 4 — type matches
- `ThemeComponents` (post/list/layout) defined in Task 1, consumed in Tasks 3 and 4 — prop interfaces match
- `loadTheme()` from Task 1, consumed in Task 4 — return type consistent
- `loadConfig()` from Phase 0, consumed in Task 5 — interface matches
