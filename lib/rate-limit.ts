/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextResponse } from "next/server";

const buckets = new Map<string, Map<string, { count: number; windowStart: number }>>();

function getBucket(key: string, windowMs: number): Map<string, { count: number; windowStart: number }> {
  const composite = `${key}:${windowMs}`;
  let bucket = buckets.get(composite);
  if (!bucket) {
    bucket = new Map();
    buckets.set(composite, bucket);
  }
  return bucket;
}

function cleanBucket(bucket: Map<string, { count: number; windowStart: number }>, now: number, windowMs: number) {
  let cleaned = 0;
  for (const [ip, entry] of bucket) {
    if (now - entry.windowStart > windowMs) {
      bucket.delete(ip);
      cleaned++;
    }
  }
  if (cleaned > 1000) buckets.clear();
}

export function rateLimit(
  request: Request,
  key: string,
  maxRequests: number,
  windowMs: number
): Response | null {
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = getBucket(key, windowMs);
  const now = Date.now();

  const entry = bucket.get(ip);
  if (entry && now - entry.windowStart <= windowMs) {
    entry.count++;
    if (entry.count > maxRequests) {
      return new NextResponse(
        JSON.stringify({ error: { message: "Too many requests" } }),
        { status: 429, headers: { "content-type": "application/json", "retry-after": "60" } }
      );
    }
  } else {
    bucket.set(ip, { count: 1, windowStart: now });
    cleanBucket(bucket, now, windowMs);
  }

  return null;
}
