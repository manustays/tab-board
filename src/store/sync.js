/**
 * Folder-sync adapter over the File System Access API.
 * Every function is a no-throw boundary: failures return null/false, never throw.
 */

export const FILE_NAME = 'tabboard.json';

/** @returns {boolean} true when the browser supports directory pickers. */
export function isSupported() {
	return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/**
 * Read and parse tabboard.json from a directory handle.
 * @param {any} dirHandle
 * @returns {Promise<object|null>} parsed blob, or null if missing/empty/corrupt.
 */
export async function readState(dirHandle) {
	try {
		const fileHandle = await dirHandle.getFileHandle(FILE_NAME);
		const file = await fileHandle.getFile();
		const text = await file.text();
		if (!text) return null;
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
}

/**
 * Write state as tabboard.json into a directory handle.
 * @param {any} dirHandle
 * @param {object} state
 * @returns {Promise<boolean>} true on success.
 */
export async function writeState(dirHandle, state) {
	try {
		const fileHandle = await dirHandle.getFileHandle(FILE_NAME, { create:true });
		const writable = await fileHandle.createWritable();
		await writable.write(JSON.stringify(state));
		await writable.close();
		return true;
	} catch (e) {
		return false;
	}
}

const IDB_NAME = 'tabboard-sync';
const IDB_STORE = 'handles';
const IDB_KEY = 'dir';

/** Promisified single-key IndexedDB storage for the directory handle. */
const idbStorage = {
	_open() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(IDB_NAME, 1);
			req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	},
	async _tx(mode, fn) {
		const db = await this._open();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(IDB_STORE, mode);
			const req = fn(tx.objectStore(IDB_STORE));
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	},
	get() { return this._tx('readonly', (s) => s.get(IDB_KEY)); },
	set(v) { return this._tx('readwrite', (s) => s.put(v, IDB_KEY)); },
	del() { return this._tx('readwrite', (s) => s.delete(IDB_KEY)); },
};

let handleStorage = idbStorage;

/**
 * Swap the handle-storage backend (test seam). Pass null to reset to IndexedDB.
 * @param {{get:()=>Promise<any>,set:(v:any)=>Promise<void>,del:()=>Promise<void>}|null} impl
 */
export function __setHandleStorage(impl) {
	handleStorage = impl || idbStorage;
}

/** Ensure readwrite permission on a handle, prompting if needed. */
async function ensurePermission(handle) {
	const opts = { mode:'readwrite' };
	if (await handle.queryPermission(opts) === 'granted') return true;
	return (await handle.requestPermission(opts)) === 'granted';
}

/**
 * Prompt for a folder, persist its handle, return it.
 * @returns {Promise<{handle:any,name:string}|null>} null if cancelled/unsupported.
 */
export async function connect() {
	if (!isSupported()) return null;
	try {
		const handle = await window.showDirectoryPicker({ mode:'readwrite' });
		await handleStorage.set(handle);
		return { handle, name:handle.name };
	} catch (e) {
		return null;
	}
}

/**
 * Reload a previously-connected folder handle if permission is still granted.
 * @returns {Promise<{handle:any,name:string}|null>}
 */
export async function restore() {
	try {
		const handle = await handleStorage.get();
		if (!handle) return null;
		if (!(await ensurePermission(handle))) return null;
		return { handle, name:handle.name };
	} catch (e) {
		return null;
	}
}

/** Forget the stored folder handle. @returns {Promise<void>} */
export async function disconnect() {
	try { await handleStorage.del(); } catch (e) { /* ignore */ }
}
