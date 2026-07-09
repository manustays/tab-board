# TabBoard

A fully-offline, open-source new-tab page — a customizable board of bookmark and helper widgets that lives in your browser and works with no backend, no accounts, and no tracking.

Drop it in as your browser's new-tab page and arrange the widgets you actually use: bookmark groups, a clock, a to-do list, quick notes, and more, all on a draggable, resizable grid.

## Features

- **Widget grid** — drag, drop, and resize widgets on a snap-to grid (powered by [Gridstack](https://gridstackjs.com/)).
- **Widgets** — bookmark groups, single bookmarks, date/time, to-do, notes/scratchpad, snippets, plus spacers and dividers for layout.
- **Offline-first** — installable PWA; after the first load it runs with no network.
- **Private by default** — no backend, no accounts, no analytics. All data stays in your browser's `localStorage`.
- **Themeable** — warm, paper-toned palettes with light/dark support and self-hosted fonts (no Google Fonts call).

## Quick start

```sh
npm install
npm run dev      # dev server (Vite)
npm test         # unit / component tests (Vitest)
npm run build    # static build to dist/
```

## Use it as your new-tab page

1. Build the app: `npm run build` produces a static site in `dist/`.
2. Deploy `dist/` to any static HTTPS host (e.g. GitHub Pages, Netlify, Cloudflare Pages).
3. Point your browser's new-tab page at that URL — via your browser's settings or an extension like "New Tab Redirect".
4. The first load caches the app; from then on it works offline.

## Privacy

No backend. No accounts. No telemetry. Everything you create lives in your browser's `localStorage` under the key `nt_dashboard_v1` and never leaves your machine. Fonts are self-hosted; the only optional network request is the per-widget "favicon" icon mode, which is **off by default**.

## Tech stack

- [Preact](https://preactjs.com/) — UI
- [Gridstack](https://gridstackjs.com/) — draggable/resizable grid
- [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — build & offline
- [Vitest](https://vitest.dev/) + Testing Library — tests

## Architecture

State persists to `localStorage` under `nt_dashboard_v1`. Widgets are declared in a registry (`src/widgets/registry.js`) and rendered onto the grid; layout is serialized alongside widget data. See `docs/superpowers/specs/` for the full design notes.

## Roadmap

- Local-folder JSON sync
- AI-agent write path
- Third-party widgets

## Contributing

Issues and pull requests welcome. Run `npm test` before opening a PR.
