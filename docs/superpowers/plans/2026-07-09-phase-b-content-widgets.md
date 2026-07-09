# Phase B — Content Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three "content" widgets — scratchpad (free-text note), to-do (checklist), and snippets (copy-to-clipboard list) — reusing the existing widget architecture with no new dependencies and no store changes.

**Architecture:** Each widget is a Preact component (`h()` hyperscript, matching the codebase) wrapped in the existing `Card` shell, receiving the standard props `{ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove }`. Content mutates via `onPatch(partial)` and persists through the existing debounced `saveState`. Interaction is "always-live": content is usable without entering edit mode; edit mode only gates structural/appearance controls. The three components are then registered in `registry.js`.

**Tech Stack:** Preact + `preact/hooks` (`useState` for ephemeral UI state), Vitest + @testing-library/preact + jsdom. Existing `Card`, `tintPalette`, `uid`.

## Global Constraints

- **No new dependencies.** Preact, hooks, and existing modules only.
- **No store.js changes.** New widget types persist through the existing blob; `migrate()` already passes `widgets` through untouched.
- **Widget component convention:** use `h()` hyperscript (not JSX), even in `.jsx` files — match every existing widget.
- **Standard props:** every widget takes `{ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove }` and renders content as `Card` children.
- **Palette:** resolve colors via `tintPalette(w.tint, theme)` → `p`; use `p.fg`, `p.mut`, `p.line`, `p.bg`. Delete-red accent is `#c0603f` (as in existing widgets).
- **Ids:** item ids via `uid()` from `../store/store.js`.
- **Code style:** tabs for indentation; JSDoc on every exported function.
- **Commits:** conventional commits, no `Co-Authored-By` trailer.
- **No `alert`/`confirm`:** deletes are immediate, matching existing widgets.

---

### Task 1: Scratchpad widget

**Files:**
- Create: `src/widgets/Scratchpad.jsx`
- Create: `src/widgets/content.test.jsx`

**Interfaces:**
- Consumes: `Card` from `./Card.jsx`, `tintPalette` from `../theme/palettes.js`.
- Produces: `Scratchpad({ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove })` — Preact component. Reads `w.text` (string), writes via `onPatch({ text })` on every input.

- [ ] **Step 1: Write the failing test `src/widgets/content.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { Scratchpad } from './Scratchpad.jsx';

describe('Scratchpad', () => {
	it('typing patches text', () => {
		const onPatch = vi.fn();
		const w = { id:'1', type:'scratchpad', title:'Notes', tint:'paper', w:3, text:'' };
		const { getByPlaceholderText } = render(h(Scratchpad, { w, editing:false, accent:'#c96442', theme:'light', menuOpen:false, onToggleMenu:vi.fn(), onPatch, onRemove:vi.fn() }));
		fireEvent.input(getByPlaceholderText('Notes…'), { target:{ value:'buy milk' } });
		expect(onPatch).toHaveBeenCalledWith({ text:'buy milk' });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- content`
Expected: FAIL (`Scratchpad` module missing).

- [ ] **Step 3: Implement `src/widgets/Scratchpad.jsx`**

```jsx
import { h } from 'preact';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';

/**
 * Free-text note widget. One textarea, autosaves via onPatch.
 * @param {object} props
 */
export function Scratchpad(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const children = h('textarea', {
		value: w.text || '',
		placeholder: 'Notes…',
		onInput: (e) => onPatch({ text: e.currentTarget.value }),
		style: { width:'100%', height:'100%', minHeight:80, boxSizing:'border-box', resize:'none', border:'none', outline:'none', background:'transparent', color:p.fg, font:"400 14px 'Instrument Sans'", lineHeight:1.5 },
	});
	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- content`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/Scratchpad.jsx src/widgets/content.test.jsx
git commit -m "feat: scratchpad content widget"
```

---

### Task 2: To-do widget

**Files:**
- Create: `src/widgets/Todo.jsx`
- Modify: `src/widgets/content.test.jsx` (append a `Todo` describe block)

**Interfaces:**
- Consumes: `Card`, `tintPalette`, `uid` from `../store/store.js`, `useState` from `preact/hooks`.
- Produces: `Todo({ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove })`. Reads `w.items: [{id,text,done}]`. Live actions: toggle done, add task (inline input, Enter), delete task — each writes via `onPatch({ items })`.

- [ ] **Step 1: Write the failing test (append to `src/widgets/content.test.jsx`)**

Add these imports to the top of the file (merge with the existing import line):

```jsx
import { Todo } from './Todo.jsx';
```

Append this block:

```jsx
const todoW = { id:'1', type:'todo', title:'Tasks', tint:'paper', w:3, items:[{ id:'a', text:'ship it', done:false }] };

