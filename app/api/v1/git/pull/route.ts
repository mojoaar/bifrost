/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { apiSuccess, apiError } from "@/lib/api/response";
import { pullFromRemote } from "@/lib/git/repo";

export async function POST() {
  try {
    await pullFromRemote();
    return apiSuccess({ pulled: true });
  } catch (err) {
    return apiError("Failed to pull", 500, String(err));
  }
}
