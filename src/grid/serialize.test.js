import { describe, it, expect } from 'vitest';
import { mergeGeometry } from './serialize.js';

describe('mergeGeometry', () => {
	it('applies node coords onto matching widgets', () => {
		const widgets = [{ id:'a', x:0, y:0, w:4, h:2 }, { id:'b', x:4, y:0, w:4, h:2 }];
		const nodes = [{ id:'a', x:2, y:1, w:6, h:3 }];
		const out = mergeGeometry(widgets, nodes);
		expect(out[0]).toMatchObject({ id:'a', x:2, y:1, w:6, h:3 });
		expect(out[1]).toMatchObject({ id:'b', x:4, y:0 }); // untouched
	});
	it('does not mutate the input', () => {
		const widgets = [{ id:'a', x:0, y:0, w:4, h:2 }];
		mergeGeometry(widgets, [{ id:'a', x:9, y:9, w:1, h:1 }]);
		expect(widgets[0].x).toBe(0);
	});
});
