# Themes

Bifröst ships with a small, opinionated theme system. Themes are self-contained directories that are statically imported and registered at build time, then selected at runtime from **Settings**.

## Architecture

Each theme lives under `themes/<theme-name>/` and is a normal set of React (App Router) components plus a manifest:

```
themes/
  bifrost-terminal/
    theme.json          # manifest: name, description, palettes, fonts
    layout.tsx          # top-level layout wrapper
    components/         # Header, Footer, PostCard, UI primitives, ...
    styles.css          # theme-specific CSS + variables
```

Themes are **statically imported** into a registry rather than loaded dynamically. This keeps the bundle tree-shakeable and type-safe. The registry maps a theme id to its manifest and components:

```ts
// themes/registry.ts
import terminal from "./bifrost-terminal/theme.json";
import read from "./bifrost-read/theme.json";
import magazine from "./bifrost-magazine/theme.json";

export const themes = { terminal, read, magazine } as const;
```

The active theme id is stored in settings and resolved when rendering the public site.

## theme.json

The manifest describes the theme and the options it exposes:

```json
{
  "id": "terminal",
  "name": "Terminal",
  "description": "A monospace, developer-focused theme.",
  "fonts": ["JetBrains Mono", "IBM Plex Mono"],
  "palettes": {
    "green": { "accent": "#00ff9c", "bg": "#0a0a0a", "fg": "#e5e5e5" },
    "amber": { "accent": "#ffb000", "bg": "#0a0a0a", "fg": "#e5e5e5" }
  }
}
```

## Built-in themes

Bifröst includes three themes:

- **Terminal** (`bifrost-terminal`) — a monospace, high-contrast look for developer blogs. Multiple accent palettes (green, amber, and more).
- **Read** (`bifrost-read`) — a minimal, typography-first reading experience with generous whitespace and a serif option.
- **Magazine** (`bifrost-magazine`) — a grid-driven layout with prominent featured images, ideal for image-heavy publications.

Switch themes at **Settings → Appearance → Theme**.

## CSS variable system

All themes render from a shared set of CSS custom properties, which makes palette and font swaps instant and consistent:

```css
:root {
  --color-bg: #0a0a0a;
  --color-fg: #e5e5e5;
  --color-accent: #00ff9c;
  --font-body: "JetBrains Mono", monospace;
  --content-width: 720px;
}
```

Selecting a palette in Settings rewrites these variables; themes read them everywhere instead of hard-coding colors. Tailwind CSS v4 is configured to expose these variables as utilities.

## Color palettes

A palette is a named set of color variables defined in `theme.json`. Choose one under **Settings → Appearance → Palette**. Because palettes only set CSS variables, changing palette never requires a rebuild.

## Custom CSS editor

For one-off tweaks that don't warrant a full theme, use the **Custom CSS** editor in the admin (Settings → Appearance). CSS entered here is injected after the theme styles, so it overrides theme defaults. Use it to adjust spacing, add fonts, or restyle individual elements.

## Theme file editor

Admins can edit theme files directly from the **Theme Editor** in the admin. This exposes the theme's CSS and template files in a CodeMirror editor for in-place customization. Changes are written back to the theme directory, so keep them under version control.

## Creating a custom theme

1. Copy an existing theme directory as a starting point:

   ```bash
   cp -r themes/bifrost-read themes/my-theme
   ```

2. Update `theme.json` with a unique `id`, `name`, and your palettes/fonts.
3. Register it in `themes/registry.ts`.
4. Adjust `layout.tsx`, the components, and `styles.css` to taste, reading from the shared CSS variables where possible.
5. Restart the dev server and select your theme in **Settings**.

Keep components as server components unless they need interactivity; add `"use client"` only where required.

## Font configuration

Fonts declared in `theme.json` populate the font picker in **Settings → Appearance → Font**. The chosen font sets `--font-body`. You can add web fonts via the Custom CSS editor with an `@import` or `@font-face` rule and then reference them in the variable.
