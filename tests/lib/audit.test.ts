/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { recordAudit, getClientContext, pruneAuditLogs } from "@/lib/audit";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/v1/x", { headers });
}

describe("getClientContext", () => {
  it("marks anonymous when no auth is provided", () => {
    const ctx = getClientContext(req({ "x-forwarded-for": "9.9.9.9, 1.1.1.1", "user-agent": "UA" }));
    expect(ctx.actorType).toBe("anonymous");
    expect(ctx.actorId).toBeNull();
    expect(ctx.ip).toBe("9.9.9.9");
    expect(ctx.userAgent).toBe("UA");
  });

  it("detects a user actor from a bearer JWT", () => {
    const ctx = getClientContext(
      req({ authorization: "Bearer eyJhbGci" }),
      { userId: "u1", role: "admin" },
      "admin@example.com"
    );
    expect(ctx.actorType).toBe("user");
    expect(ctx.actorId).toBe("u1");
    expect(ctx.actorLabel).toBe("admin@example.com");
  });

  it("detects an api_key actor from a bfk_ token", () => {
    const ctx = getClientContext(req({ authorization: "Bearer bfk_abc" }), {
      userId: "u1",
      role: "admin",
    });
    expect(ctx.actorType).toBe("api_key");
  });

  it("resolves the actor email from the database when no label is passed", () => {
    const now = new Date().toISOString();
    db.insert(users)
      .values({
        id: "u-audit-email",
        email: "resolved@example.com",
        passwordHash: "x",
        displayName: "Resolved",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const ctx = getClientContext(req({ authorization: "Bearer eyJhbGci" }), {
      userId: "u-audit-email",
      role: "admin",
    });
    expect(ctx.actorLabel).toBe("resolved@example.com");
  });
});

describe("recordAudit", () => {
  it("inserts an audit row", () => {
    recordAudit({
      action: "auth.login",
      status: "success",
      actorId: "u-audit-test",
      actorType: "user",
      metadata: { foo: "bar" },
    });
    const rows = db.select().from(auditLogs).where(eq(auditLogs.actorId, "u-audit-test")).all();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]!.action).toBe("auth.login");
    expect(rows[0]!.metadata).toBe(JSON.stringify({ foo: "bar" }));
  });

  it("never throws on best-effort logging", () => {
    expect(() =>
      recordAudit({ action: "audit.purge", status: "success" })
    ).not.toThrow();
  });
});

describe("pruneAuditLogs", () => {
  it("deletes rows older than the retention window", () => {
    const oldId = "old-audit-row";
    db.insert(auditLogs)
      .values({
        id: oldId,
        timestamp: "2000-01-01T00:00:00.000Z",
        actorType: "system",
        action: "auth.login",
        status: "success",
      })
      .run();
    pruneAuditLogs();
    const rows = db.select().from(auditLogs).where(eq(auditLogs.id, oldId)).all();
    expect(rows).toHaveLength(0);
  });
});
