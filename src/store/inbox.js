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
