/**
 * Apply gridstack node geometry back onto widgets, matched by id. Pure.
 * @param {Array<object>} widgets
 * @param {Array<{id:string,x:number,y:number,w:number,h:number}>} nodes
 * @returns {Array<object>}
 */
export function mergeGeometry(widgets, nodes) {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	return widgets.map((w) => {
		const n = byId.get(w.id);
		return n ? { ...w, x:n.x, y:n.y, w:n.w, h:n.h } : w;
	});
}
