import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Card } from './Card.jsx';
import { tintPalette } from '../theme/palettes.js';
import { uid } from '../store/store.js';
import { useItemDnd } from './dnd.js';

/**
 * Checklist widget. Always-live: check/add/delete without edit mode.
 * @param {object} props
 */
export function Todo(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, onMoveItem } = props;
	const p = tintPalette(w.tint, theme);
	const items = w.items || [];
	const [draft, setDraft] = useState('');
	const dnd = useItemDnd({ kind:'todo', widgetId:w.id, items, onMoveItem, enabled:editing, accent });

	function toggle(it) {
		onPatch({ items: items.map((x) => x.id === it.id ? { ...x, done: !x.done } : x) });
	}
	function del(it) {
		onPatch({ items: items.filter((x) => x.id !== it.id) });
	}
	function add() {
		const text = draft.trim();
		if (!text) return;
		onPatch({ items: items.concat({ id: uid(), text, done: false }) });
		setDraft('');
	}

	const rows = items.map((it, i) => h('div', { key:it.id, ...dnd.rowProps(it, i),
		style:{ display:'flex', alignItems:'center', gap:10, padding:'5px 0', cursor:editing ? 'grab' : 'default', ...dnd.markStyle(i) } },
		h('button', { onClick:() => toggle(it), 'aria-label': it.done ? 'uncheck' : 'check',
			style:{ width:18, height:18, flex:'none', borderRadius:5, border:`1.5px solid ${it.done ? accent : p.mut}`, background:it.done ? accent : 'transparent', color:'#fff', cursor:'pointer', font:'11px sans-serif', lineHeight:1, padding:0 } }, it.done ? '✓' : ''),
		h('span', { style:{ flex:1, font:"400 14px 'Instrument Sans'", color:it.done ? p.mut : p.fg, textDecoration:it.done ? 'line-through' : 'none' } }, it.text),
		h('button', { onClick:() => del(it), 'aria-label':'delete task', style:{ border:'none', background:'transparent', color:p.mut, cursor:'pointer', fontSize:14, padding:'0 2px', lineHeight:1 } }, '×')
	));

	// the add row doubles as the drop caret for "past the last task"
	const addRow = h('div', { key:'add', style:{ display:'flex', alignItems:'center', gap:10, padding:'5px 0', ...dnd.markStyle(items.length) } },
		h('span', { style:{ width:18, height:18, flex:'none', borderRadius:5, border:`1.5px dashed ${p.mut}`, boxSizing:'border-box' } }),
		h('input', { value:draft, placeholder:'Add task', onInput:(e) => setDraft(e.currentTarget.value),
			onKeyDown:(e) => { if (e.key === 'Enter') add(); },
			style:{ flex:1, border:'none', outline:'none', background:'transparent', color:p.fg, font:"400 14px 'Instrument Sans'" } })
	);

	const children = h('div', { ...dnd.zoneProps, style:{ display:'flex', flexDirection:'column' } }, rows.concat([addRow]));
	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, children });
}
