import { describe, it, expect } from 'vitest';
import { newWidget, WIDGET_COMPONENTS, ADD_MENU } from './registry.js';

describe('registry', () => {
	it('has a component for every add-menu type', () => {
		for (const [type] of ADD_MENU) expect(WIDGET_COMPONENTS[type]).toBeTruthy();
	});
	it('newWidget seeds default geometry', () => {
		const w = newWidget('bookmarks', '#c96442');
		expect(w.type).toBe('bookmarks');
		expect(w.w).toBeGreaterThanOrEqual(2);
		expect(w.id).toBeTruthy();
		expect(Array.isArray(w.items)).toBe(true);
	});
	it('only exposes v1 types', () => {
		const allowed = new Set(['bookmarks','single','datetime','divider','spacer']);
		for (const [type] of ADD_MENU) expect(allowed.has(type)).toBe(true);
	});
});
