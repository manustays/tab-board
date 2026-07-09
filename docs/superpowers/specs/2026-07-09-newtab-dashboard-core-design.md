# New-Tab Dashboard — Core (v1) Design

**Date:** 2026-07-09
**Status:** Approved design → ready for implementation plan
**Scope:** Core (v1) only. Widgets-B, Local Sync, AI integration, and third-party embeds are separate future specs.

## 1. Summary

An open-source, fully-offline, single-page web app usable as a browser new-tab page. The product is a **widget-board**: a responsive 12-column grid where every element is a draggable, resizable card. Bookmarks are one widget type among several. It ships with a calm, beautiful default layout and lets the user edit, rearrange, resize, and restyle everything. No backend; all state lives in the browser.

The complete visual design and interaction model are defined by the approved prototype `Newtab Dashboard.dc.html` (Claude Design project `8bc5aa1b-...`). This spec ports that prototype to a production stack with the deltas listed in §9.

## 2. Goals & non-goals

**Goals**
- World-class, minimalist UI/UX — this is the primary bet. Match the approved design pixel-for-feel.
- Fully offline: no network calls on load or use (fonts self-hosted, app-shell cached by a service worker). Installable PWA.
- Fast first paint — a new-tab page must feel instant.
- Free, open-source, easy for contributors to run and extend.

**Non-goals (v1)**
- No accounts, no backend, no cloud sync.
- No todo / scratchpad / snippets widgets (Phase B — designed, deliberately held).
- No local-folder JSON sync, no AI-agent write path (later phase).
- No third-party/embeddable widgets (later phase).

## 3. Tech stack

- **Preact** + **Vite**. Small runtime, component model, instant load. The prototype is already `createElement`-based, so the port maps directly to Preact's `h`.
- **gridstack.js** — the grid engine: drag, drag-resize handles, collision reflow, responsive collapse to 1 column on mobile, and layout serialization. Skinned to match the design (cards, tints, fonts) — gridstack provides mechanics, the design provides looks.
- **localStorage** — single JSON blob under one key, behind a thin `store` module (swap seam to IndexedDB later if data outgrows ~5 MB).
- **Service worker** (Workbox or hand-rolled precache) — caches the app shell + fonts for offline. Only core dep beyond the above; confirm during planning.
- **Self-hosted fonts** (woff2, `font-display: swap`): Newsreader, Instrument Sans, Spline Sans Mono.

Hosting: static build deployed to any public HTTPS host (e.g. GitHub Pages). Set as the browser's new-tab URL.

## 4. Layout & responsive model

- 12-column gridstack grid with `float:false` compaction (cards pack up-and-left, no gaps), gap ~16px.
- Container width setting: **Centered** (max ~1120px) or **Full** (max ~1680px), from the design's settings menu.
- Each widget has a column width (`w`, min 2 / max 12) mapped from the design's `span`. gridstack also tracks position (`x,y`) and row height (`h`).
- Responsive: gridstack collapses to a single column below a breakpoint (~700px). Header and controls wrap.
- A built-in **header** (not a widget) always shows: date line, greeting + editable name, and current time. This is app chrome, distinct from the optional Date/Time widget.

## 5. v1 widget set

Each widget is a Preact component rendered inside a gridstack cell. Shared chrome: optional title (uppercase mono label; hidden when empty for a clean look), per-widget tint, and — in edit mode — a control bar (drag handle, resize, background/icon menu, delete).

| Widget | Description |
|---|---|
| **Bookmark group** | Title optional. Layout toggle **grid** (icon tiles + label) or **list** (icon + label rows). Add/edit/delete bookmarks. Icon mode per widget: `mono` (default, offline), `color`, `dot`, `favicon` (opt-in, remote — see §8). |
| **Single bookmark** | 1×N highlight tile: large colored icon, label, optional subtitle. |
| **Date / time** | Large serif time + uppercase date. (Optional — header already shows time.) |
| **Divider** | Full-width hairline; layout helper. |
| **Spacer** | Empty span; layout helper. Dashed outline in edit mode. |

Held for Phase B (present in the design, not built in v1): To-do, Scratchpad, Snippets.

## 6. Theming & color

