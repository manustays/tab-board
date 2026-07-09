import { h } from 'preact';
import { Card } from './Card.jsx';
import { Icon } from './icon.jsx';
import { tintPalette } from '../theme/palettes.js';
import { uid } from '../store/store.js';

/**
 * Bookmark grid or list widget supporting add/edit/delete and icon mode selector.
 * @param {object} props
 */
export function Bookmarks(props) {
	const { w, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove } = props;
	const p = tintPalette(w.tint, theme);
	const grid = w.layout === 'grid';

	/** @param {object|null} it existing item, or null to add */
	function editItem(it) {
		const label = window.prompt('Bookmark name', it ? it.label : '');
		if (label === null) return;
		const url = window.prompt('URL', it ? it.url : 'https://');
		if (url === null) return;
		const ini = (label.trim()[0] || '•').toUpperCase();
		if (it) onPatch({ items: w.items.map((x) => x.id === it.id ? { ...x, label, url, ini } : x) });
		else onPatch({ items: w.items.concat({ id:uid(), label, url, color:accent, ini }) });
	}
	function del(it) {
		onPatch({ items: w.items.filter((x) => x.id !== it.id) });
	}

	const editControls = (it) => editing ? h('span', { style:{ position:'absolute', top:grid ? -4 : '50%', right:grid ? -4 : 0, transform:grid ? 'none' : 'translateY(-50%)', display:'flex', gap:4 } },
		h('button', { onClick:(e) => { e.preventDefault(); editItem(it); }, style:miniBtn(p, p.mut) }, '✎'),
		h('button', { onClick:(e) => { e.preventDefault(); del(it); }, style:miniBtn(p, '#c0603f') }, '×')
	) : null;

	const items = w.items.map((it) => grid
		? h('a', { key:it.id, href:it.url, style:{ display:'flex', flexDirection:'column', alignItems:'center', gap:9, textDecoration:'none', position:'relative' } },
			h(Icon, { item:it, size:46, mode:w.icon, p }),
			h('span', { style:{ font:"400 12px 'Instrument Sans'", color:p.mut, maxWidth:64, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, it.label),
			editControls(it))
		: h('a', { key:it.id, href:it.url, style:{ display:'flex', alignItems:'center', gap:12, padding:'8px 0', textDecoration:'none', position:'relative' } },
			h(Icon, { item:it, size:26, mode:w.icon, p }),
			h('span', { style:{ font:"400 14px 'Instrument Sans'", color:p.fg } }, it.label),
			editControls(it)));

	const addBtn = editing ? h('button', { key:'add', onClick:() => editItem(null),
		style: grid ? { display:'flex', flexDirection:'column', alignItems:'center', gap:9, border:'none', background:'transparent', cursor:'pointer' }
			: { display:'flex', alignItems:'center', gap:12, padding:'8px 0', border:'none', background:'transparent', cursor:'pointer', width:'100%' } },
		h('div', { style:{ width:grid ? 46 : 26, height:grid ? 46 : 26, borderRadius:grid ? 15 : 8, border:`1.5px dashed ${p.mut}`, display:'flex', alignItems:'center', justifyContent:'center', color:p.mut, fontSize:grid ? 20 : 15, flex:'none' } }, '+'),
		h('span', { style:{ font:"400 " + (grid ? 12 : 14) + "px 'Instrument Sans'", color:p.mut } }, grid ? 'Add' : 'Add bookmark')
	) : null;

	const body = grid
		? h('div', { style:{ display:'flex', flexWrap:'wrap', gap:'18px 20px' } }, items.concat(addBtn ? [addBtn] : []))
		: h('div', { style:{ display:'flex', flexDirection:'column' } }, items.concat(addBtn ? [addBtn] : []));

	// icon-mode selector injected into the Card menu
	const extraMenu = () => h('div', { style:{ padding:'8px 12px' } },
		h('div', { style:{ font:"500 10px 'Spline Sans Mono',monospace", letterSpacing:'.12em', textTransform:'uppercase', color:p.mut, marginBottom:7 } }, 'Icons'),
		h('div', { style:{ display:'flex', gap:6 } }, ['mono','color','favicon','dot'].map((m) =>
			h('button', { key:m, onClick:() => onPatch({ icon:m }),
				style:{ flex:1, border:`1px solid ${w.icon === m ? accent : p.line}`, background:w.icon === m ? accent + '18' : 'transparent', color:p.fg, borderRadius:7, padding:'5px 0', font:"500 10px 'Instrument Sans'", cursor:'pointer', textTransform:'capitalize' } }, m)
		))
	);

	// layout toggle also lives in the menu header row
	const layoutToggle = editing ? h('button', { onClick:() => onPatch({ layout:grid ? 'list' : 'grid' }),
		style:{ position:'absolute', top:14, right:44, border:'none', background:'transparent', color:p.mut, font:"500 11px 'Instrument Sans'", cursor:'pointer', zIndex:5 } }, grid ? 'List' : 'Grid') : null;

	return h(Card, { w, p, editing, accent, theme, menuOpen, onToggleMenu, onPatch, onRemove, extraMenu, children:[layoutToggle, body] });
}

const miniBtn = (p, color) => ({ border:'none', background:p.bg, color, borderRadius:6, width:20, height:20, cursor:'pointer', fontSize:12, boxShadow:'0 1px 3px rgba(0,0,0,.15)' });
