/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { ingestAll, startWatcher, stopWatcher } from "@/lib/content/watcher";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
const TEST_DIR = path.resolve("content/posts/test-post");
const TEST_FILE = path.join(TEST_DIR, "index.md");

describe("content watcher ingestion", () => {
  beforeAll(async () => {
    db.insert(users)
      .values({
        id: SYSTEM_USER_ID,
        email: "system@bifrost.local",
        passwordHash: "",
        displayName: "System",
        role: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })
      .onConflictDoNothing()
      .run();
  });

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    db.delete(posts).where(eq(posts.slug, "test-post")).run();
  });

  it("ingests a markdown file into the database", async () => {
    await fs.writeFile(
      TEST_FILE,
      `---
title: Test Ingest
date: 2026-06-01
---
# Test Content

This post validates the ingestion pipeline.`
    );
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
title: Original Title
---
# Original`
    );
    await ingestAll();
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

describe("content watcher lifecycle", () => {
  afterAll(async () => {
    await stopWatcher();
  });

  it("startWatcher does not throw when called twice", () => {
    expect(() => startWatcher()).not.toThrow();
    expect(() => startWatcher()).not.toThrow();
  });

  it("stopWatcher does not throw when called", async () => {
    startWatcher();
    await expect(stopWatcher()).resolves.not.toThrow();
  });
});
