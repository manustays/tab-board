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
