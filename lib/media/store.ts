/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema/media";
import { generateId } from "@/lib/id";

const MEDIA_DIR = path.resolve("content/media");

export interface MediaRecord {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "text/",
];

export async function saveMediaFile(file: File): Promise<MediaRecord> {
  const mimeType = file.type;
  const allowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
    mimeType.startsWith(prefix)
  );
  if (!allowed) {
    throw new Error(`Unsupported media type: ${mimeType}`);
  }

  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("File exceeds 50MB limit");
  }

  const id = generateId();
  const dir = path.join(MEDIA_DIR, id);
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, file.name);
  await fs.writeFile(filePath, buffer);

  const now = new Date().toISOString();
  const relativePath = path.relative(path.resolve("content"), filePath);

  db.insert(media)
    .values({
      id,
      filename: file.name,
      path: relativePath,
      mimeType,
      sizeBytes: file.size,
      createdAt: now,
    })
    .run();

  return {
    id,
    filename: file.name,
    path: relativePath,
    mimeType,
    sizeBytes: file.size,
    createdAt: now,
  };
}
