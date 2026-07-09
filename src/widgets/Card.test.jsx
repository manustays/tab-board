import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';

const base = { w:{ id:'1', type:'bookmarks', title:'Daily', tint:'paper', w:4 }, accent:'#c96442', theme:'light', p:tintPalette('paper','light') };

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
