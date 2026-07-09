import { h } from 'preact';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';

/**
 * Large serif time and date display. Formats from injected `now` prop, never reads system time.
 * @param {object} props
 */
export function DateTime(props) {
	const { w, editing, accent, theme, now, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const time = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
	const date = now.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
	const children = h('div', { style:{ display:'flex', flexDirection:'column', gap:6, minHeight:80, justifyContent:'center' } },
		h('div', { style:{ font:"300 40px/1 'Newsreader',serif", color:p.fg, letterSpacing:'-.01em' } }, time),
		h('div', { style:{ font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.12em', textTransform:'uppercase', color:p.mut } }, date)
	);
	return h(Card, { w:{ ...w, title:w.title || '' }, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}
