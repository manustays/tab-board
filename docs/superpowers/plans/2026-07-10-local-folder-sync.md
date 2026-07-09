# Local-folder JSON sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist dashboard state to `tabboard.json` in a user-chosen local folder — auto-write on change, auto-load on start — for backendless cross-device sync via cloud-synced folders.

**Architecture:** A no-throw persistence adapter (`src/store/sync.js`) wraps the File System Access API and stores the chosen `FileSystemDirectoryHandle` in IndexedDB. `app.jsx` reads the folder file on mount (adopting it when newer by `updatedAt`) and debounce-writes on every state change, in parallel with the untouched localStorage path. Settings-menu UI connects/disconnects the folder. Chromium-only; degrades silently.

**Tech Stack:** Preact, Vite, Vitest, File System Access API, IndexedDB. No new dependencies.

## Global Constraints

- No new dependencies (confirmed policy).
- Tabs for indentation (match existing files).
- localStorage path (`saveState`/`loadState`/`nt_dashboard_v1`) stays functionally unchanged — folder sync is additive.
- `SCHEMA_VERSION` stays `1`; `updatedAt` is additive and absence-tolerant.
- `Date.now()` is used only in `app.jsx`, never in `store.js`/`sync.js` pure paths (keeps them deterministic for tests).
- Folder file name: `tabboard.json` (exported as `FILE_NAME`).
- Every `sync.js` function is a no-throw boundary: return `null`/`false`/`undefined` on failure, never propagate.

---

## File Structure

- **Modify** `src/store/store.js` — `migrate()` defaults `updatedAt`; typedef gains `updatedAt`.
- **Modify** `src/store/store.test.js` — assert `updatedAt` migration behavior.
- **Create** `src/store/sync.js` — FS Access + IndexedDB adapter with a test seam for handle storage.
- **Create** `src/store/sync.test.js` — unit tests using fake handles + in-memory handle storage.
- **Modify** `src/app.jsx` — mount read, debounced folder write, teardown flush, `syncFolder` state + handlers.
- **Modify** `src/chrome/TopBar.jsx` — "Folder sync" settings section + new props.

---

### Task 1: Add `updatedAt` to state schema

**Files:**
- Modify: `src/store/store.js` (typedef ~line 16-24, `migrate()` ~line 36-48)
- Test: `src/store/store.test.js`

**Interfaces:**
- Produces: `State.updatedAt: number` — epoch ms, defaults to `0` via `migrate()`.

- [ ] **Step 1: Write the failing tests**

Add to `src/store/store.test.js` inside the `describe('store', ...)` block:

```js
	it('migrate defaults updatedAt to 0 when absent', () => {
		localStorage.setItem('nt_dashboard_v1', JSON.stringify({ theme:'light', widgets:[] }));
		expect(loadState().updatedAt).toBe(0);
	});
	it('migrate preserves a provided updatedAt', () => {
		localStorage.setItem('nt_dashboard_v1', JSON.stringify({ theme:'light', widgets:[], updatedAt:1234 }));
		expect(loadState().updatedAt).toBe(1234);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/store.test.js`
Expected: FAIL — `updatedAt` is `undefined`, not `0`/`1234`.

- [ ] **Step 3: Implement**

In `src/store/store.js`, add to the `State` typedef (after the `name` property line):

```js
 * @property {number} updatedAt
```

In `migrate()`, add this field to the returned object (after the `name:` line, before `widgets:`):

```js
			updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/store.test.js`
Expected: PASS (all, including pre-existing).

- [ ] **Step 5: Commit**

```bash
git add src/store/store.js src/store/store.test.js
git commit -m "feat: add updatedAt timestamp to state schema"
```

---

### Task 2: Sync adapter — file read/write over a handle

**Files:**
- Create: `src/store/sync.js`
- Test: `src/store/sync.test.js`

