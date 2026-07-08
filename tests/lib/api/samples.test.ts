/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { generateSample, generateSamples, SAMPLE_LANGUAGES } from "@/lib/api/samples";

const GET_REQ = {
  method: "GET",
  url: "http://localhost:3000/api/v1/posts",
  headers: { Authorization: "Bearer bfk_test" },
};

const POST_REQ = {
  method: "POST",
  url: "http://localhost:3000/api/v1/posts",
  headers: { "Content-Type": "application/json", Authorization: "Bearer bfk_test" },
  body: '{"slug":"hello","title":"Hello"}',
};

describe("generateSamples", () => {
  it("exposes four languages", () => {
    expect(SAMPLE_LANGUAGES.map((l) => l.id)).toEqual([
      "curl",
      "javascript",
      "powershell",
      "python",
    ]);
  });

  it("returns a sample for every language", () => {
    const samples = generateSamples(POST_REQ);
    expect(Object.keys(samples).sort()).toEqual([
      "curl",
      "javascript",
      "powershell",
      "python",
    ]);
    for (const value of Object.values(samples)) {
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("curl includes method, url, header and body", () => {
    const out = generateSample("curl", POST_REQ);
    expect(out).toContain('curl -X POST "http://localhost:3000/api/v1/posts"');
    expect(out).toContain('-H "Authorization: Bearer bfk_test"');
    expect(out).toContain(`-d '${POST_REQ.body}'`);
  });

  it("javascript uses fetch with method and JSON body", () => {
    const out = generateSample("javascript", POST_REQ);
    expect(out).toContain('await fetch("http://localhost:3000/api/v1/posts"');
    expect(out).toContain('method: "POST"');
    expect(out).toContain('"Content-Type": "application/json"');
  });

  it("powershell uses Invoke-RestMethod", () => {
    const out = generateSample("powershell", POST_REQ);
    expect(out).toContain("Invoke-RestMethod");
    expect(out).toContain("-Method POST");
    expect(out).toContain("$headers");
    expect(out).toContain("$body");
  });

  it("python uses requests with lowercase method", () => {
    const out = generateSample("python", POST_REQ);
    expect(out).toContain("import requests");
    expect(out).toContain("requests.post(");
    expect(out).toContain("headers=headers");
  });

  it("omits body constructs for GET requests", () => {
    const curl = generateSample("curl", GET_REQ);
    expect(curl).not.toContain("-d ");
    const py = generateSample("python", GET_REQ);
    expect(py).toContain("requests.get(");
    expect(py).not.toContain("data=data");
  });

  it("escapes single quotes in curl body", () => {
    const out = generateSample("curl", {
      method: "POST",
      url: "http://x/api",
      body: "{\"a\":\"it's\"}",
    });
    expect(out).toContain("'\\''");
  });
});
