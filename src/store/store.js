import { defaultState, uid } from './defaults.js';

/**
 * @typedef {object} Widget
 * @property {string} id
 * @property {'bookmarks'|'single'|'datetime'|'divider'|'spacer'} type
 * @property {string} [title]
 * @property {string} [tint]
 * @property {number} [x] @property {number} [y] @property {number} w @property {number} h
 * @property {'grid'|'list'} [layout]
 * @property {'mono'|'color'|'dot'|'favicon'} [icon]
 * @property {Array<object>} [items]
 * @property {object} [item]
 */

/**
 * @typedef {object} State
 * @property {number} version
 * @property {'light'|'dark'} theme
 * @property {'fixed'|'full'} width
 * @property {string} accent
 * @property {string} name
 * @property {number} updatedAt
 * @property {Widget[]} widgets
 */

const LS_KEY = 'nt_dashboard_v1';
const SCHEMA_VERSION = 1;

export { uid, defaultState };

/**
 * Migrate an arbitrary parsed blob up to the current schema.
 * @param {any} raw
 * @returns {State}
 */
export function migrate(raw) {
	const base = defaultState();
	if (!raw || typeof raw !== 'object') return base;
	// v0 (versionless) -> v1: keep known fields, default the rest.
	return {
		version: SCHEMA_VERSION,
		theme: raw.theme === 'dark' ? 'dark' : 'light',
		width: raw.width === 'full' ? 'full' : 'fixed',
		accent: typeof raw.accent === 'string' ? raw.accent : base.accent,
		name: typeof raw.name === 'string' ? raw.name : base.name,
		updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
		widgets: Array.isArray(raw.widgets) && raw.widgets.length ? raw.widgets : base.widgets,
	};
}

/**
 * Load persisted state, or defaults when absent/corrupt.
 * @returns {State}
 */
export function loadState() {
	try {
		const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
		return raw ? migrate(raw) : defaultState();
	} catch (e) {
		return defaultState();
	}
}

let _timer = /** @type {any} */(null);
let _pending = /** @type {any} */(null);

/**
 * Persist state (debounced ~250ms). Call `saveState.flush()` to write immediately.
 * @param {State} state
 */
export function saveState(state) {
	_pending = state;
	clearTimeout(_timer);
	_timer = setTimeout(() => saveState.flush(), 250);
}
saveState.flush = function flush() {
	clearTimeout(_timer);
	if (_pending == null) return;
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(_pending));
	} catch (e) { /* quota / private mode: ignore */ }
	_pending = null;
};
