import type { ProjectId } from '../context/IDEContext';

export interface WorkspaceMeta {
  projectId: ProjectId;
  folderName: string;
  activeFilePath?: string;
  openFilePaths?: string[];
  lastSavedAt?: number;
}

export interface PendingReconnect {
  handle: FileSystemDirectoryHandle;
  folderName: string;
  meta?: WorkspaceMeta | null;
}

const DB_NAME = 'intellicode_workspace_db';
const DB_VERSION = 1;
const STORE_NAME = 'workspace_handles';
const HANDLE_KEY = 'active_directory_handle';
const META_STORAGE_KEY = 'intellicode_workspace_meta_v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persist the FileSystemDirectoryHandle to IndexedDB using structured cloning.
 */
export async function saveStoredDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  folderName: string
): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ handle, folderName, savedAt: Date.now() }, HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not persist directory handle to IndexedDB:', err);
  }
}

/**
 * Retrieve the persisted FileSystemDirectoryHandle from IndexedDB.
 */
export async function getStoredDirectoryHandle(): Promise<{
  handle: FileSystemDirectoryHandle;
  folderName: string;
} | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => {
        if (req.result && req.result.handle) {
          resolve({
            handle: req.result.handle as FileSystemDirectoryHandle,
            folderName: req.result.folderName || 'Opened Workspace'
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not retrieve directory handle from IndexedDB:', err);
    return null;
  }
}

/**
 * Clear the persisted FileSystemDirectoryHandle from IndexedDB.
 */
export async function clearStoredDirectoryHandle(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not clear directory handle in IndexedDB:', err);
  }
}

/**
 * Save lightweight workspace metadata (project type, active file path, open tab paths).
 */
export function saveWorkspaceMeta(meta: WorkspaceMeta): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    }
  } catch (err) {
    console.warn('Could not save workspace meta to localStorage:', err);
  }
}

/**
 * Retrieve saved workspace metadata.
 */
export function getWorkspaceMeta(): WorkspaceMeta | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(META_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    }
  } catch (err) {
    console.warn('Could not load workspace meta from localStorage:', err);
  }
  return null;
}

/**
 * Clear saved workspace metadata.
 */
export function clearWorkspaceMeta(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(META_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Could not clear workspace meta from localStorage:', err);
  }
}
