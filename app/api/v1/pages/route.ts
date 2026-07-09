/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema/pages";
import { apiSuccess, apiError } from "@/lib/api/response";
import { pageCreateSchema } from "@/lib/validation/pages";
import { writePageToFilesystem } from "@/lib/content/sync";
import { renderMarkdown, parseFrontmatter } from "@/lib/md/parser";
import { resolveAuthorId } from "@/lib/content/authors";
import { requireUser, requireAdmin } from "@/lib/auth/require";
import { recordAudit, getClientContext } from "@/lib/audit";
import { slugExists } from "@/lib/content/slug";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const admin = (await requireAdmin(request)) !== null;
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const statusParam = searchParams.get("status");
  const isPublished = statusParam === "published";
  const isDraft = statusParam === "draft";
  const statusFilter = !admin
    ? eq(pages.status, "published")
    : isPublished || isDraft
      ? eq(pages.status, statusParam as "draft" | "published")
      : undefined;

  const total =
    db.select({ count: sql<number>`count(*)` }).from(pages).where(statusFilter).get()?.count ?? 0;

  const rows = db
    .select()
    .from(pages)
    .where(statusFilter)
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy(sql`${pages.navOrder} ASC, ${pages.createdAt} DESC`)
    .all();

  return apiSuccess(rows, { page, limit, total });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth) {
    return apiError("Authentication required", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = pageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const { slug, title, content, frontmatter, status, showInNav, navOrder, authorId } = parsed.data;

  const resolvedAuthorId = resolveAuthorId(auth.userId ?? authorId);
  if (!resolvedAuthorId) {
    return apiError("No valid author found; create a user first", 400);
  }

  if (slugExists(slug)) {
    return apiError("A post or page with this slug already exists", 409);
  }

  const contentFm = parseFrontmatter(content).frontmatter;
  const mergedFm = { ...contentFm, ...frontmatter };

  await writePageToFilesystem(slug, content, mergedFm);

  const now = nowISO();

  try {
    const { html, excerpt } = await renderMarkdown(content);

    db.insert(pages)
      .values({
        slug,
        title,
        contentMd: content,
        contentHtml: html,
        excerpt,
        frontmatter: JSON.stringify(mergedFm),
        status,
        showInNav,
        navOrder,
        authorId: resolvedAuthorId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    try {
      const { commitPost } = await import("@/lib/git/repo");
      await commitPost(slug, title, "create");
    } catch {
      // best-effort
    }
  } catch (err) {
    return apiError("Failed to create page", 500);
  }

  const created = db.select().from(pages).where(eq(pages.slug, slug)).get();

  recordAudit({
    action: "page.create",
    status: "success",
    targetType: "page",
    targetId: slug,
    ...getClientContext(request, auth),
    metadata: { title },
  });

  return apiSuccess(created, undefined, 201);
}
