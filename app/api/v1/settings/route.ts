/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET() {
  const rows = db.select().from(settings).all();
  const obj: Record<string, string> = {};
  for (const row of rows) obj[row.key] = row.value;
  return apiSuccess(obj);
}

export async function PUT(request: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  for (const [key, value] of Object.entries(body)) {
    db.insert(settings)
      .values({ key, value: typeof value === "string" ? value : JSON.stringify(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: typeof value === "string" ? value : JSON.stringify(value) } })
      .run();
  }

  return apiSuccess({ updated: true });
}
