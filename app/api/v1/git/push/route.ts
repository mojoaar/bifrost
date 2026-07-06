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

export async function POST() {
  try {
    await pushToRemote();
    return apiSuccess({ pushed: true });
  } catch (err) {
    return apiError("Failed to push", 500, String(err));
  }
}
