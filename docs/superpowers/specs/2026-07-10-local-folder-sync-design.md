# Local-folder JSON sync — design spec

**Date:** 2026-07-10
**Status:** approved, ready for implementation plan

## Goal

Persist the dashboard state to a JSON file inside a user-chosen local folder. Auto-write on
every change; auto-load on start. When that folder is cloud-synced (Dropbox, iCloud Drive,
etc.), this gives cross-device sync with no backend. Built on the File System Access API, so it
is Chromium-only and must degrade silently everywhere else.

localStorage remains the primary, always-on store (fast, offline, universal). The folder file is
a mirror layered on top: authoritative only when it is *newer* than the local copy at load time.

## Decisions (locked during brainstorming)

- **Mechanism:** File System Access API live sync (not manual export/import).
- **Target:** a **folder** via `showDirectoryPicker()`; the app writes `tabboard.json` inside it.
- **Read model:** read on load, write on change. Last-writer-wins by an `updatedAt` timestamp.
- **localStorage:** unchanged role — fast local mirror + offline fallback. Never removed.

## Data model change

Add one field to `State`:

```
updatedAt: number   // epoch ms, set at each save
```

- `migrate()` defaults `updatedAt` to `0` for pre-existing (v0/v1-without-stamp) blobs, so any
  real folder file with a nonzero stamp wins on first connect.
- The stamp is applied in the persistence path in `app.jsx` (where `Date.now()` is acceptable),
  **not** inside the pure `store.js` helpers — this keeps `store.js`/`migrate()` deterministic
  and test-friendly. `saveState`/`writeFile` receive an already-stamped state.

`SCHEMA_VERSION` stays at `1`; `updatedAt` is additive and absence-tolerant, so no version bump
is needed.

## New module: `src/store/sync.js`

Isolated persistence adapter. No Preact, no app imports. Pure async functions over the File
System Access API + IndexedDB. Every function is a no-throw boundary: on any failure it returns
`null`/`false` rather than propagating.

Handles cannot be stored in localStorage (not serializable) but **are** structured-clonable, so
the chosen `FileSystemDirectoryHandle` is persisted in IndexedDB under a fixed key.

Interface:

- `isSupported(): boolean` — `typeof window.showDirectoryPicker === 'function'`.
- `connect(): Promise<{handle, name} | null>` — prompt `showDirectoryPicker()` (readwrite),
  persist the handle in IndexedDB, return handle + folder name. `null` if the user cancels or
  it is unsupported.
- `restore(): Promise<{handle, name} | null>` — read the persisted handle from IndexedDB;
  `queryPermission({mode:'readwrite'})`, and if `'prompt'`, `requestPermission`. Return the
  handle if granted, else `null`. Does **not** clear the stored handle on a soft denial — the
  user may re-grant next session.
- `readState(handle): Promise<State | null>` — open `tabboard.json` in the folder, read text,
  `JSON.parse`. Return the parsed blob, or `null` if the file is missing, empty, or corrupt.
  (Caller passes the blob through `migrate()`.)
- `writeState(handle, state): Promise<boolean>` — get/create `tabboard.json`
  (`getFileHandle(name, {create:true})`), `createWritable()`, write `JSON.stringify(state)`,
  `close()`. Return `true` on success, `false` on any error.
- `disconnect(): Promise<void>` — delete the persisted handle from IndexedDB.

A tiny promisified IndexedDB get/set/delete for a single key lives in this module (no library).

`FILE_NAME = 'tabboard.json'` constant.

## App wiring (`src/app.jsx`)

**On mount (one-shot effect):**

1. `if (!isSupported()) return;` — leave UI in the unsupported state.
2. `const conn = await restore();` — if `null`, stay local-only.
3. If connected: `const fileState = await readState(conn.handle);`
   - `if (fileState && migrate(fileState).updatedAt > localState.updatedAt)` → adopt the file
     state via `setState(migrate(fileState))`. (Local is the initial `loadState()` value.)
   - else → keep local; the change effect below will write local out to the file, making the
     folder catch up.
4. Store `conn` (handle + name) in a `syncFolder` state slice for the UI.

**On state change (effect on `[state, syncFolder]`):**

- Stamp `updatedAt` and debounce a `writeState(handle, stampedState)` (~250ms), reusing the
  existing debounce shape but with a **separate timer** from `saveState`. Only runs when a
  folder is connected.
- localStorage write path is untouched — `saveState(state)` still fires on every change.

**Flush on teardown:** the existing `pagehide` / `visibilitychange` handler also flushes the
pending folder write, alongside `saveState.flush()`.

**Ordering note:** the mount read must resolve before the change-effect writes, or a connected
session could overwrite a newer file with stale local state before adopting it. Guard the write
effect behind a `ready` flag that flips true after the mount read completes.

## UI — settings menu (`src/chrome/TopBar.jsx`)

New "Folder sync" section in the existing settings dropdown:

- **Unsupported** (`!isSupported()`): a muted line — "Folder sync needs a Chromium browser."
- **Supported, not connected:** a "Connect folder" button → calls `connect()`, lifts the result
  into app state.
- **Connected:** show the folder name + a "Disconnect" button → `disconnect()` + clear the
  `syncFolder` slice.

New props threaded from `App` → `TopBar`: `syncFolder`, `onConnectFolder`, `onDisconnectFolder`.
Styling reuses the existing `label`/`choice`/`pill` helpers.

## Error handling

- User cancels the picker / permission denied → stay local-only, no throw, no UI error.
- `tabboard.json` missing, empty, or corrupt → `readState` returns `null`; app keeps local state
  and writes a fresh file.
- Write failure (quota, revoked permission, disk) → `writeState` returns `false`, ignored;
  localStorage still holds the truth. Matches the existing "quota/private mode: ignore" posture.
- Stored handle whose permission cannot be re-granted → `restore()` returns `null`; UI falls
  back to "not connected".

## Testing (`src/store/sync.test.js` + `store.test.js`)

- `writeState` serializes state to the mock file handle (assert written string parses back equal).
- `readState` parses a valid file; returns `null` for missing / empty / malformed JSON.
- `restore` returns `null` when permission is denied; returns the handle when granted.
- IndexedDB handle round-trip: `connect`-persisted handle is retrievable by `restore` (mock idb).
- `migrate()` defaults `updatedAt` to `0` and preserves a provided `updatedAt` (add to
  `store.test.js`).

Mocks: hand-rolled fake `FileSystemDirectoryHandle` / `FileSystemFileHandle` /
`FileSystemWritableFileStream` and a minimal in-memory IndexedDB shim — no new dependencies.

## Out of scope (YAGNI)

- Multi-file / per-widget / dated-backup storage in the folder.
- Live re-read of the file while the tab is open (external-change watching).
- Manual export/import buttons or any non-Chromium fallback path.
- Conflict UI / merge — last-writer-wins by timestamp is the whole conflict story.

Add any of these only when a concrete need appears.
