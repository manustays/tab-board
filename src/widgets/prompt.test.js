import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './prompt.jsx';

describe('normalizeUrl', () => {
	it('prepends https:// to a bare host', () => {
		expect(normalizeUrl('example.com')).toBe('https://example.com');
		expect(normalizeUrl('  example.com/a?b=1  ')).toBe('https://example.com/a?b=1');
	});
	it('leaves an existing scheme alone', () => {
		expect(normalizeUrl('http://example.com')).toBe('http://example.com');
		expect(normalizeUrl('https://example.com')).toBe('https://example.com');
		expect(normalizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
		expect(normalizeUrl('chrome://bookmarks')).toBe('chrome://bookmarks');
		expect(normalizeUrl('//example.com')).toBe('//example.com');
	});
	it('leaves empty input empty', () => {
		expect(normalizeUrl('')).toBe('');
		expect(normalizeUrl('   ')).toBe('');
	});
});
