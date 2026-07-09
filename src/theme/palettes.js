/** @typedef {{bg:string,fg:string,mut:string,line:string,tile:string,tfg:string,field:string}} TintSide */

/** @type {Record<string,{name:string,L:TintSide,D:TintSide}>} */
export const TINTS = {
	paper:    { name:'Paper',    L:{bg:'#f4efe4',fg:'#2a2622',mut:'#a89e8c',line:'rgba(0,0,0,.08)',tile:'#e7dfd0',tfg:'#514a3f',field:'#ebe4d6'}, D:{bg:'#1e1a13',fg:'#ece4d5',mut:'#8a8070',line:'rgba(255,255,255,.08)',tile:'#2c271e',tfg:'#cdc3b0',field:'#171410'} },
	sage:     { name:'Sage',     L:{bg:'#e6ede6',fg:'#33433a',mut:'#7e947f',line:'rgba(40,70,50,.10)',tile:'#d6e0d6',tfg:'#3d5244',field:'#dce6dc'}, D:{bg:'#1b2620',fg:'#d3e2d6',mut:'#7fa08c',line:'rgba(180,220,190,.10)',tile:'#26332b',tfg:'#a9c4b0',field:'#14201a'} },
	clay:     { name:'Clay',     L:{bg:'#f0e7dd',fg:'#4a3b30',mut:'#a3866a',line:'rgba(90,60,40,.10)',tile:'#e6d6c5',tfg:'#5c4636',field:'#e9ddce'}, D:{bg:'#251d15',fg:'#e9d7c4',mut:'#b8977a',line:'rgba(220,190,160,.10)',tile:'#332821',tfg:'#c8a986',field:'#1d160f'} },
	sky:      { name:'Sky',      L:{bg:'#e4ecef',fg:'#2c3a44',mut:'#708996',line:'rgba(40,60,70,.10)',tile:'#d3e0e5',tfg:'#3a4c56',field:'#d8e4e8'}, D:{bg:'#172227',fg:'#d6e2e8',mut:'#7f929e',line:'rgba(170,200,215,.10)',tile:'#213038',tfg:'#a6c0cc',field:'#111b20'} },
	lavender: { name:'Lavender', L:{bg:'#eae7f0',fg:'#3f3a48',mut:'#8f84a8',line:'rgba(60,50,80,.10)',tile:'#ddd8e8',tfg:'#4e475e',field:'#e2ddee'}, D:{bg:'#211d29',fg:'#ddd6e8',mut:'#9a8ec4',line:'rgba(200,190,225,.10)',tile:'#2c2739',tfg:'#bcb0d6',field:'#191622'} },
	rose:     { name:'Rose',     L:{bg:'#f2e6e6',fg:'#4a3636',mut:'#ab8484',line:'rgba(90,50,50,.10)',tile:'#e8d4d4',tfg:'#5c4444',field:'#ecdcdc'}, D:{bg:'#261a1a',fg:'#e9d0d0',mut:'#b88a8a',line:'rgba(225,185,185,.10)',tile:'#342424',tfg:'#c89e9e',field:'#1e1313'} },
	sand:     { name:'Sand',     L:{bg:'#f0ebde',fg:'#47412f',mut:'#a2966e',line:'rgba(80,70,40,.10)',tile:'#e6dfca',tfg:'#585030',field:'#e9e2d0'}, D:{bg:'#221f16',fg:'#e6ddc4',mut:'#a8996f',line:'rgba(215,205,165,.10)',tile:'#302c20',tfg:'#c6ba90',field:'#1a180f'} },
};

export const TINT_KEYS = Object.keys(TINTS);
export const ACCENTS = ['#c96442', '#3a7d6e', '#4a6fa5', '#8a7d5a', '#9a6a86'];

/**
 * Page-level palette (app background / header), independent of widget tints.
 * @param {'light'|'dark'} theme
 */
export function pagePalette(theme) {
	return theme === 'dark'
		? { bg:'#151109', fg:'#ece4d5', mut:'#8a8070', line:'rgba(255,255,255,.07)', head:'#7d7361' }
		: { bg:'#ebe4d6', fg:'#2a2622', mut:'#8f8574', line:'rgba(0,0,0,.08)', head:'#a89e8c' };
}

/**
 * Resolve a widget tint for the active theme.
 * @param {string} tintId
 * @param {'light'|'dark'} theme
 * @returns {TintSide}
 */
export function tintPalette(tintId, theme) {
	const t = TINTS[tintId] || TINTS.paper;
	return theme === 'dark' ? t.D : t.L;
}
