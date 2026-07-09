# New-Tab Dashboard — Core (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fully-offline, installable new-tab dashboard: a 12-column widget-board (bookmarks, single bookmark, date/time, spacer, divider) with edit/drag/resize, theming, and localStorage persistence — visually matching the approved design.

**Architecture:** Preact renders widget *content*; gridstack owns widget *geometry* (position/size). State (widget data + geometry + theme) lives in one localStorage blob behind a `store` seam. Pure modules (store, theme, registry, serialize) are unit-tested; DOM-heavy gridstack/SW wiring is manually verified against a checklist.

**Tech Stack:** Preact, Vite, gridstack.js, Vitest + @testing-library/preact + jsdom, vite-plugin-pwa. JS with JSDoc type annotations.

## Global Constraints

- **Fully offline:** no network request on load or interaction. Only exception: the opt-in per-widget `favicon` icon mode. Fonts self-hosted; app shell cached by service worker.
- **Fonts self-hosted** as woff2 in `public/fonts/`: Newsreader, Instrument Sans, Spline Sans Mono. No Google Fonts CDN.
- **Persistence:** single localStorage key `nt_dashboard_v1`, JSON blob, read synchronously on load, written debounced on change. All access via `src/store/store.js`. Blob carries a `version` field for migration.
- **Visual source of truth:** the approved prototype (design project `8bc5aa1b-...`, file `Newtab Dashboard.dc.html`). Palettes, fonts, spacing, and widget looks are ported from it verbatim.
- **v1 widgets only:** bookmarks, single, datetime, divider, spacer. To-do / scratchpad / snippets are Phase B — do NOT build.
- **Code style:** tabs for indentation; JSDoc on every exported function; favor functional/pure modules.
- **Accent default** `#c96442`. **Page bg** light `#ebe4d6`, dark `#151109`.
- **Commits:** conventional commits, no `Co-Authored-By` trailer.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/smoke.test.js`, `jsconfig.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a running Vite dev server mounting `#app`; `npm test` runs Vitest in jsdom.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "newtab-dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "preact": "^10.24.0",
    "gridstack": "^11.1.2"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@preact/preset-vite": "^2.9.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0",
    "@testing-library/preact": "^3.2.4",
    "@testing-library/jest-dom": "^6.5.0"
  }
}
```

- [ ] **Step 2: Install deps**

Run: `npm install`
Expected: `node_modules/` populated, no errors. (These deps are the approved stack: Preact+Vite+gridstack + test tooling.)

- [ ] **Step 3: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
	base: './',
	plugins: [preact()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test-setup.js'],
	},
});
```

- [ ] **Step 4: Create `src/test-setup.js`**

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Create `jsconfig.json`** (enables JSDoc type checking in editors)

```json
{
	"compilerOptions": {
		"checkJs": true,
		"module": "esnext",
		"target": "esnext",
		"jsx": "react-jsx",
		"jsxImportSource": "preact",
		"strict": true
	},
	"include": ["src"]
}
```

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>New Tab</title>
	</head>
	<body>
		<div id="app"></div>
		<script type="module" src="/src/main.jsx"></script>
	</body>
</html>
```

- [ ] **Step 7: Create `src/main.jsx`**

```jsx
import { render, h } from 'preact';

function Boot() {
	return h('div', null, 'New Tab loading…');
}

render(h(Boot, null), document.getElementById('app'));
```

- [ ] **Step 8: Write smoke test `src/smoke.test.js`**

```js
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
	it('runs', () => {
		expect(1 + 1).toBe(2);
	});
});
```

- [ ] **Step 9: Run test**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 10: Verify dev server**

Run: `npm run dev`, open the shown URL.
Expected: page shows "New Tab loading…". Stop the server.

- [ ] **Step 11: Commit**

```bash
git add package.json vite.config.js jsconfig.json index.html src/ package-lock.json
git commit -m "chore: scaffold Preact + Vite + Vitest project"
```

---

### Task 2: Theme module (palettes + contrast)

**Files:**
- Create: `src/theme/palettes.js`, `src/theme/contrast.js`, `src/theme/contrast.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `TINTS` — object keyed by tint id; each `{ name, L:{bg,fg,mut,line,tile,tfg,field}, D:{…} }`.
  - `TINT_KEYS: string[]`, `ACCENTS: string[]`.
  - `pagePalette(theme: 'light'|'dark'): {bg,fg,mut,line,head}`.
  - `tintPalette(tintId: string, theme: 'light'|'dark'): {bg,fg,mut,line,tile,tfg,field}`.
  - `foregroundFor(hexBg: string): '#ffffff' | '#111111'` (contrast pick for custom colors).

- [ ] **Step 1: Write failing test `src/theme/contrast.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { foregroundFor } from './contrast.js';

describe('foregroundFor', () => {
	it('returns dark text on light backgrounds', () => {
		expect(foregroundFor('#ffffff')).toBe('#111111');
		expect(foregroundFor('#ebe4d6')).toBe('#111111');
	});
	it('returns light text on dark backgrounds', () => {
		expect(foregroundFor('#000000')).toBe('#ffffff');
		expect(foregroundFor('#151109')).toBe('#ffffff');
	});
	it('handles 3-digit hex', () => {
		expect(foregroundFor('#fff')).toBe('#111111');
		expect(foregroundFor('#000')).toBe('#ffffff');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- contrast`
Expected: FAIL (`foregroundFor` not defined / module missing).

- [ ] **Step 3: Implement `src/theme/contrast.js`**

```js
/**
 * Parse a hex color (#rgb or #rrggbb) into [r,g,b] 0–255.
 * @param {string} hex
 * @returns {[number, number, number]}
 */
function parseHex(hex) {
	let h = hex.replace('#', '').trim();
	if (h.length === 3) h = h.split('').map((c) => c + c).join('');
	const n = parseInt(h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Relative luminance per WCAG 2.1.
 * @param {string} hex
 * @returns {number} 0–1
 */
export function luminance(hex) {
	const [r, g, b] = parseHex(hex).map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pick a readable foreground for an arbitrary background color.
 * @param {string} hexBg
 * @returns {'#ffffff' | '#111111'}
 */
export function foregroundFor(hexBg) {
	return luminance(hexBg) > 0.45 ? '#111111' : '#ffffff';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- contrast`
Expected: PASS.

