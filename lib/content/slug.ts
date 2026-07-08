/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { pages } from "@/lib/db/schema/pages";

export function slugExists(slug: string): boolean {
  const post = db.select({ slug: posts.slug }).from(posts).where(eq(posts.slug, slug)).get();
  if (post) return true;
  const page = db.select({ slug: pages.slug }).from(pages).where(eq(pages.slug, slug)).get();
  return Boolean(page);
}
