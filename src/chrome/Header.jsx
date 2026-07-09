import { h } from 'preact';
import { greeting } from './greeting.js';

/** @param {object} props */
export function Header({ pg, name, now, editing, onName }) {
	const dateStr = now.toLocaleDateString([], { weekday:'long', day:'numeric', month:'long' }).toUpperCase();
	const timeStr = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
	const nameEl = editing
		? h('input', { value:name, onInput:(e) => onName(e.currentTarget.value),
			style:{ border:'none', borderBottom:`1px dashed ${pg.mut}`, background:'transparent', color:pg.fg, font:"400 clamp(28px,4vw,38px) 'Newsreader',serif", width:'5ch', outline:'none' } })
		: name;
	return h('div', null,
		h('div', { style:{ font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.2em', color:pg.head } }, dateStr),
		h('div', { style:{ display:'flex', alignItems:'baseline', gap:14, marginTop:13 } },
			h('div', { style:{ font:"400 clamp(28px,4vw,38px)/1.02 'Newsreader',serif", letterSpacing:'-.01em' } }, greeting(now.getHours()) + ', ', nameEl),
			h('div', { style:{ font:"400 16px 'Spline Sans Mono',monospace", color:pg.head } }, timeStr))
	);
}
