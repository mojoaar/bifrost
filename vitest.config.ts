/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import os from "os";
import fs from "fs";

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bifrost-test-"));
process.env.BIFROST_TEST_ROOT = testRoot;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    env: {
      BIFROST_CONTENT_DIR: path.join(testRoot, "content"),
      DATABASE_URL: "file:" + path.join(testRoot, "test.db"),
    },
    globalSetup: ["./tests/global-setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
