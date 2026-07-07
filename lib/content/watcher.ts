/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import chokidar, { type FSWatcher } from "chokidar";
import { fs } from "@/lib/fs";
import path from "path";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { parseMarkdown } from "@/lib/md/parser";
import { runHook } from "@/lib/plugins/registry";
import { eq } from "drizzle-orm";

const CONTENT_POSTS_DIR = path.resolve("content/posts");

function slugFromFilePath(filePath: string): string {
  const relative = path.relative(CONTENT_POSTS_DIR, filePath);
  const parts = relative.split(path.sep);
  if (parts[0] && parts[0] !== ".") {
    return parts[0];
  }
  return path.basename(relative, ".md");
}

async function processFile(filePath: string): Promise<void> {
  if (!filePath.endsWith(".md")) return;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = await parseMarkdown(raw);

    const slug = slugFromFilePath(filePath);
    const title = (parsed.frontmatter.title as string) || slug;
    const status = parsed.frontmatter.draft === true ? "draft" : "published";
    const now = new Date().toISOString();
    const date = (parsed.frontmatter.date as string) || now;
    const authorId =
      (parsed.frontmatter.author as string) ||
      "00000000-0000-0000-0000-000000000000";

    const existing = db
      .select({ slug: posts.slug })
      .from(posts)
      .where(eq(posts.slug, slug))
      .get();

    if (existing) {
      const row = db.select({ html: posts.contentHtml }).from(posts).where(eq(posts.slug, slug)).get();
      if (row?.html !== parsed.html) {
        db.update(posts)
          .set({
            title,
            contentMd: raw,
            contentHtml: parsed.html,
            excerpt: parsed.excerpt,
            frontmatter: JSON.stringify(parsed.frontmatter),
            status,
            authorId,
            publishedAt: status === "published" ? date : null,
            updatedAt: now,
          })
          .where(eq(posts.slug, slug))
          .run();
      }
    } else {
      db.insert(posts)
        .values({
          slug,
          title,
          contentMd: raw,
          contentHtml: parsed.html,
          excerpt: parsed.excerpt,
          frontmatter: JSON.stringify(parsed.frontmatter),
          status,
          authorId,
          publishedAt: status === "published" ? date : null,
          createdAt: date,
          updatedAt: now,
        })
        .run();
    }

    try {
      const { commitPost } = await import("@/lib/git/repo");
      await commitPost(slug, title);
    } catch {
      // best-effort
    }

    if (status === "published") {
      try {
        const { loadConfig } = await import("@/lib/config/loader");
        await runHook("onContentPublish", slug, { db, loadConfig });
      } catch {
        // hooks are optional
      }
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

function deleteFromDb(filePath: string): void {
  const slug = slugFromFilePath(filePath);
  db.delete(posts).where(eq(posts.slug, slug)).run();
}

let watcher: FSWatcher | null = null;

export function startWatcher(): void {
  if (watcher) return;

  watcher = chokidar.watch(path.join(CONTENT_POSTS_DIR, "**", "*.md"), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher.on("add", processFile);
  watcher.on("change", processFile);
  watcher.on("unlink", deleteFromDb);
}

export async function ingestAll(): Promise<void> {
  try {
    const entries = await fs.readdir(CONTENT_POSTS_DIR, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const filePath = path.join(entry.parentPath || CONTENT_POSTS_DIR, entry.name);
        await processFile(filePath);
      }
    }
  } catch {
    // content/posts/ may not exist yet
  }
}

export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
