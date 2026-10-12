/**
 * Resilient IndexedDB Client Storage Utility
 * Provides virtually unlimited, quota-free storage for offline caching & instant renders.
 */

const DB_NAME = 'khojam_database';
const DB_VERSION = 1;
const STORE_NAME = 'app_store';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e: any) => {
      resolve(e.target.result);
    };

    request.onerror = (e: any) => {
      reject(e.target.error);
    };
  });
}

export const idbStorage = {
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      });
    } catch {
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
      } catch {
        return null;
      }
    }
  },

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('IndexedDB set notice:', e);
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore localStorage quota errors since IndexedDB has the data
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}

    try {
      localStorage.removeItem(key);
    } catch {}
  }
};
