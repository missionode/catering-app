const DB_NAME = 'CateringAppDB';
const STORE_NAME = 'FileSystemHandles';
const FILE_HANDLE_KEY = 'autoSaveFileHandle';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveFileHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(handle, FILE_HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadFileHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(FILE_HANDLE_KEY);
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
    });
}

export async function deleteFileHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(FILE_HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Checks if permission is already granted, without prompting the user.
 */
export async function checkPermission(fileHandle, withWrite) {
    const options = { mode: withWrite ? 'readwrite' : 'read' };
    return (await fileHandle.queryPermission(options)) === 'granted';
}

/**
 * Verifies permission and requests it if not already granted.
 * Should ONLY be called after a user gesture (e.g., a click).
 */
export async function requestPermission(fileHandle, withWrite) {
    const options = { mode: withWrite ? 'readwrite' : 'read' };
    if ((await fileHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

export async function writeFile(fileHandle, contents) {
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
}