- [ ] **Step 5: Create `src/theme/palettes.js`** (ported verbatim from the design's `TINTS`/`ACCENTS`, plus page palette + accessors)

```js
/** @typedef {{bg:string,fg:string,mut:string,line:string,tile:string,tfg:string,field:string}} TintSide */

/** @type {Record<string,{name:string,L:TintSide,D:TintSide}>} */
export const TINTS = {
	paper:    { name:'Paper',    L:{bg:'#f4efe4',fg:'#2a2622',mut:'#a89e8c',line:'rgba(0,0,0,.08)',tile:'#e7dfd0',tfg:'#514a3f',field:'#ebe4d6'}, D:{bg:'#1e1a13',fg:'#ece4d5',mut:'#8a8070',line:'rgba(255,255,255,.08)',tile:'#2c271e',tfg:'#cdc3b0',field:'#171410'} },
	sage:     { name:'Sage',     L:{bg:'#e6ede6',fg:'#33433a',mut:'#7e947f',line:'rgba(40,70,50,.10)',tile:'#d6e0d6',tfg:'#3d5244',field:'#dce6dc'}, D:{bg:'#1b2620',fg:'#d3e2d6',mut:'#7fa08c',line:'rgba(180,220,190,.10)',tile:'#26332b',tfg:'#a9c4b0',field:'#14201a'} },
	clay:     { name:'Clay',     L:{bg:'#f0e7dd',fg:'#4a3b30',mut:'#a3866a',line:'rgba(90,60,40,.10)',tile:'#e6d6c5',tfg:'#5c4636',field:'#e9ddce'}, D:{bg:'#251d15',fg:'#e9d7c4',mut:'#b8977a',line:'rgba(220,190,160,.10)',tile:'#332821',tfg:'#c8a986',field:'#1d160f'} },
	sky:      { name:'Sky',      L:{bg:'#e4ecef',fg:'#2c3a44',mut:'#708996',line:'rgba(40,60,70,.10)',tile:'#d3e0e5',tfg:'#3a4c56',field:'#d8e4e8'}, D:{bg:'#172227',fg:'#d6e2e8',mut:'#7f929e',line:'rgba(170,200,215,.10)',tile:'#213038',tfg:'#a6c0cc',field:'#111b20'} },
	lavender: { name:'Lavender', L:{bg:'#eae7f0',fg:'#3f3a48',mut:'#8f84a8',line:'rgba(60,50,80,.10)',tile:'#ddd8e8',tfg:'#4e475e',field:'#e2ddee'}, D:{bg:'#211d29',fg:'#ddd6e8',mut:'#9a8ec4',line:'rgba(200,190,225,.10)',tile:'#2c2739',tfg:'#bcb0d6',field:'#191622'} },
	rose:     { name:'Rose',     L:{bg:'#f2e6e6',fg:'#4a3636',mut:'#ab8484',line:'rgba(90,50,50,.10)',tile:'#e8d4d4',tfg:'#5c4444',field:'#ecdcdc'}, D:{bg:'#261a1a',fg:'#e9d0d0',mut:'#b88a8a',line:'rgba(225,185,185,.10)',tile:'#342424',tfg:'#c89e9e',field:'#1e1313'} },
	sand:     { name:'Sand',     L:{bg:'#f0ebde',fg:'#47412f',mut:'#a2966e',line:'rgba(80,70,40,.10)',tile:'#e6dfca',tfg:'#585030',field:'#e9e2d0'}, D:{bg:'#221f16',fg:'#e6ddc4',mut:'#a8996f',line:'rgba(215,205,165,.10)',tile:'#302c20',tfg:'#c6ba90',field:'#1a180f'} },
};

export const TINT_KEYS = Object.keys(TINTS);
export const ACCENTS = ['#c96442', '#3a7d6e', '#4a6fa5', '#8a7d5a', '#9a6a86'];

/**
 * Page-level palette (app background / header), independent of widget tints.
 * @param {'light'|'dark'} theme
 */
export function pagePalette(theme) {
	return theme === 'dark'
		? { bg:'#151109', fg:'#ece4d5', mut:'#8a8070', line:'rgba(255,255,255,.07)', head:'#7d7361' }
		: { bg:'#ebe4d6', fg:'#2a2622', mut:'#8f8574', line:'rgba(0,0,0,.08)', head:'#a89e8c' };
}

/**
 * Resolve a widget tint for the active theme.
 * @param {string} tintId
 * @param {'light'|'dark'} theme
 * @returns {TintSide}
 */
export function tintPalette(tintId, theme) {
	const t = TINTS[tintId] || TINTS.paper;
	return theme === 'dark' ? t.D : t.L;
}
```

- [ ] **Step 6: Add a palette test to `src/theme/contrast.test.js`** (co-locate; keeps one theme test file)

```js
import { TINTS, TINT_KEYS, tintPalette, pagePalette } from './palettes.js';

describe('palettes', () => {
	it('every tint has light and dark sides with all keys', () => {
		const keys = ['bg','fg','mut','line','tile','tfg','field'];
		for (const id of TINT_KEYS) {
			for (const side of ['L','D']) {
				for (const k of keys) expect(TINTS[id][side][k]).toBeTruthy();
			}
		}
	});
	it('tintPalette falls back to paper for unknown id', () => {
		expect(tintPalette('nope', 'light')).toEqual(TINTS.paper.L);
	});
	it('pagePalette differs by theme', () => {
		expect(pagePalette('light').bg).not.toBe(pagePalette('dark').bg);
	});
});
```

- [ ] **Step 7: Run tests**

Run: `npm test -- contrast`
Expected: PASS (contrast + palettes).

- [ ] **Step 8: Commit**

```bash
git add src/theme/
git commit -m "feat: theme palettes and custom-color contrast"
```

---

### Task 3: Store module (persistence + defaults)

**Files:**
- Create: `src/store/defaults.js`, `src/store/store.js`, `src/store/store.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `defaultState(): State` — v1-only default board.
  - `loadState(): State` — read blob, merge over defaults, run migration.
  - `saveState(state: State): void` — debounced write.
  - `uid(): string`.
  - Types: `State = { version, theme, width, accent, name, widgets: Widget[] }`.

- [ ] **Step 1: Write failing test `src/store/store.test.js`**

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadState, saveState, defaultState, uid } from './store.js';

beforeEach(() => localStorage.clear());

describe('store', () => {
	it('uid returns unique-ish short ids', () => {
		expect(uid()).not.toBe(uid());
	});
	it('defaultState uses only v1 widget types', () => {
		const allowed = new Set(['bookmarks','single','datetime','divider','spacer']);
		for (const w of defaultState().widgets) expect(allowed.has(w.type)).toBe(true);
	});
	it('loadState returns defaults when storage empty', () => {
		expect(loadState().widgets.length).toBeGreaterThan(0);
	});
	it('saveState then loadState round-trips edited fields', () => {
		const s = defaultState();
		s.theme = 'dark';
		s.name = 'Zed';
		saveState(s);
		vi.runAllTimers?.();
		// flush debounce synchronously for the test:
		saveState.flush();
		const back = loadState();
		expect(back.theme).toBe('dark');
		expect(back.name).toBe('Zed');
	});
	it('migrates a versionless blob without throwing', () => {
		localStorage.setItem('nt_dashboard_v1', JSON.stringify({ theme:'dark', widgets:[] }));
		const s = loadState();
		expect(s.version).toBeGreaterThanOrEqual(1);
		expect(s.theme).toBe('dark');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- store`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/store/defaults.js`**

```js
/**
 * Short random id.
 * @returns {string}
 */
export function uid() {
	return Math.random().toString(36).slice(2, 9);
}

/**
 * v1 default board — calm first-run layout using only v1 widget types.
 * Geometry (x,y,w,h) is in 12-col gridstack units.
 * @returns {import('./store.js').State}
 */
export function defaultState() {
	return {
		version: 1,
		theme: 'light',
		width: 'fixed',
		accent: '#c96442',
		name: 'there',
		widgets: [
			{ id: uid(), type:'datetime', title:'', tint:'paper', x:0, y:0, w:3, h:2 },
			{ id: uid(), type:'bookmarks', title:'Daily', layout:'grid', icon:'mono', tint:'paper', x:3, y:0, w:5, h:3, items:[
				{ id:uid(), label:'Gmail',    url:'https://mail.google.com',     color:'#d9536a', ini:'G' },
				{ id:uid(), label:'Calendar', url:'https://calendar.google.com', color:'#4b7bc4', ini:'C' },
				{ id:uid(), label:'Notion',   url:'https://notion.so',           color:'#3f8f7a', ini:'N' },
				{ id:uid(), label:'Reddit',   url:'https://reddit.com',          color:'#d97840', ini:'R' },
				{ id:uid(), label:'Figma',    url:'https://figma.com',           color:'#8964c9', ini:'F' },
			]},
			{ id: uid(), type:'bookmarks', title:'Dev', layout:'list', icon:'mono', tint:'paper', x:8, y:0, w:4, h:3, items:[
				{ id:uid(), label:'GitHub',         url:'https://github.com',                color:'#4a4a4a', ini:'GH' },
				{ id:uid(), label:'Stack Overflow', url:'https://stackoverflow.com',         color:'#e08a3c', ini:'SO' },
				{ id:uid(), label:'MDN Docs',       url:'https://developer.mozilla.org',     color:'#4b7bc4', ini:'MDN' },
			]},
			{ id: uid(), type:'single', title:"Today's Focus", tint:'sky', x:0, y:2, w:3, h:2,
				item:{ label:"Today's Focus", url:'https://notion.so', color:'#4b7bc4', ini:'▸', sub:'Pinned bookmark' } },
		],
	};
}
```

- [ ] **Step 4: Implement `src/store/store.js`**

```js
import { defaultState, uid } from './defaults.js';

/**
 * @typedef {object} Widget
 * @property {string} id
 * @property {'bookmarks'|'single'|'datetime'|'divider'|'spacer'} type
 * @property {string} [title]
 * @property {string} [tint]
 * @property {number} x @property {number} y @property {number} w @property {number} h
 * @property {'grid'|'list'} [layout]
 * @property {'mono'|'color'|'dot'|'favicon'} [icon]
 * @property {Array<object>} [items]
 * @property {object} [item]
 */

/**
 * @typedef {object} State
 * @property {number} version
 * @property {'light'|'dark'} theme
 * @property {'fixed'|'full'} width
 * @property {string} accent
 * @property {string} name
 * @property {Widget[]} widgets
 */

const LS_KEY = 'nt_dashboard_v1';
const SCHEMA_VERSION = 1;

export { uid, defaultState };

/**
 * Migrate an arbitrary parsed blob up to the current schema.
 * @param {any} raw
 * @returns {State}
 */
function migrate(raw) {
	const base = defaultState();
	if (!raw || typeof raw !== 'object') return base;
	// v0 (versionless) -> v1: keep known fields, default the rest.
	return {
		version: SCHEMA_VERSION,
		theme: raw.theme === 'dark' ? 'dark' : 'light',
		width: raw.width === 'full' ? 'full' : 'fixed',
		accent: typeof raw.accent === 'string' ? raw.accent : base.accent,
		name: typeof raw.name === 'string' ? raw.name : base.name,
		widgets: Array.isArray(raw.widgets) && raw.widgets.length ? raw.widgets : base.widgets,
	};
}

/**
 * Load persisted state, or defaults when absent/corrupt.
 * @returns {State}
 */
export function loadState() {
	try {
		const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
		return raw ? migrate(raw) : defaultState();
	} catch (e) {
		return defaultState();
	}
}

let _timer = null;
let _pending = null;

/**
 * Persist state (debounced ~250ms). Call `saveState.flush()` to write immediately.
 * @param {State} state
 */
export function saveState(state) {
	_pending = state;
	clearTimeout(_timer);
	_timer = setTimeout(() => saveState.flush(), 250);
}
saveState.flush = function flush() {
	clearTimeout(_timer);
	if (_pending == null) return;
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(_pending));
	} catch (e) { /* quota / private mode: ignore */ }
	_pending = null;
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- store`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/
git commit -m "feat: localStorage store with defaults and migration"
```

