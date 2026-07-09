/**
 * Time-of-day greeting.
 * @param {number} hour 0–23
 * @returns {string}
 */
export function greeting(hour) {
	if (hour < 5) return 'Good night';
	if (hour < 12) return 'Good morning';
	if (hour < 17) return 'Good afternoon';
	if (hour < 21) return 'Good evening';
	return 'Good night';
}