**Interfaces:**
- Produces:
  - `FILE_NAME = 'tabboard.json'`
  - `isSupported(): boolean`
  - `readState(dirHandle): Promise<object|null>` — parsed blob, or `null` if missing/empty/corrupt.
  - `writeState(dirHandle, state): Promise<boolean>` — `true` on success, `false` on any error.

This task covers only the folder-file I/O (no IndexedDB yet). Tests pass hand-rolled fake handles.

- [ ] **Step 1: Write the failing tests**

Create `src/store/sync.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { isSupported, readState, writeState, FILE_NAME } from './sync.js';

// Minimal fakes for the File System Access API.
function fakeWritable(sink) {
	return { write: (data) => { sink.data = data; }, close: async () => {} };
}
function fakeFileHandle(store) {
	return {
		createWritable: async () => fakeWritable(store),
		getFile: async () => ({ text: async () => store.data ?? '' }),
	};
}
// throwOnGet simulates a missing file; the real API rejects getFileHandle without {create}.
function fakeDir({ store = {}, throwOnGet = false } = {}) {
	return {
		getFileHandle: async (name, opts) => {
			expect(name).toBe(FILE_NAME);
			if (throwOnGet && !opts?.create) throw new Error('NotFound');
			return fakeFileHandle(store);
		},
	};
}

describe('sync file io', () => {
	it('isSupported reflects showDirectoryPicker presence', () => {
		expect(typeof isSupported()).toBe('boolean');
	});
	it('writeState serializes state to the file', async () => {
		const store = {};
		const ok = await writeState(fakeDir({ store }), { name:'Zed', updatedAt:5 });
		expect(ok).toBe(true);
		expect(JSON.parse(store.data)).toEqual({ name:'Zed', updatedAt:5 });
	});
	it('readState parses a written file', async () => {
		const store = { data: JSON.stringify({ name:'Zed', updatedAt:5 }) };
		expect(await readState(fakeDir({ store }))).toEqual({ name:'Zed', updatedAt:5 });
	});
	it('readState returns null when the file is missing', async () => {
		expect(await readState(fakeDir({ throwOnGet:true }))).toBe(null);
	});
	it('readState returns null on empty or corrupt json', async () => {
		expect(await readState(fakeDir({ store:{ data:'' } }))).toBe(null);
		expect(await readState(fakeDir({ store:{ data:'{ not json' } }))).toBe(null);
	});
	it('writeState returns false when the handle throws', async () => {
		const bad = { getFileHandle: async () => { throw new Error('denied'); } };
		expect(await writeState(bad, { updatedAt:1 })).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/sync.test.js`
Expected: FAIL — `./sync.js` does not exist.

- [ ] **Step 3: Implement `src/store/sync.js` (file I/O portion)**

Create `src/store/sync.js`:

```js
/**
 * Folder-sync adapter over the File System Access API.
 * Every function is a no-throw boundary: failures return null/false, never throw.
 */

export const FILE_NAME = 'tabboard.json';

/** @returns {boolean} true when the browser supports directory pickers. */
export function isSupported() {
	return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/**
 * Read and parse tabboard.json from a directory handle.
 * @param {any} dirHandle
 * @returns {Promise<object|null>} parsed blob, or null if missing/empty/corrupt.
 */
export async function readState(dirHandle) {
	try {
		const fileHandle = await dirHandle.getFileHandle(FILE_NAME);
		const file = await fileHandle.getFile();
		const text = await file.text();
		if (!text) return null;
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
}

/**
 * Write state as tabboard.json into a directory handle.
 * @param {any} dirHandle
 * @param {object} state
 * @returns {Promise<boolean>} true on success.
 */
export async function writeState(dirHandle, state) {
	try {
		const fileHandle = await dirHandle.getFileHandle(FILE_NAME, { create:true });
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(state));
		await writable.close();
		return true;
	} catch (e) {
		return false;
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/sync.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/sync.js src/store/sync.test.js
git commit -m "feat: sync adapter file read/write over directory handle"
```

