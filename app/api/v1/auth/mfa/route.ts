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
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import { createAccessToken, createRefreshToken, verifyMfaToken } from "@/lib/auth/token";
import { verifyMfaCode, verifyRecoveryCode } from "@/lib/auth/mfa";

export async function POST(request: NextRequest) {
  let body: { mfaToken?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const { mfaToken, code } = body;

  if (!mfaToken || !code) {
    return apiError("mfaToken and code are required", 400);
  }

  const payload = await verifyMfaToken(mfaToken);
  if (!payload) return apiError("Invalid or expired MFA token", 401);

  const user = db.select({
    id: users.id,
    email: users.email,
    role: users.role,
    mfaSecret: users.mfaSecret,
    mfaRecovery: users.mfaRecovery,
  })
    .from(users)
    .where(eq(users.id, payload.sub))
    .get();

  if (!user) return apiError("User not found", 404);

  let valid = false;
  let remainingRecovery: string[] | null = null;

  if (user.mfaSecret && verifyMfaCode(user.mfaSecret, code)) {
    valid = true;
  } else {
    const result = await verifyRecoveryCode(user.mfaRecovery, code);
    if (result.valid) {
      valid = true;
      remainingRecovery = result.remaining;
    }
  }

  if (!valid) return apiError("Invalid MFA code", 400);

  if (remainingRecovery !== null) {
    db.update(users)
      .set({ mfaRecovery: JSON.stringify(remainingRecovery) })
      .where(eq(users.id, user.id))
      .run();
  }

  const tokenPayload = { sub: user.id, role: user.role };
  const accessToken = await createAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(tokenPayload);

  return apiSuccess({ accessToken, refreshToken });
}