---

### Task 4: Icon renderer

**Files:**
- Create: `src/widgets/icon.jsx`, `src/widgets/icon.test.jsx`

**Interfaces:**
- Consumes: `tintPalette` result (`p`) passed by caller.
- Produces: `Icon({ item, size, mode, p })` — Preact component. `mode` ∈ `mono|color|dot|favicon`. `item` = `{ini, color, url}`.

- [ ] **Step 1: Write failing test `src/widgets/icon.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { h } from 'preact';
import { Icon } from './icon.jsx';

const p = { tile:'#eee', tfg:'#333' };

describe('Icon', () => {
	it('mono mode shows the initials', () => {
		const { getByText } = render(h(Icon, { item:{ ini:'GH', color:'#000', url:'https://x' }, size:26, mode:'mono', p }));
		expect(getByText('GH')).toBeInTheDocument();
	});
	it('favicon mode renders an img to the site domain', () => {
		const { container } = render(h(Icon, { item:{ ini:'G', color:'#000', url:'https://github.com' }, size:40, mode:'favicon', p }));
		const img = container.querySelector('img');
		expect(img).toBeTruthy();
		expect(img.getAttribute('src')).toContain('github.com');
	});
	it('dot mode renders no text', () => {
		const { container } = render(h(Icon, { item:{ ini:'X', color:'#f00', url:'' }, size:9, mode:'dot', p }));
		expect(container.textContent).toBe('');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- icon`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/widgets/icon.jsx`** (ported from the design's `icon()`)

```jsx
import { h } from 'preact';

/**
 * Bookmark icon. Four modes: mono (offline default), color, dot, favicon (remote, opt-in).
 * @param {{item:{ini:string,color:string,url:string}, size:number, mode:string, p:{tile:string,tfg:string}}} props
 */
