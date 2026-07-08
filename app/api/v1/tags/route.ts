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
import { tagCreateSchema } from "@/lib/validation/tags";
import { generateId } from "@/lib/id";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/require";

export async function GET() {
  const rows = db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      count: sql<number>`count(${postTags.postSlug})`,
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(sql`${tags.name} ASC`)
    .all();
  return apiSuccess(rows);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth) return apiError("Authentication required", 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = tagCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, parsed.error.flatten());
  }

  const { name, slug } = parsed.data;
  const existing = db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.slug, slug))
    .get();
  if (existing) {
    return apiError("A tag with this slug already exists", 409);
  }

  const id = generateId();
  db.insert(tags).values({ id, name, slug }).run();

  const tag = db.select().from(tags).where(eq(tags.id, id)).get();
  return apiSuccess(tag, undefined, 201);
}
