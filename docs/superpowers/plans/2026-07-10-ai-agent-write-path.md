# AI-Agent Write Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let local AI agents feed content into the dashboard by writing ops to `tabboard-inbox.json` in the connected sync folder; the app applies them on load and self-documents the protocol via an `AGENTS.md` it writes into that folder.

**Architecture:** A new pure module `src/store/inbox.js` owns the op schema (`applyOps`) and the protocol doc text (`AGENTS_DOC`). `src/store/sync.js` gains three no-throw IO helpers (`readInbox`, `clearInbox`, `writeAgentsDoc`). `src/app.jsx`'s existing mount effect consumes the inbox after adopting folder state. Spec: `docs/superpowers/specs/2026-07-10-ai-agent-write-path-design.md`.

**Tech Stack:** Preact + Vitest (existing; no new dependencies). File System Access API via the existing directory-handle plumbing.

## Global Constraints

- No new dependencies.
- Tabs for indentation; JSDoc on every new exported function (project convention).
- `src/store/inbox.js` is pure: no IO, no Preact imports (only `uid` from `./defaults.js`).
- All `sync.js` functions are no-throw boundaries: failures return `null`/`false`/void, never throw.
- Agents never edit `tabboard.json`; ops are additive content only (no widget create/remove/layout).
- **Deviation from spec, locked here:** `INBOX_FILE`, `AGENTS_FILE`, and `AGENTS_DOC` live in `inbox.js` (not `sync.js` as the spec's constants line says) — `sync.js` imports them. Reason: `writeAgentsDoc` needs `AGENTS_DOC`, and `AGENTS_DOC`'s text embeds the inbox filename; defining them in `inbox.js` keeps the dependency one-directional (`sync.js` → `inbox.js`) with no cycle.
- Run single test files (`npx vitest run <file>`), not the whole suite, except the final full-suite check in Task 4.

---

### Task 1: `applyOps` — pure op application (`src/store/inbox.js`)

**Files:**
- Create: `src/store/inbox.js`
- Test: `src/store/inbox.test.js`

**Interfaces:**
- Consumes: `uid()` from `src/store/defaults.js` (returns a short random string id).
- Produces: `applyOps(state, raw): { state, applied: number, skipped: number }` — pure; `raw` is the parsed inbox blob (`{ ops: [...] }`). When `applied === 0`, the returned `state` is the **same reference** as the input. Task 4 relies on this exact signature.

Widget shapes this task writes to (from `Todo.jsx` / `Scratchpad.jsx`):
- todo widget: `{ type:'todo', title, items: [{ id, text, done }] }`
- scratchpad widget: `{ type:'scratchpad', title, text: string }`

- [ ] **Step 1: Write the failing tests**

Create `src/store/inbox.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { applyOps } from './inbox.js';

/** Fresh three-widget board: two todos + one scratchpad. */
function makeState() {
	return {
		version:1, theme:'light', width:'fixed', accent:'#c96442', name:'t', updatedAt:0,
		widgets: [
			{ id:'w1', type:'todo', title:'Work', w:3, h:3, items:[{ id:'i1', text:'old', done:false }] },
			{ id:'w2', type:'todo', title:'Home', w:3, h:3, items:[] },
			{ id:'w3', type:'scratchpad', title:'Notes', w:3, h:3, text:'' },
		],
	};
}

describe('applyOps', () => {
	it('todo.add appends to the first todo widget by default', () => {
		const { state, applied, skipped } = applyOps(makeState(), { ops:[{ op:'todo.add', text:'Buy milk' }] });
		expect(applied).toBe(1);
		expect(skipped).toBe(0);
		const items = state.widgets[0].items;
		expect(items).toHaveLength(2);
		expect(items[1]).toMatchObject({ text:'Buy milk', done:false });
		expect(typeof items[1].id).toBe('string');
		expect(items[1].id).not.toBe('');
	});
	it('widget field targets by title, case-insensitively', () => {
		const { state } = applyOps(makeState(), { ops:[{ op:'todo.add', text:'Mow lawn', widget:'home' }] });
		expect(state.widgets[0].items).toHaveLength(1); // untouched
		expect(state.widgets[1].items).toHaveLength(1);
		expect(state.widgets[1].items[0].text).toBe('Mow lawn');
	});
	it('unmatched widget title skips the op', () => {
		const input = makeState();
		const { state, applied, skipped } = applyOps(input, { ops:[{ op:'todo.add', text:'x', widget:'Nope' }] });
		expect(applied).toBe(0);
		expect(skipped).toBe(1);
		expect(state).toBe(input); // same reference on no-op
	});
	it('note.append sets text directly when the scratchpad is empty', () => {
		const { state } = applyOps(makeState(), { ops:[{ op:'note.append', text:'Morning summary' }] });
		expect(state.widgets[2].text).toBe('Morning summary');
	});
	it('note.append joins with a newline when text exists', () => {
		const input = makeState();
		input.widgets[2].text = 'Existing';
		const { state } = applyOps(input, { ops:[{ op:'note.append', text:'More' }] });
		expect(state.widgets[2].text).toBe('Existing\nMore');
	});
	it('skips malformed ops but applies valid siblings', () => {
		const { state, applied, skipped } = applyOps(makeState(), { ops:[
			{ op:'todo.add', text:'good' },
			{ op:'todo.add' },                 // missing text
			{ op:'todo.add', text:'   ' },     // blank text
			{ op:'nope.unknown', text:'x' },   // unknown op
			'not an object',
		] });
		expect(applied).toBe(1);
		expect(skipped).toBe(4);
		expect(state.widgets[0].items).toHaveLength(2);
	});
	it('tolerates a garbage blob: same state reference back', () => {
		const input = makeState();
		for (const raw of [null, 42, 'hi', {}, { ops:'nope' }]) {
			const res = applyOps(input, raw);
			expect(res.state).toBe(input);
			expect(res.applied).toBe(0);
		}
	});
	it('never mutates the input state', () => {
		const input = makeState();
		const snapshot = JSON.parse(JSON.stringify(input));
		applyOps(input, { ops:[{ op:'todo.add', text:'Buy milk' }, { op:'note.append', text:'hi' }] });
		expect(input).toEqual(snapshot);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/inbox.test.js`
Expected: FAIL — cannot resolve `./inbox.js` (module does not exist).

- [ ] **Step 3: Write the implementation**

Create `src/store/inbox.js`:

```js
/**
 * Agent write path: pure op application + the protocol doc agents read.
 * No IO here — sync.js owns file access, app.jsx owns wiring.
 * Spec: docs/superpowers/specs/2026-07-10-ai-agent-write-path-design.md
 */

import { uid } from './defaults.js';

export const INBOX_FILE = 'tabboard-inbox.json';
export const AGENTS_FILE = 'AGENTS.md';

/** op name → widget type it targets */
const OP_TYPES = { 'todo.add':'todo', 'note.append':'scratchpad' };

/**
 * Resolve an op's target widget: case-insensitive title match when
 * `op.widget` is given, else the first widget of the op's type.
 * @param {Array<object>} widgets
 * @param {object} op
 * @returns {object|null}
 */
function findTarget(widgets, op) {
	const ofType = widgets.filter((w) => w.type === OP_TYPES[op.op]);
	if (op.widget == null) return ofType[0] || null;
	const want = String(op.widget).trim().toLowerCase();
	return ofType.find((w) => (w.title || '').trim().toLowerCase() === want) || null;
}

/**
 * Apply agent ops from a parsed inbox blob. Pure: never mutates `state`;
 * returns the same state reference when nothing applied. Malformed or
 * unmatched ops are skipped; valid siblings still apply.
 * @param {import('./store.js').State} state
 * @param {any} raw parsed tabboard-inbox.json blob ({ ops: [...] })
 * @returns {{ state: import('./store.js').State, applied: number, skipped: number }}
 */
export function applyOps(state, raw) {
	const ops = raw && typeof raw === 'object' && Array.isArray(raw.ops) ? raw.ops : [];
	let widgets = state.widgets;
	let applied = 0, skipped = 0;
	for (const op of ops) {
		const valid = op && typeof op === 'object' && OP_TYPES[op.op]
			&& typeof op.text === 'string' && op.text.trim();
		const target = valid ? findTarget(widgets, op) : null;
		if (!target) { skipped++; continue; }
		const patch = op.op === 'todo.add'
			? { items: (target.items || []).concat({ id: uid(), text: op.text, done: false }) }
			: { text: target.text ? target.text + '\n' + op.text : op.text };
		widgets = widgets.map((w) => w === target ? { ...w, ...patch } : w);
		applied++;
	}
	return { state: applied ? { ...state, widgets } : state, applied, skipped };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/inbox.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/inbox.js src/store/inbox.test.js
git commit -m "feat: pure applyOps for agent inbox ops"
```

---

### Task 2: `AGENTS_DOC` — the protocol doc agents read

**Files:**
- Modify: `src/store/inbox.js` (append the constant)
- Test: `src/store/inbox.test.js` (append a describe block)

**Interfaces:**
- Consumes: `INBOX_FILE`, `AGENTS_FILE` from Task 1 (same file).
- Produces: `AGENTS_DOC: string` — full `AGENTS.md` markdown. Task 3's `writeAgentsDoc` writes it verbatim.

- [ ] **Step 1: Write the failing tests**

Append to `src/store/inbox.test.js` (add `AGENTS_DOC, INBOX_FILE` to the existing import from `./inbox.js`):

```js
describe('AGENTS_DOC', () => {
	// Drift guard: the doc must reference the real filenames and op names.
	it('documents both ops and the inbox filename', () => {
		expect(AGENTS_DOC).toContain(INBOX_FILE);
		expect(AGENTS_DOC).toContain('todo.add');
		expect(AGENTS_DOC).toContain('note.append');
		expect(AGENTS_DOC).toContain('tabboard.json');
	});
	it('warns agents never to edit tabboard.json', () => {
		expect(AGENTS_DOC.toLowerCase()).toContain('read only');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/inbox.test.js`
Expected: FAIL — `AGENTS_DOC` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/store/inbox.js`:

```js
/**
 * The AGENTS.md the app writes into the sync folder so agents working
 * there self-discover the protocol. Rewritten on every session start.
 */
export const AGENTS_DOC = `# TabBoard — agent write path

This folder is a TabBoard sync folder. AI agents can feed content into the
user's dashboard by writing ops to \`${INBOX_FILE}\` here.

## Files

- \`tabboard.json\` — the full dashboard state. **READ ONLY** for agents: never
  edit it (the app overwrites it and your change would be lost or clobber the
  board). Read it to discover widget titles for targeting.
- \`${INBOX_FILE}\` — your ops file. The app applies it and deletes it the next
  time the user opens a new tab.
- \`${AGENTS_FILE}\` — this doc. Rewritten by the app; do not edit.

## Inbox format

Write \`${INBOX_FILE}\` as a JSON object with an \`ops\` array:

\`\`\`json
{
	"ops": [
		{ "op": "todo.add", "text": "Buy milk", "widget": "Work" },
		{ "op": "note.append", "text": "Morning summary…" }
	]
}
\`\`\`

## Ops

- \`todo.add\` — appends one to-do item to a to-do widget. \`text\` (required):
  the item label.
- \`note.append\` — appends a line to a notes/scratchpad widget. \`text\`
  (required): the text to add (a newline is inserted before it when the note
  is not empty).

**Targeting:** ops land in the first widget of the matching type. To pick a
specific widget, set \`"widget"\` to its title (case-insensitive) — widget
titles are visible in \`tabboard.json\` under \`widgets[].title\`. If nothing
matches, the op is skipped.

## Rules

- If \`${INBOX_FILE}\` already exists, **append** your ops to its \`ops\`
  array — do not overwrite it (a previous agent's ops may still be pending).
- \`text\` must be a non-empty string. Malformed ops are skipped; valid ones
  in the same file still apply.
- Ops are additive content only. There is no delete, edit, or layout op.
- Ops take effect the next time the user opens a new tab — do not wait for
  or verify immediate application.
`;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/inbox.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/inbox.js src/store/inbox.test.js
git commit -m "feat: AGENTS_DOC protocol doc for agent discovery"
```

---

### Task 3: sync.js IO helpers — `readInbox` / `clearInbox` / `writeAgentsDoc`

**Files:**
- Modify: `src/store/sync.js`
- Test: `src/store/sync.test.js` (rework `fakeDir` to multi-file, add a describe block)

**Interfaces:**
- Consumes: `INBOX_FILE`, `AGENTS_FILE`, `AGENTS_DOC` from `./inbox.js` (Tasks 1–2).
- Produces (Task 4 relies on these exact signatures):
  - `readInbox(dirHandle): Promise<object|null>` — parsed inbox blob, or `null` if missing/empty/corrupt.
  - `clearInbox(dirHandle): Promise<void>` — removes the inbox file; swallows all errors.
  - `writeAgentsDoc(dirHandle): Promise<boolean>` — writes `AGENTS_DOC` to `AGENTS.md`, overwriting; `false` on failure.

Also refactors `readState`/`writeState` onto shared internal `readJson`/`writeFile` helpers (behavior unchanged — existing tests must still pass).

- [ ] **Step 1: Rework the test fakes for multiple files**

In `src/store/sync.test.js`, replace the existing `fakeWritable`/`fakeFileHandle`/`fakeDir` block (lines 4–23) with a multi-file fake, and update the existing tests that call `fakeDir`:

```js
// Minimal fakes for the File System Access API. `files` maps name → { data }.
function fakeWritable(sink) {
	return { write: (data) => { sink.data = data; }, close: async () => {} };
}
function fakeFileHandle(store) {
	return {
		createWritable: async () => fakeWritable(store),
		getFile: async () => ({ text: async () => store.data ?? '' }),
	};
}
function fakeDir(files = {}) {
	return {
		files,
		getFileHandle: async (name, opts) => {
			// real API rejects getFileHandle for a missing file without {create}
			if (!(name in files) && !opts?.create) throw new Error('NotFound');
			files[name] = files[name] || {};
			return fakeFileHandle(files[name]);
		},
		removeEntry: async (name) => {
			if (!(name in files)) throw new Error('NotFound');
			delete files[name];
		},
	};
}
```

Update the five existing `sync file io` tests to the new call shape:

```js
	it('writeState serializes state to the file', async () => {
		const files = {};
		const ok = await writeState(fakeDir(files), { name:'Zed', updatedAt:5 });
		expect(ok).toBe(true);
		expect(JSON.parse(files[FILE_NAME].data)).toEqual({ name:'Zed', updatedAt:5 });
	});
	it('readState parses a written file', async () => {
		const files = { [FILE_NAME]: { data: JSON.stringify({ name:'Zed', updatedAt:5 }) } };
		expect(await readState(fakeDir(files))).toEqual({ name:'Zed', updatedAt:5 });
	});
	it('readState returns null when the file is missing', async () => {
		expect(await readState(fakeDir())).toBe(null);
	});
	it('readState returns null on empty or corrupt json', async () => {
		expect(await readState(fakeDir({ [FILE_NAME]: { data:'' } }))).toBe(null);
		expect(await readState(fakeDir({ [FILE_NAME]: { data:'{ not json' } }))).toBe(null);
	});
	it('writeState returns false when the handle throws', async () => {
		const bad = { getFileHandle: async () => { throw new Error('denied'); } };
		expect(await writeState(bad, { updatedAt:1 })).toBe(false);
	});
```

(`isSupported` test is untouched.)

- [ ] **Step 2: Run existing sync tests to verify the fake rework is sound**

Run: `npx vitest run src/store/sync.test.js`
Expected: PASS (all 12 existing tests) — the fake changed, the code under test didn't.

- [ ] **Step 3: Write the failing tests for the new helpers**

Append to `src/store/sync.test.js` (extend the import from `./sync.js` with `readInbox, clearInbox, writeAgentsDoc`, and add `import { INBOX_FILE, AGENTS_FILE, AGENTS_DOC } from './inbox.js';`):

```js
describe('agent inbox io', () => {
	it('readInbox parses a valid inbox file', async () => {
		const files = { [INBOX_FILE]: { data: JSON.stringify({ ops:[{ op:'todo.add', text:'x' }] }) } };
		expect(await readInbox(fakeDir(files))).toEqual({ ops:[{ op:'todo.add', text:'x' }] });
	});
	it('readInbox returns null when missing, empty, or corrupt', async () => {
		expect(await readInbox(fakeDir())).toBe(null);
		expect(await readInbox(fakeDir({ [INBOX_FILE]: { data:'' } }))).toBe(null);
		expect(await readInbox(fakeDir({ [INBOX_FILE]: { data:'{ nope' } }))).toBe(null);
	});
	it('clearInbox removes the inbox file', async () => {
		const files = { [INBOX_FILE]: { data:'{}' } };
		await clearInbox(fakeDir(files));
		expect(INBOX_FILE in files).toBe(false);
	});
	it('clearInbox does not throw when the file is absent', async () => {
		await expect(clearInbox(fakeDir())).resolves.toBeUndefined();
	});
	it('writeAgentsDoc writes AGENTS_DOC to AGENTS.md', async () => {
		const files = {};
		expect(await writeAgentsDoc(fakeDir(files))).toBe(true);
		expect(files[AGENTS_FILE].data).toBe(AGENTS_DOC);
	});
	it('writeAgentsDoc returns false when the handle throws', async () => {
		const bad = { getFileHandle: async () => { throw new Error('denied'); } };
		expect(await writeAgentsDoc(bad)).toBe(false);
	});
});
```

- [ ] **Step 4: Run tests to verify the new ones fail**

Run: `npx vitest run src/store/sync.test.js`
Expected: FAIL — `readInbox` is not exported from `./sync.js` (6 new tests fail, 12 old pass).

- [ ] **Step 5: Write the implementation**

In `src/store/sync.js`, add the import at the top:

```js
import { INBOX_FILE, AGENTS_FILE, AGENTS_DOC } from './inbox.js';
```

Replace the bodies of `readState`/`writeState` with shared helpers and add the three new functions (final shape of the file-IO section):

```js
export const FILE_NAME = 'tabboard.json';

/** Read a file's text from a directory handle and JSON-parse it. */
async function readJson(dirHandle, name) {
	try {
		const fileHandle = await dirHandle.getFileHandle(name);
		const file = await fileHandle.getFile();
		const text = await file.text();
		if (!text) return null;
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
}

/** Write text to a named file in a directory handle, creating it if needed. */
async function writeFile(dirHandle, name, text) {
	try {
		const fileHandle = await dirHandle.getFileHandle(name, { create:true });
		const writable = await fileHandle.createWritable();
		await writable.write(text);
		await writable.close();
		return true;
	} catch (e) {
		return false;
	}
}

/**
 * Read and parse tabboard.json from a directory handle.
 * @param {any} dirHandle
 * @returns {Promise<object|null>} parsed blob, or null if missing/empty/corrupt.
 */
export function readState(dirHandle) {
	return readJson(dirHandle, FILE_NAME);
}

/**
 * Write state as tabboard.json into a directory handle.
 * @param {any} dirHandle
 * @param {object} state
 * @returns {Promise<boolean>} true on success.
 */
export function writeState(dirHandle, state) {
	return writeFile(dirHandle, FILE_NAME, JSON.stringify(state));
}

/**
 * Read and parse the agent inbox file.
 * @param {any} dirHandle
 * @returns {Promise<object|null>} parsed ops blob, or null if missing/empty/corrupt.
 */
export function readInbox(dirHandle) {
	return readJson(dirHandle, INBOX_FILE);
}

/**
 * Delete the agent inbox file (consumed, or corrupt and being discarded).
 * Missing file is a no-op.
 * @param {any} dirHandle
 * @returns {Promise<void>}
 */
export async function clearInbox(dirHandle) {
	try { await dirHandle.removeEntry(INBOX_FILE); } catch (e) { /* absent: fine */ }
}

/**
 * Write the agent protocol doc (AGENTS.md) into the folder, overwriting.
 * @param {any} dirHandle
 * @returns {Promise<boolean>} true on success.
 */
export function writeAgentsDoc(dirHandle) {
	return writeFile(dirHandle, AGENTS_FILE, AGENTS_DOC);
}
```

Everything below (IndexedDB storage, `connect`/`restore`/`disconnect`) is untouched.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/store/sync.test.js`
Expected: PASS (18 tests).

- [ ] **Step 7: Commit**

```bash
git add src/store/sync.js src/store/sync.test.js
git commit -m "feat: inbox read/clear and AGENTS.md write in sync adapter"
```

---

### Task 4: App wiring + README

**Files:**
- Modify: `src/app.jsx` (imports, mount effect, `onConnectFolder`)
- Modify: `README.md` (features + roadmap)

**Interfaces:**
- Consumes: `applyOps` (Task 1), `readInbox`/`clearInbox`/`writeAgentsDoc` (Task 3), exact signatures as declared there.
- Produces: nothing downstream — this is the final wiring.

No new unit test: the pieces are covered in Tasks 1–3, and the mount effect has no existing test harness for the FS API (same posture as the folder-sync wiring, which shipped without one). Verification is the full suite + a manual check.

- [ ] **Step 1: Update imports in `src/app.jsx`**

Replace line 4:

```js
import { isSupported, connect, restore, disconnect, readState, writeState } from './store/sync.js';
```

with:

```js
import { isSupported, connect, restore, disconnect, readState, writeState, readInbox, clearInbox, writeAgentsDoc } from './store/sync.js';
import { applyOps } from './store/inbox.js';
```

- [ ] **Step 2: Extend the mount effect**

Replace the one-shot restore effect (currently lines 40–58) with:

```js
	// one-shot: restore a connected folder, adopt its file if newer, consume agent inbox
	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (isSupported()) {
				const conn = await restore();
				if (!cancelled && conn) {
					setSyncFolder(conn);
					const raw = await readState(conn.handle);
					if (!cancelled && raw) {
						const fileState = migrate(raw);
						setState((local) => fileState.updatedAt > local.updatedAt ? fileState : local);
					}
					writeAgentsDoc(conn.handle); // keep the protocol doc current (fire-and-forget)
					const inbox = await readInbox(conn.handle);
					if (!cancelled) {
						if (inbox) setState((s) => applyOps(s, inbox).state);
						clearInbox(conn.handle); // consumed — or corrupt; either way discard
					}
				}
			}
			if (!cancelled) syncReady.current = true;
		})();
		return () => { cancelled = true; };
	}, []);
```

Ordering notes (why it's written this way):
- Inbox is read **after** the folder-state adoption `setState`, so ops apply on top of whichever state wins.
- Both `setState` calls use the callback form, so they compose even though React batches them.
- `syncReady` still flips only at the end — inbox-applied state is then mirrored back to `tabboard.json` by the existing debounced write effect, which stamps `updatedAt`.

- [ ] **Step 3: Add `writeAgentsDoc` to `onConnectFolder`**

Replace the existing handler (currently lines 145–154) with:

```js
	const onConnectFolder = async () => {
		const conn = await connect();
		if (!conn) return;
		const raw = await readState(conn.handle);
		if (raw) {
			const fileState = migrate(raw);
			setState((local) => fileState.updatedAt > local.updatedAt ? fileState : local);
		}
		writeAgentsDoc(conn.handle); // protocol doc appears immediately on first connect
		setSyncFolder(conn);
	};
```

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all suites, including the untouched smoke/chrome/widget tests.

- [ ] **Step 5: Update README**

In `README.md`, append one bullet to the Features list (after the "Folder sync" bullet, line 14):

```markdown
- **Agent write path** — with folder sync connected, AI agents can push to-dos and notes onto the board by writing ops to `tabboard-inbox.json` in the folder; TabBoard applies them on load and documents the protocol in an `AGENTS.md` it writes there.
```

And in the Roadmap section, delete the line:

```markdown
- AI-agent write path
```

- [ ] **Step 6: Manual verification (Chromium)**

1. `npm run dev`, open the app in Chrome, connect a folder via Settings.
2. Confirm `AGENTS.md` and `tabboard.json` appear in the folder.
3. Create `tabboard-inbox.json` in the folder:
   ```json
   { "ops": [ { "op": "todo.add", "text": "From an agent" }, { "op": "note.append", "text": "Hello board" } ] }
   ```
4. Reload the tab: the to-do item and note text appear in the first todo/scratchpad widgets; `tabboard-inbox.json` is gone; `tabboard.json` contains the new content.

- [ ] **Step 7: Commit**

```bash
git add src/app.jsx README.md
git commit -m "feat: consume agent inbox on load and write AGENTS.md on connect"
```
