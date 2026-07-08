/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/md/parser";

describe("rehypeLucide (:icon[name] rendering)", () => {
  it("renders a valid icon as an inline lucide SVG", async () => {
    const { html } = await renderMarkdown("Take a photo :icon[camera] now.");
    expect(html).toContain('<svg');
    expect(html).toContain('class="lucide-icon lucide-camera"');
    expect(html).toContain('width="1em"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toContain(":icon[camera]");
  });

  it("leaves an unknown icon name as literal text", async () => {
    const { html } = await renderMarkdown("Bad :icon[not-a-real-icon] here.");
    expect(html).toContain(":icon[not-a-real-icon]");
    expect(html).not.toContain("<svg");
  });

  it("does not transform :icon[name] inside fenced code blocks", async () => {
    const { html } = await renderMarkdown("```\n:icon[camera]\n```");
    expect(html).toContain(":icon[camera]");
    expect(html).not.toContain('class="lucide-icon');
  });

  it("renders multiple icons in the same paragraph", async () => {
    const { html } = await renderMarkdown(":icon[house] and :icon[star]");
    expect(html).toContain("lucide-house");
    expect(html).toContain("lucide-star");
  });
});
