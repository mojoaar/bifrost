/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  socialLinks: text("social_links"),
  role: text("role", { enum: ["admin", "editor", "author"] })
    .notNull()
    .default("author"),
  mfaEnabled: integer("mfa_enabled").notNull().default(0),
  mfaSecret: text("mfa_secret"),
  mfaRecovery: text("mfa_recovery"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
