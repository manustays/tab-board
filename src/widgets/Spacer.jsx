import { h } from 'preact';
import { pagePalette } from '../theme/palettes.js';

/**
 * Empty spacer with dashed outline only in edit mode. Bare widget (no Card).
 * @param {{editing:boolean, theme:'light'|'dark', onRemove:Function}} props
 */
export function Spacer({ editing, theme, onRemove }) {
	const pg = pagePalette(theme);
	return h('div', { style:{ height:'100%', border: editing ? `1.5px dashed ${pg.line}` : 'none', borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 } },
		editing ? h('span', { style:{ font:"500 10px 'Spline Sans Mono',monospace", color:pg.head, letterSpacing:'.1em' } }, 'SPACER') : null,
		editing ? h('button', { onClick:onRemove, style:{ border:'none', background:'transparent', color:pg.head, cursor:'pointer', font:"500 10px 'Spline Sans Mono',monospace" } }, 'remove spacer') : null
	);
}
