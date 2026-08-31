import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadState, saveState, defaultState, uid } from './store.js';

beforeEach(() => {
	localStorage.clear();
	vi.useFakeTimers();
});

afterEach(() => vi.restoreAllMocks());

describe('store', () => {
	it('uid returns unique-ish short ids', () => {
		expect(uid()).not.toBe(uid());
	});
	it('defaultState uses only v1 widget types', () => {
		const allowed = new Set(['bookmarks','single','datetime','divider','spacer']);
		for (const w of defaultState().widgets) expect(allowed.has(w.type)).toBe(true);
	});
	it('loadState returns defaults when storage empty', () => {
		expect(loadState().widgets.length).toBeGreaterThan(0);
	});
	it('saveState then loadState round-trips edited fields', () => {
		const s = defaultState();
		s.theme = 'dark';
		s.name = 'Zed';
		saveState(s);
		vi.runAllTimers?.();
		// flush debounce synchronously for the test:
		saveState.flush();
		const back = loadState();
		expect(back.theme).toBe('dark');
		expect(back.name).toBe('Zed');
	});
	it('migrates a versionless blob without throwing', () => {
		localStorage.setItem('nt_dashboard_v1', JSON.stringify({ theme:'dark', widgets:[] }));
		const s = loadState();
		expect(s.version).toBeGreaterThanOrEqual(1);
		expect(s.theme).toBe('dark');
	});
	it('migrate defaults updatedAt to 0 when absent', () => {
		localStorage.setItem('nt_dashboard_v1', JSON.stringify({ theme:'light', widgets:[] }));
		expect(loadState().updatedAt).toBe(0);
	});
	it('migrate defaults newTab off and preserves it when set', () => {
		localStorage.setItem('nt_dashboard_v1', JSON.stringify({ theme:'light', widgets:[] }));
		expect(loadState().newTab).toBe(false);
		localStorage.setItem('nt_dashboard_v1', JSON.stringify({ theme:'light', widgets:[], newTab:true }));
		expect(loadState().newTab).toBe(true);
	});
	it('migrate preserves a provided updatedAt', () => {
		localStorage.setItem('nt_dashboard_v1', JSON.stringify({ theme:'light', widgets:[], updatedAt:1234 }));
		expect(loadState().updatedAt).toBe(1234);
	});
});
