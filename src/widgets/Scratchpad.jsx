import { h } from 'preact';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';

/**
 * Free-text note widget. One textarea, autosaves via onPatch.
 * @param {object} props
 */
export function Scratchpad(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const children = h('textarea', {
		value: w.text || '',
		placeholder: 'Notes…',
		onInput: (e) => onPatch({ text: e.currentTarget.value }),
		style: { width:'100%', height:'100%', minHeight:80, boxSizing:'border-box', resize:'none', border:'none', outline:'none', background:'transparent', color:p.fg, font:"400 14px 'Instrument Sans'", lineHeight:1.5 },
	});
	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}
