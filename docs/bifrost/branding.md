# Branding & PWA

Bifröst ships with a distinctive snowflake mark and full Progressive Web App (PWA) support. You can replace the icon with your own and let readers install your site as an app.

## The default icon

The built-in mark is a frost-blue snowflake on a dark rounded tile, served in several formats so every browser gets a crisp result:

- `icon.svg` — scalable vector, used by modern browsers.
- `icon-192.png` / `icon-512.png` — raster sizes for Android and PWA installs.
- `apple-icon-180.png` — the Apple touch icon for iOS/Safari home-screen installs.
- `favicon.ico` — multi-size (16/32/48) legacy fallback.

## Custom favicon

Open **Settings → Branding** and click **Upload favicon**. Accepted formats are SVG, PNG, ICO, and JPG.

- The uploaded file is stored as a media asset and served from `/icon`.
- **SVG uploads** are served as-is for the browser icon. Apple touch icons and PWA install icons continue to use the bundled PNGs, since those contexts require raster images.
- **Raster uploads** (PNG/ICO/JPG) are used everywhere, including the Apple touch icon and the PWA manifest.

Click **Reset to default** to remove your custom favicon and restore the Bifröst snowflake.

## Progressive Web App

Bifröst is installable. A dynamic web manifest is served at `/manifest.webmanifest` and derives its name, description, and icons from your site settings:

- **Name / short name** — your site title.
- **Theme & background color** — the Bifröst dark tile color (`#1e1e2e`).
- **Display** — `standalone`, so the installed app runs without browser chrome.
- **Icons** — your favicon plus maskable icons for adaptive shapes.

### Install prompt

On supported browsers, visitors to the public site see a subtle **Install app** affordance. Dismissing it is remembered locally, so it won't nag. Once installed, the site launches from the home screen or app drawer like a native app.

### Offline support

A service worker (`/sw.js`) caches the shell and assets:

- **Pages** — network-first, falling back to cache, then a themed offline page.
- **Styles, scripts, fonts** — stale-while-revalidate for fast loads.
- **Images** — cache-first.
- **API and admin routes** — always fetched from the network (never cached).

The service worker is only active in production builds. When you ship a new version, the old caches are cleaned up automatically.
