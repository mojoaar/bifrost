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
  generateMfaSecret,
  verifyMfaCode,
  generateRecoveryCodes,
  verifyRecoveryCode,
} from "@/lib/auth/mfa";

describe("generateMfaSecret", () => {
  it("returns a base32 secret and an otpauth URL", () => {
    const { secret, otpauthUrl } = generateMfaSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThan(0);
    expect(otpauthUrl).toContain("otpauth://totp/");
    expect(otpauthUrl).toContain(`secret=${secret}`);
  });

  it("returns unique secrets", () => {
    expect(generateMfaSecret().secret).not.toBe(generateMfaSecret().secret);
  });
});

describe("verifyMfaCode", () => {
  it("rejects codes that are not 6 digits", () => {
    const { secret } = generateMfaSecret();
    expect(verifyMfaCode(secret, "12345")).toBe(false);
    expect(verifyMfaCode(secret, "abcdef")).toBe(false);
    expect(verifyMfaCode(secret, "")).toBe(false);
  });

  it("rejects an incorrect code", () => {
    const { secret } = generateMfaSecret();
    expect(verifyMfaCode(secret, "000000")).toBe(false);
  });
});

describe("recovery codes", () => {
  it("generates 8 plain and 8 hashed codes", async () => {
    const { plain, hashed } = await generateRecoveryCodes();
    expect(plain).toHaveLength(8);
    expect(hashed).toHaveLength(8);
    expect(plain[0]).not.toBe(hashed[0]);
  });

  it("verifies a valid recovery code and consumes it", async () => {
    const { plain, hashed } = await generateRecoveryCodes();
    const stored = JSON.stringify(hashed);
    const result = await verifyRecoveryCode(stored, plain[0]!);
    expect(result.valid).toBe(true);
    expect(result.remaining).toHaveLength(7);
  });

  it("rejects an unknown recovery code", async () => {
    const { hashed } = await generateRecoveryCodes();
    const result = await verifyRecoveryCode(JSON.stringify(hashed), "deadbeef");
    expect(result.valid).toBe(false);
    expect(result.remaining).toHaveLength(8);
  });

  it("handles null and malformed stored json", async () => {
    expect((await verifyRecoveryCode(null, "x")).valid).toBe(false);
    expect((await verifyRecoveryCode("not json", "x")).valid).toBe(false);
    expect((await verifyRecoveryCode("[]", "x")).valid).toBe(false);
  });
});
