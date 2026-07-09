import { render, h } from 'preact';

function Boot() {
	return h('div', null, 'New Tab loading…');
}

render(h(Boot, null), document.getElementById('app'));
