import { h } from 'preact';
import { ACCENTS } from '../theme/palettes.js';
import { ADD_MENU } from '../widgets/registry.js';

/** @param {object} props */
export function TopBar(props) {
	const { pg, editing, theme, width, accent, onToggleEdit, onToggleTheme, onSetWidth, onSetAccent, onAdd, menus, onOpenMenu, syncSupported, syncFolder, onConnectFolder, onDisconnectFolder } = props;
	const pill = (label, active, on) => h('button', { onClick:on, style:{ border:'none', background:active ? accent : 'transparent', color:active ? '#fff' : pg.mut, borderRadius:9, padding:'7px 11px', font:"500 12px 'Instrument Sans'", cursor:'pointer' } }, label);

	return h('div', { style:{ display:'flex', alignItems:'center', gap:4, position:'relative' } },
		pill(editing ? 'Done' : 'Edit', editing, onToggleEdit),
		h('button', { onClick:onToggleTheme, title:'Toggle theme', style:iconBtn(pg) }, theme === 'dark' ? '☾' : '☀'),
		h('button', { onClick:(e) => { e.stopPropagation(); onOpenMenu(menus === 'settings' ? null : 'settings'); }, title:'Settings', style:iconBtn(pg) }, '⚙'),
		menus === 'settings' ? settingsMenu() : null,
		h('button', { onClick:(e) => { e.stopPropagation(); onOpenMenu(menus === 'add' ? null : 'add'); }, style:{ border:'none', background:pg.fg, color:pg.bg, borderRadius:9, padding:'7px 13px', font:"500 12px 'Instrument Sans'", cursor:'pointer' } }, '+ Add widget'),
		menus === 'add' ? addMenu() : null
	);

	function settingsMenu() {
		return h('div', { onClick:(e) => e.stopPropagation(), style:menuBox(pg, 56) },
			label('Container width', pg),
			h('div', { style:{ display:'flex', gap:7, marginBottom:16 } }, ['fixed','full'].map((m) =>
				h('button', { key:m, onClick:() => onSetWidth(m), style:choice(pg, accent, width === m) }, m === 'fixed' ? 'Centered' : 'Full'))),
			label('Accent', pg),
			h('div', { style:{ display:'flex', gap:9 } }, ACCENTS.map((c) =>
				h('button', { key:c, onClick:() => onSetAccent(c), style:{ width:26, height:26, borderRadius:'50%', background:c, border:accent === c ? `2px solid ${pg.fg}` : '2px solid transparent', cursor:'pointer', padding:0 } }))),
			h('div', { style:{ marginTop:16 } }, label('Folder sync', pg)),
			!syncSupported
				? h('div', { style:{ font:"400 12px 'Instrument Sans'", color:pg.mut } }, 'Needs a Chromium browser.')
				: syncFolder
					? h('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 } },
						h('span', { style:{ font:"400 12px 'Instrument Sans'", color:pg.fg, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, syncFolder.name),
						h('button', { onClick:onDisconnectFolder, style:choice(pg, accent, false) }, 'Disconnect'))
					: h('button', { onClick:onConnectFolder, style:choice(pg, accent, false) }, 'Connect folder')
		);
	}
	function addMenu() {
		return h('div', { onClick:(e) => e.stopPropagation(), style:menuBox(pg, 0) }, ADD_MENU.map(([t, l]) =>
			h('button', { key:t, onClick:() => onAdd(t), style:{ display:'block', width:'100%', textAlign:'left', border:'none', background:'transparent', color:pg.fg, font:"400 13px 'Instrument Sans'", padding:'9px 11px', borderRadius:9, cursor:'pointer' } }, l)));
	}
}

const iconBtn = (pg) => ({ border:'none', background:'transparent', color:pg.mut, borderRadius:9, padding:'7px 10px', font:'15px system-ui', cursor:'pointer' });
const menuBox = (pg, right) => ({ position:'absolute', top:44, right, zIndex:50, width:230, background:pg.bg, border:`1px solid ${pg.line}`, borderRadius:14, boxShadow:'0 16px 50px rgba(0,0,0,.2)', padding:16 });
const label = (t, pg) => h('div', { style:{ font:"500 10px 'Spline Sans Mono',monospace", letterSpacing:'.12em', textTransform:'uppercase', color:pg.mut, marginBottom:9 } }, t);
const choice = (pg, accent, active) => ({ flex:1, border:`1px solid ${active ? accent : pg.line}`, background:active ? accent + '18' : 'transparent', color:pg.fg, borderRadius:8, padding:'7px 0', font:"500 12px 'Instrument Sans'", cursor:'pointer' });
