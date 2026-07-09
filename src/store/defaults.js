/**
 * Short random id.
 * @returns {string}
 */
export function uid() {
	return Math.random().toString(36).slice(2, 9);
}

/**
 * v1 default board — calm first-run layout using only v1 widget types.
 * Geometry (x,y,w,h) is in 12-col gridstack units.
 * @returns {import('./store.js').State}
 */
export function defaultState() {
	return {
		version: 1,
		theme: 'light',
		width: 'fixed',
		accent: '#c96442',
		name: 'there',
		widgets: [
			{ id: uid(), type:'datetime', title:'', tint:'paper', x:0, y:0, w:3, h:2 },
			{ id: uid(), type:'bookmarks', title:'Daily', layout:'grid', icon:'mono', tint:'paper', x:3, y:0, w:5, h:3, items:[
				{ id:uid(), label:'Gmail',    url:'https://mail.google.com',     color:'#d9536a', ini:'G' },
				{ id:uid(), label:'Calendar', url:'https://calendar.google.com', color:'#4b7bc4', ini:'C' },
				{ id:uid(), label:'Notion',   url:'https://notion.so',           color:'#3f8f7a', ini:'N' },
				{ id:uid(), label:'Reddit',   url:'https://reddit.com',          color:'#d97840', ini:'R' },
				{ id:uid(), label:'Figma',    url:'https://figma.com',           color:'#8964c9', ini:'F' },
			]},
			{ id: uid(), type:'bookmarks', title:'Dev', layout:'list', icon:'mono', tint:'paper', x:8, y:0, w:4, h:3, items:[
				{ id:uid(), label:'GitHub',         url:'https://github.com',                color:'#4a4a4a', ini:'GH' },
				{ id:uid(), label:'Stack Overflow', url:'https://stackoverflow.com',         color:'#e08a3c', ini:'SO' },
				{ id:uid(), label:'MDN Docs',       url:'https://developer.mozilla.org',     color:'#4b7bc4', ini:'MDN' },
			]},
			{ id: uid(), type:'single', title:"Today's Focus", tint:'sky', x:0, y:2, w:3, h:3,
				item:{ label:"Today's Focus", url:'https://notion.so', color:'#4b7bc4', ini:'▸', sub:'Pinned bookmark' } },
		],
	};
}
