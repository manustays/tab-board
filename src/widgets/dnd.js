import { useRef, useState } from 'preact/hooks';

/**
 * The live drag, module-scoped so both ends of a cross-widget drag can see it.
 *
 * ponytail: every widget renders into its own Preact root, and HTML5 forbids
 * reading `dataTransfer` during `dragover` — so a module variable is the only
 * place the drop target can learn what is being dragged while it is deciding
 * whether to accept. Same document, one module instance, no store needed.
 * @type {{kind:string, widgetId:string, itemId:string}|null}
 */
let dragging = null;

/**
 * Move an item within, or between, widgets' `items` arrays. Pure.
 * @param {Array<object>} widgets
 * @param {string} fromId widget the item is leaving
 * @param {string} itemId
 * @param {string} toId widget the item lands in
 * @param {number} index insertion index within the target's current items
 * @returns {Array<object>} new widget list; the input is untouched
 */
export function moveItem(widgets, fromId, itemId, toId, index) {
	const src = widgets.find((w) => w.id === fromId);
	const items = (src && src.items) || [];
	const at = items.findIndex((x) => x.id === itemId);
	if (at < 0) return widgets;
	const item = items[at];

	if (fromId === toId) {
		const next = items.slice();
		next.splice(at, 1);
		// dropping below your own old slot shifts every later index up by one
		next.splice(at < index ? index - 1 : index, 0, item);
		return widgets.map((w) => w.id === toId ? { ...w, items:next } : w);
	}
	return widgets.map((w) => {
		if (w.id === fromId) return { ...w, items: items.filter((x) => x.id !== itemId) };
		if (w.id === toId) {
			const next = (w.items || []).slice();
			next.splice(index, 0, item);
			return { ...w, items:next };
		}
		return w;
	});
}

/**
 * Drag-to-reorder wiring for one widget's item list. An item can be dropped
 * anywhere inside its own widget or inside any other widget declaring the same
 * `kind`; mismatched kinds refuse the drop.
 *
 * @param {object} o
 * @param {string} o.kind compatibility group — only a matching kind accepts a drop
 * @param {string} o.widgetId
 * @param {Array<{id:string}>} o.items current items, for the drop-at-the-end index
 * @param {(from:string,itemId:string,to:string,index:number)=>void} [o.onMoveItem]
 * @param {boolean} o.enabled off outside edit mode
 * @param {string} o.accent drop-caret colour
 * @returns {{rowProps:(item:object,index:number,horizontal?:boolean)=>object, zoneProps:object, markStyle:(index:number,horizontal?:boolean)=>object|null}}
 */
export function useItemDnd({ kind, widgetId, items, onMoveItem, enabled, accent }) {
	const [over, setOver] = useState(/** @type {number|null} */(null));
	// `drop` fires before the state set by the last `dragover` has re-rendered,
	// so the index is also kept in a ref to read synchronously on drop.
	const pending = useRef(/** @type {number|null} */(null));

	const noop = { rowProps: () => ({}), zoneProps: {}, markStyle: () => null };
	if (!enabled || !onMoveItem) return noop;

	const accepts = () => dragging !== null && dragging.kind === kind;
	const mark = (index) => { pending.current = index; setOver(index); };
	const clear = () => { pending.current = null; setOver(null); };
	const commit = () => {
		const from = dragging;
		const index = pending.current;
		dragging = null;
		clear();
		if (from && from.kind === kind && index != null) onMoveItem(from.widgetId, from.itemId, widgetId, index);
	};

	return {
		rowProps: (item, index, horizontal) => ({
			draggable: true,
			onDragStart: (e) => {
				dragging = { kind, widgetId, itemId:item.id };
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', item.id); // Firefox ignores a drag with no payload
			},
			onDragEnd: () => { dragging = null; clear(); },
			onDragOver: (e) => {
				if (!accepts()) return;
				e.preventDefault(); // "yes, droppable"
				e.stopPropagation(); // a row's index beats the container's drop-at-the-end
				e.dataTransfer.dropEffect = 'move';
				const r = e.currentTarget.getBoundingClientRect();
				const past = horizontal ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
				mark(index + (past ? 1 : 0));
			},
			onDrop: (e) => { e.preventDefault(); e.stopPropagation(); commit(); },
		}),
		// spread on the list container: catches drops past the last row, and into an empty widget
		zoneProps: {
			onDragOver: (e) => { if (!accepts()) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; mark(items.length); },
			onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) clear(); },
			onDrop: (e) => { e.preventDefault(); commit(); },
		},
		// insertion caret for the marked slot — merge into that row's style
		markStyle: (index, horizontal) => over === index
			? { boxShadow: horizontal ? `inset 2px 0 0 ${accent}` : `inset 0 2px 0 ${accent}` }
			: null,
	};
}
