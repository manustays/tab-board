import { describe, it, expect } from 'vitest';
import { isSupported, readState, writeState, FILE_NAME, connect, restore, disconnect, __setHandleStorage } from './sync.js';

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

function memStorage() {
	let value = null;
	return {
		get: async () => value,
		set: async (v) => { value = v; },
		del: async () => { value = null; },
	};
}

describe('sync connect/restore/disconnect', () => {
	it('connect persists the handle and returns name', async () => {
		__setHandleStorage(memStorage());
		const handle = { name:'MyFolder', queryPermission: async () => 'granted' };
		globalThis.window = globalThis.window || {};
		window.showDirectoryPicker = async () => handle;
		const conn = await connect();
		expect(conn).toEqual({ handle, name:'MyFolder' });
		__setHandleStorage(null);
	});
	it('connect returns null when the user cancels', async () => {
		__setHandleStorage(memStorage());
		window.showDirectoryPicker = async () => { throw new Error('AbortError'); };
		expect(await connect()).toBe(null);
		__setHandleStorage(null);
	});
	it('restore returns the handle when permission is granted', async () => {
		const store = memStorage();
		__setHandleStorage(store);
		const handle = { name:'MyFolder', queryPermission: async () => 'granted' };
		await store.set(handle);
		expect(await restore()).toEqual({ handle, name:'MyFolder' });
		__setHandleStorage(null);
	});
	it('restore requests permission when prompt, returns null if not granted', async () => {
		const store = memStorage();
		__setHandleStorage(store);
		const handle = { name:'F', queryPermission: async () => 'prompt', requestPermission: async () => 'denied' };
		await store.set(handle);
		expect(await restore()).toBe(null);
		__setHandleStorage(null);
	});
	it('restore returns null when nothing is stored', async () => {
		__setHandleStorage(memStorage());
		expect(await restore()).toBe(null);
		__setHandleStorage(null);
	});
	it('disconnect clears the stored handle', async () => {
		const store = memStorage();
		__setHandleStorage(store);
		await store.set({ name:'F', queryPermission: async () => 'granted' });
		await disconnect();
		expect(await restore()).toBe(null);
		__setHandleStorage(null);
	});
});
