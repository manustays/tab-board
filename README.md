# New Tab Dashboard

A fully-offline, open-source new-tab page: a customizable widget-board of bookmarks and helpers.

## Develop
- `npm install`
- `npm run dev` — dev server
- `npm test` — unit/component tests
- `npm run build` — static build to `dist/`

## Use as your new-tab page
1. Deploy `dist/` to any static HTTPS host (e.g. GitHub Pages).
2. Set that URL as your browser's new-tab page (via an extension like "New Tab Redirect", or your browser's settings).
3. First load caches the app; afterwards it works offline.

## Offline & privacy
No backend, no accounts. All data lives in your browser's localStorage. Fonts are self-hosted; the only optional network call is the per-widget "favicon" icon mode, which is off by default.

## Data model
State persists under localStorage key `nt_dashboard_v1`. See `docs/superpowers/specs/` for the design.

## Roadmap (post-v1)
Local-folder JSON sync, AI-agent write path, third-party widgets.
