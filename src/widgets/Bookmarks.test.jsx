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
