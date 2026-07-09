/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import path from "path";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { postTags } from "@/lib/db/schema/post-tags";
import { pages } from "@/lib/db/schema/pages";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require";
import { stopWatcher, startWatcher } from "@/lib/content/watcher";
import { SEED_SLUGS, SEED_PAGE_SLUGS } from "@/lib/seed";
import { postsDir, pagesDir } from "@/lib/paths";
import { recordAudit, getClientContext } from "@/lib/audit";
import { createLogger } from "@/lib/logger";

const log = createLogger("reset");

async function rmDir(dir: string): Promise<void> {
  const { rm } = await import("fs/promises");
  await rm(dir, { recursive: true, force: true });
}

function seedPostSlugs(): string[] {
  if (SEED_SLUGS.length === 0) return [];
  return db
    .select({ slug: posts.slug })
    .from(posts)
    .where(inArray(posts.slug, SEED_SLUGS))
    .all()
    .map((r) => r.slug);
}

function seedPageSlugs(): string[] {
  if (SEED_PAGE_SLUGS.length === 0) return [];
  return db
    .select({ slug: pages.slug })
    .from(pages)
    .where(inArray(pages.slug, SEED_PAGE_SLUGS))
    .all()
    .map((r) => r.slug);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return apiError("Unauthorized", 401);
  }

  try {
    await stopWatcher();

    const slugs = seedPostSlugs();
    if (slugs.length > 0) {
      db.delete(postTags).where(inArray(postTags.postSlug, slugs)).run();
      db.delete(posts).where(inArray(posts.slug, slugs)).run();
    }

    const pageSlugs = seedPageSlugs();
    if (pageSlugs.length > 0) {
      db.delete(pages).where(inArray(pages.slug, pageSlugs)).run();
    }

    await Promise.all([
      ...SEED_SLUGS.map((slug) => rmDir(path.join(postsDir(), slug)).catch((err) => log.error("failed to remove post dir:", slug, err))),
      ...SEED_PAGE_SLUGS.map((slug) => rmDir(path.join(pagesDir(), slug)).catch((err) => log.error("failed to remove page dir:", slug, err))),
    ]);

    startWatcher();

    recordAudit({
      action: "admin.reset",
      status: "success",
      ...getClientContext(request, { userId: auth.userId, role: auth.role }),
      metadata: { removed: slugs.length + pageSlugs.length },
    });

    return apiSuccess({ removed: slugs.length + pageSlugs.length });
  } catch (err) {
    return apiError("Failed to reset content", 500);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return apiError("Unauthorized", 401);
  }
  return apiSuccess({ demoCount: seedPostSlugs().length + seedPageSlugs().length });
}
