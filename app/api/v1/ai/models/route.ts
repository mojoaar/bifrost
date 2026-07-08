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
import { fetchModels } from "@/lib/ai/providers";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const provider = searchParams.get("provider");

  if (!provider) {
    return apiError("provider query parameter is required", 400);
  }

  try {
    const models = await fetchModels(provider);
    return apiSuccess(models);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to fetch models", 500);
  }
}
