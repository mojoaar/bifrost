import type { MetadataRoute } from "next";
import { getSetting } from "@/lib/settings";

export default function robots(): MetadataRoute.Robots {
  const url = getSetting("site.url") ?? "";
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: url ? `${url}/sitemap.xml` : undefined,
  };
}
