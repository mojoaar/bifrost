/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { db } from "@/lib/db";
import { pageViews } from "@/lib/db/schema";
import { generateId } from "@/lib/id";
import { apiSuccess, apiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const viewSchema = z.object({
  path: z.string().min(1).max(2048),
  referrer: z.string().max(2048).optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "analytics:view", 100, 60_000);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const parsed = viewSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("path is required", 400);
  }

  try {
    db.insert(pageViews)
      .values({
        id: generateId(),
        path: parsed.data.path,
        timestamp: new Date().toISOString(),
        referrer: parsed.data.referrer?.slice(0, 2048) ?? null,
      })
      .run();
  } catch {
    return apiError("Failed to record view", 500);
  }

  return apiSuccess({ ok: true });
}
