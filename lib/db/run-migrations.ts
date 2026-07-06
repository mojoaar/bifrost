/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database(
  process.env.DATABASE_URL?.replace("file:", "") ?? "data/bifrost.db"
);

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./lib/db/migrations" });

console.log("Migrations complete");
