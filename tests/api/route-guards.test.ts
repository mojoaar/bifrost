/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as docsGet } from "@/app/api/v1/docs/route";
import {
  GET as themeFilesGet,
  PUT as themeFilesPut,
} from "@/app/api/v1/themes/files/route";
import {
  GET as templatesGet,
  POST as templatesPost,
  PUT as templatesPut,
  DELETE as templatesDelete,
} from "@/app/api/v1/post-templates/route";
import { GET as mediaGet } from "@/app/api/v1/media/route";
import { GET as aiModelsGet } from "@/app/api/v1/ai/models/route";
import { GET as gitHistoryGet } from "@/app/api/v1/git/history/route";
import { GET as gitDiffGet } from "@/app/api/v1/git/diff/route";

function nreq(pathname: string, method = "GET"): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`, { method });
}

async function expect401(res: Response) {
  expect(res.status).toBe(401);
  const body = await res.json();
  expect(body.error?.message).toBe("Unauthorized");
}

describe("route handler auth guards (unauthenticated)", () => {
  it("GET /api/v1/docs returns 401", async () => {
    await expect401(await docsGet(nreq("/api/v1/docs?file=readme")));
  });

  it("GET /api/v1/themes/files returns 401", async () => {
    await expect401(await themeFilesGet(nreq("/api/v1/themes/files?theme=x")));
  });

  it("PUT /api/v1/themes/files returns 401", async () => {
    await expect401(await themeFilesPut(nreq("/api/v1/themes/files", "PUT")));
  });

  it("GET /api/v1/post-templates returns 401", async () => {
    await expect401(await templatesGet(nreq("/api/v1/post-templates")));
  });

  it("POST /api/v1/post-templates returns 401", async () => {
    await expect401(await templatesPost(nreq("/api/v1/post-templates", "POST")));
  });

  it("PUT /api/v1/post-templates returns 401", async () => {
    await expect401(await templatesPut(nreq("/api/v1/post-templates", "PUT")));
  });

  it("DELETE /api/v1/post-templates returns 401", async () => {
    await expect401(
      await templatesDelete(nreq("/api/v1/post-templates", "DELETE"))
    );
  });

  it("GET /api/v1/media returns 401", async () => {
    await expect401(await mediaGet(nreq("/api/v1/media")));
  });

  it("GET /api/v1/ai/models returns 401", async () => {
    await expect401(await aiModelsGet(nreq("/api/v1/ai/models?provider=x")));
  });

  it("GET /api/v1/git/history returns 401", async () => {
    await expect401(await gitHistoryGet(nreq("/api/v1/git/history")));
  });

  it("GET /api/v1/git/diff returns 401", async () => {
    await expect401(await gitDiffGet(nreq("/api/v1/git/diff?sha=abc")));
  });
});
