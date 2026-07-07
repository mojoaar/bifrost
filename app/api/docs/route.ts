/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const DIST = join(process.cwd(), "node_modules/swagger-ui-dist");

const SWAGGER_CSS = readFileSync(join(DIST, "swagger-ui.css"), "utf-8");
const SWAGGER_JS = readFileSync(join(DIST, "swagger-ui-bundle.js"), "utf-8");
const STANDALONE_JS = readFileSync(join(DIST, "swagger-ui-standalone-preset.js"), "utf-8");

const THEME = `
:root[data-theme="dark"] {
  --bg-primary: #09090b;
  --bg-secondary: #18181b;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --border-color: #27272a;
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --code-bg: #18181b;
  --code-border: #27272a;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.swagger-ui { background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-sans); }
.swagger-ui .info .title { color: var(--text-primary); }
.swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info table { color: var(--text-secondary); }
.swagger-ui .opblock-tag { color: var(--text-primary); font-family: var(--font-sans); }
.swagger-ui .opblock-tag small { color: var(--text-muted); }
.swagger-ui .opblock { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 0.5rem; margin: 0 0 1rem; box-shadow: none; }
.swagger-ui .opblock .opblock-section-header { background: var(--bg-secondary); box-shadow: none; border-color: var(--border-color); }
.swagger-ui .opblock .opblock-section-header label { color: var(--text-secondary); font-family: var(--font-sans); }
.swagger-ui .opblock .opblock-summary-method { font-family: var(--font-mono); border-radius: 0.25rem; }
.swagger-ui .opblock .opblock-summary-path { color: var(--text-primary); font-family: var(--font-mono); }
.swagger-ui .opblock .opblock-summary-description { color: var(--text-secondary); }
.swagger-ui .opblock-description-wrapper, .swagger-ui .opblock-external-docs-wrapper, .swagger-ui .opblock-title_normal { color: var(--text-secondary); }
.swagger-ui .parameter__name { color: var(--text-primary); font-family: var(--font-mono); }
.swagger-ui .parameter__type { color: var(--text-muted); font-family: var(--font-mono); }
.swagger-ui .parameter__in { color: var(--text-muted); font-family: var(--font-mono); }
.swagger-ui .parameter__deprecated { color: var(--text-muted); }
.swagger-ui .prop-type { color: #7dd3fc; }
.swagger-ui .model { color: var(--text-primary); }
.swagger-ui .model-title { color: var(--text-primary); font-family: var(--font-sans); }
.swagger-ui .model-toggle { color: var(--text-muted); }
.swagger-ui section.models { border: 1px solid var(--border-color); border-radius: 0.5rem; background: var(--bg-secondary); }
.swagger-ui section.models .model-container { background: var(--bg-primary); border-radius: 0.25rem; margin: 0.5rem; }
.swagger-ui section.models h4 { color: var(--text-primary); }
.swagger-ui .btn { border: 1px solid var(--border-color); color: var(--text-primary); background: var(--bg-primary); font-family: var(--font-sans); border-radius: 0.25rem; box-shadow: none; }
.swagger-ui .btn:hover:not(.disabled) { background: var(--bg-secondary); box-shadow: none; }
.swagger-ui .btn.execute { background: var(--accent); color: #fff; border-color: var(--accent); }
.swagger-ui .btn.execute:hover { background: var(--accent-hover); }
.swagger-ui .btn.cancel { border-color: #7f1d1d; color: #fca5a5; }
.swagger-ui .btn.cancel:hover { background: #7f1d1d; }
.swagger-ui .btn.authorize { border-color: var(--accent); color: var(--accent); }
.swagger-ui .btn.authorize:hover { background: var(--accent); color: #fff; }
.swagger-ui .btn.authorize.locked { background: var(--accent); color: #fff; }
.swagger-ui input[type=text], .swagger-ui input[type=email], .swagger-ui textarea { background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); font-family: var(--font-mono); border-radius: 0.25rem; }
.swagger-ui select { background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 0.25rem; }
.swagger-ui .highlight-code, .swagger-ui .microlight { background: var(--code-bg) !important; font-family: var(--font-mono) !important; color: var(--text-primary) !important; border: 1px solid var(--code-border); border-radius: 0.25rem; }
.swagger-ui .highlight-code .language, .swagger-ui .microlight .language { color: var(--text-muted); }
.swagger-ui code, .swagger-ui pre { font-family: var(--font-mono) !important; color: var(--text-primary); }
.swagger-ui .response-controls { color: var(--text-secondary); }
.swagger-ui .response-col_status { color: var(--text-primary); }
.swagger-ui .response-col_description { color: var(--text-secondary); }
.swagger-ui .response-col_links { color: var(--text-muted); }
.swagger-ui table thead tr td, .swagger-ui table thead tr th { color: var(--text-secondary); border-bottom-color: var(--border-color); }
.swagger-ui table tbody tr td { color: var(--text-primary); border-bottom-color: var(--border-color); }
.swagger-ui .markdown p, .swagger-ui .markdown li { color: var(--text-secondary); }
.swagger-ui .markdown code { color: var(--text-primary); background: var(--code-bg); border: 1px solid var(--code-border); font-family: var(--font-mono); }
.swagger-ui .scheme-container { background: var(--bg-secondary); box-shadow: none; border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1rem; margin: 0 0 1rem; }
.swagger-ui .scheme-container .schemes .schemes-title { color: var(--text-secondary); }
.swagger-ui .dialog-ux .modal-ux { background: var(--bg-secondary); border: 1px solid var(--border-color); }
.swagger-ui .dialog-ux .modal-ux-header { border-bottom-color: var(--border-color); }
.swagger-ui .dialog-ux .modal-ux-header h3 { color: var(--text-primary); }
.swagger-ui .dialog-ux .modal-ux-content { color: var(--text-secondary); }
.swagger-ui .dialog-ux .modal-ux-content label, .swagger-ui .dialog-ux .modal-ux-content h4 { color: var(--text-primary); }
.swagger-ui .loading-container .loading { color: var(--text-muted); }
.swagger-ui .auth-wrapper .authorize { color: var(--text-primary); }
.swagger-ui .errors-wrapper { border-color: #7f1d1d; background: #7f1d1d33; }
.swagger-ui .errors-wrapper .errors h4, .swagger-ui .errors-wrapper .error { color: var(--text-primary); }
.swagger-ui .servers > label select { background: var(--bg-primary); color: var(--text-primary); border-color: var(--border-color); }
.swagger-ui .api-popup-dialog { background: var(--bg-secondary); border: 1px solid var(--border-color); }
.swagger-ui .tab li button.tablinks { color: var(--text-secondary); }
.swagger-ui .tab li button.tablinks.active { color: var(--text-primary); border-bottom-color: var(--accent); }
`;

const HTML = (specUrl: string) => `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bifröst API Explorer</title>
  <style>${SWAGGER_CSS}${THEME}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script>${SWAGGER_JS}</script>
  <script>${STANDALONE_JS}</script>
  <script>
    SwaggerUIBundle({
      url: ${JSON.stringify(specUrl)},
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: "StandaloneLayout",
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: -1,
      docExpansion: "list",
    });
  </script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML("/api/v1/openapi.json"), {
    headers: { "content-type": "text/html" },
  });
}
