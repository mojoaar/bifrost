/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { readFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema/media";
import { getSetting } from "@/lib/settings";
import { contentDir } from "@/lib/paths";

interface MediaRow {
  id: string;
  path: string;
  mimeType: string;
}

async function serveCustom(mediaId: string): Promise<Response | null> {
  try {
    const row = db
      .select()
      .from(media)
      .where(eq(media.id, mediaId))
      .get() as MediaRow | undefined;
    if (!row) return null;
    if (row.mimeType === "image/svg+xml") return null;
    const fsPath = path.join(contentDir(), row.path);
    if (!fsPath.startsWith(contentDir() + path.sep)) return null;
    const file = await readFile(fsPath);
    return new Response(new Uint8Array(file), {
      headers: {
        "content-type": row.mimeType || "application/octet-stream",
        "cache-control": "no-cache",
      },
    });
  } catch {
    return null;
  }
}

async function serveDefault(): Promise<Response> {
  const file = await readFile(
    path.join(process.cwd(), "public", "apple-icon-180.png")
  );
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-cache",
    },
  });
}

export async function GET() {
  const mediaId = getSetting("site.favicon_media_id");
  if (mediaId) {
    const custom = await serveCustom(mediaId);
    if (custom) return custom;
  }
  return serveDefault();
}
