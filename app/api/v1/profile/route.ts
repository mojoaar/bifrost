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
import { verifyAccessToken } from "@/lib/auth/token";
import { hashPassword } from "@/lib/auth/password";
import { cleanSocialLinks, parseSocialLinks } from "@/lib/social";

async function currentUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearerToken) return null;
  const payload = await verifyAccessToken(bearerToken);
  return payload?.sub ?? null;
}

const PROFILE_COLUMNS = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  bio: users.bio,
  socialLinks: users.socialLinks,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export async function GET(request: NextRequest) {
  const userId = await currentUserId(request);
  if (!userId) return apiError("Invalid or expired token", 401);

  const user = db.select(PROFILE_COLUMNS).from(users).where(eq(users.id, userId)).get();
  if (!user) return apiError("User not found", 404);

  return apiSuccess({ ...user, socialLinks: parseSocialLinks(user.socialLinks) });
}

export async function PUT(request: NextRequest) {
  const userId = await currentUserId(request);
  if (!userId) return apiError("Invalid or expired token", 401);

  const existing = db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!existing) return apiError("User not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const update: Record<string, string | null> = { updatedAt: new Date().toISOString() };

  if (typeof body.displayName === "string") {
    const trimmed = body.displayName.trim();
    if (!trimmed) return apiError("Display name cannot be empty", 400);
    update.displayName = trimmed;
  }
  if (typeof body.email === "string" && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    const clash = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
    if (clash && clash.id !== userId) {
      return apiError("A user with that email already exists", 409);
    }
    update.email = email;
  }
  if (typeof body.bio === "string") {
    update.bio = body.bio.trim() || null;
  }
  if (typeof body.avatarUrl === "string") {
    update.avatarUrl = body.avatarUrl.trim() || null;
  }
  if (body.socialLinks !== undefined) {
    const cleaned = cleanSocialLinks(body.socialLinks);
    update.socialLinks = Object.keys(cleaned).length ? JSON.stringify(cleaned) : null;
  }
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 8) {
      return apiError("Password must be at least 8 characters", 400);
    }
    update.passwordHash = await hashPassword(body.password);
  }

  db.update(users).set(update).where(eq(users.id, userId)).run();

  const user = db.select(PROFILE_COLUMNS).from(users).where(eq(users.id, userId)).get();
  return apiSuccess(user ? { ...user, socialLinks: parseSocialLinks(user.socialLinks) } : user);
}
