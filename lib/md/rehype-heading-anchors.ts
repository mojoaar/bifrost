/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { Root, Element, ElementContent } from "hast";
import { visit } from "unist-util-visit";

const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function textContent(node: Element): string {
  let out = "";
  for (const child of node.children) {
    if (child.type === "text") out += child.value;
    else if (child.type === "element") out += textContent(child);
  }
  return out;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function rehypeHeadingAnchors() {
  return (tree: Root): void => {
    const used = new Set<string>();

    visit(tree, "element", (node: Element) => {
      if (!HEADINGS.has(node.tagName)) return;

      const base = slugifyHeading(textContent(node));
      if (!base) return;

      let slug = base;
      let n = 1;
      while (used.has(slug)) {
        slug = `${base}-${n++}`;
      }
      used.add(slug);

      node.properties = node.properties ?? {};
      node.properties.id = slug;

      const anchor: Element = {
        type: "element",
        tagName: "a",
        properties: {
          href: `#${slug}`,
          className: ["heading-anchor"],
          ariaHidden: "true",
          tabIndex: -1,
        },
        children: [{ type: "text", value: "#" }],
      };

      node.children = [anchor, ...(node.children as ElementContent[])];
    });
  };
}
