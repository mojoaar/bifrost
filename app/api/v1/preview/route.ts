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
import { renderMarkdown } from "@/lib/md/parser";

export async function POST(request: NextRequest) {
  let body: { source?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  if (!body.source) {
    return apiError("source is required", 400);
  }

  try {
    const { html } = await renderMarkdown(body.source);
    return apiSuccess({ html });
  } catch (err) {
    return apiError("Failed to render markdown", 500);
  }
}
