/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { randomBytes } from "crypto";

export const PREVIEW_TOKEN_TTL_DAYS = 7;

export interface PreviewTokenFields {
  previewToken: string;
  previewTokenExpiresAt: string;
}

export function generatePreviewToken(now: Date = new Date()): PreviewTokenFields {
  const previewToken = randomBytes(32).toString("base64url");
  const expires = new Date(now.getTime() + PREVIEW_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { previewToken, previewTokenExpiresAt: expires.toISOString() };
}

export function isPreviewTokenValid(
  storedToken: string | null | undefined,
  storedExpiresAt: string | null | undefined,
  providedToken: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!storedToken || !providedToken) return false;
  if (storedToken !== providedToken) return false;
  if (!storedExpiresAt) return false;
  const expires = new Date(storedExpiresAt).getTime();
  if (Number.isNaN(expires)) return false;
  return now.getTime() < expires;
}
