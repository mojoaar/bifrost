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
import { saveMediaFile } from "@/lib/media/store";
import { requireUser } from "@/lib/auth/require";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth) {
    return apiError("Authentication required", 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return apiError("Missing 'file' field", 400);
  }

  try {
    const record = await saveMediaFile(file);
    return apiSuccess(record, undefined, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return apiError(message, 400);
  }
}