---

### Task 3: Sync adapter — connect/restore/disconnect via IndexedDB

**Files:**
- Modify: `src/store/sync.js`
- Test: `src/store/sync.test.js`

**Interfaces:**
- Produces:
  - `connect(): Promise<{handle, name}|null>`
  - `restore(): Promise<{handle, name}|null>`
  - `disconnect(): Promise<void>`
  - `__setHandleStorage(impl|null)` — test seam. `impl` = `{ get(): Promise<any>, set(v): Promise<void>, del(): Promise<void> }`. Passing `null` restores the default IndexedDB-backed storage.

**Rationale for the seam:** jsdom provides no IndexedDB. Rather than add `fake-indexeddb`, handle persistence goes through a swappable `handleStorage` object; tests inject an in-memory implementation. The default implementation is the real IndexedDB wrapper.

- [ ] **Step 1: Write the failing tests**

Append to `src/store/sync.test.js`:

```js
import { connect, restore, disconnect, __setHandleStorage } from './sync.js';

function memStorage() {
	let value = null;
	return {
		get: async () => value,
		set: async (v) => { value = v; },
		del: async () => { value = null; },
	};
}

describe('sync connect/restore/disconnect', () => {
	it('connect persists the handle and returns name', async () => {
		__setHandleStorage(memStorage());
		const handle = { name:'MyFolder', queryPermission: async () => 'granted' };
		globalThis.window = globalThis.window || {};
		window.showDirectoryPicker = async () => handle;
		const conn = await connect();
		expect(conn).toEqual({ handle, name:'MyFolder' });
		__setHandleStorage(null);
	});
	it('connect returns null when the user cancels', async () => {
		__setHandleStorage(memStorage());
		window.showDirectoryPicker = async () => { throw new Error('AbortError'); };
		expect(await connect()).toBe(null);
		__setHandleStorage(null);
	});
	it('restore returns the handle when permission is granted', async () => {
		const store = memStorage();
		__setHandleStorage(store);
		const handle = { name:'MyFolder', queryPermission: async () => 'granted' };
		await store.set(handle);
		expect(await restore()).toEqual({ handle, name:'MyFolder' });
		__setHandleStorage(null);
	});
	it('restore requests permission when prompt, returns null if not granted', async () => {
		const store = memStorage();
		__setHandleStorage(store);
		const handle = { name:'F', queryPermission: async () => 'prompt', requestPermission: async () => 'denied' };
		await store.set(handle);
		expect(await restore()).toBe(null);
		__setHandleStorage(null);
	});
	it('restore returns null when nothing is stored', async () => {
		__setHandleStorage(memStorage());
		expect(await restore()).toBe(null);
		__setHandleStorage(null);
	});
	it('disconnect clears the stored handle', async () => {
		const store = memStorage();
		__setHandleStorage(store);
		await store.set({ name:'F', queryPermission: async () => 'granted' });
		await disconnect();
		expect(await restore()).toBe(null);
		__setHandleStorage(null);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/sync.test.js`
Expected: FAIL — `connect`/`restore`/`disconnect`/`__setHandleStorage` are not exported.

- [ ] **Step 3: Implement — append to `src/store/sync.js`**

