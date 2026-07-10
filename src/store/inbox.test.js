import { describe, it, expect } from 'vitest';
import { applyOps, AGENTS_DOC, INBOX_FILE } from './inbox.js';

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
