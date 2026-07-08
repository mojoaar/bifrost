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
import { verifyAccessToken } from "@/lib/auth/token";
import { stopWatcher, startWatcher } from "@/lib/content/watcher";
import { SEED_SLUGS, SEED_PAGE_SLUGS } from "@/lib/seed";
import { postsDir, pagesDir } from "@/lib/paths";

async function verifyAdmin(request: NextRequest): Promise<{ sub: string; role: string } | { error: string; status: number }> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearerToken) {
    return { error: "Authentication required", status: 401 };
  }
  const payload = await verifyAccessToken(bearerToken);
  if (!payload) {
    return { error: "Invalid or expired token", status: 401 };
  }
  if (payload.role !== "admin") {
    return { error: "Admin role required", status: 403 };
  }
  return payload;
}

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
  const auth = await verifyAdmin(request);
  if ("error" in auth) {
    return apiError(auth.error, auth.status);
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
      ...SEED_SLUGS.map((slug) => rmDir(path.join(postsDir(), slug)).catch(() => {})),
      ...SEED_PAGE_SLUGS.map((slug) => rmDir(path.join(pagesDir(), slug)).catch(() => {})),
    ]);

    startWatcher();

    return apiSuccess({ removed: slugs.length + pageSlugs.length });
  } catch (err) {
    return apiError("Failed to reset content", 500);
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if ("error" in auth) {
    return apiError(auth.error, auth.status);
  }
  return apiSuccess({ demoCount: seedPostSlugs().length + seedPageSlugs().length });
}
