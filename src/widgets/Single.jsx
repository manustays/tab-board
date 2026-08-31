import { h } from 'preact';
import { Card } from './Card.jsx';
import { Icon } from './icon.jsx';
import { tintPalette } from '../theme/palettes.js';
import { askFields } from './prompt.jsx';

/**
 * Highlight bookmark tile with edit via a modal field prompt.
 * @param {object} props
 */
export function Single(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const it = w.item || {};

	async function edit() {
		const v = await askFields('Edit bookmark', [
			{ key:'label', label:'Name', value: it.label || '' },
			{ key:'url', label:'URL', value: it.url || '', type:'url' },
			{ key:'sub', label:'Subtitle (optional)', value: it.sub || '', optional:true },
		], p);
		if (!v) return;
		onPatch({ item: { ...it, label:v.label, url:v.url, sub:v.sub, ini:(v.label[0] || '•').toUpperCase(), color:it.color || accent } });
	}

	const children = [
		h('a', { key:'a', href:it.url, style:{ display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:120, textDecoration:'none', gap:20 } },
			h(Icon, { item:it, size:44, mode:'color', p }),
			h('div', null,
				h('div', { style:{ font:"600 16px 'Instrument Sans'", color:p.fg } }, it.label),
				it.sub ? h('div', { style:{ font:"400 12px 'Instrument Sans'", color:p.mut, marginTop:4 } }, it.sub) : null)),
		editing ? h('button', { key:'e', onClick:edit, style:{ marginTop:12, border:`1px solid ${p.line}`, background:'transparent', color:p.mut, borderRadius:8, padding:'5px 10px', font:"500 11px 'Instrument Sans'", cursor:'pointer' } }, 'Edit bookmark') : null,
	];
	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}
