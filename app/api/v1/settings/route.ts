/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";
import { apiSuccess, apiError } from "@/lib/api/response";
import { redactSecrets, SECRET_PLACEHOLDER, invalidateSettingsCache, isSecretKey } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth/require";
import { recordAudit, getClientContext } from "@/lib/audit";

const settingsSchema = z.record(
  z.string().min(1).max(128).regex(/^[a-z0-9_.-]+$/i, "Invalid setting key"),
  z.union([z.string().max(100_000), z.number(), z.boolean()])
);

export async function GET() {
  const rows = db.select().from(settings).all();
  const obj: Record<string, string> = {};
  for (const row of rows) obj[row.key] = row.value;
  return apiSuccess(redactSecrets(obj));
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Admin authentication required", 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError("Invalid settings payload", 400, parsed.error.flatten());
  }
  const body = parsed.data;

  for (const [key, rawValue] of Object.entries(body)) {
    if (isSecretKey(key) && rawValue === SECRET_PLACEHOLDER) continue;
    const value = typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue);
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
  }

  invalidateSettingsCache();

  recordAudit({
    action: "settings.update",
    status: "success",
    targetType: "settings",
    ...getClientContext(request, auth),
    metadata: { keys: Object.keys(body) },
  });

  return apiSuccess({ updated: true });
}
