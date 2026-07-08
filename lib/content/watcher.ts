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
import { pages } from "@/lib/db/schema/pages";
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { parseMarkdown } from "@/lib/md/parser";
import { resolveAuthorId } from "@/lib/content/authors";
import { runHook } from "@/lib/plugins/registry";
import { postsDir, pagesDir } from "@/lib/paths";
import { generateId } from "@/lib/id";
import { eq } from "drizzle-orm";

function tagSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (!name) continue;
    const slug = tagSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push(name);
  }
  return result;
}

function syncPostTags(slug: string, frontmatterTags: unknown): void {
  const names = normalizeTags(frontmatterTags);
  const tagIds: string[] = [];

  for (const name of names) {
    const slugified = tagSlug(name);
    const existing = db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slugified)).get();
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    const id = generateId();
    db.insert(tags).values({ id, name, slug: slugified }).onConflictDoNothing().run();
    const row = db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slugified)).get();
    if (row) tagIds.push(row.id);
  }

  db.delete(postTags).where(eq(postTags.postSlug, slug)).run();
  for (const tagId of tagIds) {
    db.insert(postTags).values({ postSlug: slug, tagId }).onConflictDoNothing().run();
  }
}

type Collection = "post" | "page";

function isInside(baseDir: string, filePath: string): boolean {
  const rel = path.relative(baseDir, filePath);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function collectionFor(filePath: string): { kind: Collection; dir: string } | null {
  if (isInside(postsDir(), filePath)) return { kind: "post", dir: postsDir() };
  if (isInside(pagesDir(), filePath)) return { kind: "page", dir: pagesDir() };
  return null;
}

function slugFromFilePath(filePath: string, baseDir: string): string {
  const relative = path.relative(baseDir, filePath);
  const parts = relative.split(path.sep);
  if (parts[0] && parts[0] !== ".") {
    return parts[0];
  }
  return path.basename(relative, ".md");
}

async function processPost(
  filePath: string,
  slug: string,
  raw: string,
  parsed: Awaited<ReturnType<typeof parseMarkdown>>,
  skipGit: boolean
): Promise<void> {
  const title = (parsed.frontmatter.title as string) || slug;
  const isDraft = parsed.frontmatter.draft === true;
  const frontmatterScheduledAt = parsed.frontmatter.scheduledAt as string | undefined;
  const status = isDraft
    ? "draft"
    : frontmatterScheduledAt
      ? "scheduled"
      : "published";
  const now = new Date().toISOString();
  const date = (parsed.frontmatter.date as string) || now;
  const authorId = resolveAuthorId((parsed.frontmatter.author as string) || null);

  if (!authorId) {
    console.error(`[watcher] no users exist in the database — skipping ${filePath}`);
    return;
  }

  const existing = db.select({ slug: posts.slug }).from(posts).where(eq(posts.slug, slug)).get();

  let action: "create" | "update" | null = null;

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
          scheduledAt: status === "scheduled" ? (frontmatterScheduledAt ?? now) : null,
          updatedAt: now,
        })
        .where(eq(posts.slug, slug))
        .run();
      action = "update";
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
    action = "create";
  }

  syncPostTags(slug, parsed.frontmatter.tags);

  console.log(`[watcher] processFile ${filePath} → post slug=${slug} action=${action ?? "unchanged"}`);

  if (action && !skipGit) {
    try {
      const { commitPost } = await import("@/lib/git/repo");
      await commitPost(slug, title, action);
    } catch {
      // best-effort
    }
  }

  if (status === "published") {
    try {
      const { loadConfig } = await import("@/lib/config/loader");
      await runHook("onContentPublish", slug, { db, loadConfig });
    } catch {
      // hooks are optional
    }
  }
}

