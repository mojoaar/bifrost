/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import path from "path";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema/media";
import { eq } from "drizzle-orm";
import { fs } from "@/lib/fs";
import { contentDir } from "@/lib/paths";
import { generateImageVariants } from "@/lib/media/store";
import type { MediaRecord } from "@/lib/media/store";

async function main() {
  const rows = db.select().from(media).all() as MediaRecord[];
  let processed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.variants || !row.mimeType.startsWith("image/")) {
      skipped++;
      continue;
    }

    const fsPath = path.join(contentDir(), row.path);
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await fs.readFile(fsPath));
    } catch {
      console.error(`skip ${row.filename}: original file missing`);
      skipped++;
      continue;
    }

    const dir = path.dirname(fsPath);
    const result = await generateImageVariants(buffer, dir, row.filename, row.mimeType);
    if (!result) {
      console.error(`skip ${row.filename}: could not generate variants`);
      skipped++;
      continue;
    }

    db.update(media)
      .set({
        width: result.width,
        height: result.height,
        variants: JSON.stringify(result.variants),
      })
      .where(eq(media.id, row.id))
      .run();

    processed++;
    console.log(`processed ${row.filename} (${result.variants.sizes.length} variants)`);
  }

  console.log(`\nBackfill complete: ${processed} processed, ${skipped} skipped.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
