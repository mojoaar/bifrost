/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";
import { tags } from "./tags";

export const postTags = sqliteTable(
  "post_tags",
  {
    postSlug: text("post_slug")
      .notNull()
      .references(() => posts.slug),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.postSlug, table.tagId] })]
);
