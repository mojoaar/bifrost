/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { apiSuccess, apiError } from "@/lib/api/response";

describe("apiSuccess", () => {
  it("returns { data, error: null, meta: null } by default", async () => {
    const res = apiSuccess({ slug: "hello" });
    const json = await res.json();
    expect(json).toEqual({ data: { slug: "hello" }, error: null, meta: null });
  });

  it("includes meta when provided", async () => {
    const res = apiSuccess({ slug: "hello" }, { total: 10, page: 1, limit: 10 });
    const json = await res.json();
    expect(json.meta).toEqual({ total: 10, page: 1, limit: 10 });
  });

  it("uses custom status code", () => {
    const res = apiSuccess({}, undefined, 201);
    expect(res.status).toBe(201);
  });
});

describe("apiError", () => {
  it("returns { data: null, error, meta: null }", async () => {
    const res = apiError("Not found", 404);
    const json = await res.json();
    expect(json).toEqual({ data: null, error: { message: "Not found" }, meta: null });
  });

  it("includes details when provided", async () => {
    const res = apiError("Validation failed", 422, { fields: ["title"] });
    const json = await res.json();
    expect(json.error).toEqual({ message: "Validation failed", details: { fields: ["title"] } });
  });
});
