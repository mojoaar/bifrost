/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { createMcpServer, matchResource } from "@/lib/mcp/server";
import { createResourceDefinitions } from "@/lib/mcp/resources";

describe("createMcpServer", () => {
  it("returns a connectable server instance", () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
    expect(typeof server.connect).toBe("function");
  });
});

describe("matchResource routing", () => {
  const resources = createResourceDefinitions();

  it("returns undefined for an unknown uri", () => {
    expect(matchResource(resources, "bifrost://nope/xyz")).toBeUndefined();
  });

  it("prefers the longest matching pattern", () => {
    expect(matchResource(resources, "bifrost://posts/some-slug/html")?.uriPattern).toBe(
      "bifrost://posts/{slug}/html"
    );
  });

  it("matches static resources exactly", () => {
    expect(matchResource(resources, "bifrost://settings")?.uriPattern).toBe("bifrost://settings");
    expect(matchResource(resources, "bifrost://media")?.uriPattern).toBe("bifrost://media");
  });
});
