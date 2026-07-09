/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { publishDueScheduledPosts } from "@/lib/content/scheduler";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";

const AUTHOR_ID = "scheduler-author";

beforeAll(() => {
  const now = new Date().toISOString();
  db.insert(users)
    .values({
      id: AUTHOR_ID,
      email: "scheduler@example.com",
      passwordHash: "x",
      displayName: "Scheduler Author",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
});

function makeScheduledPost(slug: string, scheduledAt: string) {
  const now = new Date().toISOString();
  db.insert(posts)
    .values({
      slug,
      title: slug,
      contentMd: `# ${slug}`,
      contentHtml: `<h1>${slug}</h1>`,
      excerpt: slug,
      frontmatter: JSON.stringify({ title: slug, scheduledAt }),
      status: "scheduled",
      authorId: AUTHOR_ID,
      scheduledAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

describe("publishDueScheduledPosts", () => {
  it("publishes a post whose scheduledAt is in the past", async () => {
    const slug = "sched-due";
    makeScheduledPost(slug, "2000-01-01T00:00:00.000Z");

    await publishDueScheduledPosts();

    const row = db.select().from(posts).where(eq(posts.slug, slug)).get();
    expect(row?.status).toBe("published");
    expect(row?.scheduledAt).toBeNull();
    expect(row?.publishedAt).toBe("2000-01-01T00:00:00.000Z");
  });

  it("leaves a future scheduled post untouched", async () => {
    const slug = "sched-future";
    const future = new Date(Date.now() + 86_400_000).toISOString();
    makeScheduledPost(slug, future);

    await publishDueScheduledPosts();

    const row = db.select().from(posts).where(eq(posts.slug, slug)).get();
    expect(row?.status).toBe("scheduled");
    expect(row?.scheduledAt).toBe(future);
  });

  it("returns 0 when there is nothing due", async () => {
    const count = await publishDueScheduledPosts();
    expect(count).toBe(0);
  });
});
