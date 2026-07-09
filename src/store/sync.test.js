import { describe, it, expect } from 'vitest';
import { isSupported, readState, writeState, FILE_NAME } from './sync.js';

// Minimal fakes for the File System Access API.
function fakeWritable(sink) {
	return { write: (data) => { sink.data = data; }, close: async () => {} };
}
function fakeFileHandle(store) {
	return {
		createWritable: async () => fakeWritable(store),
		getFile: async () => ({ text: async () => store.data ?? '' }),
	};
}
// throwOnGet simulates a missing file; the real API rejects getFileHandle without {create}.
function fakeDir({ store = {}, throwOnGet = false } = {}) {
	return {
		getFileHandle: async (name, opts) => {
			expect(name).toBe(FILE_NAME);
			if (throwOnGet && !opts?.create) throw new Error('NotFound');
			return fakeFileHandle(store);
		},
	};
}

describe('sync file io', () => {
	it('isSupported reflects showDirectoryPicker presence', () => {
		expect(typeof isSupported()).toBe('boolean');
	});
	it('writeState serializes state to the file', async () => {
		const store = {};
		const ok = await writeState(fakeDir({ store }), { name:'Zed', updatedAt:5 });
		expect(ok).toBe(true);
		expect(JSON.parse(store.data)).toEqual({ name:'Zed', updatedAt:5 });
	});
	it('readState parses a written file', async () => {
		const store = { data: JSON.stringify({ name:'Zed', updatedAt:5 }) };
		expect(await readState(fakeDir({ store }))).toEqual({ name:'Zed', updatedAt:5 });
	});
	it('readState returns null when the file is missing', async () => {
		expect(await readState(fakeDir({ throwOnGet:true }))).toBe(null);
	});
	it('readState returns null on empty or corrupt json', async () => {
		expect(await readState(fakeDir({ store:{ data:'' } }))).toBe(null);
		expect(await readState(fakeDir({ store:{ data:'{ not json' } }))).toBe(null);
	});
	it('writeState returns false when the handle throws', async () => {
		const bad = { getFileHandle: async () => { throw new Error('denied'); } };
		expect(await writeState(bad, { updatedAt:1 })).toBe(false);
	});
});
