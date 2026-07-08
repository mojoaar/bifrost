/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { apiSuccess, apiError } from "@/lib/api/response";
import { pushToRemote } from "@/lib/git/repo";
import { requireAdmin } from "@/lib/auth/require";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Admin authentication required", 401);

  try {
    await pushToRemote();
    return apiSuccess({ pushed: true });
  } catch {
    return apiError("Failed to push", 500);
  }
}
