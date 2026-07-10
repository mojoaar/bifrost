/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { and, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { nowISO } from "@/lib/time";
import { writePostToFilesystem } from "@/lib/content/sync";
import { runHook } from "@/lib/plugins/registry";
import { createLogger } from "@/lib/logger";

const log = createLogger("scheduler");
const INTERVAL_MS = 60_000;

export async function publishDueScheduledPosts(): Promise<number> {
  const now = nowISO();

  const due = db
    .select()
    .from(posts)
    .where(and(eq(posts.status, "scheduled"), lte(posts.scheduledAt, now)))
    .all();

  let published = 0;

  for (const post of due) {
    const publishedAt = post.scheduledAt ?? now;

    db.update(posts)
      .set({
        status: "published",
        publishedAt,
        scheduledAt: null,
        previewToken: null,
        previewTokenExpiresAt: null,
        updatedAt: now,
      })
      .where(eq(posts.slug, post.slug))
      .run();

    try {
      const fm = JSON.parse(post.frontmatter) as Record<string, unknown>;
      delete fm.scheduledAt;
      await writePostToFilesystem(post.slug, post.contentMd, {
        title: post.title,
        ...fm,
      });
    } catch (err) {
      log.error(`failed to rewrite markdown for ${post.slug}:`, err);
    }

    try {
      const { loadConfig } = await import("@/lib/config/loader");
      await runHook("onContentPublish", post.slug, { db, loadConfig });
    } catch {
      // hooks are optional
    }

    published += 1;
    log.info(`published scheduled post ${post.slug}`);
  }

  return published;
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    publishDueScheduledPosts().catch((err) =>
      log.error("run failed:", err)
    );
  }, INTERVAL_MS);
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
