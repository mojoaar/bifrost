/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { mediaDir } from "@/lib/paths";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const root = mediaDir();
  const target = path.resolve(root, ...segments);

  if (target !== root && !target.startsWith(root + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) {
      return new Response("Not found", { status: 404 });
    }
    const file = await readFile(target);
    const ext = path.extname(target).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(file), {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
