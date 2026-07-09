/**
 * Parse a hex color (#rgb or #rrggbb) into [r,g,b] 0–255.
 * @param {string} hex
 * @returns {[number, number, number]}
 */
function parseHex(hex) {
	let h = hex.replace('#', '').trim();
	if (h.length === 3) h = h.split('').map((c) => c + c).join('');
	const n = parseInt(h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Relative luminance per WCAG 2.1.
 * @param {string} hex
 * @returns {number} 0–1
 */
export function luminance(hex) {
	const [r, g, b] = parseHex(hex).map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pick a readable foreground for an arbitrary background color.
 * @param {string} hexBg
 * @returns {'#ffffff' | '#111111'}
 */
export function foregroundFor(hexBg) {
	return luminance(hexBg) > 0.45 ? '#111111' : '#ffffff';
}
