/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema/pages";
import { apiSuccess, apiError } from "@/lib/api/response";
import { pageUpdateSchema } from "@/lib/validation/pages";
import {
  writePageToFilesystem,
  deletePageFromFilesystem,
} from "@/lib/content/sync";
import { renderMarkdown, parseFrontmatter } from "@/lib/md/parser";
import { requireUser } from "@/lib/auth/require";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = db.select().from(pages).where(eq(pages.slug, slug)).get();

  if (!page) {
    return apiError("Page not found", 404);
  }

  return apiSuccess(page);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireUser(request);
  if (!auth) {
    return apiError("Authentication required", 401);
  }

  const { slug } = await params;

  const existing = db.select().from(pages).where(eq(pages.slug, slug)).get();
  if (!existing) {
    return apiError("Page not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = pageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const update = parsed.data;
  const now = new Date().toISOString();
  const existingFm: Record<string, unknown> = JSON.parse(existing.frontmatter);
  const contentFm = parseFrontmatter(update.content ?? "").frontmatter;
  const mergedFm = { ...existingFm, ...contentFm, ...(update.frontmatter ?? {}) };

  const updateData: Record<string, unknown> = { updatedAt: now };

  if (update.title !== undefined) updateData.title = update.title;
  if (update.status !== undefined) updateData.status = update.status;
  if (update.showInNav !== undefined) updateData.showInNav = update.showInNav;
  if (update.navOrder !== undefined) updateData.navOrder = update.navOrder;
  if (update.authorId !== undefined) updateData.authorId = update.authorId;

  if (update.content !== undefined) {
    updateData.frontmatter = JSON.stringify(mergedFm);
    try {
      const { html, excerpt } = await renderMarkdown(update.content);
      updateData.contentMd = update.content;
      updateData.contentHtml = html;
      updateData.excerpt = excerpt;
    } catch (err) {
      return apiError("Failed to render markdown", 500);
    }
  }

  db.update(pages).set(updateData).where(eq(pages.slug, slug)).run();

  if (update.content !== undefined) {
    await writePageToFilesystem(slug, update.content, {
      title: update.title ?? existing.title,
      ...mergedFm,
    });
  }

  try {
    const { commitPost } = await import("@/lib/git/repo");
    await commitPost(slug, update.title ?? existing.title, "update");
  } catch {
    // best-effort
  }

  const page = db.select().from(pages).where(eq(pages.slug, slug)).get();

  return apiSuccess(page);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireUser(request);
  if (!auth) {
    return apiError("Authentication required", 401);
  }

  const { slug } = await params;

  const existing = db.select().from(pages).where(eq(pages.slug, slug)).get();
  if (!existing) {
    return apiError("Page not found", 404);
  }

  db.delete(pages).where(eq(pages.slug, slug)).run();
  await deletePageFromFilesystem(slug);

  return apiSuccess({ deleted: true });
}
