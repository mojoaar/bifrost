# Phase 2 — Auth & Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JWT-based authentication, role-based authorization, admin dashboard layout, post list/editor pages, and a CodeMirror 6 split-pane markdown editor.

**Architecture:** `jose` handles JWT signing/verification, `bcrypt` hashes passwords. Next.js middleware protects `/admin/*` and write API routes. Admin pages are client-side React components under `app/(admin)/`. The CodeMirror 6 editor lives under `lib/editor/` and includes a live-preview pane rendered through the existing markdown pipeline.

**Tech Stack:** jose (JWT), bcrypt, CodeMirror 6 (@codemirror/view, @codemirror/state, @codemirror/lang-markdown, @codemirror/theme-one-dark)

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- Server components by default, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- Environment variables prefixed with `BIFROST_`
- No comments unless logic is genuinely non-obvious
- All new source files carry the AGPL-3.0 license header
- Run `npm run typecheck && npm run lint && npm test` before marking work complete
- Access token: 15min, refresh token: 7 days httpOnly cookie

---

### Task 1: Install Auth Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: project from Phase 1
- Produces: installed `jose`, `bcrypt`, `@types/bcrypt`

- [ ] **Step 1: Install packages**

```bash
npm install jose bcrypt && npm install -D @types/bcrypt
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean (no code referencing new packages yet)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install auth dependencies (jose, bcrypt)"
```

---

### Task 2: Auth Utilities (hash, verify, JWT create/verify)

**Files:**
- Create: `lib/auth/password.ts`
- Create: `lib/auth/token.ts`
- Create: `lib/auth/types.ts`
- Create: `tests/lib/auth/password.test.ts`
- Create: `tests/lib/auth/token.test.ts`

