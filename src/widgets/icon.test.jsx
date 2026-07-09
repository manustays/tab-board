import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { h } from 'preact';
import { Icon } from './icon.jsx';

const p = { tile:'#eee', tfg:'#333' };

describe('Icon', () => {
	it('mono mode shows the initials', () => {
		const { getByText } = render(h(Icon, { item:{ ini:'GH', color:'#000', url:'https://x' }, size:26, mode:'mono', p }));
		expect(getByText('GH')).toBeInTheDocument();
	});
	it('favicon mode renders an img to the site domain', () => {
		const { container } = render(h(Icon, { item:{ ini:'G', color:'#000', url:'https://github.com' }, size:40, mode:'favicon', p }));
		const img = container.querySelector('img');
		expect(img).toBeTruthy();
		expect(img.getAttribute('src')).toContain('github.com');
	});
	it('dot mode renders no text', () => {
		const { container } = render(h(Icon, { item:{ ini:'X', color:'#f00', url:'' }, size:9, mode:'dot', p }));
		expect(container.textContent).toBe('');
	});
});
