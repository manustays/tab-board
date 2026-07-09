import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { Scratchpad } from './Scratchpad.jsx';
import { Todo } from './Todo.jsx';

describe('Scratchpad', () => {
	it('typing patches text', () => {
		const onPatch = vi.fn();
		const w = { id:'1', type:'scratchpad', title:'Notes', tint:'paper', w:3, text:'' };
		const { getByPlaceholderText } = render(h(Scratchpad, { w, editing:false, accent:'#c96442', theme:'light', menuOpen:false, onToggleMenu:vi.fn(), onPatch, onRemove:vi.fn() }));
		fireEvent.input(getByPlaceholderText('Notes…'), { target:{ value:'buy milk' } });
		expect(onPatch).toHaveBeenCalledWith({ text:'buy milk' });
	});
});

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
