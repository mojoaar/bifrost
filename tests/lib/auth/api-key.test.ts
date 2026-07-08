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
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { apiKeys } from "@/lib/db/schema/api-keys";
import {
  generateApiKey,
  createApiKey,
  verifyApiKey,
  isApiKey,
  API_KEY_PREFIX,
} from "@/lib/auth/api-key";

const userId = randomUUID();

beforeAll(() => {
  const now = new Date().toISOString();
  db.insert(users)
    .values({
      id: userId,
      email: `apikey-${userId}@example.com`,
      passwordHash: "x",
      displayName: "API Key Tester",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .run();
});

describe("generateApiKey", () => {
  it("produces a bfk_-prefixed plaintext and a verifiable bcrypt hash", async () => {
    const { plaintext, prefix, hash } = await generateApiKey();
    expect(plaintext.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(prefix).toBe(plaintext.slice(0, 12));
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it("produces unique keys", async () => {
    const a = await generateApiKey();
    const b = await generateApiKey();
    expect(a.plaintext).not.toBe(b.plaintext);
  });
});

describe("isApiKey", () => {
  it("recognizes bfk_ tokens and rejects others", () => {
    expect(isApiKey("bfk_abc")).toBe(true);
    expect(isApiKey("eyJhbGciOi.jwt.token")).toBe(false);
  });
});

describe("verifyApiKey", () => {
  it("resolves a valid key to its user identity and role", async () => {
    const created = await createApiKey({ name: "test", userId });
    const identity = await verifyApiKey(created.plaintext);
    expect(identity).toEqual({ userId, role: "admin" });
  });

  it("updates lastUsedAt on successful verification", async () => {
    const created = await createApiKey({ name: "usage", userId });
    await verifyApiKey(created.plaintext);
    const row = db
      .select({ lastUsedAt: apiKeys.lastUsedAt })
      .from(apiKeys)
      .where(eq(apiKeys.id, created.id))
      .get();
    expect(row?.lastUsedAt).toBeTruthy();
  });

  it("returns null for a non-api-key token", async () => {
    expect(await verifyApiKey("not-a-key")).toBeNull();
  });

  it("returns null for an unknown key", async () => {
    expect(await verifyApiKey(API_KEY_PREFIX + "deadbeefdeadbeef")).toBeNull();
  });

  it("returns null for a revoked key", async () => {
    const created = await createApiKey({ name: "revoked", userId });
    db.update(apiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, created.id))
      .run();
    expect(await verifyApiKey(created.plaintext)).toBeNull();
  });
});
