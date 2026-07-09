/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema/pages";
import { renderMarkdown } from "@/lib/md/parser";
import { writePageToFilesystem } from "@/lib/content/sync";
import { sql } from "drizzle-orm";

interface SeedPage {
  slug: string;
  title: string;
  showInNav: boolean;
  navOrder: number;
  content: string;
}

const SEED_PAGES: SeedPage[] = [
  {
    slug: "about",
    title: "About",
    showInNav: true,
    navOrder: 1,
    content: `This is an example **page** — standalone content that lives outside your blog feed.

## What are pages?

Unlike posts, pages are not part of the chronological blog stream. They are perfect for evergreen content such as an About page, a Projects list, a Contact page, or anything else that deserves its own permanent home.

Pages are authored in Markdown with the same editor you use for posts, and they can be shown in the site navigation with a configurable order.

## Editing this page

Head to **Admin → Pages**, open this page, and make it your own. You can toggle whether it appears in the navigation and set its position, or delete it entirely.
`,
  },
];

export const SEED_PAGE_SLUGS: string[] = SEED_PAGES.map((p) => p.slug);

export async function seedPages(authorId: string): Promise<void> {
  const now = nowISO();

  for (const page of SEED_PAGES) {
    const existing = db
      .select({ slug: pages.slug })
      .from(pages)
      .where(sql`${pages.slug} = ${page.slug}`)
      .get();

    if (existing) continue;

    const { html, excerpt } = await renderMarkdown(page.content);
    const frontmatter: Record<string, unknown> = {
      title: page.title,
      nav: page.showInNav,
      navOrder: page.navOrder,
    };

    await writePageToFilesystem(page.slug, page.content, frontmatter);

    db.insert(pages)
      .values({
        slug: page.slug,
        title: page.title,
        contentMd: page.content,
        contentHtml: html,
        excerpt,
        frontmatter: JSON.stringify(frontmatter),
        status: "published",
        showInNav: page.showInNav,
        navOrder: page.navOrder,
        authorId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}
