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
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import { createAccessToken, createRefreshToken, createMfaToken, secureCookies } from "@/lib/auth/token";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit, getClientContext } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "auth:login", 5, 60_000);
  if (limited) return limited;
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return apiError("Email and password are required", 400);
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .get();

  if (!user) {
    recordAudit({
      action: "auth.login",
      status: "failure",
      ...getClientContext(request, null, email),
      metadata: { reason: "user_not_found" },
    });
    return apiError("Invalid email or password", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordAudit({
      action: "auth.login",
      status: "failure",
      ...getClientContext(request, { userId: user.id, role: user.role }, user.email),
      metadata: { reason: "invalid_password" },
    });
    return apiError("Invalid email or password", 401);
  }

  const payload = { sub: user.id, role: user.role };

  if (user.mfaEnabled) {
    const mfaToken = await createMfaToken(payload);
    recordAudit({
      action: "auth.login",
      status: "success",
      ...getClientContext(request, { userId: user.id, role: user.role }, user.email),
      metadata: { mfaRequired: true },
    });
    return apiSuccess({
      requiresMfa: true,
      mfaToken,
    });
  }

  const accessToken = await createAccessToken(payload);
  const refreshToken = await createRefreshToken(payload);

  recordAudit({
    action: "auth.login",
    status: "success",
    ...getClientContext(request, { userId: user.id, role: user.role }, user.email),
  });

  const response = apiSuccess({
    tokens: { accessToken, refreshToken },
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });

  response.cookies.set("bifrost_refresh", refreshToken, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
