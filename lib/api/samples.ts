/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export type SampleLanguage = "curl" | "javascript" | "powershell" | "python";

export interface SampleRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export const SAMPLE_LANGUAGES: { id: SampleLanguage; label: string; shiki: string }[] = [
  { id: "curl", label: "cURL", shiki: "bash" },
  { id: "javascript", label: "JavaScript", shiki: "javascript" },
  { id: "powershell", label: "PowerShell", shiki: "powershell" },
  { id: "python", label: "Python", shiki: "python" },
];

function entries(headers?: Record<string, string>): [string, string][] {
  return Object.entries(headers ?? {}).filter(([k, v]) => k && v !== undefined);
}

function curlSample(req: SampleRequest): string {
  const lines = [`curl -X ${req.method} "${req.url}"`];
  for (const [k, v] of entries(req.headers)) {
    lines.push(`  -H "${k}: ${v}"`);
  }
  if (req.body) {
    lines.push(`  -d '${req.body.replace(/'/g, "'\\''")}'`);
  }
  return lines.join(" \\\n");
}

function javascriptSample(req: SampleRequest): string {
  const init: string[] = [`  method: "${req.method}",`];
  const hdrs = entries(req.headers);
  if (hdrs.length) {
    const inner = hdrs.map(([k, v]) => `    "${k}": "${v}",`).join("\n");
    init.push(`  headers: {\n${inner}\n  },`);
  }
  if (req.body) {
    init.push(`  body: ${JSON.stringify(req.body)},`);
  }
  return [
    `const res = await fetch("${req.url}", {`,
    ...init,
    `});`,
    `const data = await res.json();`,
    `console.log(data);`,
  ].join("\n");
}

function powershellSample(req: SampleRequest): string {
  const lines: string[] = [];
  const hdrs = entries(req.headers);
  if (hdrs.length) {
    const inner = hdrs.map(([k, v]) => `  "${k}" = "${v}"`).join("\n");
    lines.push(`$headers = @{\n${inner}\n}`);
  }
  const args = [`-Uri "${req.url}"`, `-Method ${req.method}`];
  if (hdrs.length) args.push(`-Headers $headers`);
  if (req.body) {
    lines.push(`$body = '${req.body.replace(/'/g, "''")}'`);
    args.push(`-Body $body`);
  }
  lines.push(`Invoke-RestMethod ${args.join(" ")}`);
  return lines.join("\n");
}

function pythonSample(req: SampleRequest): string {
  const lines = ["import requests", ""];
  const hdrs = entries(req.headers);
  if (hdrs.length) {
    const inner = hdrs.map(([k, v]) => `    "${k}": "${v}",`).join("\n");
    lines.push(`headers = {\n${inner}\n}`);
  }
  if (req.body) {
    lines.push(`data = ${JSON.stringify(req.body)}`);
  }
  const args = [`"${req.url}"`];
  if (hdrs.length) args.push(`headers=headers`);
  if (req.body) args.push(`data=data`);
  lines.push(`response = requests.${req.method.toLowerCase()}(${args.join(", ")})`);
  lines.push(`print(response.json())`);
  return lines.join("\n");
}

export function generateSample(lang: SampleLanguage, req: SampleRequest): string {
  switch (lang) {
    case "curl":
      return curlSample(req);
    case "javascript":
      return javascriptSample(req);
    case "powershell":
      return powershellSample(req);
    case "python":
      return pythonSample(req);
  }
}

export function generateSamples(req: SampleRequest): Record<SampleLanguage, string> {
  return {
    curl: curlSample(req),
    javascript: javascriptSample(req),
    powershell: powershellSample(req),
    python: pythonSample(req),
  };
}
