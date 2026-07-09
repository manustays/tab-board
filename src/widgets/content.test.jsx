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
