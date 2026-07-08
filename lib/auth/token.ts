/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { SignJWT, jwtVerify } from "jose";
import type { TokenPayload } from "./types";

const DEV_ACCESS_SECRET = "bifrost-dev-access-secret-change-me";
const DEV_REFRESH_SECRET = "bifrost-dev-refresh-secret-change-me";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.BIFROST_JWT_SECRET ?? DEV_ACCESS_SECRET
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.BIFROST_JWT_REFRESH_SECRET ?? DEV_REFRESH_SECRET
);

export function isUsingDevSecrets(): boolean {
  return (
    !process.env.BIFROST_JWT_SECRET ||
    !process.env.BIFROST_JWT_REFRESH_SECRET ||
    process.env.BIFROST_JWT_SECRET === DEV_ACCESS_SECRET ||
    process.env.BIFROST_JWT_REFRESH_SECRET === DEV_REFRESH_SECRET
  );
}

const ACCESS_EXPIRES = "1h";
const REFRESH_EXPIRES = "7d";

export function createAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(ACCESS_SECRET);
}

export function createRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(REFRESH_EXPIRES)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
