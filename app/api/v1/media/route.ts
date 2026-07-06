/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { apiSuccess, apiError } from "@/lib/api/response";
import { getAllMedia } from "@/lib/media/store";

export async function GET() {
  try {
    const items = await getAllMedia();
    return apiSuccess(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list media";
    return apiError(message, 500);
  }
}
