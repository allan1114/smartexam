import { logger } from './logger';

/**
 * IndexedDB store for uploaded file bytes (PDF / image base64).
 *
 * The saved-documents library keeps its metadata index in localStorage, which
 * has a ~5MB quota shared with question banks and exam history — far too small
 * for the PDFs users upload, which is why file bytes were previously dropped and
 * re-opening a saved PDF forced a re-upload. IndexedDB has no such constraint,
 * so the uploaded document can be kept as a genuine, re-openable reference.
 *
 * Every operation is best-effort: a browser without IndexedDB (or with it
 * blocked, e.g. private mode in some engines) degrades to exactly the previous
 * behavior — metadata is kept, bytes are not, and the UI asks for a re-upload.
 * Nothing here may ever throw into the upload or exam flow.
 */

const DB_NAME = 'smartexam';
const DB_VERSION = 1;
const STORE = 'documentFiles';

/**
 * Skip storing anything larger than this (length of the base64 string, so ~19MB
 * of actual file). Big enough for the exam PDFs this app targets, small enough
 * that the library can't quietly consume hundreds of MB of the user's disk.
 */
export const MAX_STORED_FILE_LEN = 25 * 1024 * 1024;

export interface StoredFile {
  data: string; // base64
  mimeType: string;
}

const hasIndexedDB = (): boolean =>
  typeof indexedDB !== 'undefined' && indexedDB !== null;

const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (!hasIndexedDB()) return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      logger.warn('IndexedDB open threw', 'fileStore.openDb', e);
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      logger.warn('IndexedDB unavailable — file bytes will not be kept', 'fileStore.openDb');
      resolve(null);
    };
    // A blocked upgrade must not hang the caller forever.
    req.onblocked = () => resolve(null);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise<T | null>((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    } catch (e) {
      logger.warn('IndexedDB transaction failed', 'fileStore.withStore', e);
      resolve(null);
    } finally {
      // Closing is safe here: pending transactions still run to completion.
      db.close();
    }
  });
};

/** Store a document's bytes. Returns whether they were actually persisted. */
export const putFile = async (hash: string, file: StoredFile): Promise<boolean> => {
  if (!file?.data) return false;
  if (file.data.length > MAX_STORED_FILE_LEN) {
    logger.warn(
      `File too large to keep in the document library (${Math.round(file.data.length / 1024 / 1024)}MB) — skipping.`,
      'fileStore.putFile'
    );
    return false;
  }
  const res = await withStore('readwrite', (s) => s.put(file, hash) as IDBRequest<IDBValidKey>);
  return res !== null;
};

/** Retrieve a document's bytes, or null when they were never stored. */
export const getFile = async (hash: string): Promise<StoredFile | null> => {
  const res = await withStore<StoredFile>('readonly', (s) => s.get(hash) as IDBRequest<StoredFile>);
  return res && typeof res.data === 'string' ? res : null;
};

/** Best-effort removal; used when a document is deleted or evicted. */
export const deleteFile = async (hash: string): Promise<void> => {
  await withStore('readwrite', (s) => s.delete(hash) as IDBRequest<undefined>);
};
