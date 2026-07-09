/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require";
import { recordAudit, getClientContext } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Admin authentication required", 401);

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))
  );

  const filters: SQL[] = [];

  const action = searchParams.get("action");
  if (action) filters.push(eq(auditLogs.action, action));

  const actorId = searchParams.get("actorId");
  if (actorId) filters.push(eq(auditLogs.actorId, actorId));

  const status = searchParams.get("status");
  if (status === "success" || status === "failure") {
    filters.push(eq(auditLogs.status, status));
  }

  const from = searchParams.get("from");
  if (from) filters.push(sql`${auditLogs.timestamp} >= ${from}`);

  const to = searchParams.get("to");
  if (to) filters.push(sql`${auditLogs.timestamp} <= ${to}`);

  const where = filters.length > 0 ? and(...filters) : undefined;

  const total =
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(where)
      .get()?.count ?? 0;

  const rows = db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  return apiSuccess(rows, { page, limit, total });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Admin authentication required", 401);

  const deleted =
    db.select({ count: sql<number>`count(*)` }).from(auditLogs).get()?.count ?? 0;

  db.delete(auditLogs).run();

  recordAudit({
    action: "audit.purge",
    status: "success",
    ...getClientContext(request, auth),
    metadata: { purged: deleted },
  });

  return apiSuccess({ purged: deleted });
}
