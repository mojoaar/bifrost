# Settings

The **Settings** area (`/admin/settings`) controls how your site looks and behaves. Changes persist to the database and take effect immediately — no rebuild required. Settings are grouped into several panels.

## Appearance

Control the visual presentation of the public site:

- **Font** — pick from the fonts declared by the active theme's `theme.json`. Sets the `--font-body` CSS variable.
- **Content width** — the maximum reading width (sets `--content-width`), e.g. `680px`, `720px`, `800px`.
- **Date format** — how dates render across the site, e.g. `YYYY-MM-DD`, `MMM D, YYYY`, or a relative format.
- **Palette** — the color palette from the active theme (see [themes.md](./themes.md)).
- **Theme** — choose between the built-in themes (Terminal, Read, Magazine) or a custom one.

## Display toggles

Fine-grained switches that themes respect when rendering:

- **Show author** — display the post author byline.
- **Show reading time** — display an estimated reading time (also available via the reading-time plugin).
- **Show featured images** — render `featuredImage` in listings and post headers.
- **Show reading progress bar** — display a scroll-driven progress bar at the top of post pages.
- **Show related posts** — show up to three related posts (sharing at least one tag) at the bottom of each post.

Toggle these off for a cleaner, more minimal presentation.

## Site info

Global metadata used in the header, `<title>`, and feeds:

- **Title** — the site name.
- **Description** — a short tagline used for SEO and feed metadata.

These override the defaults from `bifrost.config.ts`.

## Branding

Upload a custom favicon under the **Branding** panel. It replaces the default Bifröst snowflake across browser tabs, bookmarks, and the installable app icon. Accepts SVG, PNG, ICO, or JPG. See [branding.md](./branding.md) for details on favicons and PWA support.

## Social sharing

Configure Open Graph and Twitter/X card metadata and optional share buttons. When enabled, posts expose share links and social preview tags are added to the document head so links unfurl nicely.

## Git sync

Configure content versioning and remote synchronization (details in [git.md](./git.md)):

- **Remote URL** — the Git remote to push/pull.
- **Branch** — the branch to sync (e.g. `main`).
- **Token** — a personal access token used for authenticated push/pull.
- **Auto-commit** — commit automatically on create/update.

Credentials are stored server-side and never exposed to the browser.

## AI assistant

Bifröst integrates with OpenAI-compatible providers via `@ai-sdk/openai-compatible`. Configure the assistant here:

- **Base URL** — the provider endpoint (e.g. a local model or a hosted API).
- **API key** — provider credential.
- **Model** — the model id to use for completions.

Once configured, the AI assistant is available in the editor and via the API's AI endpoints for drafting, summarizing, and rewriting content.

## Plugins

The **Plugins** panel lists installed plugins and lets you enable or disable each one. Plugins hook into the content pipeline and can render admin widgets (see [plugins.md](./plugins.md)). Toggling a plugin here activates or deactivates its lifecycle hooks without removing its files.

## Persistence and precedence

Settings resolve in this order (highest wins):

1. Values saved in the database via this UI.
2. Defaults in `bifrost.config.ts`.
3. Built-in framework defaults.

This means you can commit sensible defaults in config and still let each deployment override them at runtime.
