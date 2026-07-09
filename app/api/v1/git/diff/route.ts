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
import { getDiff } from "@/lib/git/repo";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Unauthorized", 401);

  const { searchParams } = request.nextUrl;
  const sha = searchParams.get("sha");

  if (!sha) {
    return apiError("sha query parameter is required", 400);
  }

  try {
    const diff = await getDiff(sha);
    return apiSuccess({ diff });
  } catch (err) {
    return apiError("Failed to get diff", 500);
  }
}
