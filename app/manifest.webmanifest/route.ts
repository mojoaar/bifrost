/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { getSetting } from "@/lib/settings";

export async function GET() {
  const name = getSetting("site.title") || "Bifröst";
  const description = getSetting("site.description") || "";
  const hasCustom = Boolean(getSetting("site.favicon_media_id"));

  const icons = [
    {
      src: "/icon.svg",
      type: "image/svg+xml",
      sizes: "any",
      purpose: "any",
    },
    {
      src: hasCustom ? "/icon" : "/icon-192.png",
      type: hasCustom ? undefined : "image/png",
      sizes: "192x192",
      purpose: "any",
    },
    {
      src: hasCustom ? "/icon" : "/icon-512.png",
      type: hasCustom ? undefined : "image/png",
      sizes: "512x512",
      purpose: "any",
    },
    {
      src: hasCustom ? "/icon" : "/icon-512.png",
      type: hasCustom ? undefined : "image/png",
      sizes: "512x512",
      purpose: "maskable",
    },
  ].map((icon) =>
    icon.type ? icon : { src: icon.src, sizes: icon.sizes, purpose: icon.purpose }
  );

  const manifest = {
    name,
    short_name: name,
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1e1e2e",
    theme_color: "#1e1e2e",
    icons,
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json",
      "cache-control": "no-cache",
    },
  });
}
