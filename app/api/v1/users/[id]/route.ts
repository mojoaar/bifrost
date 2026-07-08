/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { apiSuccess, apiError } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/require";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Admin authentication required", 401);

  const { id } = await params;

  const existing = db.select({ id: users.id }).from(users).where(eq(users.id, id)).get();
  if (!existing) return apiError("User not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const update: Record<string, string> = { updatedAt: new Date().toISOString() };

  if (typeof body.displayName === "string" && body.displayName.trim()) {
    update.displayName = body.displayName.trim();
  }
  if (typeof body.email === "string" && body.email.trim()) {
    update.email = body.email.trim().toLowerCase();
  }
  if (typeof body.role === "string" && ["admin", "editor", "author"].includes(body.role)) {
    update.role = body.role;
  }
  if (typeof body.password === "string" && body.password) {
    update.passwordHash = await hashPassword(body.password);
  }

  db.update(users).set(update).where(eq(users.id, id)).run();

  return apiSuccess({ updated: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Admin authentication required", 401);
  const { id } = await params;

  const existing = db.select({ id: users.id }).from(users).where(eq(users.id, id)).get();
  if (!existing) return apiError("User not found", 404);

  db.delete(users).where(eq(users.id, id)).run();

  return apiSuccess({ deleted: true });
}