- **Theme:** light / dark toggle (page-level palette).
- **Per-widget tint:** 7 named palettes — Paper, Sage, Clay, Sky, Lavender, Rose, Sand — each with a light and dark variant defining `bg / fg / muted / line / tile / tile-fg / field`. Foreground is **pre-decided per tint** to guarantee contrast (no runtime contrast math needed for the presets).
- **Accent:** picker with 5 presets (default terracotta `#c96442`); accent drives active states, checkboxes, focus.
- **Custom widget color** (from user's original ask): allow a custom bg color per widget in addition to the 7 presets. For a custom color, compute foreground (black/white) from WCAG relative luminance to keep contrast. *This is the one place runtime contrast math is needed; presets skip it.*

## 7. Data model & persistence

Single JSON object persisted to localStorage (key e.g. `nt_dashboard_v1`), written on change (debounced), read synchronously on load for instant paint. Defaults seed a calm first-run board using only v1 widgets.

```
{
  theme: 'light' | 'dark',
  width: 'fixed' | 'full',
  accent: '#rrggbb',
  name: string,
  widgets: [
    { id, type, title?, tint, span/w, x, y, h,
      // bookmarks: layout:'grid'|'list', icon:'mono'|'color'|'dot'|'favicon', items:[{id,label,url,color,ini}]
      // single:    item:{label,url,color,ini,sub}
      // datetime/divider/spacer: no extra fields
    }
  ]
}
```

A `store` module wraps get/set so persistence backend and schema migrations are centralized. Include a schema `version` for forward migration.

## 8. Offline & privacy

- **Fonts** self-hosted; no Google Fonts request.
- **Service worker** precaches the app shell (HTML/JS/CSS/fonts) so new-tab open works with no network. Cache-first for the shell; versioned cache busting on deploy.
- **Favicon icon mode** is the only feature that touches the network. It is **opt-in per widget**, off by default, fetches from a public icon service (e.g. DuckDuckGo `icons.duckduckgo.com/ip3/<domain>.ico`) with `referrerPolicy: 'no-referrer'` and a letter-avatar fallback on error. UI notes that enabling it makes remote requests. All other icon modes are fully offline.

## 9. Deltas from the prototype

The prototype `Newtab Dashboard.dc.html` is the source of truth for visuals and behavior. Production deltas:

1. **Layout engine:** replace the prototype's HTML5 drag-reorder + `−/+` span buttons with **gridstack** (real drag + resize handles + collision). Keep the prototype's card styling, tints, and fonts. `span` → gridstack `w`.
2. **Widget scope:** omit To-do, Scratchpad, Snippets in v1 (Phase B). Rebuild the default board from v1 widgets only.
3. **Fonts:** self-host woff2 instead of Google Fonts CDN.
4. **Offline:** add a service worker + PWA manifest (not in the prototype).
5. **Runtime:** port `DCLogic`/`React.createElement` to a Preact component tree; replace the design-canvas `support.js` runtime.
6. **Custom widget color** with luminance-based foreground (prototype only had the 7 presets).

## 10. Component boundaries

- `store` — load/save/migrate the state blob. No UI.
- `grid` — gridstack init, add/remove/move/resize, serialize/restore. Knows nothing about widget internals.
- `widgets/*` — one component per widget type; each renders from its data slice and emits edits via callbacks. Independently understandable/testable.
- `theme` — palettes (tints, page, accent) + custom-color contrast helper. Pure functions.
- `chrome` — header (greeting/clock), top bar (edit/theme/settings/add), menus.
- `app` — wires the above; owns edit-mode flag and current state.

Each unit answers: what it does, how it's used, what it depends on — with the grid engine and widget contents cleanly separated so Phase-B widgets slot in without touching `grid` or `store`.

## 11. Success criteria

- New tab opens to the calm default board with no network access (airplane-mode test passes after first load).
- Add/edit/delete bookmarks; toggle grid/list; switch icon modes; drag + resize widgets; changes persist across reload.
- Toggle theme, change accent, tint any widget, switch container width — all persist.
- Responsive: usable single-column layout on mobile width.
- Lighthouse: PWA installable; fast first contentful paint.

## 12. Future phases (out of scope, noted for architecture)

- **Phase B — Widgets:** To-do, Scratchpad, Snippets (already designed). Slot into existing grid/store.
- **Phase C — Local sync:** File System Access API → plain JSON files in a user-chosen folder.
- **Phase D — AI agent write path:** local agents update the same JSON files (or via deeplinks) so the board becomes a morning dashboard other tools can feed.
- **Phase E — Third-party/embeddable widgets.**

The `store` seam and widget-interface boundary are designed so these land without reworking Core.