async function processPage(
  filePath: string,
  slug: string,
  raw: string,
  parsed: Awaited<ReturnType<typeof parseMarkdown>>,
  skipGit: boolean
): Promise<void> {
  const fm = parsed.frontmatter;
  const title = (fm.title as string) || slug;
  const status = fm.draft === true ? "draft" : "published";
  const now = new Date().toISOString();
  const date = (fm.date as string) || now;
  const showInNav = fm.nav === true || fm.showInNav === true;
  const navOrder = Number(fm.navOrder ?? fm.order ?? 0) || 0;
  const authorId = resolveAuthorId((fm.author as string) || null);

  if (!authorId) {
    console.error(`[watcher] no users exist in the database — skipping ${filePath}`);
    return;
  }

  const existing = db.select({ slug: pages.slug }).from(pages).where(eq(pages.slug, slug)).get();

  let action: "create" | "update" | null = null;

  if (existing) {
    const row = db.select({ html: pages.contentHtml }).from(pages).where(eq(pages.slug, slug)).get();
    if (row?.html !== parsed.html) {
      db.update(pages)
        .set({
          title,
          contentMd: raw,
          contentHtml: parsed.html,
          excerpt: parsed.excerpt,
          frontmatter: JSON.stringify(fm),
          status,
          showInNav,
          navOrder,
          authorId,
          updatedAt: now,
        })
        .where(eq(pages.slug, slug))
        .run();
      action = "update";
    }
  } else {
    db.insert(pages)
      .values({
        slug,
        title,
        contentMd: raw,
        contentHtml: parsed.html,
        excerpt: parsed.excerpt,
        frontmatter: JSON.stringify(fm),
        status,
        showInNav,
        navOrder,
        authorId,
        createdAt: date,
        updatedAt: now,
      })
      .run();
    action = "create";
  }

  console.log(`[watcher] processFile ${filePath} → page slug=${slug} action=${action ?? "unchanged"}`);

  if (action && !skipGit) {
    try {
      const { commitPost } = await import("@/lib/git/repo");
      await commitPost(slug, title, action);
    } catch {
      // best-effort
    }
  }
}

async function processFile(filePath: string, skipGit = false): Promise<void> {
  if (!filePath.endsWith(".md")) return;

  const collection = collectionFor(filePath);
  if (!collection) return;

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = await parseMarkdown(raw);
    const slug = slugFromFilePath(filePath, collection.dir);

    if (collection.kind === "page") {
      await processPage(filePath, slug, raw, parsed, skipGit);
    } else {
      await processPost(filePath, slug, raw, parsed, skipGit);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

function deleteFromDb(filePath: string): void {
  const collection = collectionFor(filePath);
  if (!collection) return;

  const slug = slugFromFilePath(filePath, collection.dir);

  if (collection.kind === "page") {
    const row = db.select({ slug: pages.slug }).from(pages).where(eq(pages.slug, slug)).get();
    if (!row) {
      console.warn(`[watcher] unlink for page ${slug} but no DB row exists — skipping`);
      return;
    }
    console.log(`[watcher] unlink: deleting page ${slug} from DB`);
    db.delete(pages).where(eq(pages.slug, slug)).run();
    return;
  }

  const row = db.select({ id: posts.slug }).from(posts).where(eq(posts.slug, slug)).get();
  if (!row) {
    console.warn(`[watcher] unlink for ${slug} but no DB row exists — skipping`);
    return;
  }
  console.log(`[watcher] unlink: deleting ${slug} from DB`);
  db.delete(posts).where(eq(posts.slug, slug)).run();
}

let watcher: FSWatcher | null = null;

export function startWatcher(): void {
  if (watcher) return;

  watcher = chokidar.watch([postsDir(), pagesDir()], {
    ignoreInitial: true,
    ignored: (p: string) => p.includes(`${path.sep}.git${path.sep}`),
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher.on("add", (filePath: string) => {
    console.log(`[watcher] add: ${filePath}`);
    processFile(filePath);
  });
  watcher.on("change", (filePath: string) => {
    console.log(`[watcher] change: ${filePath}`);
    processFile(filePath);
  });
  watcher.on("unlink", (filePath: string) => {
    console.log(`[watcher] unlink: ${filePath}`);
    deleteFromDb(filePath);
  });
  watcher.on("unlinkDir", (dirPath: string) => {
    console.log(`[watcher] unlinkDir: ${dirPath}`);
  });
}

async function ingestDir(baseDir: string, skipGit: boolean): Promise<void> {
  try {
    const entries = await fs.readdir(baseDir, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const filePath = path.join(entry.parentPath || baseDir, entry.name);
        await processFile(filePath, skipGit);
      }
    }
  } catch {
    // directory may not exist yet
  }
}

export async function ingestAll(skipGit = false): Promise<void> {
  await ingestDir(postsDir(), skipGit);
  await ingestDir(pagesDir(), skipGit);
}

export async function stopWatcher(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}
