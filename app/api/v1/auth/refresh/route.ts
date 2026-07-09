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
import { createAccessToken, verifyRefreshToken } from "@/lib/auth/token";
import { validateCsrf } from "@/lib/auth/csrf";
import { recordAudit, getClientContext } from "@/lib/audit";

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) {
    return apiError("Invalid request origin", 403);
  }

  const cookie = request.cookies.get("bifrost_refresh");

  if (!cookie?.value) {
    return apiError("No refresh token provided", 401);
  }

  const payload = await verifyRefreshToken(cookie.value);
  if (!payload) {
    recordAudit({
      action: "auth.refresh",
      status: "failure",
      ...getClientContext(request, null),
      metadata: { reason: "invalid_token" },
    });
    return apiError("Invalid or expired refresh token", 401);
  }

  const accessToken = await createAccessToken(payload);

  return apiSuccess({ accessToken });
}