```js
const IDB_NAME = 'tabboard-sync';
const IDB_STORE = 'handles';
const IDB_KEY = 'dir';

/** Promisified single-key IndexedDB storage for the directory handle. */
const idbStorage = {
	_open() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(IDB_NAME, 1);
			req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	},
	async _tx(mode, fn) {
		const db = await this._open();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(IDB_STORE, mode);
			const req = fn(tx.objectStore(IDB_STORE));
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	},
	get() { return this._tx('readonly', (s) => s.get(IDB_KEY)); },
	set(v) { return this._tx('readwrite', (s) => s.put(v, IDB_KEY)); },
	del() { return this._tx('readwrite', (s) => s.delete(IDB_KEY)); },
};

let handleStorage = idbStorage;

/**
 * Swap the handle-storage backend (test seam). Pass null to reset to IndexedDB.
 * @param {{get:()=>Promise<any>,set:(v:any)=>Promise<void>,del:()=>Promise<void>}|null} impl
 */
export function __setHandleStorage(impl) {
	handleStorage = impl || idbStorage;
}

/** Ensure readwrite permission on a handle, prompting if needed. */
async function ensurePermission(handle) {
	const opts = { mode:'readwrite' };
	if (await handle.queryPermission(opts) === 'granted') return true;
	return (await handle.requestPermission(opts)) === 'granted';
}

/**
 * Prompt for a folder, persist its handle, return it.
 * @returns {Promise<{handle:any,name:string}|null>} null if cancelled/unsupported.
 */
export async function connect() {
	if (!isSupported()) return null;
	try {
		const handle = await window.showDirectoryPicker({ mode:'readwrite' });
		await handleStorage.set(handle);
		return { handle, name:handle.name };
	} catch (e) {
		return null;
	}
}

/**
 * Reload a previously-connected folder handle if permission is still granted.
 * @returns {Promise<{handle:any,name:string}|null>}
 */
export async function restore() {
	try {
		const handle = await handleStorage.get();
		if (!handle) return null;
		if (!(await ensurePermission(handle))) return null;
		return { handle, name:handle.name };
	} catch (e) {
		return null;
	}
}

/** Forget the stored folder handle. @returns {Promise<void>} */
export async function disconnect() {
	try { await handleStorage.del(); } catch (e) { /* ignore */ }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/sync.test.js`
Expected: PASS (all file-io + connect/restore/disconnect tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/sync.js src/store/sync.test.js
git commit -m "feat: sync adapter connect/restore/disconnect via IndexedDB"
```

---

### Task 4: Wire folder sync into the app

**Files:**
- Modify: `src/app.jsx`
- Test: manual (see Step 5) — App orchestration over real browser APIs; unit-covered by Tasks 1-3.

**Interfaces:**
- Consumes: `isSupported`, `connect`, `restore`, `disconnect`, `readState`, `writeState` from `./store/sync.js`; `migrate`-equivalent via `loadState`. Note: `migrate` is not currently exported from `store.js` — export it (see Step 1).
- Produces: `syncFolder` state (`{handle,name}|null`), `onConnectFolder`/`onDisconnectFolder` handlers passed to `TopBar` (consumed in Task 5).

- [ ] **Step 1: Export `migrate` from `store.js`**

In `src/store/store.js`, change the `migrate` declaration to a named export so the app can normalize a raw file blob:

```js
export function migrate(raw) {
```

(The function body is unchanged; `loadState` still calls it locally.)

- [ ] **Step 2: Add sync imports and state in `app.jsx`**

At the top of `src/app.jsx`, extend the store import and add the sync import:

```js
import { loadState, saveState, migrate } from './store/store.js';
import { isSupported, connect, restore, disconnect, readState, writeState } from './store/sync.js';
```

Inside `App()`, after the existing `useState`/`useRef` declarations, add:

```js
	const [syncFolder, setSyncFolder] = useState(/** @type {{handle:any,name:string}|null} */(null));
	const syncTimer = useRef(/** @type {any} */(null));
	const syncReady = useRef(false); // gate writes until the mount read resolves
```

- [ ] **Step 3: Add the mount-read effect**

Add this effect in `App()` (after the existing persist effect at line ~34):

```js
	// one-shot: restore a connected folder and adopt its file if newer
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
				}
			}
			if (!cancelled) syncReady.current = true;
		})();
		return () => { cancelled = true; };
	}, []);
