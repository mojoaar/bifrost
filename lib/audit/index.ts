/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";

import { randomUUID } from "crypto";
import { lt, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { users } from "@/lib/db/schema/users";
import type { AuthIdentity } from "@/lib/auth/require";

export type AuditAction =
  | "auth.login"
  | "auth.mfa"
  | "auth.refresh"
  | "mfa.setup"
  | "mfa.verify"
  | "mfa.disable"
  | "mfa.reset"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "post.create"
  | "post.update"
  | "post.delete"
  | "post.preview_share"
  | "post.preview_revoke"
  | "page.create"
  | "page.update"
  | "page.delete"
  | "settings.update"
  | "apikey.create"
  | "apikey.revoke"
  | "admin.reset"
  | "content.export"
  | "content.import"
  | "media.upload"
  | "media.delete"
  | "audit.purge";

export type AuditStatus = "success" | "failure";
export type AuditActorType = "user" | "api_key" | "system" | "anonymous";

const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface ClientContext {
  actorId: string | null;
  actorLabel: string | null;
  actorType: AuditActorType;
  ip: string | null;
  userAgent: string | null;
}

export interface AuditEntry {
  action: AuditAction;
  status: AuditStatus;
  actorId?: string | null;
  actorLabel?: string | null;
  actorType?: AuditActorType;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function getClientContext(
  request: Request,
  auth?: AuthIdentity | null,
  actorLabel?: string | null
): ClientContext {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]!.trim()
    : request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  let actorType: AuditActorType = "anonymous";
  let resolvedLabel = actorLabel ?? null;
  if (auth) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    actorType = token?.startsWith("bfk_") ? "api_key" : "user";

    if (!resolvedLabel) {
      try {
        resolvedLabel =
          db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, auth.userId))
            .get()?.email ?? null;
      } catch {
        resolvedLabel = null;
      }
    }
  }

  return {
    actorId: auth?.userId ?? null,
    actorLabel: resolvedLabel,
    actorType,
    ip: ip || null,
    userAgent: userAgent || null,
  };
}

export function recordAudit(entry: AuditEntry): void {
  try {
    db.insert(auditLogs)
      .values({
        id: randomUUID(),
        timestamp: nowISO(),
        actorId: entry.actorId ?? null,
        actorLabel: entry.actorLabel ?? null,
        actorType: entry.actorType ?? "system",
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        status: entry.status,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      })
      .run();
    pruneAuditLogs();
  } catch {
    // Audit logging is best-effort and must never break a request.
  }
}

export function pruneAuditLogs(): void {
  try {
    const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
    db.delete(auditLogs).where(lt(auditLogs.timestamp, cutoff)).run();
  } catch {
    // Best-effort.
  }
}
