/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { requireUser, requireAdmin } from "@/lib/auth/require";
import { createAccessToken } from "@/lib/auth/token";
import { createApiKey } from "@/lib/auth/api-key";

const adminId = randomUUID();
const authorId = randomUUID();

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/v1/x", { headers });
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

beforeAll(() => {
  const now = new Date().toISOString();
  db.insert(users)
    .values([
      {
        id: adminId,
        email: `admin-${adminId}@example.com`,
        passwordHash: "x",
        displayName: "Admin",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: authorId,
        email: `author-${authorId}@example.com`,
        passwordHash: "x",
        displayName: "Author",
        role: "author",
        createdAt: now,
        updatedAt: now,
      },
    ])
    .run();
});

describe("requireUser", () => {
  it("returns null when no authorization header is present", async () => {
    expect(await requireUser(req())).toBeNull();
  });

  it("returns null for an invalid token", async () => {
    expect(await requireUser(req(bearer("not-a-jwt")))).toBeNull();
  });

  it("resolves a valid JWT to its identity", async () => {
    const token = await createAccessToken({ sub: authorId, role: "author" });
    expect(await requireUser(req(bearer(token)))).toEqual({
      userId: authorId,
      role: "author",
    });
  });

  it("resolves a valid API key to its identity", async () => {
    const key = await createApiKey({ name: "ru", userId: adminId });
    expect(await requireUser(req(bearer(key.plaintext)))).toEqual({
      userId: adminId,
      role: "admin",
    });
  });
});

describe("requireAdmin", () => {
  it("returns null when no authorization header is present", async () => {
    expect(await requireAdmin(req())).toBeNull();
  });

  it("rejects a valid non-admin JWT", async () => {
    const token = await createAccessToken({ sub: authorId, role: "author" });
    expect(await requireAdmin(req(bearer(token)))).toBeNull();
  });

  it("accepts a valid admin JWT", async () => {
    const token = await createAccessToken({ sub: adminId, role: "admin" });
    expect(await requireAdmin(req(bearer(token)))).toEqual({
      userId: adminId,
      role: "admin",
    });
  });

  it("accepts a valid admin API key", async () => {
    const key = await createApiKey({ name: "ra", userId: adminId });
    expect(await requireAdmin(req(bearer(key.plaintext)))).toEqual({
      userId: adminId,
      role: "admin",
    });
  });

  it("rejects a valid non-admin API key", async () => {
    const key = await createApiKey({ name: "ra-author", userId: authorId });
    expect(await requireAdmin(req(bearer(key.plaintext)))).toBeNull();
  });
});
