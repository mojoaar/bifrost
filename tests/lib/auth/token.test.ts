/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/token";
import type { TokenPayload } from "@/lib/auth/types";

const payload: TokenPayload = { sub: "user-1", role: "admin" };

describe("createAccessToken", () => {
  it("creates a JWT string", async () => {
    const token = await createAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });
});

describe("verifyAccessToken", () => {
  it("returns payload for valid token", async () => {
    const token = await createAccessToken(payload);
    const result = await verifyAccessToken(token);
    expect(result).toEqual(payload);
  });

  it("returns null for expired token", async () => {
    const { SignJWT } = await import("jose");
    const testSecret = new TextEncoder().encode("bifrost-dev-access-secret-change-me");
    const expired = await new SignJWT({ sub: "x", role: "author" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("0s")
      .sign(testSecret);

    const result = await verifyAccessToken(expired);
    expect(result).toBeNull();
  });

  it("returns null for tampered token", async () => {
    const token = await createAccessToken(payload);
    const tampered = token.slice(0, -5) + "xxxxx";
    const result = await verifyAccessToken(tampered);
    expect(result).toBeNull();
  });
});

describe("createRefreshToken / verifyRefreshToken", () => {
  it("round-trips correctly", async () => {
    const token = await createRefreshToken(payload);
    const result = await verifyRefreshToken(token);
    expect(result).toEqual(payload);
  });
});
