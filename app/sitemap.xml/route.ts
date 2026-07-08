/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { pages } from "@/lib/db/schema/pages";
import { eq } from "drizzle-orm";
import { getSetting } from "@/lib/settings";

export async function GET(request: Request) {
  let siteUrl = getSetting("site.url");
  if (!siteUrl) {
    const url = new URL(request.url);
    siteUrl = `${url.protocol}//${url.host}`;
  } else {
    siteUrl = siteUrl.replace(/\/$/, "");
  }

  const postRows = db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(eq(posts.status, "published"))
    .all();

  const pageRows = db
    .select({ slug: pages.slug, updatedAt: pages.updatedAt })
    .from(pages)
    .where(eq(pages.status, "published"))
    .all();

  const urls = [
    `  <url><loc>${siteUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...postRows.map(
      (p) =>
        `  <url><loc>${siteUrl}/${p.slug}</loc><lastmod>${p.updatedAt}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    ),
    ...pageRows.map(
      (p) =>
        `  <url><loc>${siteUrl}/${p.slug}</loc><lastmod>${p.updatedAt}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`
    ),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