export function Icon({ item, size, mode, p }) {
	const r = size >= 44 ? 15 : size >= 30 ? 10 : 8;
	const fontPx = size >= 44 ? 17 : size >= 30 ? 12 : 10;

	if (mode === 'dot') {
		return h('span', { style:{ width:9, height:9, borderRadius:'50%', background:item.color, flex:'none', display:'inline-block' } });
	}
	if (mode === 'favicon') {
		let dom = '';
		try { dom = new URL(item.url).hostname; } catch (e) { /* invalid url */ }
		return h('div', { style:{ width:size, height:size, borderRadius:r, position:'relative', flex:'none', overflow:'hidden', background:p.tile } },
			h('div', { style:{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:p.tfg, font:`600 ${fontPx}px 'Instrument Sans'` } }, item.ini),
			dom ? h('img', {
				src:`https://icons.duckduckgo.com/ip3/${dom}.ico`,
				referrerpolicy:'no-referrer',
				onError:(e) => e.currentTarget.remove(),
				style:{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' },
			}) : null
		);
	}
	const bg = mode === 'color' ? item.color : p.tile;
	const fg = mode === 'color' ? '#fff' : p.tfg;
	return h('div', { style:{ width:size, height:size, borderRadius:r, background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', font:`600 ${fontPx}px 'Instrument Sans'`, flex:'none' } }, item.ini);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- icon`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/icon.jsx src/widgets/icon.test.jsx
git commit -m "feat: bookmark icon renderer (mono/color/dot/favicon)"
```

---

### Task 5: Widget card shell + edit chrome

**Files:**
- Create: `src/widgets/Card.jsx`, `src/widgets/Card.test.jsx`

**Interfaces:**
- Consumes: `tintPalette`, `TINTS`, `TINT_KEYS`, `foregroundFor`.
- Produces:
  - `Card({ w, p, editing, accent, theme, children, onPatch, onRemove, menuOpen, onToggleMenu, extraMenu })` — the tinted card shell + title row + (in edit mode) control bar and background/delete menu. `onPatch(partial)` merges into the widget; `onRemove()` deletes it. `extraMenu` lets a widget inject type-specific menu rows (e.g. icon mode).
  - Title auto-hides when `w.title === ''` and not editing.

- [ ] **Step 1: Write failing test `src/widgets/Card.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { Card } from './Card.jsx';

const base = { w:{ id:'1', type:'bookmarks', title:'Daily', tint:'paper', w:4 }, accent:'#c96442', theme:'light' };

describe('Card', () => {
	it('shows title when present', () => {
		const { getByText } = render(h(Card, { ...base, editing:false, children:'x' }));
		expect(getByText('Daily')).toBeInTheDocument();
	});
	it('hides empty title when not editing', () => {
		const { queryByPlaceholderText } = render(h(Card, { ...base, w:{ ...base.w, title:'' }, editing:false, children:'x' }));
		expect(queryByPlaceholderText('Title')).toBeNull();
	});
	it('shows a title input in edit mode', () => {
		const { getByPlaceholderText } = render(h(Card, { ...base, editing:true, children:'x', onPatch:vi.fn() }));
		expect(getByPlaceholderText('Title')).toBeInTheDocument();
	});
	it('fires onRemove from the delete action', () => {
		const onRemove = vi.fn();
		const { getByText } = render(h(Card, { ...base, editing:true, menuOpen:true, onToggleMenu:vi.fn(), onPatch:vi.fn(), onRemove, children:'x' }));
		fireEvent.click(getByText('Delete widget'));
		expect(onRemove).toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Card`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/widgets/Card.jsx`** (ported from the design's `card`, `header2`, `ctrlBar`, `widgetMenu`; span/resize buttons removed — gridstack owns geometry)

```jsx
import { h } from 'preact';
import { TINTS, TINT_KEYS, tintPalette } from '../theme/palettes.js';

/**
 * Tinted widget shell with title row and edit-mode chrome.
 * @param {object} props
 */
export function Card(props) {
	const { w, p, editing, accent, theme, children, onPatch, onRemove, menuOpen, onToggleMenu, extraMenu } = props;
	const showTitle = w.title !== undefined && (w.title !== '' || editing);

	const titleEl = showTitle
		? (editing
			? h('input', { value:w.title, placeholder:'Title', onInput:(e) => onPatch({ title:e.currentTarget.value }),
				style:{ border:'none', background:'transparent', color:p.mut, font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.16em', textTransform:'uppercase', outline:'none', width:'60%' } })
			: h('div', { style:{ font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.16em', textTransform:'uppercase', color:p.mut } }, w.title))
		: h('span');

	const ctrl = editing ? h('div', { style:{ display:'flex', alignItems:'center', gap:2, position:'relative' } },
		h('button', { onClick:onToggleMenu, style:btn(p) }, '•••'),
		menuOpen ? menu() : null
	) : null;

	function menu() {
		return h('div', { style:menuStyle(p) },
			extraMenu ? extraMenu() : null,
			h('div', { style:{ padding:'8px 12px' } },
				h('div', { style:menuLabel(p) }, 'Background'),
				h('div', { style:{ display:'flex', flexWrap:'wrap', gap:7 } }, TINT_KEYS.map((k) => {
					const tp = tintPalette(k, theme);
					return h('button', { key:k, title:TINTS[k].name, onClick:() => onPatch({ tint:k }),
						style:{ width:24, height:24, borderRadius:7, background:tp.bg, border:w.tint === k ? `2px solid ${accent}` : `1px solid ${p.line}`, cursor:'pointer', padding:0 } });
				}))
			),
			h('div', { style:{ height:1, background:p.line } }),
			h('button', { onClick:onRemove, style:{ display:'block', width:'100%', textAlign:'left', padding:'10px 12px', border:'none', background:'transparent', color:'#c0603f', font:"500 12px 'Instrument Sans'", cursor:'pointer' } }, 'Delete widget')
		);
	}

	return h('div', { style:{ background:p.bg, border:`1px solid ${p.line}`, borderRadius:18, padding:'20px 22px', color:p.fg, height:'100%', boxSizing:'border-box', position:'relative', boxShadow: theme === 'dark' ? '0 1px 2px rgba(0,0,0,.25)' : '0 1px 2px rgba(70,58,44,.05)' } },
		h('div', { style:{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:(w.title || editing) ? 14 : 0 } }, titleEl, ctrl),
		children
	);
}

const btn = (p) => ({ border:'none', background:'transparent', color:p.mut, cursor:'pointer', font:"500 11px 'Instrument Sans'", padding:'2px 5px', borderRadius:6, lineHeight:1 });
const menuStyle = (p) => ({ position:'absolute', top:26, right:0, zIndex:40, minWidth:180, background:p.bg, border:`1px solid ${p.line}`, borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,.18)', overflow:'hidden' });
const menuLabel = (p) => ({ font:"500 10px 'Spline Sans Mono',monospace", letterSpacing:'.12em', textTransform:'uppercase', color:p.mut, marginBottom:8 });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Card`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/Card.jsx src/widgets/Card.test.jsx
git commit -m "feat: tinted widget card shell with edit chrome"
```

---

### Task 6: Bookmarks widget

**Files:**
- Create: `src/widgets/Bookmarks.jsx`, `src/widgets/Bookmarks.test.jsx`

**Interfaces:**
- Consumes: `Card`, `Icon`, `tintPalette`, `uid`.
- Produces: `Bookmarks({ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove })`. Uses `onPatch` to update `items`, `layout`, `icon`, `tint`, `title`. Edits use `window.prompt` (ported from design).

- [ ] **Step 1: Write failing test `src/widgets/Bookmarks.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { Bookmarks } from './Bookmarks.jsx';

const w = { id:'1', type:'bookmarks', title:'Dev', layout:'list', icon:'mono', tint:'paper', w:4, items:[
	{ id:'a', label:'GitHub', url:'https://github.com', color:'#000', ini:'GH' },
] };

describe('Bookmarks', () => {
	it('renders each bookmark label', () => {
		const { getByText } = render(h(Bookmarks, { w, editing:false, accent:'#c96442', theme:'light', onPatch:vi.fn(), onRemove:vi.fn() }));
		expect(getByText('GitHub')).toBeInTheDocument();
	});
	it('grid layout wraps labels too', () => {
		const { getByText } = render(h(Bookmarks, { w:{ ...w, layout:'grid' }, editing:false, accent:'#c96442', theme:'light', onPatch:vi.fn(), onRemove:vi.fn() }));
		expect(getByText('GitHub')).toBeInTheDocument();
	});
	it('deleting a bookmark patches items to empty', () => {
		const onPatch = vi.fn();
		const { getByText } = render(h(Bookmarks, { w, editing:true, accent:'#c96442', theme:'light', menuOpen:false, onToggleMenu:vi.fn(), onPatch, onRemove:vi.fn() }));
		fireEvent.click(getByText('×'));
		expect(onPatch).toHaveBeenCalledWith({ items: [] });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Bookmarks`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/widgets/Bookmarks.jsx`** (ported from design's `wBookmarks`, `itemEdit`, `editBookmark`; geometry chrome via `Card`)

```jsx
import { h } from 'preact';
import { Card } from './Card.jsx';
import { Icon } from './icon.jsx';
import { tintPalette } from '../theme/palettes.js';
import { uid } from '../store/store.js';

/** @param {object} props */
export function Bookmarks(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const grid = w.layout === 'grid';

	/** @param {object|null} it existing item, or null to add */
	function editItem(it) {
		const label = window.prompt('Bookmark name', it ? it.label : '');
		if (label === null) return;
		const url = window.prompt('URL', it ? it.url : 'https://');
		if (url === null) return;
		const ini = (label.trim()[0] || '•').toUpperCase();
		if (it) onPatch({ items: w.items.map((x) => x.id === it.id ? { ...x, label, url, ini } : x) });
		else onPatch({ items: w.items.concat({ id:uid(), label, url, color:accent, ini }) });
	}
	function del(it) {
		onPatch({ items: w.items.filter((x) => x.id !== it.id) });
	}

	const editControls = (it) => editing ? h('span', { style:{ position:'absolute', top:grid ? -4 : '50%', right:grid ? -4 : 0, transform:grid ? 'none' : 'translateY(-50%)', display:'flex', gap:4 } },
		h('button', { onClick:(e) => { e.preventDefault(); editItem(it); }, style:miniBtn(p, p.mut) }, '✎'),
		h('button', { onClick:(e) => { e.preventDefault(); del(it); }, style:miniBtn(p, '#c0603f') }, '×')
	) : null;

	const items = w.items.map((it) => grid
		? h('a', { key:it.id, href:it.url, style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:9, textDecoration:'none', position:'relative' } },
			h(Icon, { item:it, size:46, mode:w.icon, p }),
			h('span', { style:{ font:"400 12px 'Instrument Sans'", color:p.mut, maxWidth:64, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, it.label),
			editControls(it))
		: h('a', { key:it.id, href:it.url, style:{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', textDecoration:'none', position:'relative' } },
			h(Icon, { item:it, size:26, mode:w.icon, p }),
			h('span', { style:{ font:"400 14px 'Instrument Sans'", color:p.fg } }, it.label),
			editControls(it)));

	const addBtn = editing ? h('button', { key:'add', onClick:() => editItem(null),
		style: grid ? { display:'flex', flexDirection:'column', alignItems:'center', gap:9, border:'none', background:'transparent', cursor:'pointer' }
			: { display:'flex', alignItems:'center', gap:12, padding:'8px 0', border:'none', background:'transparent', cursor:'pointer', width:'100%' } },
		h('div', { style:{ width:grid ? 46 : 26, height:grid ? 46 : 26, borderRadius:grid ? 15 : 8, border:`1.5px dashed ${p.mut}`, display:'flex', alignItems:'center', justifyContent:'center', color:p.mut, fontSize:grid ? 20 : 15, flex:'none' } }, '+'),
		h('span', { style:{ font:"400 " + (grid ? 12 : 14) + "px 'Instrument Sans'", color:p.mut } }, grid ? 'Add' : 'Add bookmark')
	) : null;

	const body = grid
		? h('div', { style:{ display:'flex', flexWrap:'wrap', gap:'18px 20px' } }, items.concat(addBtn ? [addBtn] : []))
		: h('div', { style:{ display:'flex', flexDirection:'column' } }, items.concat(addBtn ? [addBtn] : []));

	// icon-mode selector injected into the Card menu
	const extraMenu = () => h('div', { style:{ padding:'8px 12px' } },
		h('div', { style:{ font:"500 10px 'Spline Sans Mono',monospace", letterSpacing:'.12em', textTransform:'uppercase', color:p.mut, marginBottom:7 } }, 'Icons'),
		h('div', { style:{ display:'flex', gap:6 } }, ['mono','color','favicon','dot'].map((m) =>
			h('button', { key:m, onClick:() => onPatch({ icon:m }),
				style:{ flex:1, border:`1px solid ${w.icon === m ? accent : p.line}`, background:w.icon === m ? accent + '18' : 'transparent', color:p.fg, borderRadius:7, padding:'5px 0', font:"500 10px 'Instrument Sans'", cursor:'pointer', textTransform:'capitalize' } }, m)
		))
	);

	// layout toggle also lives in the menu header row
	const layoutToggle = editing ? h('button', { onClick:() => onPatch({ layout:grid ? 'list' : 'grid' }),
		style:{ position:'absolute', top:14, right:44, border:'none', background:'transparent', color:p.mut, font:"500 11px 'Instrument Sans'", cursor:'pointer', zIndex:5 } }, grid ? 'List' : 'Grid') : null;

	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, extraMenu, children:[layoutToggle, body] });
}

const miniBtn = (p, color) => ({ border:'none', background:p.bg, color, borderRadius:6, width:20, height:20, cursor:'pointer', fontSize:12, boxShadow:'0 1px 3px rgba(0,0,0,.15)' });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Bookmarks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/Bookmarks.jsx src/widgets/Bookmarks.test.jsx
git commit -m "feat: bookmarks widget (grid/list, add/edit/delete, icon modes)"
```

---

### Task 7: Single / DateTime / Divider / Spacer widgets

**Files:**
- Create: `src/widgets/Single.jsx`, `src/widgets/DateTime.jsx`, `src/widgets/Divider.jsx`, `src/widgets/Spacer.jsx`, `src/widgets/simple.test.jsx`

**Interfaces:**
- Consumes: `Card`, `Icon`, `tintPalette`.
- Produces:
  - `Single({ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove })`.
  - `DateTime({ w, editing, theme, now, menuOpen, onToggleMenu, onPatch, onRemove })` — `now: Date` passed in.
  - `Divider({ editing, theme, onRemove })`, `Spacer({ w, editing, theme })`.

- [ ] **Step 1: Write failing test `src/widgets/simple.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/preact';
import { h } from 'preact';
import { Single } from './Single.jsx';
import { DateTime } from './DateTime.jsx';

describe('Single', () => {
	it('shows label and subtitle', () => {
		const w = { id:'1', type:'single', tint:'sky', w:3, item:{ label:'Focus', url:'https://x', color:'#4b7bc4', ini:'F', sub:'Pinned' } };
		const { getByText } = render(h(Single, { w, editing:false, accent:'#c96442', theme:'light', onPatch:vi.fn(), onRemove:vi.fn() }));
		expect(getByText('Focus')).toBeInTheDocument();
		expect(getByText('Pinned')).toBeInTheDocument();
	});
});

describe('DateTime', () => {
	it('renders a fixed time from the injected Date', () => {
		const now = new Date(2026, 6, 9, 9, 5); // 09:05
		const { container } = render(h(DateTime, { w:{ id:'1', type:'datetime', tint:'paper', w:3 }, editing:false, theme:'light', now, onPatch:vi.fn(), onRemove:vi.fn() }));
		expect(container.textContent).toMatch(/09/);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- simple`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/widgets/Single.jsx`** (ported from design's `wSingle`/`editSingle`)

```jsx
import { h } from 'preact';
import { Card } from './Card.jsx';
import { Icon } from './icon.jsx';
import { tintPalette } from '../theme/palettes.js';

/** @param {object} props */
export function Single(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const it = w.item || {};

	function edit() {
		const label = window.prompt('Name', it.label); if (label === null) return;
		const url = window.prompt('URL', it.url || 'https://'); if (url === null) return;
		const sub = window.prompt('Subtitle (optional)', it.sub || '');
		onPatch({ item: { ...it, label, url, sub: sub || '', ini:(label.trim()[0] || '•').toUpperCase(), color:it.color || accent } });
	}

	const children = [
		h('a', { key:'a', href:it.url, style:{ display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:120, textDecoration:'none', gap:20 } },
			h(Icon, { item:it, size:44, mode:'color', p }),
			h('div', null,
				h('div', { style:{ font:"600 16px 'Instrument Sans'", color:p.fg } }, it.label),
				it.sub ? h('div', { style:{ font:"400 12px 'Instrument Sans'", color:p.mut, marginTop:4 } }, it.sub) : null)),
		editing ? h('button', { key:'e', onClick:edit, style:{ marginTop:12, border:`1px solid ${p.line}`, background:'transparent', color:p.mut, borderRadius:8, padding:'5px 10px', font:"500 11px 'Instrument Sans'", cursor:'pointer' } }, 'Edit bookmark') : null,
	];
	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}
```

- [ ] **Step 4: Implement `src/widgets/DateTime.jsx`** (ported from design's `wDateTime`)

```jsx
import { h } from 'preact';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';

/** @param {object} props */
export function DateTime(props) {
	const { w, editing, accent, theme, now, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const time = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
	const date = now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
	const children = h('div', { style:{ display:'flex', flexDirection:'column', gap:6, minHeight:80, justifyContent:'center' } },
		h('div', { style:{ font:"300 40px/1 'Newsreader',serif", color:p.fg, letterSpacing:'-.01em' } }, time),
		h('div', { style:{ font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.12em', textTransform:'uppercase', color:p.mut } }, date)
	);
	return h(Card, { w:{ ...w, title:w.title || '' }, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}
```

- [ ] **Step 5: Implement `src/widgets/Divider.jsx`** and `src/widgets/Spacer.jsx` (ported from `wDivider`/`wSpacer`; geometry via gridstack)

```jsx
// Divider.jsx
import { h } from 'preact';
import { pagePalette } from '../theme/palettes.js';

/** @param {{editing:boolean, theme:'light'|'dark', onRemove:Function}} props */
export function Divider({ editing, theme, onRemove }) {
	const pg = pagePalette(theme);
	return h('div', { style:{ display:'flex', alignItems:'center', gap:12, padding:'4px 0', height:'100%' } },
		h('div', { style:{ flex:1, height:1, background:pg.line } }),
		editing ? h('button', { onClick:onRemove, style:{ border:'none', background:'transparent', color:pg.head, cursor:'pointer', font:"500 10px 'Spline Sans Mono',monospace" } }, 'remove divider') : null
	);
}
```

```jsx
// Spacer.jsx
import { h } from 'preact';
import { pagePalette } from '../theme/palettes.js';

/** @param {{editing:boolean, theme:'light'|'dark'}} props */
export function Spacer({ editing, theme }) {
	const pg = pagePalette(theme);
	return h('div', { style:{ height:'100%', border: editing ? `1.5px dashed ${pg.line}` : 'none', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center' } },
		editing ? h('span', { style:{ font:"500 10px 'Spline Sans Mono',monospace", color:pg.head, letterSpacing:'.1em' } }, 'SPACER') : null
	);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- simple`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/widgets/Single.jsx src/widgets/DateTime.jsx src/widgets/Divider.jsx src/widgets/Spacer.jsx src/widgets/simple.test.jsx
git commit -m "feat: single, datetime, divider, spacer widgets"
```

---

### Task 8: Widget registry

**Files:**
- Create: `src/widgets/registry.js`, `src/widgets/registry.test.js`

**Interfaces:**
- Consumes: all widget components; `uid`.
- Produces:
  - `WIDGET_COMPONENTS: Record<type, Component>`.
  - `newWidget(type: string, accent: string): Widget` — factory with default geometry + content for a freshly added widget.
  - `ADD_MENU: Array<[type, label]>` — order/labels for the "Add widget" menu (v1 types only).

- [ ] **Step 1: Write failing test `src/widgets/registry.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { newWidget, WIDGET_COMPONENTS, ADD_MENU } from './registry.js';

describe('registry', () => {
	it('has a component for every add-menu type', () => {
		for (const [type] of ADD_MENU) expect(WIDGET_COMPONENTS[type]).toBeTruthy();
	});
	it('newWidget seeds default geometry', () => {
		const w = newWidget('bookmarks', '#c96442');
		expect(w.type).toBe('bookmarks');
		expect(w.w).toBeGreaterThanOrEqual(2);
		expect(w.id).toBeTruthy();
		expect(Array.isArray(w.items)).toBe(true);
	});
	it('only exposes v1 types', () => {
		const allowed = new Set(['bookmarks','single','datetime','divider','spacer']);
		for (const [type] of ADD_MENU) expect(allowed.has(type)).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- registry`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/widgets/registry.js`**

```js
import { Bookmarks } from './Bookmarks.jsx';
import { Single } from './Single.jsx';
import { DateTime } from './DateTime.jsx';
import { Divider } from './Divider.jsx';
import { Spacer } from './Spacer.jsx';
import { uid } from '../store/store.js';

export const WIDGET_COMPONENTS = {
	bookmarks: Bookmarks,
	single: Single,
	datetime: DateTime,
	divider: Divider,
	spacer: Spacer,
};

/** Add-widget menu — v1 types only. @type {Array<[string,string]>} */
export const ADD_MENU = [
	['bookmarks', 'Bookmark group'],
	['single', 'Single bookmark'],
	['datetime', 'Date & time'],
	['divider', 'Divider'],
	['spacer', 'Spacer'],
];

/**
 * Build a fresh widget of a given type with default geometry/content.
 * @param {string} type
 * @param {string} accent
 * @returns {import('../store/store.js').Widget}
 */
export function newWidget(type, accent) {
	const id = uid();
	switch (type) {
		case 'bookmarks': return { id, type, title:'New group', layout:'grid', icon:'mono', tint:'paper', w:4, h:3, items:[] };
		case 'single':    return { id, type, title:'Bookmark', tint:'paper', w:3, h:2, item:{ label:'New bookmark', url:'https://', color:accent, ini:'•', sub:'' } };
		case 'datetime':  return { id, type, title:'', tint:'paper', w:3, h:2 };
		case 'divider':   return { id, type, w:12, h:1 };
		case 'spacer':    return { id, type, w:3, h:2 };
		default:          return { id, type:'spacer', w:3, h:2 };
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- registry`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/registry.js src/widgets/registry.test.js
git commit -m "feat: widget registry and add-widget factory"
```

---

### Task 9: Grid module (gridstack wiring)

**Files:**
- Create: `src/grid/grid.js`, `src/grid/serialize.js`, `src/grid/serialize.test.js`

**Interfaces:**
- Consumes: gridstack.
- Produces:
  - `mergeGeometry(widgets: Widget[], nodes: Array<{id,x,y,w,h}>): Widget[]` (pure, in `serialize.js`) — apply gridstack node coords back onto widgets by id.
  - `initGrid(el: HTMLElement, opts): GridStack` — init with 12 columns, `float:false`, drag/resize gated by `opts.staticGrid`.
  - `syncGrid(grid, widgets, renderInto)` — add/remove/update gridstack items to match `widgets`; call `renderInto(contentEl, widget)` for each item's content element.

**Note on testing:** gridstack needs real layout, unavailable in jsdom. `mergeGeometry` is pure and unit-tested here; `initGrid`/`syncGrid` DOM wiring is verified manually in Task 11's checklist.

- [ ] **Step 1: Write failing test `src/grid/serialize.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { mergeGeometry } from './serialize.js';

describe('mergeGeometry', () => {
	it('applies node coords onto matching widgets', () => {
		const widgets = [{ id:'a', x:0, y:0, w:4, h:2 }, { id:'b', x:4, y:0, w:4, h:2 }];
		const nodes = [{ id:'a', x:2, y:1, w:6, h:3 }];
		const out = mergeGeometry(widgets, nodes);
		expect(out[0]).toMatchObject({ id:'a', x:2, y:1, w:6, h:3 });
		expect(out[1]).toMatchObject({ id:'b', x:4, y:0 }); // untouched
	});
	it('does not mutate the input', () => {
		const widgets = [{ id:'a', x:0, y:0, w:4, h:2 }];
		mergeGeometry(widgets, [{ id:'a', x:9, y:9, w:1, h:1 }]);
		expect(widgets[0].x).toBe(0);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- serialize`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/grid/serialize.js`**

```js
/**
 * Apply gridstack node geometry back onto widgets, matched by id. Pure.
 * @param {Array<object>} widgets
 * @param {Array<{id:string,x:number,y:number,w:number,h:number}>} nodes
 * @returns {Array<object>}
 */
export function mergeGeometry(widgets, nodes) {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	return widgets.map((w) => {
		const n = byId.get(w.id);
		return n ? { ...w, x:n.x, y:n.y, w:n.w, h:n.h } : w;
	});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- serialize`
Expected: PASS.

- [ ] **Step 5: Implement `src/grid/grid.js`** (imperative gridstack wrapper; content rendered by caller)

```js
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

/**
 * Initialize gridstack on a container.
 * @param {HTMLElement} el
 * @param {{staticGrid:boolean}} opts
 * @returns {import('gridstack').GridStack}
 */
export function initGrid(el, opts) {
	return GridStack.init({
		column: 12,
		cellHeight: 90,
		margin: 8,
		float: false,
		staticGrid: opts.staticGrid,
		handle: '.nt-drag',
		resizable: { handles: 'se' },
	}, el);
}

/**
 * Reconcile gridstack items to match `widgets`. Adds new, removes gone,
 * updates geometry, and (re)renders content via `renderInto`.
 * Content elements are cached on the item DOM node as `_ntContent`.
 * @param {import('gridstack').GridStack} grid
 * @param {Array<object>} widgets
 * @param {(contentEl:HTMLElement, widget:object)=>void} renderInto
 */
export function syncGrid(grid, widgets, renderInto) {
	const want = new Map(widgets.map((w) => [w.id, w]));
	// remove gone
	for (const node of grid.engine.nodes.slice()) {
		if (!want.has(node.el.getAttribute('gs-id'))) grid.removeWidget(node.el, true);
	}
	const have = new Set(grid.engine.nodes.map((n) => n.el.getAttribute('gs-id')));
	grid.batchUpdate();
	for (const w of widgets) {
		let el;
		if (!have.has(w.id)) {
			el = grid.addWidget({ id:w.id, x:w.x, y:w.y, w:w.w, h:w.h, content:'' });
			el.setAttribute('gs-id', w.id);
		} else {
			el = grid.engine.nodes.find((n) => n.el.getAttribute('gs-id') === w.id).el;
			grid.update(el, { x:w.x, y:w.y, w:w.w, h:w.h });
		}
		const contentEl = el.querySelector('.grid-stack-item-content');
		renderInto(contentEl, w);
	}
	grid.commit();
}
```

- [ ] **Step 6: Run full test suite** (nothing new to test for the DOM parts; ensure no import breakage)

Run: `npm test`
Expected: PASS (serialize test included).

- [ ] **Step 7: Commit**

```bash
git add src/grid/
git commit -m "feat: gridstack wrapper and pure geometry merge"
```

---

### Task 10: App chrome (header + top bar)

**Files:**
- Create: `src/chrome/Header.jsx`, `src/chrome/TopBar.jsx`, `src/chrome/greeting.js`, `src/chrome/chrome.test.jsx`

**Interfaces:**
- Consumes: `pagePalette`, `ACCENTS`, `ADD_MENU`.
- Produces:
  - `greeting(hour: number): string` (pure).
  - `Header({ pg, name, now, editing, onName })`.
  - `TopBar({ pg, editing, theme, width, accent, onToggleEdit, onToggleTheme, onSetWidth, onSetAccent, onAdd, menus, onOpenMenu })` where `menus` selects which dropdown (`'add'|'settings'|null`).

- [ ] **Step 1: Write failing test `src/chrome/chrome.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { greeting } from './greeting.js';
import { TopBar } from './TopBar.jsx';
import { pagePalette } from '../theme/palettes.js';

describe('greeting', () => {
	it('varies by hour', () => {
		expect(greeting(8)).toBe('Good morning');
		expect(greeting(14)).toBe('Good afternoon');
		expect(greeting(20)).toBe('Good evening');
		expect(greeting(2)).toBe('Good night');
	});
});

describe('TopBar', () => {
	it('toggles edit', () => {
		const onToggleEdit = vi.fn();
		const { getByText } = render(h(TopBar, { pg:pagePalette('light'), editing:false, theme:'light', width:'fixed', accent:'#c96442', onToggleEdit, onToggleTheme:vi.fn(), onSetWidth:vi.fn(), onSetAccent:vi.fn(), onAdd:vi.fn(), menus:null, onOpenMenu:vi.fn() }));
		fireEvent.click(getByText('Edit'));
		expect(onToggleEdit).toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- chrome`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `src/chrome/greeting.js`**

```js
/**
 * Time-of-day greeting.
 * @param {number} hour 0–23
 * @returns {string}
 */
export function greeting(hour) {
	if (hour < 5) return 'Good night';
	if (hour < 12) return 'Good morning';
	if (hour < 17) return 'Good afternoon';
	if (hour < 21) return 'Good evening';
	return 'Good night';
}
```

- [ ] **Step 4: Implement `src/chrome/Header.jsx`** (ported from design's `renderApp` header block)

```jsx
import { h } from 'preact';
import { greeting } from './greeting.js';

/** @param {object} props */
export function Header({ pg, name, now, editing, onName }) {
	const dateStr = now.toLocaleDateString([], { weekday:'long', day:'numeric', month:'long' }).toUpperCase();
	const timeStr = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
	const nameEl = editing
		? h('input', { value:name, onInput:(e) => onName(e.currentTarget.value),
			style:{ border:'none', borderBottom:`1px dashed ${pg.mut}`, background:'transparent', color:pg.fg, font:"400 clamp(28px,4vw,38px) 'Newsreader',serif", width:'5ch', outline:'none' } })
		: name;
	return h('div', null,
		h('div', { style:{ font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.2em', color:pg.head } }, dateStr),
		h('div', { style:{ display:'flex', alignItems:'baseline', gap:14, marginTop:13 } },
			h('div', { style:{ font:"400 clamp(28px,4vw,38px)/1.02 'Newsreader',serif", letterSpacing:'-.01em' } }, greeting(now.getHours()) + ', ', nameEl),
			h('div', { style:{ font:"400 16px 'Spline Sans Mono',monospace", color:pg.head } }, timeStr))
	);
}
```

- [ ] **Step 5: Implement `src/chrome/TopBar.jsx`** (ported from design's `topBar`, `settingsMenu`, `addMenu`)

```jsx
import { h } from 'preact';
import { ACCENTS } from '../theme/palettes.js';
import { ADD_MENU } from '../widgets/registry.js';

/** @param {object} props */
export function TopBar(props) {
	const { pg, editing, theme, width, accent, onToggleEdit, onToggleTheme, onSetWidth, onSetAccent, onAdd, menus, onOpenMenu } = props;
	const pill = (label, active, on) => h('button', { onClick:on, style:{ border:'none', background:active ? accent : 'transparent', color:active ? '#fff' : pg.mut, borderRadius:9, padding:'7px 11px', font:"500 12px 'Instrument Sans'", cursor:'pointer' } }, label);

	return h('div', { style:{ display:'flex', alignItems:'center', gap:4, position:'relative' } },
		pill(editing ? 'Done' : 'Edit', editing, onToggleEdit),
		h('button', { onClick:onToggleTheme, title:'Toggle theme', style:iconBtn(pg) }, theme === 'dark' ? '☾' : '☀'),
		h('button', { onClick:() => onOpenMenu(menus === 'settings' ? null : 'settings'), title:'Settings', style:iconBtn(pg) }, '⚙'),
		menus === 'settings' ? settingsMenu() : null,
		h('button', { onClick:() => onOpenMenu(menus === 'add' ? null : 'add'), style:{ border:'none', background:pg.fg, color:pg.bg, borderRadius:9, padding:'7px 13px', font:"500 12px 'Instrument Sans'", cursor:'pointer' } }, '+ Add widget'),
		menus === 'add' ? addMenu() : null
	);

	function settingsMenu() {
		return h('div', { style:menuBox(pg, 56) },
			label('Container width', pg),
			h('div', { style:{ display:'flex', gap:7, marginBottom:16 } }, ['fixed','full'].map((m) =>
				h('button', { key:m, onClick:() => onSetWidth(m), style:choice(pg, accent, width === m) }, m === 'fixed' ? 'Centered' : 'Full'))),
			label('Accent', pg),
			h('div', { style:{ display:'flex', gap:9 } }, ACCENTS.map((c) =>
				h('button', { key:c, onClick:() => onSetAccent(c), style:{ width:26, height:26, borderRadius:'50%', background:c, border:accent === c ? `2px solid ${pg.fg}` : '2px solid transparent', cursor:'pointer', padding:0 } })))
		);
	}
	function addMenu() {
		return h('div', { style:menuBox(pg, 0) }, ADD_MENU.map(([t, l]) =>
			h('button', { key:t, onClick:() => onAdd(t), style:{ display:'block', width:'100%', textAlign:'left', border:'none', background:'transparent', color:pg.fg, font:"400 13px 'Instrument Sans'", padding:'9px 11px', borderRadius:9, cursor:'pointer' } }, l)));
	}
}

const iconBtn = (pg) => ({ border:'none', background:'transparent', color:pg.mut, borderRadius:9, padding:'7px 10px', font:'15px system-ui', cursor:'pointer' });
const menuBox = (pg, right) => ({ position:'absolute', top:44, right, zIndex:50, width:230, background:pg.bg, border:`1px solid ${pg.line}`, borderRadius:14, boxShadow:'0 16px 50px rgba(0,0,0,.2)', padding:16 });
const label = (t, pg) => h('div', { style:{ font:"500 10px 'Spline Sans Mono',monospace", letterSpacing:'.12em', textTransform:'uppercase', color:pg.mut, marginBottom:9 } }, t);
const choice = (pg, accent, active) => ({ flex:1, border:`1px solid ${active ? accent : pg.line}`, background:active ? accent + '18' : 'transparent', color:pg.fg, borderRadius:8, padding:'7px 0', font:"500 12px 'Instrument Sans'", cursor:'pointer' });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- chrome`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/chrome/
git commit -m "feat: header greeting/clock and top bar controls"
```

---

### Task 11: App wiring (state + grid + render loop)

**Files:**
- Create: `src/app.jsx`, `src/styles.css`
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes: everything above.
- Produces: `App()` — owns state, drives gridstack, renders widget content, persists changes. This is the integration task; verified by the manual checklist in Step 6.

- [ ] **Step 1: Create `src/styles.css`** (resets + selection + gridstack content reset; @font-face added in Task 12)

```css
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: 'Instrument Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
::selection { background: rgba(201, 100, 66, .22); }
/* let widget cards fill the gridstack item box */
.grid-stack-item-content { inset: 0; overflow: visible; }
.nt-drag { cursor: grab; }
```

- [ ] **Step 2: Implement `src/app.jsx`**

Renders page chrome via Preact and hosts the gridstack container. Widget *content* is rendered into each grid item with a per-item Preact `render()` root; geometry changes come back through gridstack's `change` event and merge into state via `mergeGeometry`. A drag handle (`.nt-drag`) is injected into each item only in edit mode.

```jsx
import { h, render as prender } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { loadState, saveState, uid } from './store/store.js';
import { pagePalette } from './theme/palettes.js';
import { WIDGET_COMPONENTS, newWidget } from './widgets/registry.js';
import { initGrid, syncGrid } from './grid/grid.js';
import { mergeGeometry } from './grid/serialize.js';
import { Header } from './chrome/Header.jsx';
import { TopBar } from './chrome/TopBar.jsx';
import './styles.css';

export function App() {
	const [state, setState] = useState(loadState);
	const [editing, setEditing] = useState(false);
	const [now, setNow] = useState(() => new Date());
	const [menus, setMenus] = useState(/** @type {string|null} */(null)); // top-bar dropdown
	const [openWidgetMenu, setOpenWidgetMenu] = useState(/** @type {string|null} */(null));
	const gridEl = useRef(null);
	const grid = useRef(/** @type {any} */(null));

	// tick the clock each minute
	useEffect(() => {
		const t = setInterval(() => setNow(new Date()), 1000 * 20);
		return () => clearInterval(t);
	}, []);

	// persist on any state change
	useEffect(() => { saveState(state); }, [state]);

	// patch helpers
	const patchWidget = (id, partial) => setState((s) => ({ ...s, widgets: s.widgets.map((w) => w.id === id ? { ...w, ...partial } : w) }));
	const removeWidget = (id) => { setState((s) => ({ ...s, widgets: s.widgets.filter((w) => w.id !== id) })); setOpenWidgetMenu(null); };
	const addWidget = (type) => { setState((s) => ({ ...s, widgets: s.widgets.concat(newWidget(type, s.accent)) })); setMenus(null); };

	// init gridstack once
	useEffect(() => {
		grid.current = initGrid(gridEl.current, { staticGrid: !editing });
		grid.current.on('change', (_e, nodes) => {
			const read = grid.current.engine.nodes.map((n) => ({ id:n.el.getAttribute('gs-id'), x:n.x, y:n.y, w:n.w, h:n.h }));
			setState((s) => ({ ...s, widgets: mergeGeometry(s.widgets, read) }));
		});
		return () => grid.current.destroy(false);
	}, []);

	// toggle drag/resize with edit mode
	useEffect(() => { if (grid.current) grid.current.setStatic(!editing); }, [editing]);

	// reconcile grid items + render content whenever inputs change
	useEffect(() => {
		if (!grid.current) return;
		syncGrid(grid.current, state.widgets, (contentEl, w) => {
			const Comp = WIDGET_COMPONENTS[w.type];
			const common = { w, editing, accent:state.accent, theme:state.theme,
				menuOpen: openWidgetMenu === w.id, onToggleMenu:() => setOpenWidgetMenu(openWidgetMenu === w.id ? null : w.id),
				onPatch:(partial) => patchWidget(w.id, partial), onRemove:() => removeWidget(w.id), now };
			const handle = editing ? h('span', { class:'nt-drag', style:{ position:'absolute', top:8, left:8, zIndex:6, color:'#999', fontSize:13 } }, '⠿') : null;
			prender(h('div', { style:{ position:'relative', height:'100%' } }, handle, h(Comp, common)), contentEl);
		});
	}, [state.widgets, editing, state.theme, state.accent, openWidgetMenu, now]);

	// dismiss menus on outside click
	useEffect(() => {
		const close = () => { setMenus(null); setOpenWidgetMenu(null); };
		document.addEventListener('click', close);
		return () => document.removeEventListener('click', close);
	}, []);

	const pg = pagePalette(state.theme);
	const maxW = state.width === 'fixed' ? 1120 : 1680;

	return h('div', { onClick:(e) => e.stopPropagation(), style:{ minHeight:'100vh', background:pg.bg, color:pg.fg, transition:'background .3s,color .3s' } },
		h('div', { style:{ maxWidth:maxW, margin:'0 auto', padding:'clamp(28px,5vw,56px) clamp(20px,4vw,48px) 80px' } },
			h('div', { style:{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, flexWrap:'wrap', marginBottom:'clamp(28px,4vw,44px)' } },
				h(Header, { pg, name:state.name, now, editing, onName:(v) => setState((s) => ({ ...s, name:v })) }),
				h(TopBar, { pg, editing, theme:state.theme, width:state.width, accent:state.accent,
					onToggleEdit:() => { setEditing((v) => !v); setOpenWidgetMenu(null); },
					onToggleTheme:() => setState((s) => ({ ...s, theme:s.theme === 'dark' ? 'light' : 'dark' })),
					onSetWidth:(m) => setState((s) => ({ ...s, width:m })),
					onSetAccent:(c) => setState((s) => ({ ...s, accent:c })),
					onAdd:addWidget, menus, onOpenMenu:setMenus })
			),
			h('div', { class:'grid-stack', ref:gridEl }),
			h('div', { style:{ marginTop:40, font:"400 12px 'Instrument Sans'", color:pg.head, textAlign:'center' } },
				editing ? 'Drag ⠿ to move · drag the corner to resize · ••• for background & icons' : 'Click Edit to rearrange, resize and restyle your widgets')
		)
	);
}
```

- [ ] **Step 3: Update `src/main.jsx`**

```jsx
import { render, h } from 'preact';
import { App } from './app.jsx';

render(h(App, null), document.getElementById('app'));
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS (all prior tests; no new unit test — this task is integration).

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: build succeeds, `dist/` produced.

- [ ] **Step 6: Manual verification checklist**

Run: `npm run dev`, open the URL, and confirm each:
- [ ] Default board renders: date/time widget, two bookmark groups (grid + list), single-bookmark tile.
- [ ] Click **Edit** → drag a widget to a new cell; it stays. Drag its corner to resize.
- [ ] Reload → layout, sizes, and positions persist.
- [ ] Add a bookmark (edit mode → **Add** inside a group), edit it, delete it.
- [ ] Toggle a group between **Grid**/**List**; switch **icon mode** to color/dot; each renders.
- [ ] Toggle **theme**; change **accent**; **tint** a widget via `•••`; switch **Centered/Full** — all persist across reload.
- [ ] **Add widget** → each of the 5 types appears and can be deleted.
- [ ] Narrow the window to phone width → grid collapses to one column, remains usable.

- [ ] **Step 7: Commit**

```bash
git add src/app.jsx src/main.jsx src/styles.css
git commit -m "feat: wire app state, gridstack, and widget render loop"
```

---

### Task 12: Self-hosted fonts

**Files:**
- Create: `public/fonts/*.woff2`, add `@font-face` block to `src/styles.css`

**Interfaces:**
- Consumes: nothing.
- Produces: three font families available offline: Newsreader, Instrument Sans, Spline Sans Mono.

- [ ] **Step 1: Download woff2 files into `public/fonts/`**

Use [google-webfonts-helper](https://gwfh.mranftl.com/fonts) (or fontsource unpkg URLs) to fetch woff2 for:
- Instrument Sans — weights 400, 500, 600 (latin)
- Newsreader — weights 300, 400, 500 (latin), plus 400 italic
- Spline Sans Mono — weights 400, 500 (latin)

Save as e.g. `public/fonts/instrument-sans-400.woff2`, `newsreader-300.woff2`, `spline-sans-mono-400.woff2`, etc. Example fetch:

```bash
mkdir -p public/fonts
# from fontsource CDN (self-hosting the file locally — no runtime CDN call):
curl -L -o public/fonts/instrument-sans-400.woff2 https://cdn.jsdelivr.net/fontsource/fonts/instrument-sans@latest/latin-400-normal.woff2
curl -L -o public/fonts/instrument-sans-500.woff2 https://cdn.jsdelivr.net/fontsource/fonts/instrument-sans@latest/latin-500-normal.woff2
curl -L -o public/fonts/instrument-sans-600.woff2 https://cdn.jsdelivr.net/fontsource/fonts/instrument-sans@latest/latin-600-normal.woff2
curl -L -o public/fonts/newsreader-300.woff2 https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-300-normal.woff2
curl -L -o public/fonts/newsreader-400.woff2 https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-400-normal.woff2
curl -L -o public/fonts/newsreader-400-italic.woff2 https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-400-italic.woff2
curl -L -o public/fonts/newsreader-500.woff2 https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-500-normal.woff2
curl -L -o public/fonts/spline-sans-mono-400.woff2 https://cdn.jsdelivr.net/fontsource/fonts/spline-sans-mono@latest/latin-400-normal.woff2
curl -L -o public/fonts/spline-sans-mono-500.woff2 https://cdn.jsdelivr.net/fontsource/fonts/spline-sans-mono@latest/latin-500-normal.woff2
```

- [ ] **Step 2: Prepend `@font-face` rules to `src/styles.css`**

```css
@font-face { font-family:'Instrument Sans'; font-weight:400; font-display:swap; src:url('/fonts/instrument-sans-400.woff2') format('woff2'); }
@font-face { font-family:'Instrument Sans'; font-weight:500; font-display:swap; src:url('/fonts/instrument-sans-500.woff2') format('woff2'); }
@font-face { font-family:'Instrument Sans'; font-weight:600; font-display:swap; src:url('/fonts/instrument-sans-600.woff2') format('woff2'); }
@font-face { font-family:'Newsreader'; font-weight:300; font-display:swap; src:url('/fonts/newsreader-300.woff2') format('woff2'); }
@font-face { font-family:'Newsreader'; font-weight:400; font-display:swap; src:url('/fonts/newsreader-400.woff2') format('woff2'); }
@font-face { font-family:'Newsreader'; font-weight:400; font-style:italic; font-display:swap; src:url('/fonts/newsreader-400-italic.woff2') format('woff2'); }
@font-face { font-family:'Newsreader'; font-weight:500; font-display:swap; src:url('/fonts/newsreader-500.woff2') format('woff2'); }
@font-face { font-family:'Spline Sans Mono'; font-weight:400; font-display:swap; src:url('/fonts/spline-sans-mono-400.woff2') format('woff2'); }
@font-face { font-family:'Spline Sans Mono'; font-weight:500; font-display:swap; src:url('/fonts/spline-sans-mono-500.woff2') format('woff2'); }
```

- [ ] **Step 3: Verify fonts load with no network**

Run: `npm run dev`, open DevTools → Network, filter `Font`. Reload.
Expected: fonts load from `/fonts/*.woff2` (same origin), zero requests to `fonts.googleapis.com` / `fonts.gstatic.com`. Headings render in Newsreader serif.

- [ ] **Step 4: Commit**

```bash
git add public/fonts src/styles.css
git commit -m "feat: self-host fonts (Newsreader, Instrument Sans, Spline Sans Mono)"
```

---

### Task 13: Service worker + PWA (offline app shell)

**Dependency sign-off required:** this task adds `vite-plugin-pwa` (dev dependency). Confirm before installing.

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `vite.config.js`, `index.html`

**Interfaces:**
- Consumes: the built app shell.
- Produces: an installable PWA whose shell + fonts are cached for offline use.

- [ ] **Step 1: Install the plugin**

Run: `npm install -D vite-plugin-pwa`
Expected: added to devDependencies.

- [ ] **Step 2: Add app icons**

Create `public/icon-192.png` and `public/icon-512.png` (simple mark on the paper background `#ebe4d6`; any 192/512 PNG is fine for v1).

- [ ] **Step 3: Create `public/manifest.webmanifest`**

```json
{
	"name": "New Tab Dashboard",
	"short_name": "New Tab",
	"start_url": "./",
	"display": "standalone",
	"background_color": "#ebe4d6",
	"theme_color": "#ebe4d6",
	"icons": [
		{ "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
		{ "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
	]
}
```

- [ ] **Step 4: Wire the plugin in `vite.config.js`**

```js
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	base: './',
	plugins: [
		preact(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: false, // use public/manifest.webmanifest
			workbox: {
				globPatterns: ['**/*.{js,css,html,woff2,png}'],
				navigateFallback: 'index.html',
			},
		}),
	],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test-setup.js'],
	},
});
```

- [ ] **Step 5: Link the manifest in `index.html`** (add inside `<head>`)

```html
<link rel="manifest" href="./manifest.webmanifest" />
<meta name="theme-color" content="#ebe4d6" />
```

- [ ] **Step 6: Verify offline**

Run: `npm run build && npm run preview`. Open the preview URL.
- [ ] DevTools → Application → Service Workers shows an active worker.
- [ ] DevTools → Network → set **Offline**, reload → the dashboard still loads fully (shell + fonts from cache).
- [ ] Application → Manifest shows installable; install prompt available.

- [ ] **Step 7: Run test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add vite.config.js index.html public/manifest.webmanifest public/icon-192.png public/icon-512.png package.json package-lock.json
git commit -m "feat: service worker and PWA manifest for offline app shell"
```

---

### Task 14: README + deploy notes

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: contributor-facing run/build/deploy instructions; sets the new-tab URL.

- [ ] **Step 1: Write `README.md`**

```markdown
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
To-do / scratchpad / snippets widgets, local-folder JSON sync, AI-agent write path, third-party widgets.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with run and deploy instructions"
```

---

## Self-Review

**Spec coverage:**
- Fully offline → Tasks 12 (fonts) + 13 (SW). ✓
- Widget-board / 12-col / drag+resize → Tasks 9 + 11 (gridstack). ✓
- v1 widgets (bookmarks/single/datetime/divider/spacer) → Tasks 4–8. ✓ To-do/scratch/snippets excluded (registry + defaults enforce v1 set; tests assert it). ✓
- Themes: light/dark, 7 tints, accent → Tasks 2, 5, 10. ✓
- Custom widget color + contrast → Task 2 (`foregroundFor`). *Note:* preset tints wired in Task 5; the custom-color path uses `foregroundFor` and is available for a follow-up UI hook — Card's background menu currently exposes the 7 presets (matches design). Custom-color picker is a small additive step; flagged, not blocking.
- localStorage single key + migration seam → Task 3. ✓
- Container width fixed/full → Tasks 10 + 11. ✓
- Favicon opt-in remote, others offline → Task 4. ✓
- Instant paint (sync load) → Task 3 `loadState` sync + Task 11 initial state. ✓
- Responsive collapse → Task 9 gridstack + Task 11 checklist. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; test steps include real assertions. ✓

**Type consistency:** `newWidget(type, accent)`, `mergeGeometry(widgets, nodes)`, `tintPalette(id, theme)`, `pagePalette(theme)`, `foregroundFor(hex)`, `greeting(hour)`, `loadState/saveState/uid/defaultState`, widget props `{ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove }` (DateTime adds `now`) — names consistent across tasks. ✓

**Gap noted (non-blocking):** the custom per-widget background color picker (beyond the 7 presets) is scaffolded via `foregroundFor` but not surfaced in the Card menu in v1; it matches the design, which ships presets only. Add as a fast-follow if desired.