```

- [ ] **Step 4: Add the debounced folder-write effect**

Add this effect after the mount-read effect:

```js
	// mirror state to the connected folder file (debounced), stamping updatedAt
	useEffect(() => {
		if (!syncFolder || !syncReady.current) return;
		clearTimeout(syncTimer.current);
		syncTimer.current = setTimeout(() => {
			writeState(syncFolder.handle, { ...state, updatedAt: Date.now() });
		}, 250);
		return () => clearTimeout(syncTimer.current);
	}, [state, syncFolder]);
```

- [ ] **Step 5: Flush the folder write on teardown**

Replace the existing teardown effect (lines ~43-52) so it also flushes a pending folder write:

```js
	// flush a pending debounced save before the tab is hidden/closed
	useEffect(() => {
		const flush = () => {
			saveState.flush();
			if (syncFolder && syncReady.current) {
				clearTimeout(syncTimer.current);
				writeState(syncFolder.handle, { ...state, updatedAt: Date.now() });
			}
		};
		const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
		window.addEventListener('pagehide', flush);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			window.removeEventListener('pagehide', flush);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [syncFolder, state]);
```

- [ ] **Step 6: Add connect/disconnect handlers**

In `App()`, before the `return`, add:

```js
	const onConnectFolder = async () => {
		const conn = await connect();
		if (!conn) return;
		setSyncFolder(conn);
		const raw = await readState(conn.handle);
		if (raw) {
			const fileState = migrate(raw);
			setState((local) => fileState.updatedAt > local.updatedAt ? fileState : local);
		}
	};
	const onDisconnectFolder = async () => { await disconnect(); setSyncFolder(null); };
```

- [ ] **Step 7: Pass props to `TopBar`**

In the `h(TopBar, { ... })` call, add these props (Task 5 consumes them):

```js
						syncSupported: isSupported(), syncFolder, onConnectFolder, onDisconnectFolder,
```

- [ ] **Step 8: Verify the suite still passes and the app builds**

Run: `npx vitest run`
Expected: PASS (37 existing + new sync/store tests).

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 9: Commit**

```bash
git add src/store/store.js src/app.jsx
git commit -m "feat: wire folder sync read-on-load and write-on-change into app"
```

---

### Task 5: Folder-sync UI in the settings menu

**Files:**
- Modify: `src/chrome/TopBar.jsx`
- Test: `src/chrome/chrome.test.jsx`

**Interfaces:**
- Consumes: `syncSupported: boolean`, `syncFolder: {name}|null`, `onConnectFolder: ()=>void`, `onDisconnectFolder: ()=>void` (from Task 4).

- [ ] **Step 1: Write the failing test**

Look at `src/chrome/chrome.test.jsx` first to match its render/query helpers. Then add a test that opens settings and asserts the sync section. Append inside its existing `describe`:

```jsx
	it('settings shows Connect folder when supported and disconnected', async () => {
		const onConnectFolder = vi.fn();
		const { getByTitle, getByText } = render(h(TopBar, {
			pg: pagePalette('light'), editing:false, theme:'light', width:'fixed', accent:'#c96442',
			onToggleEdit(){}, onToggleTheme(){}, onSetWidth(){}, onSetAccent(){}, onAdd(){},
			menus:'settings', onOpenMenu(){},
			syncSupported:true, syncFolder:null, onConnectFolder, onDisconnectFolder(){},
		}));
		getByText('Connect folder').click();
		expect(onConnectFolder).toHaveBeenCalled();
	});
	it('settings shows folder name and Disconnect when connected', () => {
		const { getByText } = render(h(TopBar, {
			pg: pagePalette('light'), editing:false, theme:'light', width:'fixed', accent:'#c96442',
			onToggleEdit(){}, onToggleTheme(){}, onSetWidth(){}, onSetAccent(){}, onAdd(){},
			menus:'settings', onOpenMenu(){},
			syncSupported:true, syncFolder:{ name:'MyFolder' }, onConnectFolder(){}, onDisconnectFolder(){},
		}));
		expect(getByText('MyFolder')).toBeTruthy();
		expect(getByText('Disconnect')).toBeTruthy();
	});
```

Ensure the test file imports `pagePalette` (`import { pagePalette } from '../theme/palettes.js';`) and `vi` (`from 'vitest'`) — add if absent.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/chrome/chrome.test.jsx`
Expected: FAIL — no "Connect folder"/"Disconnect" text rendered.

- [ ] **Step 3: Implement the sync section**

In `src/chrome/TopBar.jsx`, destructure the new props at the top of `TopBar` (add to the existing `const { ... } = props;` line):

```js
	const { pg, editing, theme, width, accent, onToggleEdit, onToggleTheme, onSetWidth, onSetAccent, onAdd, menus, onOpenMenu, syncSupported, syncFolder, onConnectFolder, onDisconnectFolder } = props;
```

In `settingsMenu()`, append a sync block as the last child of the menu `div` (after the Accent row):

```js
			, label('Folder sync', pg)
			, !syncSupported
				? h('div', { style:{ font:"400 12px 'Instrument Sans'", color:pg.mut } }, 'Needs a Chromium browser.')
				: syncFolder
					? h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 } },
						h('span', { style:{ font:"400 12px 'Instrument Sans'", color:pg.fg, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, syncFolder.name),
						h('button', { onClick:onDisconnectFolder, style:choice(pg, accent, false) }, 'Disconnect'))
					: h('button', { onClick:onConnectFolder, style:choice(pg, accent, false) }, 'Connect folder')
```

Note: the Accent row currently ends the `settingsMenu` return; add a `marginTop:16` wrapper only if spacing looks tight — the `label` helper already has `marginBottom:9`. Insert a spacer by giving the `label('Folder sync', ...)` a wrapping div with `style:{ marginTop:16 }` if needed:

```js
			, h('div', { style:{ marginTop:16 } }, label('Folder sync', pg))
```

(Use this wrapped form in place of the bare `label('Folder sync', pg)` above.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/chrome/chrome.test.jsx`
Expected: PASS.

- [ ] **Step 5: Full suite + build**

Run: `npx vitest run`
Expected: PASS (all).

Run: `npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/chrome/TopBar.jsx src/chrome/chrome.test.jsx
git commit -m "feat: folder-sync controls in settings menu"
```

---

### Task 6: Update docs

**Files:**
- Modify: `README.md` (Roadmap section ~line with "Local-folder JSON sync")

- [ ] **Step 1: Move the shipped item out of Roadmap**

In `README.md`, remove `- Local-folder JSON sync` from the Roadmap list and add a bullet under Features:

```md
- **Folder sync** — optionally connect a local folder (Chromium browsers); TabBoard mirrors its state to `tabboard.json` there and reloads from it on start. Point it at a cloud-synced folder for backendless cross-device sync.
```

Update the Privacy section's "only optional network request" wording only if needed — folder sync is local, no network, so no change required there.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document folder sync feature"
```

---

## Self-Review

- **Spec coverage:** data model (`updatedAt`) → Task 1; `sync.js` interface → Tasks 2-3; app wiring (mount read, write-on-change, teardown flush, ready gate) → Task 4; settings UI + unsupported/connected/disconnected states → Task 5; tests → Tasks 1-3, 5; README → Task 6. All spec sections covered.
- **Placeholder scan:** all code steps contain real code; no TBD/TODO. The one conditional ("add spacer if tight") gives the exact concrete form to use.
- **Type consistency:** `readState`/`writeState`/`connect`/`restore`/`disconnect`/`isSupported`/`__setHandleStorage`/`FILE_NAME` names identical across Tasks 2-5; `syncFolder` shape `{handle,name}` consistent app↔TopBar (`name` used in UI). `migrate` exported in Task 4 before first app use.
- **Ordering:** `syncReady` gate ensures the write effect never fires before the mount read adopts a newer file — matches the spec's ordering note.
