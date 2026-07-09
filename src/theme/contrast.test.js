import { describe, it, expect } from 'vitest';
import { foregroundFor } from './contrast.js';

describe('foregroundFor', () => {
	it('returns dark text on light backgrounds', () => {
		expect(foregroundFor('#ffffff')).toBe('#111111');
		expect(foregroundFor('#ebe4d6')).toBe('#111111');
	});
	it('returns light text on dark backgrounds', () => {
		expect(foregroundFor('#000000')).toBe('#ffffff');
		expect(foregroundFor('#151109')).toBe('#ffffff');
	});
	it('handles 3-digit hex', () => {
		expect(foregroundFor('#fff')).toBe('#111111');
		expect(foregroundFor('#000')).toBe('#ffffff');
	});
});

import { TINTS, TINT_KEYS, tintPalette, pagePalette } from './palettes.js';

describe('palettes', () => {
	it('every tint has light and dark sides with all keys', () => {
		const keys = ['bg','fg','mut','line','tile','tfg','field'];
		for (const id of TINT_KEYS) {
			for (const side of ['L','D']) {
				for (const k of keys) expect(TINTS[id][side][k]).toBeTruthy();
			}
		}
	});
	it('tintPalette falls back to paper for unknown id', () => {
		expect(tintPalette('nope', 'light')).toEqual(TINTS.paper.L);
	});
	it('pagePalette differs by theme', () => {
		expect(pagePalette('light').bg).not.toBe(pagePalette('dark').bg);
	});
});
