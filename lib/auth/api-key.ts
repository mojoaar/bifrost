/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { randomBytes, randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema/api-keys";
import { users } from "@/lib/db/schema/users";

const SALT_ROUNDS = 12;
const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const KEY_BYTES = 32;
const PREFIX_LENGTH = 12;

export const API_KEY_PREFIX = "bfk_";

export function isApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

function toBase62(bytes: Buffer): string {
  let out = "";
  for (const b of bytes) {
    if (b >= 248) continue;
    out += ALPHABET[b % 62];
  }
  while (out.length < KEY_BYTES) out += ALPHABET[0];
  return out.slice(0, KEY_BYTES);
}

export interface GeneratedApiKey {
  plaintext: string;
  prefix: string;
  hash: string;
}

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const plaintext = API_KEY_PREFIX + toBase62(randomBytes(KEY_BYTES));
  const prefix = plaintext.slice(0, PREFIX_LENGTH);
  const hash = await bcrypt.hash(plaintext, SALT_ROUNDS);
  return { plaintext, prefix, hash };
}

export interface ApiKeyRecordInput {
  name: string;
  userId: string;
}

export interface CreatedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  plaintext: string;
}

export async function createApiKey(
  input: ApiKeyRecordInput
): Promise<CreatedApiKey> {
  const { plaintext, prefix, hash } = await generateApiKey();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.insert(apiKeys)
    .values({
      id,
      name: input.name,
      keyPrefix: prefix,
      keyHash: hash,
      userId: input.userId,
      createdAt,
      lastUsedAt: null,
      revokedAt: null,
    })
    .run();
  return { id, name: input.name, keyPrefix: prefix, createdAt, plaintext };
}

export interface ApiKeyIdentity {
  userId: string;
  role: string;
}

export async function verifyApiKey(
  token: string
): Promise<ApiKeyIdentity | null> {
  if (!isApiKey(token)) return null;
  const prefix = token.slice(0, PREFIX_LENGTH);

  const candidates = db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyPrefix, prefix), isNull(apiKeys.revokedAt)))
    .all();

  for (const candidate of candidates) {
    const match = await bcrypt.compare(token, candidate.keyHash);
    if (!match) continue;

    const user = db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, candidate.userId))
      .get();
    if (!user) return null;

    db.update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, candidate.id))
      .run();

    return { userId: candidate.userId, role: user.role };
  }

  return null;
}

export async function verifyApiKeyRequest(
  request: Request
): Promise<ApiKeyIdentity | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token) return null;
  return verifyApiKey(token);
}