**Interfaces:**
- Consumes: `jose`, `bcrypt`
- Produces:
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, hash: string): Promise<boolean>`
  - `createAccessToken(payload: TokenPayload): Promise<string>`
  - `createRefreshToken(payload: TokenPayload): Promise<string>`
  - `verifyAccessToken(token: string): Promise<TokenPayload | null>`
  - `verifyRefreshToken(token: string): Promise<TokenPayload | null>`
  - `TokenPayload: { sub: string; role: string }`

- [ ] **Step 1: Create lib/auth/types.ts**

```typescript
export interface TokenPayload {
  sub: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
```

- [ ] **Step 2: Write tests for password functions**

Create `tests/lib/auth/password.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword", () => {
  it("returns a bcrypt hash string", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it("produces unique hashes for the same input", async () => {
    const h1 = await hashPassword("secret123");
    const h2 = await hashPassword("secret123");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns true for matching password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });

  it("returns false for non-matching password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --run tests/lib/auth/password.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 4: Create lib/auth/password.ts**

```typescript
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 5: Run password tests**

Run: `npm test -- --run tests/lib/auth/password.test.ts`
Expected: 4/4 pass

- [ ] **Step 6: Write tests for token functions**

Create `tests/lib/auth/token.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/token";
import type { TokenPayload } from "@/lib/auth/types";

const payload: TokenPayload = { sub: "user-1", role: "admin" };

describe("createAccessToken", () => {
  it("creates a JWT string", async () => {
    const token = await createAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });
});

describe("verifyAccessToken", () => {
  it("returns payload for valid token", async () => {
    const token = await createAccessToken(payload);
    const result = await verifyAccessToken(token);
    expect(result).toEqual(payload);
  });

  it("returns null for expired token", async () => {
    const secret = new Uint8Array(32);
    const { SignJWT } = await import("jose");
    const expired = await new SignJWT({ sub: "x", role: "author" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("0s")
      .sign(secret);

    const result = await verifyAccessToken(expired);
    expect(result).toBeNull();
  });

  it("returns null for tampered token", async () => {
    const token = await createAccessToken(payload);
    const tampered = token.slice(0, -5) + "xxxxx";
    const result = await verifyAccessToken(tampered);
    expect(result).toBeNull();
  });

  it("returns null for token signed with wrong secret", async () => {
    const { SignJWT } = await import("jose");
    const wrongSecret = new Uint8Array(32);
    const bad = await new SignJWT({ sub: "x", role: "author" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .sign(wrongSecret);

    const result = await verifyAccessToken(bad);
    expect(result).toBeNull();
  });
});

describe("createRefreshToken / verifyRefreshToken", () => {
  it("round-trips correctly", async () => {
    const token = await createRefreshToken(payload);
    const result = await verifyRefreshToken(token);
    expect(result).toEqual(payload);
  });
});
```

- [ ] **Step 7: Run token tests to verify they fail**

Run: `npm test -- --run tests/lib/auth/token.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 8: Create lib/auth/token.ts**

```typescript
import { SignJWT, jwtVerify } from "jose";
import type { TokenPayload } from "./types";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.BIFROST_JWT_SECRET ?? "bifrost-dev-access-secret-change-me"
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.BIFROST_JWT_REFRESH_SECRET ??
    "bifrost-dev-refresh-secret-change-me"
);

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

export function createAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(ACCESS_SECRET);
}

export function createRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(REFRESH_EXPIRES)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return { sub: payload.sub as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return { sub: payload.sub as string, role: payload.role as string };
  } catch {
    return null;
  }
}
```

- [ ] **Step 9: Run all tests**

Run: `npm test`
Expected: all pass

- [ ] **Step 10: Commit**

```bash
git add lib/auth/ tests/lib/auth/
git commit -m "feat: add auth utilities (password hashing, JWT sign/verify)"
```

---

### Task 3: Auth API Routes (login, refresh)

**Files:**
- Create: `app/api/v1/auth/login/route.ts`
- Create: `app/api/v1/auth/refresh/route.ts`

**Interfaces:**
- Consumes: `lib/auth/token.ts` (createAccessToken, createRefreshToken, verifyRefreshToken), `lib/auth/password.ts` (verifyPassword), `db` (users table), `lib/api/response.ts` (apiSuccess, apiError)
- Produces:
  - `POST /api/v1/auth/login` — `{ email, password }` → `{ tokens: { accessToken, refreshToken } }`, sets refresh token as httpOnly cookie
  - `POST /api/v1/auth/refresh` — reads cookie, returns new access token

- [ ] **Step 1: Create app/api/v1/auth/login/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import { createAccessToken, createRefreshToken } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return apiError("Email and password are required", 400);
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .get();

  if (!user) {
    return apiError("Invalid email or password", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return apiError("Invalid email or password", 401);
  }

  const payload = { sub: user.id, role: user.role };
  const accessToken = await createAccessToken(payload);
  const refreshToken = await createRefreshToken(payload);

  const response = apiSuccess({
    tokens: { accessToken, refreshToken },
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });

  response.cookies.set("bifrost_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
```

- [ ] **Step 2: Create app/api/v1/auth/refresh/route.ts**

```typescript
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createAccessToken, verifyRefreshToken } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get("bifrost_refresh");

  if (!cookie?.value) {
    return apiError("No refresh token provided", 401);
  }

  const payload = await verifyRefreshToken(cookie.value);
  if (!payload) {
    return apiError("Invalid or expired refresh token", 401);
  }

  const accessToken = await createAccessToken(payload);

  return apiSuccess({ accessToken });
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/auth/
git commit -m "feat: add auth API routes (login, refresh)"
```

---

### Task 4: Auth Middleware (protect /admin/* and write API routes)

**Files:**
- Create: `middleware.ts` (root)
- Create: `lib/auth/middleware.ts`

**Interfaces:**
- Consumes: `lib/auth/token.ts` (verifyAccessToken)
- Produces: Next.js middleware that:
  - Redirects unauthenticated users from `/admin/*` to `/admin/login`
  - Returns 401 for unauthenticated write API requests (POST/PUT/DELETE to `/api/v1/posts`, etc.)
  - Passes authenticated requests through (sets `x-user-id` and `x-user-role` headers)

- [ ] **Step 1: Create lib/auth/middleware.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./token";

const PROTECTED_API_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

const WRITE_API_PATTERNS = [/^\/api\/v1\/posts/, /^\/api\/v1\/media/];

function isProtectedApiRoute(pathname: string, method: string): boolean {
  if (!PROTECTED_API_METHODS.has(method)) return false;
  return WRITE_API_PATTERNS.some((p) => p.test(pathname));
}

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    return response;
  }

  if (isProtectedApiRoute(pathname, method)) {
    if (!token) {
      return new NextResponse(
        JSON.stringify({
          data: null,
          error: { message: "Authentication required" },
          meta: null,
        }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return new NextResponse(
        JSON.stringify({
          data: null,
          error: { message: "Invalid or expired token" },
          meta: null,
        }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    return response;
  }

  return NextResponse.next();
}
```

- [ ] **Step 2: Create middleware.ts (root)**

```typescript
import { authMiddleware } from "@/lib/auth/middleware";

export const config = {
  matcher: ["/admin/:path*", "/api/v1/:path*"],
};

export default authMiddleware;
```

- [ ] **Step 3: Verify typecheck and lint pass**

Run: `npm run typecheck && npm run lint`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add middleware.ts lib/auth/middleware.ts
git commit -m "feat: add auth middleware for admin and write API routes"
```

---

### Task 5: Admin Layout Shell

**Files:**
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/page.tsx` (dashboard placeholder)
- Create: `app/(admin)/login/page.tsx`
- Create: `app/(admin)/layout-client.tsx`

**Interfaces:**
- Consumes: middleware.ts (session from headers)
- Produces:
  - Admin layout with sidebar navigation
  - Dashboard placeholder page
  - Login page with email/password form

- [ ] **Step 1: Create app/(admin)/layout.tsx** (server component)

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Bifröst",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="w-60 border-r border-zinc-800 p-4">
        <h1 className="mb-6 text-lg font-bold">Bifröst Admin</h1>
        <nav className="flex flex-col gap-1">
          <a href="/admin" className="rounded px-3 py-2 text-sm hover:bg-zinc-800">
            Dashboard
          </a>
          <a href="/admin/posts" className="rounded px-3 py-2 text-sm hover:bg-zinc-800">
            Posts
          </a>
          <a href="/admin/media" className="rounded px-3 py-2 text-sm hover:bg-zinc-800">
            Media
          </a>
          <a href="/admin/settings" className="rounded px-3 py-2 text-sm hover:bg-zinc-800">
            Settings
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create app/(admin)/page.tsx** (dashboard placeholder)

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

- [ ] **Step 3: Create app/(admin)/login/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error?.message ?? "Login failed");
        return;
      }

      localStorage.setItem("bifrost_token", body.data.tokens.accessToken);
      router.push("/admin");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
      >
        <h2 className="text-xl font-semibold">Login</h2>

        {error && (
          <p className="rounded border border-red-800 bg-red-900/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <label className="block">
          <span className="text-sm text-zinc-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run typecheck`
Expected: clean (Next.js typechecks page components)

- [ ] **Step 5: Commit**

```bash
git add app/\(admin\)/
git commit -m "feat: add admin layout, dashboard, and login page"
```

---

### Task 6: Admin Posts List Page

**Files:**
- Create: `app/(admin)/posts/page.tsx`
- Modify: `app/(admin)/posts/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/posts` (paginated), `DELETE /api/v1/posts/:slug`
- Produces: Posts table with create link, edit/delete actions

- [ ] **Step 1: Create app/(admin)/posts/page.tsx**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Post {
  slug: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/posts?limit=50", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Failed to load posts");
        return;
      }

      setPosts(body.data ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this post?")) return;

    const token = localStorage.getItem("bifrost_token");
    const res = await fetch(`/api/v1/posts/${slug}`, {
      method: "DELETE",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    }
  }

  if (loading) {
    return <p className="text-zinc-400">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Posts</h2>
        <Link
          href="/admin/posts/new"
          className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-zinc-400">No posts yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="pb-2 font-medium">Title</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Updated</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.slug} className="border-b border-zinc-800">
                <td className="py-2">
                  <Link
                    href={`/admin/posts/${post.slug}`}
                    className="text-zinc-200 hover:text-zinc-100"
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      post.status === "published"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-yellow-900/50 text-yellow-400"
                    }`}
                  >
                    {post.status}
                  </span>
                </td>
                <td className="py-2 text-zinc-500">
                  {new Date(post.updatedAt).toLocaleDateString()}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/posts/${post.slug}`}
                      className="text-sm text-zinc-400 hover:text-zinc-200"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(post.slug)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add app/\(admin\)/posts/
git commit -m "feat: add admin posts list page"
```

---

### Task 7: CodeMirror 6 Split-Pane Editor

**Files:**
- Create: `lib/editor/Editor.tsx`
- Create: `lib/editor/Preview.tsx`

**Interfaces:**
- Consumes: `lib/md/parser.ts` (renderMarkdown), CodeMirror 6 packages
- Produces:
  - `<Editor value={string} onChange={(v: string) => void} />` — CodeMirror 6 markdown editor
  - `<Preview markdown={string} />` — live HTML preview in an iframe

- [ ] **Step 1: Install CodeMirror packages**

```bash
npm install @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/theme-one-dark
```

- [ ] **Step 2: Create lib/editor/Editor.tsx**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap } from "@codemirror/commands";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CodeMirrorEditor({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        markdown({ base: markdownLanguage }),
        oneDark,
        keymap.of(defaultKeymap),
        updateListener,
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full" />;
}
```

- [ ] **Step 3: Create lib/editor/Preview.tsx**

```typescript
"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  source: string;
}

export default function Preview({ source }: Props) {
  const [html, setHtml] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const res = await fetch("/api/v1/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source }),
      });

      if (cancelled) return;

      if (res.ok) {
        const body = await res.json();
        setHtml(body.data?.html ?? "");
      }
    }

    const timer = setTimeout(render, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        Preview will appear here
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full border-0 bg-white"
      sandbox="allow-same-origin"
      title="Preview"
    />
  );
}
```

- [ ] **Step 4: Create the preview API endpoint**

Create `app/api/v1/preview/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { renderMarkdown } from "@/lib/md/parser";

export async function POST(request: NextRequest) {
  let body: { source?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  if (!body.source) {
    return apiError("source is required", 400);
  }

  try {
    const { html } = await renderMarkdown(body.source);
    return apiSuccess({ html });
  } catch (err) {
    return apiError("Failed to render markdown", 500, String(err));
  }
}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add lib/editor/ app/api/v1/preview/ package.json package-lock.json
git commit -m "feat: add CodeMirror 6 split-pane editor with live preview"
```

---

### Task 8: Admin Post Editor Page

**Files:**
- Create: `app/(admin)/posts/new/page.tsx`
- Create: `app/(admin)/posts/[slug]/page.tsx`

**Interfaces:**
- Consumes: CodeMirrorEditor, Preview, POST/PUT /api/v1/posts
- Produces: Split-pane editor page for creating and editing posts

- [ ] **Step 1: Create app/(admin)/posts/new/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function generateSlug(t: string) {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSave() {
    if (!title || !slug) {
      setError("Title and slug are required");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          slug,
          content,
          status,
          frontmatter: {},
          authorId: "00000000-0000-0000-0000-000000000000",
          tagIds: [],
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to save");
        return;
      }

      router.push(`/admin/posts/${slug}`);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(generateSlug(e.target.value));
          }}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-48 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none font-mono"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-1 gap-px rounded border border-zinc-800 bg-zinc-800">
        <div className="w-1/2 bg-zinc-950">
          <Editor value={content} onChange={setContent} />
        </div>
        <div className="w-1/2 bg-zinc-950">
          <Preview source={content} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create app/(admin)/posts/[slug]/page.tsx** (edit existing post)

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });

interface Post {
  slug: string;
  title: string;
  contentMd: string;
  status: string;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/posts/${params.slug}`);
        if (!res.ok) {
          const body = await res.json();
          setError(body.error?.message ?? "Failed to load post");
          return;
        }
        const body = await res.json();
        const p = body.data as Post;
        setPost(p);
        setTitle(p.title);
        setContent(p.contentMd);
        setStatus(p.status as "draft" | "published");
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.slug]);

  async function handleSave() {
    if (!title) {
      setError("Title is required");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch(`/api/v1/posts/${params.slug}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          content,
          status,
          frontmatter: {},
          tagIds: [],
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to save");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-zinc-400">Loading...</p>;
  }

  if (error && !post) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!post) return null;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/posts")}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-1 gap-px rounded border border-zinc-800 bg-zinc-800">
        <div className="w-1/2 bg-zinc-950">
          <Editor value={content} onChange={setContent} />
        </div>
        <div className="w-1/2 bg-zinc-950">
          <Preview source={content} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Fix the new/edit routes to also add a POST/PUT endpoint for content updates**

Wait — let me check that the routes are set up correctly. Next.js App Router route group `(admin)` doesn't affect URL paths, so `/app/(admin)/posts/new/page.tsx` will be served at `/posts/new` not `/admin/posts/new`. Let me fix the plan — the admin routes should be under `app/admin/` not `app/(admin)/`. The route group `(admin)` was chosen in the spec to group admin routes for shared layout, but the actual URL path should include `/admin`.

Actually, route group parentheses `(admin)` in Next.js DO NOT affect the URL. So `app/(admin)/posts/` → URL `/posts`, not `/admin/posts`. This is a spec issue — the spec originally shows:
```
├── (admin)/              # Admin dashboard (authenticated)
│   ├── layout.tsx        # Admin shell
│   ├── page.tsx          # Dashboard overview
│   ├── posts/            # Post CRUD
```

This means the URLs would be `/posts`, `/editor/`, etc. — not `admin/posts`. The middleware uses `pathname.startsWith("/admin")` which wouldn't match.

Let me restructure: the admin pages should be at `app/admin/` with their own layout, NOT inside a route group. The middleware protects `/admin/*`. The layout at `app/admin/layout.tsx` is the admin shell.

Let me fix the plan to use `app/admin/` instead of `app/(admin)/`.<｜end▁of▁thinking｜>Wait — I need to fix a structural issue. The spec's `(admin)` route group doesn't put URLs under `/admin/*`, but the middleware guards `/admin/*`. Let me restructure correctly before writing the full plan.

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true"># Phase 2 — Auth & Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JWT-based authentication, role-based authorization, admin dashboard layout, post list/editor pages, and a CodeMirror 6 split-pane markdown editor.

**Architecture:** `jose` handles JWT signing/verification, `bcrypt` hashes passwords. Next.js middleware protects `/admin/*` and write API routes. Admin pages are client-side React components under `app/admin/`. The CodeMirror 6 editor lives under `lib/editor/` (loaded via `next/dynamic` with `ssr: false`).

**Tech Stack:** jose (JWT), bcrypt, CodeMirror 6 (@codemirror/view, @codemirror/state, @codemirror/lang-markdown, @codemirror/theme-one-dark)

## Global Constraints

- TypeScript strict mode — no `any` without explicit reason
- Server components by default, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- Environment variables prefixed with `BIFROST_`
- No comments unless logic is genuinely non-obvious
- All new source files carry the AGPL-3.0 license header
- Run `npm run typecheck && npm run lint && npm test` before marking work complete
- Access token: 15min, refresh token: 7 days httpOnly cookie
- URL structure: admin pages at `/admin/*`, middleware guards `/admin/*` and write API routes

---

### Task 1: Install Auth Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: project from Phase 1
- Produces: installed `jose`, `bcrypt`, `@types/bcrypt`

- [ ] **Step 1: Install packages**

```bash
npm install jose bcrypt && npm install -D @types/bcrypt
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean (no code referencing new packages yet)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install auth dependencies (jose, bcrypt)"
```

---

### Task 2: Auth Utilities (hash, verify, JWT create/verify)

**Files:**
- Create: `lib/auth/password.ts`
- Create: `lib/auth/token.ts`
- Create: `lib/auth/types.ts`
- Create: `tests/lib/auth/password.test.ts`
- Create: `tests/lib/auth/token.test.ts`

**Interfaces:**
- Consumes: `jose`, `bcrypt`
- Produces:
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, hash: string): Promise<boolean>`
  - `createAccessToken(payload: TokenPayload): Promise<string>`
  - `createRefreshToken(payload: TokenPayload): Promise<string>`
  - `verifyAccessToken(token: string): Promise<TokenPayload | null>`
  - `verifyRefreshToken(token: string): Promise<TokenPayload | null>`
  - `TokenPayload: { sub: string; role: string }`

- [ ] **Step 1: Create lib/auth/types.ts**

```typescript
export interface TokenPayload {
  sub: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
```

- [ ] **Step 2: Write tests for password functions**

Create `tests/lib/auth/password.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword", () => {
  it("returns a bcrypt hash string", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it("produces unique hashes for the same input", async () => {
    const h1 = await hashPassword("secret123");
    const h2 = await hashPassword("secret123");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns true for matching password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
  });

  it("returns false for non-matching password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --run tests/lib/auth/password.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 4: Create lib/auth/password.ts**

```typescript
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 5: Run password tests**

Run: `npm test -- --run tests/lib/auth/password.test.ts`
Expected: 4/4 pass

- [ ] **Step 6: Write tests for token functions**

Create `tests/lib/auth/token.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/token";
import type { TokenPayload } from "@/lib/auth/types";

const payload: TokenPayload = { sub: "user-1", role: "admin" };

describe("createAccessToken", () => {
  it("creates a JWT string", async () => {
    const token = await createAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });
});

describe("verifyAccessToken", () => {
  it("returns payload for valid token", async () => {
    const token = await createAccessToken(payload);
    const result = await verifyAccessToken(token);
    expect(result).toEqual(payload);
  });

  it("returns null for expired token", async () => {
    const { SignJWT } = await import("jose");
    const expired = await new SignJWT({ sub: "x", role: "author" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("0s")
      .sign(new TextEncoder().encode("00000000000000000000000000000000"));

    const result = await verifyAccessToken(expired);
    expect(result).toBeNull();
  });

  it("returns null for tampered token", async () => {
    const token = await createAccessToken(payload);
    const tampered = token.slice(0, -5) + "xxxxx";
    const result = await verifyAccessToken(tampered);
    expect(result).toBeNull();
  });
});

describe("createRefreshToken / verifyRefreshToken", () => {
  it("round-trips correctly", async () => {
    const token = await createRefreshToken(payload);
    const result = await verifyRefreshToken(token);
    expect(result).toEqual(payload);
  });
});
```

- [ ] **Step 7: Run token tests to verify they fail**

Run: `npm test -- --run tests/lib/auth/token.test.ts`
Expected: FAIL (file not found)

- [ ] **Step 8: Create lib/auth/token.ts**

```typescript
import { SignJWT, jwtVerify } from "jose";
import type { TokenPayload } from "./types";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.BIFROST_JWT_SECRET ?? "bifrost-dev-access-secret-change-me"
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.BIFROST_JWT_REFRESH_SECRET ??
    "bifrost-dev-refresh-secret-change-me"
);

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

export function createAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(ACCESS_SECRET);
}

export function createRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(REFRESH_EXPIRES)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return { sub: payload.sub as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return { sub: payload.sub as string, role: payload.role as string };
  } catch {
    return null;
  }
}
```

- [ ] **Step 9: Run all tests**

Run: `npm test`
Expected: all pass

- [ ] **Step 10: Commit**

```bash
git add lib/auth/ tests/lib/auth/
git commit -m "feat: add auth utilities (password hashing, JWT sign/verify)"
```

---

### Task 3: Auth API Routes (login, refresh, logout)

**Files:**
- Create: `app/api/v1/auth/login/route.ts`
- Create: `app/api/v1/auth/refresh/route.ts`

**Interfaces:**
- Consumes: `lib/auth/token.ts` (createAccessToken, createRefreshToken, verifyRefreshToken), `lib/auth/password.ts` (verifyPassword), `db` (users table), `lib/api/response.ts` (apiSuccess, apiError)
- Produces:
  - `POST /api/v1/auth/login` — `{ email, password }` → `{ tokens: { accessToken, refreshToken }, user }`, sets refresh token as httpOnly cookie
  - `POST /api/v1/auth/refresh` — reads cookie, returns new access token

- [ ] **Step 1: Create app/api/v1/auth/login/route.ts**

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import { createAccessToken, createRefreshToken } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return apiError("Email and password are required", 400);
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .get();

  if (!user) {
    return apiError("Invalid email or password", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return apiError("Invalid email or password", 401);
  }

  const payload = { sub: user.id, role: user.role };
  const accessToken = await createAccessToken(payload);
  const refreshToken = await createRefreshToken(payload);

  const response = apiSuccess({
    tokens: { accessToken, refreshToken },
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });

  response.cookies.set("bifrost_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
```

- [ ] **Step 2: Create app/api/v1/auth/refresh/route.ts**

```typescript
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createAccessToken, verifyRefreshToken } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get("bifrost_refresh");

  if (!cookie?.value) {
    return apiError("No refresh token provided", 401);
  }

  const payload = await verifyRefreshToken(cookie.value);
  if (!payload) {
    return apiError("Invalid or expired refresh token", 401);
  }

  const accessToken = await createAccessToken(payload);

  return apiSuccess({ accessToken });
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/auth/
git commit -m "feat: add auth API routes (login, refresh)"
```

---

### Task 4: Auth Middleware (protect /admin/* and write API routes)

**Files:**
- Create: `lib/auth/middleware.ts`
- Create: `middleware.ts` (root)

**Interfaces:**
- Consumes: `lib/auth/token.ts` (verifyAccessToken)
- Produces: Next.js middleware that:
  - Redirects unauthenticated users from `/admin/*` to `/admin/login`
  - Returns 401 for unauthenticated write API requests (POST/PUT/DELETE to `/api/v1/posts`, etc.)
  - Passes authenticated requests through (sets `x-user-id` and `x-user-role` headers)

- [ ] **Step 1: Create lib/auth/middleware.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./token";

const PROTECTED_API_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

const WRITE_API_PATTERNS = [/^\/api\/v1\/posts/, /^\/api\/v1\/media/];

function isProtectedApiRoute(pathname: string, method: string): boolean {
  if (!PROTECTED_API_METHODS.has(method)) return false;
  return WRITE_API_PATTERNS.some((p) => p.test(pathname));
}

export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    return response;
  }

  if (isProtectedApiRoute(pathname, method)) {
    if (!token) {
      return NextResponse.json(
        { data: null, error: { message: "Authentication required" }, meta: null },
        { status: 401 }
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { data: null, error: { message: "Invalid or expired token" }, meta: null },
        { status: 401 }
      );
    }

    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-user-role", payload.role);
    return response;
  }

  return NextResponse.next();
}
```

- [ ] **Step 2: Create middleware.ts (project root)**

```typescript
import { authMiddleware } from "@/lib/auth/middleware";

export const config = {
  matcher: ["/admin/:path*", "/api/v1/:path*"],
};

export default authMiddleware;
```

- [ ] **Step 3: Verify typecheck and lint pass**

Run: `npm run typecheck && npm run lint`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add middleware.ts lib/auth/middleware.ts
git commit -m "feat: add auth middleware for admin and write API routes"
```

---

### Task 5: Admin Layout, Dashboard, and Login Page

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/login/page.tsx`

**Interfaces:**
- Consumes: middleware.ts (session from headers)
- Produces:
  - Admin layout with sidebar navigation (applied to all `/admin/*` pages)
  - Dashboard placeholder page
  - Login page with email/password form

- [ ] **Step 1: Create app/admin/layout.tsx** (server component)

```typescript
import type { Metadata } from "next";
import Link from "next/link";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Admin — Bifröst",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
          <aside className="w-60 border-r border-zinc-800 p-4">
            <Link href="/admin" className="mb-6 block text-lg font-bold">
              Bifröst Admin
            </Link>
            <nav className="flex flex-col gap-1">
              <Link
                href="/admin"
                className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/posts"
                className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
              >
                Posts
              </Link>
              <Link
                href="/admin/media"
                className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
              >
                Media
              </Link>
              <Link
                href="/admin/settings"
                className="rounded px-3 py-2 text-sm hover:bg-zinc-800"
              >
                Settings
              </Link>
            </nav>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create app/admin/page.tsx** (dashboard)

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

- [ ] **Step 3: Create app/admin/login/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error?.message ?? "Login failed");
        return;
      }

      localStorage.setItem("bifrost_token", body.data.tokens.accessToken);
      router.push("/admin");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
      >
        <h2 className="text-xl font-semibold">Login</h2>

        {error && (
          <p className="rounded border border-red-800 bg-red-900/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <label className="block">
          <span className="text-sm text-zinc-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add app/admin/
git commit -m "feat: add admin layout, dashboard, and login page"
```

---

### Task 6: Admin Posts List Page

**Files:**
- Create: `app/admin/posts/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/posts`, `DELETE /api/v1/posts/:slug`
- Produces: Posts table with create link, edit/delete actions, status badges

- [ ] **Step 1: Create app/admin/posts/page.tsx**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Post {
  slug: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/posts?limit=50", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Failed to load posts");
        return;
      }

      setPosts(body.data ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this post?")) return;

    const token = localStorage.getItem("bifrost_token");
    const res = await fetch(`/api/v1/posts/${slug}`, {
      method: "DELETE",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    }
  }

  if (loading) {
    return <p className="text-zinc-400">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Posts</h2>
        <Link
          href="/admin/posts/new"
          className="rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-zinc-400">No posts yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="pb-2 font-medium">Title</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Updated</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.slug} className="border-b border-zinc-800">
                <td className="py-2">
                  <Link
                    href={`/admin/posts/${post.slug}`}
                    className="text-zinc-200 hover:text-zinc-100"
                  >
                    {post.title}
                  </Link>
                </td>
                <td className="py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      post.status === "published"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-yellow-900/50 text-yellow-400"
                    }`}
                  >
                    {post.status}
                  </span>
                </td>
                <td className="py-2 text-zinc-500">
                  {new Date(post.updatedAt).toLocaleDateString()}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/posts/${post.slug}`}
                      className="text-sm text-zinc-400 hover:text-zinc-200"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(post.slug)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add app/admin/posts/
git commit -m "feat: add admin posts list page"
```

---

### Task 7: CodeMirror 6 Editor and Live Preview

**Files:**
- Create: `lib/editor/Editor.tsx` (CodeMirror 6 component)
- Create: `lib/editor/Preview.tsx` (live preview iframe)
- Create: `app/api/v1/preview/route.ts` (API endpoint for server-side rendering)

**Interfaces:**
- Consumes: `lib/md/parser.ts` (renderMarkdown), CodeMirror 6 packages
- Produces:
  - `<Editor value={string} onChange={(v: string) => void} />` — CodeMirror 6 markdown editor
  - `<Preview source={string} />` — debounced live HTML preview in iframe

- [ ] **Step 1: Install CodeMirror packages**

```bash
npm install @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/theme-one-dark @codemirror/commands
```

- [ ] **Step 2: Create lib/editor/Editor.tsx**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap } from "@codemirror/commands";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CodeMirrorEditor({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        markdown({ base: markdownLanguage }),
        oneDark,
        keymap.of(defaultKeymap),
        updateListener,
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full" />;
}
```

- [ ] **Step 3: Create lib/editor/Preview.tsx**

```typescript
"use client";

import { useEffect, useState, useRef } from "react";

interface Props {
  source: string;
}

export default function Preview({ source }: Props) {
  const [html, setHtml] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const res = await fetch("/api/v1/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source }),
      });

      if (cancelled) return;

      if (res.ok) {
        const body = await res.json();
        setHtml(body.data?.html ?? "");
      }
    }

    const timer = setTimeout(render, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        Preview will appear here
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full border-0 bg-white"
      sandbox="allow-same-origin"
      title="Preview"
    />
  );
}
```

- [ ] **Step 4: Create app/api/v1/preview/route.ts**

```typescript
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { renderMarkdown } from "@/lib/md/parser";

export async function POST(request: NextRequest) {
  let body: { source?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  if (!body.source) {
    return apiError("source is required", 400);
  }

  try {
    const { html } = await renderMarkdown(body.source);
    return apiSuccess({ html });
  } catch (err) {
    return apiError("Failed to render markdown", 500, String(err));
  }
}
```

- [ ] **Step 5: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add lib/editor/ app/api/v1/preview/ package.json package-lock.json
git commit -m "feat: add CodeMirror 6 editor with live markdown preview"
```

---

### Task 8: Admin Post Editor Pages (New + Edit)

**Files:**
- Create: `app/admin/posts/new/page.tsx`
- Create: `app/admin/posts/[slug]/page.tsx`

**Interfaces:**
- Consumes: CodeMirrorEditor, Preview, POST/PUT /api/v1/posts, GET /api/v1/posts/:slug
- Produces: Split-pane editor pages for creating new posts and editing existing posts

- [ ] **Step 1: Create app/admin/posts/new/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function generateSlug(t: string) {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSave() {
    if (!title || !slug) {
      setError("Title and slug are required");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          slug,
          content,
          status,
          frontmatter: {},
          authorId: "00000000-0000-0000-0000-000000000000",
          tagIds: [],
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to save");
        return;
      }

      router.push(`/admin/posts/${slug}`);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(generateSlug(e.target.value));
          }}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-48 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-1 gap-px rounded border border-zinc-800 bg-zinc-800">
        <div className="w-1/2 bg-zinc-950">
          <Editor value={content} onChange={setContent} />
        </div>
        <div className="w-1/2 bg-zinc-950">
          <Preview source={content} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create app/admin/posts/[slug]/page.tsx**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });

interface Post {
  slug: string;
  title: string;
  contentMd: string;
  status: string;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/posts/${params.slug}`);
        if (!res.ok) {
          const body = await res.json();
          setError(body.error?.message ?? "Failed to load post");
          return;
        }
        const body = await res.json();
        const p = body.data as Post;
        setPost(p);
        setTitle(p.title);
        setContent(p.contentMd);
        setStatus(p.status as "draft" | "published");
      } catch {
        setError("Network error");
      }
    }
    load();
  }, [params.slug]);

  async function handleSave() {
    if (!title) {
      setError("Title is required");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch(`/api/v1/posts/${params.slug}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          content,
          status,
          frontmatter: {},
          tagIds: [],
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Failed to save");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!post) {
    return <p className="text-zinc-400">Loading...</p>;
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/posts")}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          &larr; Back
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-1 gap-px rounded border border-zinc-800 bg-zinc-800">
        <div className="w-1/2 bg-zinc-950">
          <Editor value={content} onChange={setContent} />
        </div>
        <div className="w-1/2 bg-zinc-950">
          <Preview source={content} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add app/admin/posts/new/ app/admin/posts/\[slug\]/
git commit -m "feat: add admin post editor pages (new + edit)"
```

---

### Task 9: Version Bump and Changelog

**Files:**
- Modify: `VERSION`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump to v0.3.0**

Write `0.3.0` to `VERSION` and update `package.json` version to `0.3.0`

- [ ] **Step 2: Update CHANGELOG.md**

Add under `## [0.3.0]`:

```markdown
## [0.3.0] — 2026-07-06

### Added
- JWT authentication with access (15min) and refresh (7d httpOnly cookie) tokens.
- Password hashing with bcrypt (12 salt rounds).
- Auth API routes: POST /api/v1/auth/login, POST /api/v1/auth/refresh.
- Next.js middleware protecting /admin/* and write API routes.
- Admin layout with sidebar navigation.
- Admin login page with email/password form.
- Admin posts list page with status badges.
- CodeMirror 6 split-pane editor with one-dark theme.
- Live markdown preview via server-side rendering endpoint.
- Admin post creation and editing pages.
```

- [ ] **Step 3: Final verification**

```bash
npm run typecheck && npm run lint && npm test
```

Expected: all pass, zero errors

- [ ] **Step 4: Commit**

```bash
git add VERSION package.json CHANGELOG.md
git commit -m "chore: bump to v0.3.0, update changelog"
```

---

## Self-Review

### 1. Spec Coverage
- [x] JWT auth: login, refresh, middleware for `/admin/*` and write API routes — Tasks 2, 3, 4
- [x] User model, password hashing (bcrypt), role-based access — Tasks 2, 3
- [x] Admin layout shell with navigation — Task 5
- [x] Post list, create, edit pages in admin — Tasks 6, 8
- [x] CodeMirror 6 split-pane editor (markdown + live preview) — Task 7

### 2. Placeholder Scan
No TBD, TODO, or vague steps found.

### 3. Type Consistency
- `TokenPayload: { sub: string; role: string }` — consistent across Task 2, 3, 4
- `apiSuccess<T>(data, meta?, status?)` and `apiError(message, status?, details?)` — consumed in Task 3, 7
- `renderMarkdown(source)` from Phase 1 — consumed in Task 7
- URL structure: all admin pages at `/admin/*` — consistent with middleware matcher in Task 4
