# Phase B — Content Widgets (to-do, scratchpad, snippets)

**Status:** Approved design, ready for implementation plan.

**Goal:** Add three "content" widgets to the new-tab dashboard — a to-do checklist, a free-text scratchpad, and a copy-to-clipboard snippets list. They reuse the existing widget architecture (Preact content in a tinted `Card`, gridstack geometry, single localStorage blob) with **no new dependencies and no new store code**.

## Context

v1 core is complete: 14 tasks shipped (scaffold → theme → store → widgets → registry → grid → chrome → wiring → fonts → SW/PWA → README). Existing widgets: `bookmarks`, `single`, `datetime`, `divider`, `spacer`. This is the first slice of Phase B (post-v1). The remaining Phase B pieces — local-folder JSON sync, AI-agent write path, third-party widgets — are **out of scope** here; each gets its own spec.

## Architecture

Mirrors the existing widget pattern exactly. Each widget:

- Is a Preact component in `src/widgets/`, wrapped in `Card` (inherits tint, title row, edit-mode chrome, background/delete menu).
- Receives the standard props: `{ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove }`.
- Mutates its own content via `onPatch(partial)` — the same seam bookmarks/single use. No direct store access.
- Persists through the existing debounced `saveState` (250ms). No store.js changes.

Registry wiring in `src/widgets/registry.js`:

- `WIDGET_COMPONENTS` gains `todo`, `scratchpad`, `snippets`.
- `ADD_MENU` gains three rows (labels: "To-do", "Scratchpad", "Snippets").
- `newWidget(type, accent)` gains three cases seeding empty content + default geometry.

## Data model (fields on the widget object)

```
todo:       { ...card, items: [{ id, text, done }] }
scratchpad: { ...card, text: string }
snippets:   { ...card, items: [{ id, label, body }] }
```

`...card` = the shared fields already on every widget: `id, type, title, tint, x, y, w, h`. Item ids via existing `uid()`.

## Interaction model — "always-live"

Content is usable without entering edit mode. Edit mode adds only structural/appearance controls. Rationale: you check a todo or copy a snippet many times a day; forcing an edit-mode toggle each time is hostile.

| Widget | Live (no edit mode) | Edit mode only |
|---|---|---|
| To-do | check/uncheck an item; add task (inline input at list bottom); delete task | title, tint (Card menu) |
| Scratchpad | type in textarea (autosaves via `onPatch`) | title, tint (Card menu) |
| Snippets | click a snippet to copy its body (shows "Copied" ~1s) | add / edit / delete snippet; title, tint |

### Per-widget behavior

**To-do (`src/widgets/Todo.jsx`)**
- Renders `items` as a list; each row = a checkbox + text. Toggling patches that item's `done`.
- Inline "add task" input at the bottom (always visible, live): Enter appends `{ id: uid(), text, done: false }`.
- Delete control (×) per row shows only in `editing` OR always-live — **decision: delete shows on hover/always in live mode** so a finished list can be cleared without edit mode. Add and delete are the natural counterpart of checking; both live.
- Done items: strikethrough + muted color. No auto-sort, no separate "completed" section.

**Scratchpad (`src/widgets/Scratchpad.jsx`)**
- One full-height `textarea`, transparent background, tint foreground. `onInput` → `onPatch({ text })`. Debounced save handles write throughput.
- Placeholder "Notes…" when empty.

**Snippets (`src/widgets/Snippets.jsx`)**
- Renders `items` as clickable rows: label (primary) + truncated body preview (muted). Click → `navigator.clipboard.writeText(body)`, then swap that row's label to "Copied" for ~1s (local component state, not persisted).
- Edit mode: add button (bottom) and per-row edit (✎) / delete (×). Add/edit use `window.prompt` twice (label, then body) — matches the existing bookmarks/single edit UX, zero form UI.

## Add/edit UX rationale

- **To-do** adds inline (input box) because adding is a live, high-frequency action.
- **Snippets** adds/edits via `window.prompt` (label + body) — consistent with existing widgets, no new form components. Editing snippet bodies is infrequent, so a prompt is acceptable.
- **Scratchpad** needs no add/edit affordance; the textarea *is* the content.

## Clipboard & error handling

- `navigator.clipboard.writeText` returns a promise. On reject (e.g., permissions, insecure context) the "Copied" state is not shown; fail silently — no throw, no alert. The dashboard is served over HTTPS (per v1 deploy notes), where clipboard is available.
- No JS `alert`/`confirm` — deletes are immediate (consistent with existing widgets, which delete without confirm).

## Migration

None. These are new widget types; existing blobs are untouched and keep loading. The store's `migrate()` already passes `widgets` through as-is. `newWidget` seeds empty content for freshly added widgets.

## Testing

One new file `src/widgets/content.test.jsx` (Vitest + @testing-library/preact + jsdom), plus a registry assertion. Cases:

- **To-do:** toggling a checkbox calls `onPatch` with that item's `done` flipped; submitting the add input appends an item; delete removes an item.
- **Scratchpad:** typing in the textarea calls `onPatch({ text })` with the value.
- **Snippets:** renders each label; clicking a row calls `navigator.clipboard.writeText` with the body (clipboard mocked via `vi.fn()`).
- **Registry:** `ADD_MENU` includes the three new types and each has a `WIDGET_COMPONENTS` entry and a `newWidget` case producing valid geometry.

DOM-heavy gridstack wiring is already covered by v1's manual checklist; these widgets add no new geometry behavior.

## Out of scope (defer to later)

- Drag-reorder of todo/snippet items.
- Snippet categories/folders.
- Rich text / markdown in scratchpad.
- Due dates, recurring todos.
- Inline snippet form (prompt is sufficient for v1 of this slice).

## Files

- Create: `src/widgets/Todo.jsx`, `src/widgets/Scratchpad.jsx`, `src/widgets/Snippets.jsx`, `src/widgets/content.test.jsx`
- Modify: `src/widgets/registry.js` (+ `registry.test.js` assertions)
- Modify: `README.md` roadmap line (move these three out of "post-v1 to-do").
