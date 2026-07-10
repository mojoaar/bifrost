/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { Request } from "express";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import type { McpContext } from "./tools/shared";

export function buildHttpContext(
  req: Request,
  auth: { userId: string; role: string }
): McpContext {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const actorType = token.startsWith("bfk_") ? "api_key" : "user";

  const fwd = req.headers["x-forwarded-for"];
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd;
  const ip = fwdStr
    ? fwdStr.split(",")[0]!.trim()
    : ((req.headers["x-real-ip"] as string) ?? null);
  const ua = (req.headers["user-agent"] as string) ?? null;

  let label: string | null = null;
  try {
    label =
      db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, auth.userId))
        .get()?.email ?? null;
  } catch {
    label = null;
  }

  return {
    actorId: auth.userId,
    actorLabel: label,
    actorType,
    ip: ip || null,
    userAgent: ua || null,
  };
}
