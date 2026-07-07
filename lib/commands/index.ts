/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface Command {
  id: string;
  label: string;
  hint?: string;
  section: "Navigation" | "Posts" | "Actions";
  shortcut?: string;
  keywords?: string[];
  perform: () => void | Promise<void>;
}

let postCommands: Command[] = [];
let postFetchedAt = 0;
const POST_CACHE_MS = 30_000;

async function loadPostCommands(): Promise<Command[]> {
  if (Date.now() - postFetchedAt < POST_CACHE_MS && postCommands.length > 0) {
    return postCommands;
  }
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("bifrost_token") : null;
  try {
    const res = await fetch("/api/v1/posts?limit=20", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return postCommands;
    const body = await res.json();
    const posts: { slug: string; title: string; status: string }[] = body.data ?? [];
    postCommands = posts.map((p) => ({
      id: `post:${p.slug}`,
      label: p.title,
      hint: p.status,
      section: "Posts",
      keywords: [p.slug, "post"],
      perform: () => {
        window.location.href = `/admin/posts/${p.slug}`;
      },
    }));
    postFetchedAt = Date.now();
  } catch {
    // network error — return stale cache
  }
  return postCommands;
}

export function invalidatePostCache() {
  postFetchedAt = 0;
}

export async function getCommands(): Promise<Command[]> {
  const builtIn = getBuiltInCommands();
  const posts = await loadPostCommands();
  return [...builtIn, ...posts];
}

export function getBuiltInCommands(): Command[] {
  return [
    {
      id: "nav:dashboard",
      label: "Dashboard",
      section: "Navigation",
      keywords: ["home", "admin"],
      perform: () => { window.location.href = "/admin"; },
    },
    {
      id: "nav:posts",
      label: "Posts",
      section: "Navigation",
      keywords: ["list", "articles"],
      perform: () => { window.location.href = "/admin/posts"; },
    },
    {
      id: "nav:posts-new",
      label: "New Post",
      section: "Navigation",
      keywords: ["create", "write"],
      shortcut: "⌘N",
      perform: () => { window.location.href = "/admin/posts/new"; },
    },
    {
      id: "nav:media",
      label: "Media",
      section: "Navigation",
      keywords: ["files", "images", "uploads"],
      perform: () => { window.location.href = "/admin/media"; },
    },
    {
      id: "nav:users",
      label: "Users",
      section: "Navigation",
      keywords: ["accounts", "members"],
      perform: () => { window.location.href = "/admin/users"; },
    },
    {
      id: "nav:git",
      label: "Git",
      section: "Navigation",
      keywords: ["history", "commits", "version"],
      perform: () => { window.location.href = "/admin/git"; },
    },
    {
      id: "nav:themes",
      label: "Themes",
      section: "Navigation",
      keywords: ["design", "appearance"],
      perform: () => { window.location.href = "/admin/themes"; },
    },
    {
      id: "nav:settings",
      label: "Settings",
      section: "Navigation",
      keywords: ["config", "preferences"],
      perform: () => { window.location.href = "/admin/settings"; },
    },
    {
      id: "nav:api-docs",
      label: "API Explorer",
      hint: "↗",
      section: "Navigation",
      keywords: ["swagger", "openapi", "docs"],
      perform: () => { window.open("/api/docs", "_blank", "noopener,noreferrer"); },
    },
    {
      id: "nav:public",
      label: "View Public Site",
      section: "Navigation",
      keywords: ["blog", "frontend"],
      perform: () => { window.open("/", "_blank", "noopener,noreferrer"); },
    },
    {
      id: "action:logout",
      label: "Logout",
      section: "Actions",
      keywords: ["sign out", "exit"],
      perform: async () => {
        const { logout } = await import("@/lib/auth/logout");
        await logout();
      },
    },
    {
      id: "action:toggle-theme",
      label: "Toggle Theme",
      section: "Actions",
      hint: "light/dark",
      keywords: ["mode", "color", "appearance"],
      perform: () => {
        const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", next);
        document.cookie = `bifrost_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      },
    },
  ];
}
