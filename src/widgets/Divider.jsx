import { h } from 'preact';
import { pagePalette } from '../theme/palettes.js';

/**
 * Full-width hairline divider. Bare widget (no Card).
 * @param {{editing:boolean, theme:'light'|'dark', onRemove:Function}} props
 */
export function Divider({ editing, theme, onRemove }) {
	const pg = pagePalette(theme);
	return h('div', { style:{ display:'flex', alignItems:'center', gap:12, padding:'4px 0', height:'100%' } },
		h('div', { style:{ flex:1, height:1, background:pg.line } }),
		editing ? h('button', { onClick:onRemove, style:{ border:'none', background:'transparent', color:pg.head, cursor:'pointer', font:"500 10px 'Spline Sans Mono',monospace" } }, 'remove divider') : null
	);
}
