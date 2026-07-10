/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";

import { fs } from "@/lib/fs";
import path from "path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema/media";
import { generateId } from "@/lib/id";
import { contentDir, mediaDir } from "@/lib/paths";
import { createLogger } from "@/lib/logger";

const log = createLogger("media");

export interface MediaVariant {
  path: string;
  width: number;
  height: number;
}

export interface MediaVariants {
  thumb?: MediaVariant;
  sizes: MediaVariant[];
}

export interface MediaRecord {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  width: number | null;
  height: number | null;
  variants: string | null;
}

const RESIZABLE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const VARIANT_WIDTHS = [320, 640, 1280];
const THUMB_WIDTH = 400;

interface ProcessedImage {
  width: number;
  height: number;
  variants: MediaVariants;
}

export async function generateImageVariants(
  buffer: Buffer,
  dir: string,
  filename: string,
  mimeType: string
): Promise<ProcessedImage | null> {
  if (!RESIZABLE_IMAGE_TYPES.includes(mimeType)) return null;

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;
    if (!width || !height) return null;

    const baseName = filename.replace(/\.[^.]+$/, "");
    const sizes: MediaVariant[] = [];

    const widths = [...VARIANT_WIDTHS, THUMB_WIDTH].filter((w) => w < width);
    const uniqueWidths = Array.from(new Set(widths)).sort((a, b) => a - b);

    for (const w of uniqueWidths) {
      const resized = await sharp(buffer).resize({ width: w }).webp({ quality: 80 }).toBuffer();
      const meta = await sharp(resized).metadata();
      const variantName = `${baseName}-${w}.webp`;
      const variantPath = path.join(dir, variantName);
      await fs.writeFile(variantPath, resized);
      sizes.push({
        path: path.relative(contentDir(), variantPath),
        width: meta.width ?? w,
        height: meta.height ?? Math.round((height / width) * w),
      });
    }

    const thumb = sizes.find((s) => s.width === THUMB_WIDTH) ?? sizes[0];

    return {
      width,
      height,
      variants: { thumb, sizes },
    };
  } catch (err) {
    log.error("failed to generate image variants:", filename, err);
    return null;
  }
}

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "text/",
];

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/\\/g, "");
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 200);
  return cleaned || "file";
}

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

  const filename = sanitizeFilename(file.name);
  const id = generateId();
  const dir = path.join(mediaDir(), id);
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);

  const processed = await generateImageVariants(buffer, dir, filename, mimeType);
  const width = processed?.width ?? null;
  const height = processed?.height ?? null;
  const variants = processed ? JSON.stringify(processed.variants) : null;

  const now = nowISO();
  const relativePath = path.relative(contentDir(), filePath);

  db.insert(media)
    .values({
      id,
      filename,
      path: relativePath,
      mimeType,
      sizeBytes: file.size,
      createdAt: now,
      width,
      height,
      variants,
    })
    .run();

  return {
    id,
    filename,
    path: relativePath,
    mimeType,
    sizeBytes: file.size,
    createdAt: now,
    width,
    height,
    variants,
  };
}

export async function getAllMedia(): Promise<MediaRecord[]> {
  return db.select().from(media).all() as MediaRecord[];
}

export function getMediaByPath(publicPath: string): MediaRecord | null {
  const relative = publicPath.replace(/^\/+/, "");
  const record = db.select().from(media).where(eq(media.path, relative)).get() as
    | MediaRecord
    | undefined;
  return record ?? null;
}

export async function deleteMedia(id: string): Promise<boolean> {
  const record = db.select().from(media).where(eq(media.id, id)).get() as MediaRecord | undefined;

  if (!record) return false;

  const fsPath = path.join(contentDir(), record.path);
  const dir = path.dirname(fsPath);
  const mediaRoot = mediaDir();
  if (dir.startsWith(mediaRoot) && dir !== mediaRoot) {
    await fs.rm(dir, { recursive: true, force: true }).catch((err) =>
      log.error("failed to remove media dir:", dir, err)
    );
  } else {
    await fs.unlink(fsPath).catch((err) => log.error("failed to unlink file:", fsPath, err));
  }

  db.delete(media).where(eq(media.id, id)).run();

  return true;
}
