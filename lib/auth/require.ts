/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { verifyApiKeyRequest, verifyApiKey } from "./api-key";
import { verifyAccessToken } from "./token";

export interface AuthIdentity {
  userId: string;
  role: string;
}

export async function requireUser(
  request: Request
): Promise<AuthIdentity | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (payload) {
    return { userId: payload.sub, role: payload.role };
  }

  return verifyApiKeyRequest(request);
}

export async function requireAdmin(
  request: Request
): Promise<AuthIdentity | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (payload) {
    return payload.role === "admin"
      ? { userId: payload.sub, role: payload.role }
      : null;
  }

  const keyIdentity = await verifyApiKey(token);
  if (keyIdentity) {
    return keyIdentity.role === "admin" ? keyIdentity : null;
  }

  return null;
}
