/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { Root, RootContent, Nodes, Element, ElementContent, Text } from "hast";
import { dynamicIconImports } from "lucide-react/dynamic";

type IconNode = Array<[string, Record<string, string>]>;

let validNames: Set<string> | null = null;

function getValidNames(): Set<string> {
  if (validNames) return validNames;
  validNames = new Set(Object.keys(dynamicIconImports));
  return validNames;
}

const ICON_RE = /:icon\[([a-z0-9-]+)\]/g;
const nodeCache = new Map<string, IconNode>();

async function loadIconNode(name: string): Promise<void> {
  if (nodeCache.has(name)) return;
  const importer = (dynamicIconImports as Record<string, () => Promise<{ __iconNode: IconNode }>>)[name];
  if (!importer) return;
  const mod = await importer();
  nodeCache.set(name, mod.__iconNode);
}

function buildSvg(name: string, node: IconNode): Element {
  const children: ElementContent[] = node.map(([tagName, attrs]) => {
    const properties: Record<string, string> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "key") continue;
      properties[key] = value;
    }
    return { type: "element", tagName, properties, children: [] } as Element;
  });

  return {
    type: "element",
    tagName: "svg",
    properties: {
      xmlns: "http://www.w3.org/2000/svg",
      width: "1em",
      height: "1em",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: ["lucide-icon", `lucide-${name}`],
      ariaHidden: "true",
    },
    children,
  };
}

function splitText(value: string): ElementContent[] | null {
  const out: ElementContent[] = [];
  let last = 0;
  let matched = false;
  ICON_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ICON_RE.exec(value))) {
    const name = m[1]!;
    if (!getValidNames().has(name) || !nodeCache.has(name)) continue;
    matched = true;
    if (m.index > last) {
      out.push({ type: "text", value: value.slice(last, m.index) } as Text);
    }
    out.push(buildSvg(name, nodeCache.get(name)!));
    last = m.index + m[0].length;
  }
  if (!matched) return null;
  if (last < value.length) {
    out.push({ type: "text", value: value.slice(last) } as Text);
  }
  return out;
}

function collectNames(node: Nodes, inCode: boolean, names: Set<string>): void {
  const isCode =
    inCode || (node.type === "element" && (node.tagName === "code" || node.tagName === "pre"));
  if (node.type === "text" && !inCode) {
    ICON_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ICON_RE.exec(node.value))) {
      if (getValidNames().has(m[1]!)) names.add(m[1]!);
    }
  }
  if ("children" in node && node.children) {
    for (const child of node.children) collectNames(child, isCode, names);
  }
}

function transform(node: Nodes, inCode: boolean): void {
  if (!("children" in node) || !node.children) return;
  const isCode =
    inCode || (node.type === "element" && (node.tagName === "code" || node.tagName === "pre"));
  const next: Array<RootContent | ElementContent> = [];
  for (const child of node.children) {
    if (child.type === "text" && !isCode) {
      const replacement = splitText(child.value);
      if (replacement) {
        next.push(...replacement);
        continue;
      }
    }
    transform(child, isCode);
    next.push(child);
  }
  node.children = next as typeof node.children;
}

export default function rehypeLucide() {
  return async (tree: Root): Promise<void> => {
    const names = new Set<string>();
    collectNames(tree, false, names);
    if (names.size === 0) return;
    await Promise.all([...names].map(loadIconNode));
    transform(tree, false);
  };
}
