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
