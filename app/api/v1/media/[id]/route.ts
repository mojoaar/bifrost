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
import { deleteMedia } from "@/lib/media/store";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = await deleteMedia(id);
    if (!deleted) {
      return apiError("Media not found", 404);
    }
    return apiSuccess({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete media";
    return apiError(message, 500);
  }
}
