/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { extractZip } from "@/lib/export";

const require = createRequire(import.meta.url);
const { ZipArchive } = require("archiver");

// A zip whose single entry path escapes the target dir ("../../escaped.txt").
// Built with Python's zipfile (which does not sanitize entry names) since
// archiver normalizes traversal segments away.
const MALICIOUS_ZIP_BASE64 =
  "UEsDBBQAAAAIANqJ6Vx+UwTZBwAAAAUAAAARAAAALi4vLi4vZXNjYXBlZC50eHQrKM9LTQEAUEsB" +
  "AhQDFAAAAAgA2onpXH5TBNkHAAAABQAAABEAAAAAAAAAAAAAAIABAAAAAC4uLy4uL2VzY2FwZWQu" +
  "dHh0UEsFBgAAAAABAAEAPwAAADYAAAAAAA==";

function makeZip(
  zipPath: string,
  entries: { name: string; content: string }[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    for (const e of entries) archive.append(e.content, { name: e.name });
    archive.finalize();
  });
}

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bifrost-zip-"));
}

describe("extractZip", () => {
  it("extracts a normal archive into the target directory", async () => {
    const work = tmpDir();
    const zipPath = path.join(work, "ok.zip");
    const target = path.join(work, "out");
    fs.mkdirSync(target, { recursive: true });

    await makeZip(zipPath, [
      { name: "posts/hello/index.md", content: "# hello" },
      { name: "note.txt", content: "hi" },
    ]);

    await extractZip(zipPath, target);

    expect(fs.readFileSync(path.join(target, "posts/hello/index.md"), "utf-8")).toBe(
      "# hello"
    );
    expect(fs.readFileSync(path.join(target, "note.txt"), "utf-8")).toBe("hi");
  });

  it("rejects an archive containing a path-traversal entry", async () => {
    const work = tmpDir();
    const zipPath = path.join(work, "evil.zip");
    const target = path.join(work, "out");
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(zipPath, Buffer.from(MALICIOUS_ZIP_BASE64, "base64"));

    await expect(extractZip(zipPath, target)).rejects.toThrow(/path traversal/i);
    expect(fs.existsSync(path.resolve(target, "../../escaped.txt"))).toBe(false);
  });
});
