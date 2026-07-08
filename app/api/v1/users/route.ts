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
import { generateId } from "@/lib/id";
import { requireAdmin } from "@/lib/auth/require";

export async function GET() {
  const rows = db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users).all();

  return apiSuccess(rows);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return apiError("Admin authentication required", 401);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" && ["admin", "editor", "author"].includes(body.role)
    ? body.role
    : "author";

  if (!email || !password) return apiError("Email and password are required", 400);
  if (password.length < 8) return apiError("Password must be at least 8 characters", 400);
  if (!displayName) return apiError("Display name is required", 400);

  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) return apiError("A user with that email already exists", 409);

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  db.insert(users).values({
    id: generateId(),
    email,
    passwordHash,
    displayName,
    role: role as "admin" | "editor" | "author",
    createdAt: now,
    updatedAt: now,
  }).run();

  return apiSuccess({ created: true }, undefined, 201);
}
