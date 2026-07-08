/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { writePageToFilesystem, deletePageFromFilesystem } from "@/lib/content/sync";
import { fs } from "@/lib/fs";
import path from "path";
import { pagesDir, trashDir } from "@/lib/paths";
import { pageCreateSchema, pageUpdateSchema } from "@/lib/validation/pages";
import { slugExists } from "@/lib/content/slug";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema/pages";
import { users } from "@/lib/db/schema/users";

describe("page filesystem sync", () => {
  afterAll(async () => {
    await fs.rm(path.join(pagesDir(), "test-page"), { recursive: true, force: true });
    await fs.rm(trashDir(), { recursive: true, force: true });
  });

  it("writes a page to the filesystem with frontmatter", async () => {
    await writePageToFilesystem("test-page", "# About Us", {
      title: "About",
      nav: true,
    });

    const raw = await fs.readFile(path.join(pagesDir(), "test-page/index.md"), "utf-8");
    expect(raw).toContain("title: About");
    expect(raw).toContain("# About Us");
  });

  it("moves a deleted page to the trash instead of removing it", async () => {
    await writePageToFilesystem("test-page", "# Temp", { title: "Temp" });
    await deletePageFromFilesystem("test-page");

    await expect(fs.access(path.join(pagesDir(), "test-page"))).rejects.toThrow();

    const trashed = await fs.readdir(trashDir());
    expect(trashed.some((name) => name.startsWith("test-page-"))).toBe(true);
  });
});

describe("page validation", () => {
  it("accepts a valid page", () => {
    const result = pageCreateSchema.safeParse({
      slug: "about",
      title: "About",
      content: "# Hello",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
      expect(result.data.showInNav).toBe(false);
      expect(result.data.navOrder).toBe(0);
    }
  });

  it("rejects an invalid slug", () => {
    const result = pageCreateSchema.safeParse({
      slug: "Not A Slug",
      title: "About",
      content: "# Hello",
    });
    expect(result.success).toBe(false);
  });

  it("allows partial updates without a slug", () => {
    const result = pageUpdateSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });
});

describe("cross-table slug uniqueness", () => {
  beforeAll(() => {
    db.insert(users)
      .values({
        id: "test-author",
        email: "test-author@example.test",
        passwordHash: "",
        displayName: "Test Author",
        role: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .run();
  });

  it("reports an existing page slug as taken", () => {
    const now = new Date().toISOString();
    db.insert(pages)
      .values({
        slug: "unique-check",
        title: "Unique",
        contentMd: "x",
        contentHtml: "<p>x</p>",
        authorId: "test-author",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    expect(slugExists("unique-check")).toBe(true);
    expect(slugExists("does-not-exist-anywhere")).toBe(false);
  });
});
