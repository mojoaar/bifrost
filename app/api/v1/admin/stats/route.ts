/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import os from "os";
import { db } from "@/lib/db";
import { posts, pages, users, media, tags, pageViews } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require";
import { apiSuccess, apiError } from "@/lib/api/response";
import { sql } from "drizzle-orm";
import { version } from "@/package.json";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return apiError("Admin authentication required", 401);
  }

  const mem = process.memoryUsage();

  const counts = db
    .select({
      posts: sql<number>`count(*)`,
    })
    .from(posts)
    .get();

  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

  const viewsToday =
    db
      .select({ count: sql<number>`count(*)` })
      .from(pageViews)
      .where(sql`${pageViews.timestamp} >= ${dayAgo}`)
      .get()?.count ?? 0;

  const viewsWeek =
    db
      .select({ count: sql<number>`count(*)` })
      .from(pageViews)
      .where(sql`${pageViews.timestamp} >= ${weekAgo}`)
      .get()?.count ?? 0;

  const mostViewed = db
    .select({
      path: pageViews.path,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(pageViews)
    .where(sql`${pageViews.timestamp} >= ${weekAgo}`)
    .groupBy(pageViews.path)
    .orderBy(sql`count(*) DESC`)
    .limit(5)
    .all();

  const dbCounts = {
    posts: counts?.posts ?? 0,
    pages: db.select({ count: sql<number>`count(*)` }).from(pages).get()?.count ?? 0,
    users: db.select({ count: sql<number>`count(*)` }).from(users).get()?.count ?? 0,
    media: db.select({ count: sql<number>`count(*)` }).from(media).get()?.count ?? 0,
    tags: db.select({ count: sql<number>`count(*)` }).from(tags).get()?.count ?? 0,
  };

  return apiSuccess({
    server: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      },
      version,
    },
    db: dbCounts,
    views: {
      today: viewsToday,
      week: viewsWeek,
      mostViewed,
    },
  });
}
