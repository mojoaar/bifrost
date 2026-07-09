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
import { requireUser } from "@/lib/auth/require";
import { getAllMedia } from "@/lib/media/store";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const items = await getAllMedia();
    return apiSuccess(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list media";
    return apiError(message, 500);
  }
}
