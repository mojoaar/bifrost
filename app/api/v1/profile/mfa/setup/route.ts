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
import { generateMfaSecret, generateRecoveryCodes } from "@/lib/auth/mfa";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Authentication required", 401);

  const { secret, otpauthUrl } = generateMfaSecret();
  const { plain } = await generateRecoveryCodes();

  return apiSuccess({ secret, otpauthUrl, recoveryCodes: plain });
}
