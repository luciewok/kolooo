import { CompetitionEntry, SpinLog, Prize } from '../types';

export interface OutboxItem {
  id: string;
  type: 'entry' | 'spin' | 'prize_state';
  data: CompetitionEntry | SpinLog | Prize[];
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
}

const DB_NAME = 'pixel_kolo_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

export function getDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('entries')) {
          db.createObjectStore('entries', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('spins')) {
          db.createObjectStore('spins', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB failed to open, falling back to localStorage only:', event);
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB initialization exception:', e);
      resolve(null);
    }
  });

  return dbPromise;
}

// Helper for generic store operations
async function performTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | null> {
  const db = await getDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = operation(store);

      if (req) {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } else {
        tx.oncomplete = () => resolve(null);
        tx.onerror = () => resolve(null);
      }
    } catch (err) {
      console.warn(`IndexedDB transaction error on ${storeName}:`, err);
      resolve(null);
    }
  });
}

// --- Entries ---
export async function saveEntryToIDB(entry: CompetitionEntry): Promise<void> {
  await performTx('entries', 'readwrite', (store) => store.put(entry));
}

export async function getAllEntriesFromIDB(): Promise<CompetitionEntry[]> {
  const result = await performTx<CompetitionEntry[]>('entries', 'readonly', (store) => store.getAll());
  return Array.isArray(result) ? result : [];
}

export async function deleteEntryFromIDB(id: string): Promise<void> {
  await performTx('entries', 'readwrite', (store) => store.delete(id));
}

export async function clearEntriesFromIDB(): Promise<void> {
  await performTx('entries', 'readwrite', (store) => store.clear());
}

// --- Spins ---
export async function saveSpinToIDB(spin: SpinLog): Promise<void> {
  await performTx('spins', 'readwrite', (store) => store.put(spin));
}

export async function getAllSpinsFromIDB(): Promise<SpinLog[]> {
  const result = await performTx<SpinLog[]>('spins', 'readonly', (store) => store.getAll());
  return Array.isArray(result) ? result : [];
}

export async function clearSpinsFromIDB(): Promise<void> {
  await performTx('spins', 'readwrite', (store) => store.clear());
}

// --- Outbox Queue ---
export async function saveOutboxItemToIDB(item: OutboxItem): Promise<void> {
  await performTx('outbox', 'readwrite', (store) => store.put(item));
}

export async function removeOutboxItemFromIDB(id: string): Promise<void> {
  await performTx('outbox', 'readwrite', (store) => store.delete(id));
}

export async function getAllOutboxItemsFromIDB(): Promise<OutboxItem[]> {
  const result = await performTx<OutboxItem[]>('outbox', 'readonly', (store) => store.getAll());
  return Array.isArray(result) ? result : [];
}
