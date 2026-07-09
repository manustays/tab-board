import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';
import { uid } from '../store/store.js';

/**
 * Copy-to-clipboard snippet list. Live: click to copy. Edit mode: add/edit/delete.
 * @param {object} props
 */
export function Snippets(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const items = w.items || [];
	const [copied, setCopied] = useState(null);

	function copy(it) {
		if (!navigator.clipboard) return;
		navigator.clipboard.writeText(it.body).then(() => {
			setCopied(it.id);
			setTimeout(() => setCopied(null), 1000);
		}).catch(() => { /* insecure context / denied: no feedback */ });
	}
	/** @param {object|null} it existing snippet, or null to add */
	function edit(it) {
		const label = window.prompt('Label', it ? it.label : ''); if (label === null) return;
		const body = window.prompt('Snippet text', it ? it.body : ''); if (body === null) return;
		if (it) onPatch({ items: items.map((x) => x.id === it.id ? { ...x, label, body } : x) });
		else onPatch({ items: items.concat({ id: uid(), label, body }) });
	}
	function del(it) {
		onPatch({ items: items.filter((x) => x.id !== it.id) });
	}

	const rows = items.map((it) => h('div', { key:it.id, style:{ display:'flex', alignItems:'center', gap:8, padding:'7px 0' } },
		h('button', { onClick:() => copy(it), style:{ flex:1, textAlign:'left', border:'none', background:'transparent', cursor:'pointer', padding:0, minWidth:0 } },
			h('div', { style:{ font:"500 13px 'Instrument Sans'", color:p.fg } }, copied === it.id ? 'Copied' : it.label),
			h('div', { style:{ font:"400 12px 'Spline Sans Mono',monospace", color:p.mut, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, it.body)),
		editing ? h('span', { style:{ display:'flex', gap:4, flex:'none' } },
			h('button', { onClick:() => edit(it), 'aria-label':'edit snippet', style:miniBtn(p.mut) }, '✎'),
			h('button', { onClick:() => del(it), 'aria-label':'delete snippet', style:miniBtn('#c0603f') }, '×')) : null
	));

	const addBtn = editing ? h('button', { key:'add', onClick:() => edit(null),
		style:{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', border:'none', background:'transparent', cursor:'pointer', width:'100%', color:p.mut, font:"400 13px 'Instrument Sans'" } }, '+ Add snippet') : null;

	const children = h('div', { style:{ display:'flex', flexDirection:'column' } }, rows.concat(addBtn ? [addBtn] : []));
	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}

const miniBtn = (color) => ({ border:'none', background:'transparent', color, cursor:'pointer', fontSize:12, padding:'0 2px', lineHeight:1 });
