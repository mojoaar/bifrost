/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { saveMediaFile, getAllMedia, deleteMedia } from "@/lib/media/store";

function file(name: string, type: string, size = 4): File {
  return new File([new Uint8Array(size)], name, { type });
}

async function pngFile(name: string, width: number, height: number): Promise<File> {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/png" });
}

describe("saveMediaFile", () => {
  it("rejects an unsupported mime type", async () => {
    await expect(
      saveMediaFile(file("evil.exe", "application/x-msdownload"))
    ).rejects.toThrow(/Unsupported media type/);
  });

  it("saves an allowed image and returns a record", async () => {
    const record = await saveMediaFile(file("photo.png", "image/png"));
    expect(record.id).toBeTruthy();
    expect(record.filename).toBe("photo.png");
    expect(record.mimeType).toBe("image/png");
    expect(record.path).toContain(record.id);
  });

  it("sanitizes dangerous filenames", async () => {
    const record = await saveMediaFile(file("../../etc/pa ss wd!.png", "image/png"));
    expect(record.filename).not.toContain("/");
    expect(record.filename).not.toContain(" ");
    expect(record.filename).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it("generates width/height and WebP variants for a real image", async () => {
    const record = await saveMediaFile(await pngFile("wide.png", 1600, 900));
    expect(record.width).toBe(1600);
    expect(record.height).toBe(900);
    expect(record.variants).toBeTruthy();
    const variants = JSON.parse(record.variants!);
    expect(variants.sizes.length).toBeGreaterThan(0);
    expect(variants.sizes.every((v: { path: string }) => v.path.endsWith(".webp"))).toBe(true);
    expect(variants.thumb).toBeTruthy();
    const widths = variants.sizes.map((v: { width: number }) => v.width);
    expect(Math.max(...widths)).toBeLessThan(1600);
  });

  it("skips resizing for svg and gif", async () => {
    const svg = await saveMediaFile(file("logo.svg", "image/svg+xml"));
    expect(svg.width).toBeNull();
    expect(svg.variants).toBeNull();
    const gif = await saveMediaFile(file("anim.gif", "image/gif"));
    expect(gif.width).toBeNull();
    expect(gif.variants).toBeNull();
  });

  it("falls back to original-only when the image cannot be processed", async () => {
    const record = await saveMediaFile(file("broken.png", "image/png", 8));
    expect(record.id).toBeTruthy();
    expect(record.width).toBeNull();
    expect(record.variants).toBeNull();
  });
});

describe("getAllMedia / deleteMedia", () => {
  it("lists saved media and deletes by id", async () => {
    const record = await saveMediaFile(file("doc.pdf", "application/pdf"));
    const all = await getAllMedia();
    expect(all.some((m) => m.id === record.id)).toBe(true);

    const deleted = await deleteMedia(record.id);
    expect(deleted).toBe(true);

    const after = await getAllMedia();
    expect(after.some((m) => m.id === record.id)).toBe(false);
  });

  it("returns false when deleting an unknown id", async () => {
    expect(await deleteMedia("does-not-exist")).toBe(false);
  });
});
