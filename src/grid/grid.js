import { GridStack } from 'gridstack';
import { render as prender } from 'preact';
import 'gridstack/dist/gridstack.min.css';

/**
 * Initialize gridstack on a container.
 * @param {HTMLElement} el
 * @param {{staticGrid:boolean}} opts
 * @returns {import('gridstack').GridStack}
 */
export function initGrid(el, opts) {
	return GridStack.init({
		column: 12,
		cellHeight: 90,
		margin: 8,
		float: false,
		staticGrid: opts.staticGrid,
		handle: '.nt-drag',
		resizable: { handles: 'se' },
	}, el);
}

/**
 * Reconcile gridstack items to match `widgets`. Adds new, removes gone,
 * updates geometry, and (re)renders content via `renderInto`.
 * Content elements are cached on the item DOM node as `_ntContent`.
 * @param {import('gridstack').GridStack} grid
 * @param {Array<object>} widgets
 * @param {(contentEl:HTMLElement, widget:object)=>void} renderInto
 */
export function syncGrid(grid, widgets, renderInto) {
	const want = new Map(widgets.map((w) => [w.id, w]));
	// remove gone
	for (const node of grid.engine.nodes.slice()) {
		if (!want.has(node.el.getAttribute('gs-id'))) {
			// ponytail: unmount the Preact subtree before the DOM node goes away, else
			// widget effects (intervals, listeners) never get their cleanup called.
			const contentEl = node.el.querySelector('.grid-stack-item-content');
			if (contentEl) prender(null, contentEl);
			grid.removeWidget(node.el, true);
		}
	}
	const have = new Set(grid.engine.nodes.map((n) => n.el.getAttribute('gs-id')));
	grid.batchUpdate();
	for (const w of widgets) {
		let el;
		if (!have.has(w.id)) {
			el = grid.addWidget({ id:w.id, x:w.x, y:w.y, w:w.w, h:w.h, content:'' });
			el.setAttribute('gs-id', w.id);
		} else {
			el = grid.engine.nodes.find((n) => n.el.getAttribute('gs-id') === w.id).el;
			grid.update(el, { x:w.x, y:w.y, w:w.w, h:w.h });
		}
		const contentEl = el.querySelector('.grid-stack-item-content');
		renderInto(contentEl, w);
	}
	grid.commit();
}
