import { h, render } from 'preact';

/**
 * Prefix a bare host with https:// so `example.com` becomes a real link.
 * Leaves an existing scheme (http:, mailto:, chrome:) and protocol-relative
 * URLs alone. Empty input stays empty.
 * @param {string} value
 * @returns {string}
 */
export function normalizeUrl(value) {
	const v = value.trim();
	if (!v || v.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
	return 'https://' + v;
}

/**
 * @typedef {object} Field
 * @property {string} key       name in the resolved values object
 * @property {string} label     visible label
 * @property {string} [value]   initial value
 * @property {'text'|'url'|'textarea'} [type]
 * @property {boolean} [optional] when true the field may be left blank
 */

/**
 * Modal field prompt rendered as a native <dialog>.
 *
 * ponytail: replaces window.prompt, which Chrome silently suppresses when the
 * page is used as a new-tab override — prompt() returned null and every add
 * bailed out. <dialog> is top-layer, so it escapes the grid cell's clipping.
 *
 * @param {string} title
 * @param {Field[]} fields
 * @param {import('../theme/palettes.js').TintSide} p palette for theming
 * @returns {Promise<Record<string,string>|null>} values, or null if cancelled
 */
export function askFields(title, fields, p) {
	return new Promise((resolve) => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		let values = /** @type {Record<string,string>|null} */(null);

		const finish = () => { render(null, host); host.remove(); resolve(values); };
		const collect = (form) => {
			const data = new FormData(form);
			values = Object.fromEntries(fields.map((f) => {
				const raw = String(data.get(f.key) ?? '').trim();
				return [f.key, f.type === 'url' ? normalizeUrl(raw) : raw];
			}));
		};

		const input = (f, i) => h(f.type === 'textarea' ? 'textarea' : 'input', {
			name: f.key, defaultValue: f.value || '', autofocus: i === 0, required: !f.optional,
			rows: f.type === 'textarea' ? 4 : undefined,
			type: f.type === 'textarea' ? undefined : 'text', // keep type=url off: we normalize instead
			style: { width:'100%', border:`1px solid ${p.line}`, background:p.field, color:p.fg,
				borderRadius:8, padding:'8px 10px', font:"400 14px 'Instrument Sans'", outline:'none', resize:'vertical' },
		});

		render(h('dialog', { class:'nt-dialog', onClose:finish,
			style:{ border:`1px solid ${p.line}`, borderRadius:16, background:p.bg, color:p.fg, padding:20, minWidth:320, maxWidth:'92vw', boxShadow:'0 20px 60px rgba(0,0,0,.28)' } },
			h('form', { method:'dialog', onSubmit:(e) => collect(e.currentTarget) },
				h('div', { style:{ font:"500 11px 'Spline Sans Mono',monospace", letterSpacing:'.16em', textTransform:'uppercase', color:p.mut, marginBottom:14 } }, title),
				fields.map((f, i) => h('label', { key:f.key, style:{ display:'block', marginBottom:12 } },
					h('div', { style:{ font:"400 12px 'Instrument Sans'", color:p.mut, marginBottom:5 } }, f.label),
					input(f, i))),
				h('div', { style:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 } },
					h('button', { type:'button', onClick:(e) => e.currentTarget.closest('dialog').close(),
						style:{ border:`1px solid ${p.line}`, background:'transparent', color:p.mut, borderRadius:8, padding:'7px 14px', font:"500 12px 'Instrument Sans'", cursor:'pointer' } }, 'Cancel'),
					h('button', { style:{ border:'none', background:p.tile, color:p.tfg, borderRadius:8, padding:'7px 14px', font:"500 12px 'Instrument Sans'", cursor:'pointer' } }, 'Save')))
		), host);

		/** @type {HTMLDialogElement} */(host.firstElementChild).showModal();
	});
}
