/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getRelatedPosts } from "@/lib/content/related";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { tags } from "@/lib/db/schema/tags";
import { postTags } from "@/lib/db/schema/post-tags";
import { users } from "@/lib/db/schema/users";

const AUTHOR_ID = "related-author";
const TAG_A = "related-tag-a";
const TAG_B = "related-tag-b";

function makePost(slug: string, status: "published" | "draft", publishedAt: string | null) {
  const now = new Date().toISOString();
  db.insert(posts)
    .values({
      slug,
      title: slug,
      contentMd: `# ${slug}`,
      contentHtml: `<h1>${slug}</h1>`,
      excerpt: slug,
      frontmatter: JSON.stringify({ title: slug }),
      status,
      authorId: AUTHOR_ID,
      publishedAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

function tagPost(slug: string, tagId: string) {
  db.insert(postTags).values({ postSlug: slug, tagId }).onConflictDoNothing().run();
}

beforeAll(() => {
  const now = new Date().toISOString();
  db.insert(users)
    .values({
      id: AUTHOR_ID,
      email: "related@example.com",
      passwordHash: "x",
      displayName: "Related Author",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();

  db.insert(tags).values({ id: TAG_A, name: TAG_A, slug: TAG_A }).onConflictDoNothing().run();
  db.insert(tags).values({ id: TAG_B, name: TAG_B, slug: TAG_B }).onConflictDoNothing().run();

  makePost("rel-source", "published", "2026-01-01T00:00:00.000Z");
  makePost("rel-shared-1", "published", "2026-01-02T00:00:00.000Z");
  makePost("rel-shared-2", "published", "2026-01-03T00:00:00.000Z");
  makePost("rel-draft", "draft", "2026-01-04T00:00:00.000Z");
  makePost("rel-unrelated", "published", "2026-01-05T00:00:00.000Z");

  tagPost("rel-source", TAG_A);
  tagPost("rel-shared-1", TAG_A);
  tagPost("rel-shared-2", TAG_A);
  tagPost("rel-draft", TAG_A);
  tagPost("rel-unrelated", TAG_B);
});

describe("getRelatedPosts", () => {
  it("returns published posts sharing a tag, excluding the source", () => {
    const related = getRelatedPosts("rel-source", 3);
    const slugs = related.map((r) => r.slug);
    expect(slugs).toContain("rel-shared-1");
    expect(slugs).toContain("rel-shared-2");
    expect(slugs).not.toContain("rel-source");
  });

  it("excludes drafts and posts without shared tags", () => {
    const slugs = getRelatedPosts("rel-source", 10).map((r) => r.slug);
    expect(slugs).not.toContain("rel-draft");
    expect(slugs).not.toContain("rel-unrelated");
  });

  it("respects the limit", () => {
    expect(getRelatedPosts("rel-source", 1)).toHaveLength(1);
  });

  it("returns [] for a post with no tags", () => {
    makePost("rel-notags", "published", "2026-01-06T00:00:00.000Z");
    expect(getRelatedPosts("rel-notags")).toEqual([]);
  });
});
