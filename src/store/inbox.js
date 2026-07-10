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
