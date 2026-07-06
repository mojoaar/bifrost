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
import { fs } from "@/lib/fs";
import path from "path";
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
