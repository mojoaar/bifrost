# Plugins

Plugins let you extend Bifröst without forking it. A plugin taps into the content pipeline and admin UI through a small set of lifecycle hooks.

## Directory structure

Plugins live under the `plugins/` directory, one folder per plugin:

```
plugins/
  reading-time/
    index.ts        # exports the plugin definition
    package.json    # optional: dependencies and metadata
```

A plugin's entry file exports a default object implementing one or more hooks:

```ts
// plugins/reading-time/index.ts
import type { BifrostPlugin } from "@/lib/plugins/types";

const plugin: BifrostPlugin = {
  name: "reading-time",
  version: "1.0.0",
  hooks: {
    onContentParse(content, ctx) {
      const words = content.body.split(/\s+/).length;
      ctx.frontmatter.readingTime = Math.ceil(words / 200);
      return content;
    },
  },
};

export default plugin;
```

## Lifecycle hooks

Bifröst exposes five hooks. Implement only the ones you need.

| Hook               | When it runs                          | Typical use                              |
| ------------------ | ------------------------------------- | ---------------------------------------- |
| `onContentParse`   | After markdown is parsed to an AST/frontmatter | Compute derived metadata (reading time, TOC). |
| `onContentRender`  | After HTML is generated from markdown | Post-process HTML (add anchors, transform links). |
| `onContentPublish` | When a post transitions to published  | Notify webhooks, ping search, syndicate. |
| `onServerStart`    | Once, when the server boots           | Register services, warm caches, connect clients. |
| `adminWidget`      | When the admin dashboard renders      | Contribute a widget/card to the dashboard. |

### Hook signatures (illustrative)

```ts
interface BifrostPluginHooks {
  onContentParse?(content: Content, ctx: ParseContext): Content;
  onContentRender?(html: string, ctx: RenderContext): string;
  onContentPublish?(post: Post, ctx: PublishContext): void | Promise<void>;
  onServerStart?(ctx: ServerContext): void | Promise<void>;
  adminWidget?(ctx: AdminContext): WidgetDescriptor;
}
```

## Example: reading-time

The bundled `reading-time` plugin demonstrates the parse and admin hooks:

```ts
const plugin: BifrostPlugin = {
  name: "reading-time",
  hooks: {
    onContentParse(content, ctx) {
      const words = content.body.trim().split(/\s+/).filter(Boolean).length;
      ctx.frontmatter.readingTime = Math.max(1, Math.round(words / 200));
      return content;
    },
    adminWidget() {
      return {
        title: "Reading time",
        render: () => "Estimated reading time is added to every post.",
      };
    },
  },
};
```

The computed `readingTime` becomes available to themes, which display it when the **Show reading time** toggle is enabled in Settings.

## Loading plugins

Plugins are discovered from the `plugins/` directory at server start (`onServerStart` fires then). Enable or disable each one from **Settings → Plugins** without deleting files. Disabled plugins keep their code but their hooks are skipped.

To add a third-party plugin:

1. Place it under `plugins/<name>/`.
2. Install any dependencies (`npm install` in the plugin folder if it has its own `package.json`).
3. Restart the server.
4. Enable it in **Settings → Plugins**.

## Plugin types

Broadly, plugins fall into categories based on which hooks they use:

- **Content transformers** — `onContentParse` / `onContentRender` to enrich or rewrite content.
- **Publishing integrations** — `onContentPublish` for webhooks, syndication, and notifications.
- **Services** — `onServerStart` for long-lived connections and background setup.
- **Admin extensions** — `adminWidget` to surface information or controls in the dashboard.

## Best practices

- Keep hooks pure and fast; heavy work belongs in `onContentPublish` or background tasks.
- Return the (possibly modified) value from transform hooks so the pipeline can continue.
- Namespace any frontmatter keys you add to avoid clashing with core fields.
- Fail gracefully — a throwing hook should not take down content rendering.
