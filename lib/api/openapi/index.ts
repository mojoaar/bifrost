/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { version } from "@/package.json";
import { OpenAPISpec } from "./shared";
import { components } from "./schemas";
import { contentPaths } from "./paths/content";
import { authPaths } from "./paths/auth";
import { mediaPaths } from "./paths/media";
import { systemPaths } from "./paths/system";

export type { OpenAPISpec } from "./shared";

export function generateOpenApiSpec(): OpenAPISpec {
  return {
    openapi: "3.1.0",
    info: {
      title: "Bifröst API",
      version,
      description:
        "REST API for the Bifröst blogging framework. Responses use a { data, error, meta } envelope. " +
        "Write endpoints require authentication via a Bearer JWT access token or a Bifröst API key (bfk_…).",
    },
    servers: [{ url: "/api/v1" }],
    paths: {
      ...contentPaths,
      ...authPaths,
      ...mediaPaths,
      ...systemPaths,
    },
    components,
  } as OpenAPISpec;
}
