/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { desc, eq, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema/api-keys";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require";
import { createApiKey } from "@/lib/auth/api-key";
import { recordAudit, getClientContext } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError("Invalid or expired token", 401);

  const rows = db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, admin.userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt))
    .all();

  return apiSuccess(rows);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError("Invalid or expired token", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const name =
    typeof (body as { name?: unknown })?.name === "string"
      ? (body as { name: string }).name.trim()
      : "";
  if (!name) return apiError("A key name is required", 400);

  const created = await createApiKey({ name, userId: admin.userId });

  recordAudit({
    action: "apikey.create",
    status: "success",
    targetType: "api_key",
    targetId: created.id,
    ...getClientContext(request, admin),
    metadata: { name: created.name, keyPrefix: created.keyPrefix },
  });

  return apiSuccess(
    {
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      createdAt: created.createdAt,
      key: created.plaintext,
    },
    undefined,
    201
  );
}
