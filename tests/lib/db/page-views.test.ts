/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { pageViews } from "@/lib/db/schema";

describe("page_views schema", () => {
  it("has the expected columns", () => {
    const cols = Object.keys(pageViews);
    expect(cols).toContain("id");
    expect(cols).toContain("path");
    expect(cols).toContain("timestamp");
    expect(cols).toContain("referrer");
  });
});
