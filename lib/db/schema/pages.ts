/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const pages = sqliteTable("pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  contentMd: text("content_md").notNull(),
  contentHtml: text("content_html").notNull().default(""),
  excerpt: text("excerpt"),
  frontmatter: text("frontmatter").notNull().default("{}"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  showInNav: integer("show_in_nav", { mode: "boolean" })
    .notNull()
    .default(false),
  navOrder: integer("nav_order").notNull().default(0),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
