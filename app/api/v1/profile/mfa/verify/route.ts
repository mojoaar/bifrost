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
import { verifyMfaCode } from "@/lib/auth/mfa";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Authentication required", 401);

  let body: { secret?: string; code?: string; recoveryCodes?: string[] };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const { secret, code, recoveryCodes } = body;

  if (!secret || !code || !Array.isArray(recoveryCodes)) {
    return apiError("secret, code, and recoveryCodes are required", 400);
  }

  if (!verifyMfaCode(secret, code)) {
    return apiError("Invalid verification code", 400);
  }

  db.update(users)
    .set({
      mfaEnabled: 1,
      mfaSecret: secret,
      mfaRecovery: JSON.stringify(recoveryCodes),
    })
    .where(eq(users.id, auth.userId))
    .run();

  return apiSuccess({ enabled: true });
}
