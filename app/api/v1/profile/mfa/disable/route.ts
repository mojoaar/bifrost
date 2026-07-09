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
import { verifyPassword } from "@/lib/auth/password";
import { recordAudit, getClientContext } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Authentication required", 401);

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  if (!body.password) {
    return apiError("password is required", 400);
  }

  const user = db.select({ passwordHash: users.passwordHash, mfaEnabled: users.mfaEnabled })
    .from(users)
    .where(eq(users.id, auth.userId))
    .get();

  if (!user) return apiError("User not found", 404);

  const pwValid = await verifyPassword(body.password, user.passwordHash);
  if (!pwValid) return apiError("Invalid password", 400);

  db.update(users)
    .set({ mfaEnabled: 0, mfaSecret: null, mfaRecovery: null })
    .where(eq(users.id, auth.userId))
    .run();

  recordAudit({
    action: "mfa.disable",
    status: "success",
    targetType: "user",
    targetId: auth.userId,
    ...getClientContext(request, auth),
  });

  return apiSuccess({ disabled: true });
}
