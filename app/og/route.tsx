/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getSetting } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteTitle = getSetting("site.title") ?? "Bifröst";
  const title = (searchParams.get("title") ?? siteTitle).slice(0, 140);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1e1e2e",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "#89dceb",
            }}
          />
          <div style={{ fontSize: "32px", color: "#89dceb", fontWeight: 700 }}>
            {siteTitle}
          </div>
        </div>
        <div
          style={{
            fontSize: "64px",
            color: "#cdd6f4",
            fontWeight: 800,
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          {title}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
      },
    }
  );
}
