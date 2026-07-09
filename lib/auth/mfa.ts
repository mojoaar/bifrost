/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }

  return result;
}

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotp(secret: string, time = Date.now()): string {
  const key = base32Decode(secret);
  const counter = Buffer.alloc(8);
  const t = Math.floor(time / 1000 / 30);
  counter.writeBigInt64BE(BigInt(t));

  const hmac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 15;
  const binary =
    ((hmac[offset]! & 127) << 24) |
    ((hmac[offset + 1]! & 255) << 16) |
    ((hmac[offset + 2]! & 255) << 8) |
    (hmac[offset + 3]! & 255);

  return (binary % 1000000).toString().padStart(6, "0");
}

export function generateMfaSecret(): { secret: string; otpauthUrl: string } {
  const bytes = crypto.randomBytes(20);
  const secret = base32Encode(bytes);
  const otpauthUrl = `otpauth://totp/Bifr%C3%B6st:admin?secret=${secret}&issuer=Bifr%C3%B6st`;
  return { secret, otpauthUrl };
}

export function verifyMfaCode(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;

  const now = Date.now();

  for (const drift of [-1, 0, 1]) {
    const expected = generateTotp(secret, now + drift * 30000);
    if (code === expected) return true;
  }

  return false;
}

export async function generateRecoveryCodes(): Promise<{
  plain: string[];
  hashed: string[];
}> {
  const plain: string[] = [];
  const hashed: string[] = [];

  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(8).toString("hex");
    plain.push(code);
    hashed.push(await bcrypt.hash(code, 10));
  }

  return { plain, hashed };
}

export async function verifyRecoveryCode(
  storedJson: string | null,
  code: string
): Promise<{ valid: boolean; remaining: string[] }> {
  if (!storedJson) return { valid: false, remaining: [] };

  let hashes: string[];
  try {
    hashes = JSON.parse(storedJson);
  } catch {
    return { valid: false, remaining: [] };
  }

  if (!Array.isArray(hashes) || hashes.length === 0) {
    return { valid: false, remaining: [] };
  }

  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i]!;
    const match = await bcrypt.compare(code, hash);
    if (match) {
      hashes.splice(i, 1);
      return { valid: true, remaining: hashes };
    }
  }

  return { valid: false, remaining: hashes };
}
