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
import { media } from "@/lib/db/schema/media";
import { settings } from "@/lib/db/schema/settings";
import { eq } from "drizzle-orm";
import { redactSecrets } from "@/lib/settings";

export interface ResourceDef {
  uriPattern: string;
  handler: (uri: string) => Promise<{ contents: { uri: string; mimeType: string; text: string }[] } | null>;
}

export function createResourceDefinitions(): ResourceDef[] {
  return [
    {
      uriPattern: "bifrost://posts",
      handler: async () => {
        const rows = db.select({ slug: posts.slug }).from(posts).all();
        const slugs = rows.map((r) => r.slug);
        return {
          contents: [{ uri: "bifrost://posts", mimeType: "application/json", text: JSON.stringify(slugs, null, 2) }],
        };
      },
    },
    {
      uriPattern: "bifrost://posts/{slug}",
      handler: async (uri: string) => {
        const slug = uri.replace("bifrost://posts/", "");
        const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
        if (!post) return null;
        return {
          contents: [
            { uri, mimeType: "text/markdown", text: post.contentMd },
          ],
        };
      },
    },
    {
      uriPattern: "bifrost://posts/{slug}/html",
      handler: async (uri: string) => {
        const slug = uri.replace("bifrost://posts/", "").replace("/html", "");
        const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
        if (!post) return null;
        return {
          contents: [
            { uri, mimeType: "text/html", text: post.contentHtml },
          ],
        };
      },
    },
    {
      uriPattern: "bifrost://posts/{slug}/frontmatter",
      handler: async (uri: string) => {
        const slug = uri.replace("bifrost://posts/", "").replace("/frontmatter", "");
        const post = db.select().from(posts).where(eq(posts.slug, slug)).get();
        if (!post) return null;
        return {
          contents: [
            { uri, mimeType: "application/json", text: post.frontmatter },
          ],
        };
      },
    },
    {
      uriPattern: "bifrost://media",
      handler: async () => {
        const rows = db.select({ path: media.path }).from(media).all();
        const paths = rows.map((r) => r.path);
        return {
          contents: [{ uri: "bifrost://media", mimeType: "application/json", text: JSON.stringify(paths, null, 2) }],
        };
      },
    },
    {
      uriPattern: "bifrost://settings",
      handler: async () => {
        const rows = db.select().from(settings).all();
        const raw: Record<string, string> = {};
        for (const row of rows) raw[row.key] = row.value;
        return {
          contents: [{ uri: "bifrost://settings", mimeType: "application/json", text: JSON.stringify(redactSecrets(raw), null, 2) }],
        };
      },
    },
  ];
}
