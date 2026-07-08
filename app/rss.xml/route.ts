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
import { eq, sql } from "drizzle-orm";
import { getSetting } from "@/lib/settings";

export async function GET(request: Request) {
  let siteUrl = getSetting("site.url");
  if (!siteUrl) {
    const url = new URL(request.url);
    siteUrl = `${url.protocol}//${url.host}`;
  } else {
    siteUrl = siteUrl.replace(/\/$/, "");
  }

  const rows = db
    .select()
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(sql`${posts.createdAt} DESC`)
    .limit(20)
    .all();

  const items = rows
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/${post.slug}</guid>
      <description><![CDATA[${post.excerpt ?? ""}]]></description>
      <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${getSetting("site.title") ?? "Bifröst"}</title>
    <description>${getSetting("site.description") ?? "A self-hosted blogging framework"}</description>
    <link>${siteUrl}</link>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
