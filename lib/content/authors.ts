/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { asc, eq } from "drizzle-orm";

export function resolveAuthorId(candidate?: string | null): string | null {
  if (candidate) {
    const found = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, candidate))
      .get();
    if (found) return found.id;
  }

  const admin = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.createdAt))
    .get();
  if (admin) return admin.id;

  const any = db
    .select({ id: users.id })
    .from(users)
    .orderBy(asc(users.createdAt))
    .get();

  return any?.id ?? null;
}
