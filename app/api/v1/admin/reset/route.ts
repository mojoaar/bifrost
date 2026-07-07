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
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { media } from "@/lib/db/schema/media";
import { postTags } from "@/lib/db/schema/post-tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { verifyAccessToken } from "@/lib/auth/token";
import { stopWatcher, startWatcher } from "@/lib/content/watcher";

const CONTENT_DIR = path.resolve("content");
const POSTS_DIR = path.join(CONTENT_DIR, "posts");
const MEDIA_DIR = path.join(CONTENT_DIR, "media");
const GIT_DIR = path.join(CONTENT_DIR, ".git");

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

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if ("error" in auth) {
    return apiError(auth.error, auth.status);
  }

  try {
    await stopWatcher();

    db.delete(postTags).run();
    db.delete(media).run();
    db.delete(posts).run();

    await Promise.all([
      rmDir(POSTS_DIR).catch(() => {}),
      rmDir(MEDIA_DIR).catch(() => {}),
      rmDir(GIT_DIR).catch(() => {}),
    ]);

    startWatcher();

    return apiSuccess({ reset: true });
  } catch (err) {
    return apiError("Failed to reset content", 500, String(err));
  }
}

export async function GET() {
  return apiError("Method not allowed", 405);
}
