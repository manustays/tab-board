import { h } from 'preact';

/**
 * Bookmark icon. Four modes: mono (offline default), color, dot, favicon (remote, opt-in).
 * @param {{item:{ini:string,color:string,url:string}, size:number, mode:string, p:{tile:string,tfg:string}}} props
 */
export function Icon({ item, size, mode, p }) {
	const r = size >= 44 ? 15 : size >= 30 ? 10 : 8;
	const fontPx = size >= 44 ? 17 : size >= 30 ? 12 : 10;

	if (mode === 'dot') {
		return h('span', { style:{ width:9, height:9, borderRadius:'50%', background:item.color, flex:'none', display:'inline-block' } });
	}
	if (mode === 'favicon') {
		let dom = '';
		try { dom = new URL(item.url).hostname; } catch (e) { /* invalid url */ }
		return h('div', { style:{ width:size, height:size, borderRadius:r, position:'relative', flex:'none', overflow:'hidden', background:p.tile } },
			h('div', { style:{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:p.tfg, font:`600 ${fontPx}px 'Instrument Sans'` } }, item.ini),
			dom ? h('img', {
				src:`https://icons.duckduckgo.com/ip3/${dom}.ico`,
				referrerpolicy:'no-referrer',
				onError:(e) => e.currentTarget.remove(),
				style:{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' },
			}) : null
		);
	}
	const bg = mode === 'color' ? item.color : p.tile;
	const fg = mode === 'color' ? '#fff' : p.tfg;
	return h('div', { style:{ width:size, height:size, borderRadius:r, background:bg, color:fg, display:'flex', alignItems:'center', justifyContent:'center', font:`600 ${fontPx}px 'Instrument Sans'`, flex:'none' } }, item.ini);
}
