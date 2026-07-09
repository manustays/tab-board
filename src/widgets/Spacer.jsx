import { h } from 'preact';
import { pagePalette } from '../theme/palettes.js';

/**
 * Empty spacer with dashed outline only in edit mode. Bare widget (no Card).
 * @param {{editing:boolean, theme:'light'|'dark', w:number}} props
 */
export function Spacer({ editing, theme }) {
	const pg = pagePalette(theme);
	return h('div', { style:{ height:'100%', border: editing ? `1.5px dashed ${pg.line}` : 'none', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center' } },
		editing ? h('span', { style:{ font:"500 10px 'Spline Sans Mono',monospace", color:pg.head, letterSpacing:'.1em' } }, 'SPACER') : null
	);
}
