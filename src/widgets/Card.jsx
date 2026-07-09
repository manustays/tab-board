import { h } from 'preact';
import { TINTS, TINT_KEYS, tintPalette } from '../theme/palettes.js';

/**
 * Tinted widget shell with title row and edit-mode chrome.
 * @param {object} props
 */
export function Card(props) {
	const { w, p, editing, accent, theme, children, onPatch, onRemove, menuOpen, onToggleMenu, extraMenu } = props;
	const showTitle = w.title !== undefined && (w.title !== '' || editing);

	const titleEl = showTitle
		? (editing
			? h('input', { value:w.title, placeholder:'Title', onInput:(e) => onPatch({ title:e.currentTarget.value }),
				style:{ border:'none', background:'transparent', color:p.mut, font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.16em', textTransform:'uppercase', outline:'none', width:'60%' } })
			: h('div', { style:{ font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.16em', textTransform:'uppercase', color:p.mut } }, w.title))
		: h('span');

	const ctrl = editing ? h('div', { style:{ display:'flex', alignItems:'center', gap:2, position:'relative' } },
		h('button', { onClick:onToggleMenu, style:btn(p) }, '•••'),
		menuOpen ? menu() : null
	) : null;

	function menu() {
		return h('div', { style:menuStyle(p) },
			extraMenu ? extraMenu() : null,
			h('div', { style:{ padding:'8px 12px' } },
				h('div', { style:menuLabel(p) }, 'Background'),
				h('div', { style:{ display:'flex', flexWrap:'wrap', gap:7 } }, TINT_KEYS.map((k) => {
					const tp = tintPalette(k, theme);
					return h('button', { key:k, title:TINTS[k].name, onClick:() => onPatch({ tint:k }),
						style:{ width:24, height:24, borderRadius:7, background:tp.bg, border:w.tint === k ? `2px solid ${accent}` : `1px solid ${p.line}`, cursor:'pointer', padding:0 } });
				}))
			),
			h('div', { style:{ height:1, background:p.line } }),
			h('button', { onClick:onRemove, style:{ display:'block', width:'100%', textAlign:'left', padding:'10px 12px', border:'none', background:'transparent', color:'#c0603f', font:"500 12px 'Instrument Sans'", cursor:'pointer' } }, 'Delete widget')
		);
	}

	return h('div', { style:{ background:p.bg, border:`1px solid ${p.line}`, borderRadius:18, padding:'20px 22px', color:p.fg, height:'100%', boxSizing:'border-box', position:'relative', boxShadow: theme === 'dark' ? '0 1px 2px rgba(0,0,0,.25)' : '0 1px 2px rgba(70,58,44,.05)' } },
		h('div', { style:{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:(w.title || editing) ? 14 : 0 } }, titleEl, ctrl),
		children
	);
}

const btn = (p) => ({ border:'none', background:'transparent', color:p.mut, cursor:'pointer', font:"500 11px 'Instrument Sans'", padding:'2px 5px', borderRadius:6, lineHeight:1 });
const menuStyle = (p) => ({ position:'absolute', top:26, right:0, zIndex:40, minWidth:180, background:p.bg, border:`1px solid ${p.line}`, borderRadius:12, boxShadow:'0 12px 40px rgba(0,0,0,.18)', overflow:'hidden' });
const menuLabel = (p) => ({ font:"500 10px 'Spline Sans Mono',monospace", letterSpacing:'.12em', textTransform:'uppercase', color:p.mut, marginBottom:8 });
