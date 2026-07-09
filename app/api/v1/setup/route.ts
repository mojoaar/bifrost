/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { settings } from "@/lib/db/schema/settings";
import { apiSuccess, apiError } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { generateId } from "@/lib/id";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const admin = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .get();

  return apiSuccess({ needsSetup: !admin });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "setup", 3, 60_000);
  if (limited) return limited;

  let body: { email?: string; password?: string; name?: string; title?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { email, password, name, title, description } = body;
  if (!email || !password) return apiError("Email and password are required", 400);
  if (password.length < 8) return apiError("Password must be at least 8 characters", 400);

  const passwordHash = await hashPassword(password);
  const now = nowISO();

  const adminId = db.transaction(() => {
    const admin = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .get();

    if (admin) return null;

    const id = generateId();
    db.insert(users)
      .values({
        id,
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName: (name?.trim() || email.split("@")[0] || "Admin"),
        role: "admin",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return id;
  });

  if (!adminId) return apiError("Setup already completed", 409);

  const defaultSettings: Record<string, string> = {
    "appearance.date_format": "EU",
    "appearance.time_format": "24h",
    "appearance.color_scheme": "default",
    "git.enabled": "false",
    "ai.enabled": "false",
    "sharing.enabled": "false",
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    db.insert(settings).values({ key, value }).onConflictDoNothing().run();
  }

  if (title) {
    db.insert(settings)
      .values({ key: "site.title", value: title })
      .onConflictDoUpdate({ target: settings.key, set: { value: title } })
      .run();
  }
  if (description) {
    db.insert(settings)
      .values({ key: "site.description", value: description })
      .onConflictDoUpdate({ target: settings.key, set: { value: description } })
      .run();
  }

  try {
    const { seedPosts, seedPages } = await import("@/lib/seed");
    await seedPosts(adminId);
    await seedPages(adminId);
  } catch (err) {
    console.error("[setup] seed failed (best-effort):", err);
  }

  return apiSuccess({ setup: true }, undefined, 201);
}
