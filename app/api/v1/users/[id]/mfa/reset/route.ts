/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (!auth) return apiError("Authentication required", 401);

  const { id } = await context.params;

  const user = db.select({ id: users.id }).from(users).where(eq(users.id, id)).get();
  if (!user) return apiError("User not found", 404);

  db.update(users)
    .set({ mfaEnabled: 0, mfaSecret: null, mfaRecovery: null })
    .where(eq(users.id, id))
    .run();

  return apiSuccess({ reset: true });
}