describe('Todo', () => {
	it('toggling a checkbox flips done', () => {
		const onPatch = vi.fn();
		const { getByLabelText } = render(h(Todo, { w:todoW, editing:false, accent:'#c96442', theme:'light', menuOpen:false, onToggleMenu:vi.fn(), onPatch, onRemove:vi.fn() }));
		fireEvent.click(getByLabelText('check'));
		expect(onPatch).toHaveBeenCalledWith({ items:[{ id:'a', text:'ship it', done:true }] });
	});
	it('Enter in the add input appends a task', () => {
		const onPatch = vi.fn();
		const { getByPlaceholderText } = render(h(Todo, { w:todoW, editing:false, accent:'#c96442', theme:'light', menuOpen:false, onToggleMenu:vi.fn(), onPatch, onRemove:vi.fn() }));
		const input = getByPlaceholderText('Add task');
		fireEvent.input(input, { target:{ value:'new task' } });
		fireEvent.keyDown(input, { key:'Enter' });
		expect(onPatch).toHaveBeenCalledWith({ items:[{ id:'a', text:'ship it', done:false }, expect.objectContaining({ text:'new task', done:false })] });
	});
	it('delete removes a task', () => {
		const onPatch = vi.fn();
		const { getByLabelText } = render(h(Todo, { w:todoW, editing:false, accent:'#c96442', theme:'light', menuOpen:false, onToggleMenu:vi.fn(), onPatch, onRemove:vi.fn() }));
		fireEvent.click(getByLabelText('delete task'));
		expect(onPatch).toHaveBeenCalledWith({ items:[] });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- content`
Expected: FAIL (`Todo` module missing).

- [ ] **Step 3: Implement `src/widgets/Todo.jsx`**

```jsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';
import { uid } from '../store/store.js';

/**
 * Checklist widget. Always-live: check/add/delete without edit mode.
 * @param {object} props
 */
export function Todo(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const items = w.items || [];
	const [draft, setDraft] = useState('');

	function toggle(it) {
		onPatch({ items: items.map((x) => x.id === it.id ? { ...x, done: !x.done } : x) });
	}
	function del(it) {
		onPatch({ items: items.filter((x) => x.id !== it.id) });
	}
	function add() {
		const text = draft.trim();
		if (!text) return;
		onPatch({ items: items.concat({ id: uid(), text, done: false }) });
		setDraft('');
	}

	const rows = items.map((it) => h('div', { key:it.id, style:{ display:'flex', alignItems:'center', gap:10, padding:'5px 0' } },
		h('button', { onClick:() => toggle(it), 'aria-label': it.done ? 'uncheck' : 'check',
			style:{ width:18, height:18, flex:'none', borderRadius:5, border:`1.5px solid ${it.done ? accent : p.mut}`, background:it.done ? accent : 'transparent', color:'#fff', cursor:'pointer', font:'11px sans-serif', lineHeight:1, padding:0 } }, it.done ? '✓' : ''),
		h('span', { style:{ flex:1, font:"400 14px 'Instrument Sans'", color:it.done ? p.mut : p.fg, textDecoration:it.done ? 'line-through' : 'none' } }, it.text),
		h('button', { onClick:() => del(it), 'aria-label':'delete task', style:{ border:'none', background:'transparent', color:p.mut, cursor:'pointer', fontSize:14, padding:'0 2px', lineHeight:1 } }, '×')
	));

	const addRow = h('div', { key:'add', style:{ display:'flex', alignItems:'center', gap:10, padding:'5px 0' } },
		h('span', { style:{ width:18, height:18, flex:'none', borderRadius:5, border:`1.5px dashed ${p.mut}`, boxSizing:'border-box' } }),
		h('input', { value:draft, placeholder:'Add task', onInput:(e) => setDraft(e.currentTarget.value),
			onKeyDown:(e) => { if (e.key === 'Enter') add(); },
			style:{ flex:1, border:'none', outline:'none', background:'transparent', color:p.fg, font:"400 14px 'Instrument Sans'" } })
	);

	const children = h('div', { style:{ display:'flex', flexDirection:'column' } }, rows.concat([addRow]));
	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- content`
Expected: PASS (Scratchpad + 3 Todo tests).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/Todo.jsx src/widgets/content.test.jsx
git commit -m "feat: to-do checklist content widget"
```

---

### Task 3: Snippets widget

**Files:**
- Create: `src/widgets/Snippets.jsx`
- Modify: `src/widgets/content.test.jsx` (append a `Snippets` describe block)

**Interfaces:**
- Consumes: `Card`, `tintPalette`, `uid`, `useState`.
- Produces: `Snippets({ w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove })`. Reads `w.items: [{id,label,body}]`. Live: click a row → `navigator.clipboard.writeText(body)`, shows "Copied" ~1s. Edit mode: add/edit (via `window.prompt` for label then body) and delete, each via `onPatch({ items })`.

- [ ] **Step 1: Write the failing test (append to `src/widgets/content.test.jsx`)**

Add to the import at the top:

```jsx
import { Snippets } from './Snippets.jsx';
```

Append this block:

```jsx
describe('Snippets', () => {
	it('clicking a snippet copies its body', () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		const w = { id:'1', type:'snippets', title:'Snips', tint:'paper', w:3, items:[{ id:'a', label:'Email', body:'me@x.com' }] };
		const { getByText } = render(h(Snippets, { w, editing:false, accent:'#c96442', theme:'light', menuOpen:false, onToggleMenu:vi.fn(), onPatch:vi.fn(), onRemove:vi.fn() }));
		fireEvent.click(getByText('Email'));
		expect(writeText).toHaveBeenCalledWith('me@x.com');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- content`
Expected: FAIL (`Snippets` module missing).

- [ ] **Step 3: Implement `src/widgets/Snippets.jsx`**

```jsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';
import { uid } from '../store/store.js';

/**
 * Copy-to-clipboard snippet list. Live: click to copy. Edit mode: add/edit/delete.
 * @param {object} props
 */
export function Snippets(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const items = w.items || [];
	const [copied, setCopied] = useState(null);

	function copy(it) {
		if (!navigator.clipboard) return;
		navigator.clipboard.writeText(it.body).then(() => {
			setCopied(it.id);
			setTimeout(() => setCopied(null), 1000);
		}).catch(() => { /* insecure context / denied: no feedback */ });
	}
	/** @param {object|null} it existing snippet, or null to add */
	function edit(it) {
		const label = window.prompt('Label', it ? it.label : ''); if (label === null) return;
		const body = window.prompt('Snippet text', it ? it.body : ''); if (body === null) return;
		if (it) onPatch({ items: items.map((x) => x.id === it.id ? { ...x, label, body } : x) });
		else onPatch({ items: items.concat({ id: uid(), label, body }) });
	}
	function del(it) {
		onPatch({ items: items.filter((x) => x.id !== it.id) });
	}

	const rows = items.map((it) => h('div', { key:it.id, style:{ display:'flex', alignItems:'center', gap:8, padding:'7px 0' } },
		h('button', { onClick:() => copy(it), style:{ flex:1, textAlign:'left', border:'none', background:'transparent', cursor:'pointer', padding:0, minWidth:0 } },
			h('div', { style:{ font:"500 13px 'Instrument Sans'", color:p.fg } }, copied === it.id ? 'Copied' : it.label),
			h('div', { style:{ font:"400 12px 'Spline Sans Mono',monospace", color:p.mut, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, it.body)),
		editing ? h('span', { style:{ display:'flex', gap:4, flex:'none' } },
			h('button', { onClick:() => edit(it), 'aria-label':'edit snippet', style:miniBtn(p.mut) }, '✎'),
			h('button', { onClick:() => del(it), 'aria-label':'delete snippet', style:miniBtn('#c0603f') }, '×')) : null
	));

	const addBtn = editing ? h('button', { key:'add', onClick:() => edit(null),
		style:{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', border:'none', background:'transparent', cursor:'pointer', width:'100%', color:p.mut, font:"400 13px 'Instrument Sans'" } }, '+ Add snippet') : null;

	const children = h('div', { style:{ display:'flex', flexDirection:'column' } }, rows.concat(addBtn ? [addBtn] : []));
	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}

const miniBtn = (color) => ({ border:'none', background:'transparent', color, cursor:'pointer', fontSize:12, padding:'0 2px', lineHeight:1 });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- content`
Expected: PASS (Scratchpad + Todo + Snippets tests).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/Snippets.jsx src/widgets/content.test.jsx
git commit -m "feat: snippets content widget (click-to-copy)"
```

---

### Task 4: Register widgets + update README

**Files:**
- Modify: `src/widgets/registry.js`
- Modify: `src/widgets/registry.test.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: `Todo`, `Scratchpad`, `Snippets` from their modules.
- Produces: `WIDGET_COMPONENTS`, `ADD_MENU`, `newWidget` extended with `todo`, `scratchpad`, `snippets`. These are the entries the app's render loop and add-widget menu read.

- [ ] **Step 1: Update the registry test first (`src/widgets/registry.test.js`)**

The existing `only exposes v1 types` test asserts a fixed allowed-set of five types; adding three types breaks it. Widen the allowed set and assert the new types are present. Replace the `only exposes v1 types` test with:

```js
	it('exposes exactly the supported widget types', () => {
		const allowed = new Set(['bookmarks','single','datetime','divider','spacer','todo','scratchpad','snippets']);
		for (const [type] of ADD_MENU) expect(allowed.has(type)).toBe(true);
	});
	it('registers the content widgets', () => {
		for (const type of ['todo','scratchpad','snippets']) {
			expect(WIDGET_COMPONENTS[type]).toBeTruthy();
			expect(ADD_MENU.some(([t]) => t === type)).toBe(true);
			const w = newWidget(type, '#c96442');
			expect(w.type).toBe(type);
			expect(w.w).toBeGreaterThanOrEqual(2);
			expect(w.h).toBeGreaterThanOrEqual(1);
		}
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- registry`
Expected: FAIL (`registers the content widgets` — components/menu/factory entries missing).

- [ ] **Step 3: Update `src/widgets/registry.js`**

Add imports after the existing widget imports (line 5 area):

```js
import { Todo } from './Todo.jsx';
import { Scratchpad } from './Scratchpad.jsx';
import { Snippets } from './Snippets.jsx';
```

Add to `WIDGET_COMPONENTS` (after `spacer: Spacer,`):

```js
	todo: Todo,
	scratchpad: Scratchpad,
	snippets: Snippets,
```

Add to `ADD_MENU` (after the `spacer` row):

```js
	['todo', 'To-do'],
	['scratchpad', 'Scratchpad'],
	['snippets', 'Snippets'],
```

Add these cases to `newWidget`'s switch (before `default:`):

```js
		case 'todo':       return { id, type, title:'To-do', tint:'paper', w:3, h:3, items:[] };
		case 'scratchpad': return { id, type, title:'Notes', tint:'paper', w:3, h:3, text:'' };
		case 'snippets':   return { id, type, title:'Snippets', tint:'paper', w:3, h:3, items:[] };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- registry`
Expected: PASS.

- [ ] **Step 5: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS (all files, including content + registry).

- [ ] **Step 6: Update `README.md` roadmap**

Find the roadmap line under `## Roadmap (post-v1)`:

```
To-do / scratchpad / snippets widgets, local-folder JSON sync, AI-agent write path, third-party widgets.
```

Replace it with (the three widgets are now shipped):

```
Local-folder JSON sync, AI-agent write path, third-party widgets.
```

- [ ] **Step 7: Commit**

```bash
git add src/widgets/registry.js src/widgets/registry.test.js README.md
git commit -m "feat: register content widgets and update roadmap"
```

---

## Manual verification

After Task 4, verify in the real app (gridstack DOM behavior is not covered by jsdom tests):

- [ ] `npm run dev`, open the page.
- [ ] Enter edit mode → "Add widget" menu shows To-do, Scratchpad, Snippets.
- [ ] Add each. Exit edit mode.
- [ ] To-do: type a task + Enter → appears; check it → strikethrough; × removes it — all without edit mode.
- [ ] Scratchpad: type; reload page → text persists.
- [ ] Snippets: enter edit mode, add a snippet (two prompts); exit; click it → "Copied" flashes and clipboard holds the body.
- [ ] Each widget's ••• menu (edit mode) changes tint and deletes the widget.
