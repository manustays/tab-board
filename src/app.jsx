import { h, render as prender } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { loadState, saveState, migrate } from './store/store.js';
import { isSupported, connect, restore, disconnect, readState, writeState } from './store/sync.js';
import { pagePalette } from './theme/palettes.js';
import { WIDGET_COMPONENTS, newWidget } from './widgets/registry.js';
import { initGrid, syncGrid } from './grid/grid.js';
import { mergeGeometry } from './grid/serialize.js';
import { Header } from './chrome/Header.jsx';
import { TopBar } from './chrome/TopBar.jsx';
import './styles.css';

/**
 * Root dashboard component: owns state, drives gridstack, renders widget
 * content into per-item Preact roots, and persists changes to localStorage.
 * @returns {import('preact').VNode}
 */
export function App() {
	const [state, setState] = useState(loadState);
	const [editing, setEditing] = useState(false);
	const [now, setNow] = useState(() => new Date());
	const [menus, setMenus] = useState(/** @type {string|null} */(null)); // top-bar dropdown
	const [openWidgetMenu, setOpenWidgetMenu] = useState(/** @type {string|null} */(null));
	const gridEl = useRef(null);
	const grid = useRef(/** @type {any} */(null));
	const interacting = useRef(false); // true mid drag/resize — pause grid reconcile
	const [syncFolder, setSyncFolder] = useState(/** @type {{handle:any,name:string}|null} */(null));
	const syncTimer = useRef(/** @type {any} */(null));
	const syncReady = useRef(false); // gate writes until the mount read resolves

	// tick the clock every 20s
	useEffect(() => {
		const t = setInterval(() => setNow(new Date()), 1000 * 20);
		return () => clearInterval(t);
	}, []);

	// persist on any state change
	useEffect(() => { saveState(state); }, [state]);

	// one-shot: restore a connected folder and adopt its file if newer
	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (isSupported()) {
				const conn = await restore();
				if (!cancelled && conn) {
					setSyncFolder(conn);
					const raw = await readState(conn.handle);
					if (!cancelled && raw) {
						const fileState = migrate(raw);
						setState((local) => fileState.updatedAt > local.updatedAt ? fileState : local);
					}
				}
			}
			if (!cancelled) syncReady.current = true;
		})();
		return () => { cancelled = true; };
	}, []);

	// mirror state to the connected folder file (debounced), stamping updatedAt
	useEffect(() => {
		if (!syncFolder || !syncReady.current) return;
		clearTimeout(syncTimer.current);
		syncTimer.current = setTimeout(() => {
			writeState(syncFolder.handle, { ...state, updatedAt: Date.now() });
		}, 250);
		return () => clearTimeout(syncTimer.current);
	}, [state, syncFolder]);

	// expose theme to CSS (scrollbars, native controls) via <html> attrs
	useEffect(() => {
		document.documentElement.dataset.theme = state.theme;
		document.documentElement.style.colorScheme = state.theme;
	}, [state.theme]);

	// flush a pending debounced save before the tab is hidden/closed
	useEffect(() => {
		const flush = () => {
			saveState.flush();
			if (syncFolder && syncReady.current) {
				clearTimeout(syncTimer.current);
				writeState(syncFolder.handle, { ...state, updatedAt: Date.now() });
			}
		};
		const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
		window.addEventListener('pagehide', flush);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			window.removeEventListener('pagehide', flush);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [syncFolder, state]);

	// patch helpers
	const patchWidget = (id, partial) => setState((s) => ({ ...s, widgets: s.widgets.map((w) => w.id === id ? { ...w, ...partial } : w) }));
	const removeWidget = (id) => { setState((s) => ({ ...s, widgets: s.widgets.filter((w) => w.id !== id) })); setOpenWidgetMenu(null); };
	const addWidget = (type) => { setState((s) => ({ ...s, widgets: s.widgets.concat(newWidget(type, s.accent)) })); setMenus(null); };

	// init gridstack once
	useEffect(() => {
		grid.current = initGrid(gridEl.current, { staticGrid: !editing });
		// 'added' fires for auto-placed new widgets (which have no x/y yet);
		// 'change' fires for moved/resized items. Both re-read all node coords
		// back into state so no widget is ever left with undefined x/y — a
		// widget with undefined y makes gridstack's row count NaN and collapses
		// the grid container height to 0.
		const readGeometry = () => {
			const read = grid.current.engine.nodes.map((n) => ({ id:n.el.getAttribute('gs-id'), x:n.x, y:n.y, w:n.w, h:n.h }));
			setState((s) => ({ ...s, widgets: mergeGeometry(s.widgets, read) }));
		};
		grid.current.on('change added', readGeometry);
		// While a drag/resize is live, gridstack owns the DOM. Reconciling
		// (add/remove/update) mid-interaction makes it spawn a duplicate DOM
		// node bound to the same widget. Pause reconcile during interaction,
		// then run one clean sync on stop.
		grid.current.on('dragstart resizestart', () => { interacting.current = true; });
		grid.current.on('dragstop resizestop', () => { interacting.current = false; readGeometry(); });
		return () => grid.current.destroy(false);
	}, []);

	// toggle drag/resize with edit mode
	useEffect(() => { if (grid.current) grid.current.setStatic(!editing); }, [editing]);

	// reconcile grid items + render content whenever inputs change
	useEffect(() => {
		if (!grid.current || interacting.current) return;
		syncGrid(grid.current, state.widgets, (contentEl, w) => {
			const Comp = WIDGET_COMPONENTS[w.type];
			if (!Comp) return; // corrupt/unknown widget type from stale localStorage: skip rendering
			const common = { w, editing, accent:state.accent, theme:state.theme,
				menuOpen: openWidgetMenu === w.id, onToggleMenu:() => setOpenWidgetMenu(openWidgetMenu === w.id ? null : w.id),
				onPatch:(partial) => patchWidget(w.id, partial), onRemove:() => removeWidget(w.id), now };
			const handle = editing ? h('span', { class:'nt-drag', style:{ position:'absolute', top:8, left:8, zIndex:6, color:'#999', fontSize:13 } }, '⠿') : null;
			prender(h('div', { style:{ position:'relative', height:'100%' } }, handle, h(Comp, common)), contentEl);
		});
	}, [state.widgets, editing, state.theme, state.accent, openWidgetMenu, now]);

	// dismiss menus on outside click
	useEffect(() => {
		const close = () => { setMenus(null); setOpenWidgetMenu(null); };
		document.addEventListener('click', close);
		return () => document.removeEventListener('click', close);
	}, []);

	const onConnectFolder = async () => {
		const conn = await connect();
		if (!conn) return;
		const raw = await readState(conn.handle);
		if (raw) {
			const fileState = migrate(raw);
			setState((local) => fileState.updatedAt > local.updatedAt ? fileState : local);
		}
		setSyncFolder(conn);
	};
	const onDisconnectFolder = async () => { await disconnect(); setSyncFolder(null); };

	const pg = pagePalette(state.theme);
	const maxW = state.width === 'fixed' ? 1120 : 1680;

	return h('div', { style:{ minHeight:'100vh', background:pg.bg, color:pg.fg, transition:'background .3s,color .3s' } },
		h('div', { style:{ maxWidth:maxW, margin:'0 auto', padding:'clamp(28px,5vw,56px) clamp(20px,4vw,48px) 80px' } },
			h('div', { style:{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, flexWrap:'wrap', marginBottom:'clamp(28px,4vw,44px)' } },
				h(Header, { pg, name:state.name, now, editing, onName:(v) => setState((s) => ({ ...s, name:v })) }),
				h(TopBar, { pg, editing, theme:state.theme, width:state.width, accent:state.accent,
					onToggleEdit:() => { setEditing((v) => !v); setOpenWidgetMenu(null); },
					onToggleTheme:() => setState((s) => ({ ...s, theme:s.theme === 'dark' ? 'light' : 'dark' })),
					onSetWidth:(m) => setState((s) => ({ ...s, width:m })),
					onSetAccent:(c) => setState((s) => ({ ...s, accent:c })),
					onAdd:addWidget, menus, onOpenMenu:setMenus,
					syncSupported: isSupported(), syncFolder, onConnectFolder, onDisconnectFolder })
			),
			h('div', { class:'grid-stack', ref:gridEl }),
			h('div', { style:{ marginTop:40, font:"400 12px 'Instrument Sans'", color:pg.head, textAlign:'center' } },
				editing ? 'Drag ⠿ to move · drag the corner to resize · ••• for background & icons' : 'Click Edit to rearrange, resize and restyle your widgets')
		)
	);
}
