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
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { apiSuccess, apiError } from "@/lib/api/response";
import { tagUpdateSchema } from "@/lib/validation/tags";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tag = db.select().from(tags).where(eq(tags.id, id)).get();
  if (!tag) {
    return apiError("Tag not found", 404);
  }
  return apiSuccess(tag);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = db.select().from(tags).where(eq(tags.id, id)).get();
  if (!existing) {
    return apiError("Tag not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = tagUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.slug !== undefined) update.slug = parsed.data.slug;

  if (Object.keys(update).length === 0) {
    return apiSuccess(existing);
  }

  db.update(tags).set(update).where(eq(tags.id, id)).run();
  const tag = db.select().from(tags).where(eq(tags.id, id)).get();
  return apiSuccess(tag);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = db.select().from(tags).where(eq(tags.id, id)).get();
  if (!existing) {
    return apiError("Tag not found", 404);
  }

  db.delete(postTags).where(eq(postTags.tagId, id)).run();
  db.delete(tags).where(eq(tags.id, id)).run();

  return apiSuccess({ deleted: true });
}
