import { Bookmarks } from './Bookmarks.jsx';
import { Single } from './Single.jsx';
import { DateTime } from './DateTime.jsx';
import { Divider } from './Divider.jsx';
import { Spacer } from './Spacer.jsx';
import { uid } from '../store/store.js';

/** Component map: widget type → component. @type {Record<string, import('preact').ComponentType>} */
export const WIDGET_COMPONENTS = {
	bookmarks: Bookmarks,
	single: Single,
	datetime: DateTime,
	divider: Divider,
	spacer: Spacer,
};

/** Add-widget menu — v1 types only. @type {Array<[string,string]>} */
export const ADD_MENU = [
	['bookmarks', 'Bookmark group'],
	['single', 'Single bookmark'],
	['datetime', 'Date & time'],
	['divider', 'Divider'],
	['spacer', 'Spacer'],
];

/**
 * Build a fresh widget of a given type with default geometry/content.
 * @param {string} type
 * @param {string} accent
 * @returns {import('../store/store.js').Widget}
 */
export function newWidget(type, accent) {
	const id = uid();
	switch (type) {
		case 'bookmarks': return { id, type, title:'New group', layout:'grid', icon:'mono', tint:'paper', w:4, h:3, items:[] };
		case 'single':    return { id, type, title:'Bookmark', tint:'paper', w:3, h:2, item:{ label:'New bookmark', url:'https://', color:accent, ini:'•', sub:'' } };
		case 'datetime':  return { id, type, title:'', tint:'paper', w:3, h:2 };
		case 'divider':   return { id, type, w:12, h:1 };
		case 'spacer':    return { id, type, w:3, h:2 };
		default:          return { id, type:'spacer', w:3, h:2 };
	}
}
