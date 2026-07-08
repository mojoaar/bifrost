/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs/promises";
import path from "path";

vi.mock("@/lib/settings", () => ({
  getSetting: () => undefined,
  getAllSettings: () => ({}),
  invalidateSettingsCache: () => {},
}));

import {
  initContentRepo,
  commitPost,
  getHistory,
  getDiff,
} from "@/lib/git/repo";
import { contentDir } from "@/lib/paths";

const TEST_DIR = path.join(contentDir(), "test-git");
const POST_FILE = path.join(TEST_DIR, "test-post/index.md");
const SLUG = "test-git/test-post";

describe("git repo", () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await initContentRepo();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("initializes a git repo in content/", async () => {
    const stat = await fs.stat(path.join(contentDir(), ".git"));
    expect(stat.isDirectory()).toBe(true);
  });

  it("commits a post and returns a SHA", async () => {
    await fs.mkdir(path.dirname(POST_FILE), { recursive: true });
    await fs.writeFile(POST_FILE, "# Hello World\n\nTest content.");

    const sha = await commitPost(SLUG, "Hello World");
    expect(sha).toBeTruthy();
    expect(sha).toMatch(/^[a-f0-9]{40}$/);
  });

  it("returns null for commit without changes", async () => {
    await fs.mkdir(path.dirname(POST_FILE), { recursive: true });
    await fs.writeFile(POST_FILE, "# Hello\n");
    await commitPost(SLUG, "Hello");

    const sha = await commitPost(SLUG, "Hello");
    expect(sha).toBeNull();
  });

  it("returns commit history", async () => {
    await fs.mkdir(path.dirname(POST_FILE), { recursive: true });
    await fs.writeFile(POST_FILE, "# Post 1\n");
    await commitPost(SLUG, "Post 1");

    await fs.writeFile(POST_FILE, "# Post 1 Updated\n");
    await commitPost(SLUG, "Post 1 Updated");

    const history = await getHistory("test-git/test-post/index.md");
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0]).toHaveProperty("sha");
    expect(history[0]).toHaveProperty("message");
  });

  it("returns a diff for a commit", async () => {
    await fs.mkdir(path.dirname(POST_FILE), { recursive: true });
    await fs.writeFile(POST_FILE, "# Original\n");
    await commitPost(SLUG, "Original");

    await fs.writeFile(POST_FILE, "# Modified\n");
    const sha = await commitPost(SLUG, "Modified");
    expect(sha).toBeTruthy();

    const diff = await getDiff(sha!);
    expect(diff).toContain("Original");
  });
});
