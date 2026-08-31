import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { moveItem } from './dnd.js';
import { Todo } from './Todo.jsx';
import { Snippets } from './Snippets.jsx';

const list = (id, ...ids) => ({ id, type:'todo', items: ids.map((x) => ({ id:x, text:x, done:false })) });
const ids = (widgets, id) => widgets.find((w) => w.id === id).items.map((x) => x.id);

describe('moveItem', () => {
	it('reorders within one widget', () => {
		const out = moveItem([list('w', 'a', 'b', 'c')], 'w', 'c', 'w', 0);
		expect(ids(out, 'w')).toEqual(['c', 'a', 'b']);
	});
	it('accounts for the vacated slot when moving down', () => {
		const out = moveItem([list('w', 'a', 'b', 'c')], 'w', 'a', 'w', 2);
		expect(ids(out, 'w')).toEqual(['b', 'a', 'c']);
	});
	it('dropping past the last row lands last', () => {
		const out = moveItem([list('w', 'a', 'b', 'c')], 'w', 'a', 'w', 3);
		expect(ids(out, 'w')).toEqual(['b', 'c', 'a']);
	});
	it('moves between widgets, at the given index', () => {
		const out = moveItem([list('x', 'a', 'b'), list('y', 'c')], 'x', 'b', 'y', 0);
		expect(ids(out, 'x')).toEqual(['a']);
		expect(ids(out, 'y')).toEqual(['b', 'c']);
	});
	it('ignores an unknown source widget or item', () => {
		const widgets = [list('w', 'a')];
		expect(moveItem(widgets, 'nope', 'a', 'w', 0)).toBe(widgets);
		expect(moveItem(widgets, 'w', 'nope', 'w', 0)).toBe(widgets);
	});
	it('does not mutate the input', () => {
		const widgets = [list('w', 'a', 'b')];
		moveItem(widgets, 'w', 'b', 'w', 0);
		expect(ids(widgets, 'w')).toEqual(['a', 'b']);
	});
});

/** Minimal stand-in for the real DataTransfer; jsdom ships none. */
const dt = () => ({ setData: vi.fn(), effectAllowed:'', dropEffect:'' });
const props = (w, extra) => ({ w, editing:true, accent:'#c96442', theme:'light', menuOpen:false,
	onToggleMenu:vi.fn(), onPatch:vi.fn(), onRemove:vi.fn(), ...extra });
const rows = (c) => Array.from(c.querySelectorAll('[draggable="true"]'));

describe('item drag and drop', () => {
	it('dragging a task onto an earlier one moves it there', () => {
		const onMoveItem = vi.fn();
		const w = { id:'t1', type:'todo', title:'T', tint:'paper', items:[
			{ id:'a', text:'first', done:false }, { id:'b', text:'second', done:false } ] };
		const { container } = render(h(Todo, props(w, { onMoveItem })));
		const [first, second] = rows(container);
		const transfer = dt();
		fireEvent.dragStart(second, { dataTransfer: transfer });
		fireEvent.dragOver(first, { dataTransfer: transfer, clientY: 0 });
		fireEvent.drop(first, { dataTransfer: transfer });
		expect(onMoveItem).toHaveBeenCalledWith('t1', 'b', 't1', 0);
	});

	it('a drag started in one widget drops into another of the same kind', () => {
		const onMoveItem = vi.fn();
		const src = { id:'t1', type:'todo', title:'A', tint:'paper', items:[{ id:'a', text:'x', done:false }] };
		const dst = { id:'t2', type:'todo', title:'B', tint:'paper', items:[{ id:'b', text:'y', done:false }] };
		const a = render(h(Todo, props(src, { onMoveItem })));
		const b = render(h(Todo, props(dst, { onMoveItem })));
		const transfer = dt();
		fireEvent.dragStart(rows(a.container)[0], { dataTransfer: transfer });
		const target = rows(b.container)[0];
		fireEvent.dragOver(target, { dataTransfer: transfer, clientY: 0 });
		fireEvent.drop(target, { dataTransfer: transfer });
		expect(onMoveItem).toHaveBeenCalledWith('t1', 'a', 't2', 0);
	});

	it('an incompatible widget kind refuses the drop', () => {
		const onMoveItem = vi.fn();
		const todo = { id:'t1', type:'todo', title:'A', tint:'paper', items:[{ id:'a', text:'x', done:false }] };
		const snip = { id:'s1', type:'snippets', title:'B', tint:'paper', items:[{ id:'b', label:'L', body:'B' }] };
		const a = render(h(Todo, props(todo, { onMoveItem })));
		const b = render(h(Snippets, props(snip, { onMoveItem })));
		const transfer = dt();
		fireEvent.dragStart(rows(a.container)[0], { dataTransfer: transfer });
		const target = rows(b.container)[0];
		fireEvent.dragOver(target, { dataTransfer: transfer, clientY: 0 });
		fireEvent.drop(target, { dataTransfer: transfer });
		expect(onMoveItem).not.toHaveBeenCalled();
	});

	it('items are not draggable outside edit mode', () => {
		const w = { id:'t1', type:'todo', title:'T', tint:'paper', items:[{ id:'a', text:'x', done:false }] };
		const { container } = render(h(Todo, props(w, { editing:false, onMoveItem:vi.fn() })));
		expect(rows(container)).toHaveLength(0);
	});
});
