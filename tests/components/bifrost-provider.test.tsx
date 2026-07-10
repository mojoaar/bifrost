/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BifrostProvider, type BifrostContextValue } from "@/components/BifrostProvider";
import { useBifrost } from "@/lib/hooks/use-bifrost";

const value: BifrostContextValue = {
  site: { title: "Test Site", footerText: "hello footer" },
  settings: { "site.title": "Test Site" },
  nav: [{ slug: "about", title: "About" }],
};

function Consumer() {
  const { site, nav } = useBifrost();
  return (
    <div>
      <span>{site.title}</span>
      <span>{nav[0]?.title}</span>
    </div>
  );
}

describe("BifrostProvider / useBifrost", () => {
  it("provides context values to consumers", () => {
    const html = renderToStaticMarkup(
      <BifrostProvider value={value}>
        <Consumer />
      </BifrostProvider>
    );
    expect(html).toContain("Test Site");
    expect(html).toContain("About");
  });

  it("throws when used outside a provider", () => {
    expect(() => renderToStaticMarkup(<Consumer />)).toThrow(
      /useBifrost must be used within a BifrostProvider/
    );
  });
});
