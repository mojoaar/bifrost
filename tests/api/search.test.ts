/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { users } from "@/lib/db/schema/users";
import { nowISO } from "@/lib/time";
import { GET as searchGet } from "@/app/api/v1/search/route";

const marker = `Zephyr${randomUUID().slice(0, 8)}`;
const authorId = randomUUID();

function req(query: string): Request {
  return new Request(`http://localhost:3000/api/v1/search?${query}`);
}

beforeAll(() => {
  const now = nowISO();
  db.insert(users)
    .values({
      id: authorId,
      email: `search-author-${authorId}@example.com`,
      passwordHash: "x",
      displayName: "Search Author",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(posts)
    .values({
      slug: `search-pub-${randomUUID().slice(0, 8)}`,
      title: `Published ${marker} Post`,
      contentMd: "body",
      contentHtml: "<p>body</p>",
      excerpt: "an excerpt",
      frontmatter: "{}",
      status: "published",
      authorId,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(posts)
    .values({
      slug: `search-draft-${randomUUID().slice(0, 8)}`,
      title: `Draft ${marker} Post`,
      contentMd: "body",
      contentHtml: "<p>body</p>",
      excerpt: "an excerpt",
      frontmatter: "{}",
      status: "draft",
      authorId,
      createdAt: now,
      updatedAt: now,
    })
    .run();
});

describe("GET /api/v1/search", () => {
  it("finds a published post matching the query", async () => {
    const res = await searchGet(req(`q=${marker}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].title).toContain(marker);
    expect(body.meta.total).toBe(1);
  });

  it("excludes drafts from results", async () => {
    const res = await searchGet(req(`q=${marker}`));
    const body = await res.json();
    const titles = body.data.map((r: { title: string }) => r.title);
    expect(titles.some((t: string) => t.startsWith("Draft"))).toBe(false);
  });

  it("rejects a query shorter than 2 characters", async () => {
    const res = await searchGet(req("q=a"));
    expect(res.status).toBe(400);
  });

  it("rejects a missing query", async () => {
    const res = await searchGet(req(""));
    expect(res.status).toBe(400);
  });

  it("returns pagination metadata", async () => {
    const res = await searchGet(req(`q=${marker}&page=1&limit=5`));
    const body = await res.json();
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(5);
  });
});
