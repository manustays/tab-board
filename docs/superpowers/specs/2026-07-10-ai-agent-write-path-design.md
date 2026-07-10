# AI-agent write path — design spec

**Date:** 2026-07-10
**Status:** approved, ready for implementation plan

## Goal

Let local AI agents (Claude Code, Codex, cron scripts, …) feed content into the dashboard —
push to-do items, drop notes — so the board becomes a morning dashboard other tools can feed
(Phase D of the core design). Built on top of the existing local-folder sync: agents write an
ops file into the connected folder; the app consumes it on load.

## Decisions (locked during brainstorming)

- **Scope:** agents feed *content* into existing widgets. Layout stays human-owned — no
  widget creation, removal, or rearrangement by agents.
- **Ops (v1):** `todo.add` and `note.append` only.
- **Mechanism:** an inbox file in the sync folder. Deeplink/URL ops deferred to a later slice
  (the op schema and `applyOps` are designed to be reused by it).
- **Discovery:** the app writes `AGENTS.md` into the sync folder — agents working in that
  folder self-discover the protocol. No download buttons, no hosted docs.
- **Pickup:** on tab load only. A new-tab page opens many times a day; each open is a natural
  pickup moment. No polling, no file watching (matches the sync spec's posture).
- **Targeting:** first widget of matching type by default; optional case-insensitive title
  match via a `widget` field. No match → op skipped. No auto-create.

## Files in the sync folder

```
<folder>/
  tabboard.json          # existing state mirror — agents READ ONLY
  tabboard-inbox.json    # agents write ops here; app consumes + deletes
  AGENTS.md              # protocol doc, written by the app
```

## Inbox format (`tabboard-inbox.json`)

```json
{
	"ops": [
		{ "op": "todo.add", "text": "Buy milk", "widget": "Work" },
		{ "op": "note.append", "text": "Morning summary…" }
	]
}
```

- `op` — `"todo.add"` | `"note.append"`.
- `text` — required non-empty string.
- `widget` — optional; case-insensitive title match. Absent → first widget of that type.
  No match → op skipped.
- Top level is an object with an `ops` array (extensible later), not a bare array.

**Semantics:**

Each op maps to one widget type: `todo.add` → `todo`, `note.append` → `scratchpad`. Targeting
resolves among widgets of that type only.

- `todo.add` → appends `{ id: uid(), text, done: false }` to the target widget's `items`
  (matches the `Todo.jsx` item shape).
- `note.append` → `target.text += '\n' + text`; the separator is added only when the existing
  text is non-empty.
- A malformed op or unknown `op` is skipped; remaining ops still apply. A whole-file JSON
  parse failure is ignored — but the file is deleted anyway, so a poison-pill inbox cannot
  wedge every future load.

**Consumption:** read on load → apply → **delete** the inbox file. File absent = consumed.
Agents recreate the file, or append ops to a still-pending one.

## New module: `src/store/inbox.js`

Pure — no IO, no Preact.

- `applyOps(state, raw): { state, applied, skipped }` — validates `raw` (the parsed inbox
  blob), resolves each op's target widget (title match → first-of-type), returns a new state
  object (never mutates). When `applied === 0` it returns the *same* state reference, so the
  caller can skip a no-op `setState`.
- `AGENTS_DOC` — string constant: the full `AGENTS.md` text. Documents the inbox schema with
  examples, targeting rules, "read `tabboard.json` for widget titles, never edit it", pickup
  timing ("applied next time a tab opens"), and the append-don't-overwrite rule for a pending
  inbox.

## `src/store/sync.js` additions

Three helpers, same no-throw posture as the existing ones:

- `readInbox(handle): Promise<object|null>` — read + parse `tabboard-inbox.json`; `null` if
  missing, empty, or corrupt.
- `clearInbox(handle): Promise<void>` — `removeEntry('tabboard-inbox.json')`; swallow errors
  (missing file is a no-op).
- `writeAgentsDoc(handle): Promise<boolean>` — write `AGENTS_DOC` to `AGENTS.md`, overwriting
  unconditionally.

`INBOX_FILE = 'tabboard-inbox.json'` and `AGENTS_FILE = 'AGENTS.md'` constants.

## App wiring (`src/app.jsx`)

Mount effect, extended in sequence inside the existing async flow:

1. `restore()` → connected? (unchanged)
2. Adopt newer file state (unchanged)
3. **New:** `writeAgentsDoc(handle)` — refreshes the doc every session start, so it tracks the
   app version.
4. **New:** `readInbox(handle)` → if non-null: `setState((s) => applyOps(s, raw).state)` →
   `clearInbox(handle)`.
5. `syncReady.current = true` (unchanged)

The `connect()` handler also calls `writeAgentsDoc` so the doc appears immediately on first
connect. Applied ops flow through the existing change effect → stamped `updatedAt` → written
back to `tabboard.json`. No new persistence machinery.

## Error handling

- Inbox missing / empty / corrupt JSON → `readInbox` returns `null`; the app skips apply but
  still calls `clearInbox` (deletes a corrupt file; missing-file delete is a swallowed no-op).
- Op targets a nonexistent widget or has a bad shape → skipped silently, counted in `skipped`.
  No UI error — matches the app's quiet-failure posture.
- `writeAgentsDoc` failure → ignored (`false`), retried naturally next session.
- Permission lapsed mid-flow → all helpers are already no-throw; the app stays local-only.
- No confirm UI: writing into the user's chosen folder is already trusted (the drive-by
  concern that motivated a confirm banner for deeplinks does not apply here).

## Testing

**`src/store/inbox.test.js`** (pure, no mocks):

- `todo.add` appends the correct item shape to the first todo widget.
- `widget: "Work"` title match is case-insensitive; no match → skipped.
- `note.append` to an empty vs non-empty scratchpad (separator rule).
- Malformed ops are skipped while valid siblings still apply; `applied === 0` → same state
  reference returned.
- `AGENTS_DOC` mentions both op names and the inbox filename (doc/code drift guard).

**`src/store/sync.test.js`** (existing fake-handle mocks):

- `readInbox` parses a valid file; `null` on missing/corrupt.
- `clearInbox` removes the entry; no throw when absent.
- `writeAgentsDoc` writes the `AGENTS_DOC` content.

## Out of scope (each a later slice)

- Deeplink/URL ops (the op schema and `applyOps` are designed for reuse by it).
- `snippet.add`, `bookmark.add` ops.
- Live inbox watching / polling while the tab is open.
- Op provenance UI (badging agent-added items).
- Multi-agent coordination / op dedup.

Add any of these only when a concrete need appears.
