/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { getHistory } from "@/lib/git/repo";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(500, Math.max(1, Number(limitParam))) : undefined;

  try {
    const history = await getHistory(slug, limit);
    return apiSuccess(history ?? []);
  } catch {
    return apiSuccess([]);
  }
}
