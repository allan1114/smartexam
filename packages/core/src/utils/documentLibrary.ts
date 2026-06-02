import { DocumentSource } from '../types';
import { generateDocumentHash } from './examStorage';
import { logger } from './logger';

/**
 * Saved-documents library.
 *
 * Lets users re-open a previously uploaded/pasted document WITHOUT re-uploading.
 * Stored in a NEW localStorage namespace (smart_exam_doclib_*) so it never
 * touches existing keys.
 *
 * Storage policy (matches "text/paste first" decision):
 *  - kind === 'text'  → full text is stored, so it is fully restorable offline.
 *  - kind === 'file'  → only metadata (name + mimeType) is stored, NOT the
 *    base64 bytes (PDFs/images can be megabytes and would blow the localStorage
 *    quota). The cached question bank for the same hash still lets the user
 *    re-run exams; if it has been evicted the UI asks them to re-upload.
 */

const DOCLIB_INDEX_KEY = 'smart_exam_doclib_index';
const DOCLIB_KEY_PREFIX = 'smart_exam_doc_';
const MAX_DOCS = 20;

export interface SavedDocument {
  hash: string;
  name: string;
  kind: 'text' | 'file';
  mimeType?: string;
  text?: string; // only present for kind === 'text'
  createdAt: number;
  lastUsedAt: number;
}

const getIndex = (): string[] => {
  try {
    const raw = localStorage.getItem(DOCLIB_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeIndex = (index: string[]) => {
  try {
    localStorage.setItem(DOCLIB_INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    logger.warn('Failed to write doc library index', 'documentLibrary.writeIndex', e);
  }
};

const readDoc = (hash: string): SavedDocument | null => {
  try {
    const raw = localStorage.getItem(DOCLIB_KEY_PREFIX + hash);
    return raw ? (JSON.parse(raw) as SavedDocument) : null;
  } catch {
    return null;
  }
};

/** Derive a friendly display name when the source has none. */
const deriveName = (source: DocumentSource): string => {
  if (source.name && source.name.trim()) return source.name.trim();
  if (source.text) {
    const firstLine = source.text.trim().split('\n')[0].slice(0, 40).trim();
    if (firstLine) return firstLine;
    return `Pasted text · ${new Date().toLocaleDateString()}`;
  }
  return `Document · ${new Date().toLocaleDateString()}`;
};

/**
 * Persist a document so it can be re-opened later without re-uploading.
 * Returns the saved record (or null on failure — saving is best-effort and must
 * never break the upload flow).
 */
export const saveDocument = (source: DocumentSource): SavedDocument | null => {
  try {
    const hash = generateDocumentHash(source.text, source.fileData);
    const now = Date.now();
    const existing = readDoc(hash);

    const record: SavedDocument = {
      hash,
      name: deriveName(source),
      kind: source.text ? 'text' : 'file',
      mimeType: source.fileData?.mimeType,
      text: source.text || undefined,
      createdAt: existing?.createdAt ?? now,
      lastUsedAt: now,
    };

    localStorage.setItem(DOCLIB_KEY_PREFIX + hash, JSON.stringify(record));

    // Maintain index (most-recent-last), evicting the oldest beyond the cap.
    const index = getIndex().filter(h => h !== hash);
    index.push(hash);
    while (index.length > MAX_DOCS) {
      const evict = index.shift();
      if (evict) localStorage.removeItem(DOCLIB_KEY_PREFIX + evict);
    }
    writeIndex(index);
    return record;
  } catch (e) {
    // Quota errors etc. — never throw into the upload path.
    logger.warn('Failed to save document to library', 'documentLibrary.saveDocument', e);
    return null;
  }
};

/** List saved documents, most-recently-used first. */
export const listDocuments = (): SavedDocument[] => {
  // The index is maintained most-recent-LAST. Reverse it first so that recency
  // is the natural order, then stable-sort by lastUsedAt — ties (same-ms saves)
  // keep the reversed-index order, i.e. the latest save still wins.
  return getIndex()
    .slice()
    .reverse()
    .map(readDoc)
    .filter((d): d is SavedDocument => d !== null)
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
};

/**
 * Rebuild a usable DocumentSource for a saved document.
 *  - text docs → fully restored ({ text, name }).
 *  - file docs → null, because the bytes were intentionally not stored; the
 *    caller should prompt the user to re-upload.
 */
export const loadDocument = (hash: string): DocumentSource | null => {
  const doc = readDoc(hash);
  if (!doc) return null;
  if (doc.kind === 'text' && doc.text) {
    return { text: doc.text, name: doc.name };
  }
  return null;
};

export const deleteDocument = (hash: string): void => {
  try {
    localStorage.removeItem(DOCLIB_KEY_PREFIX + hash);
    writeIndex(getIndex().filter(h => h !== hash));
  } catch (e) {
    logger.warn('Failed to delete document from library', 'documentLibrary.deleteDocument', e);
  }
};

/** Bump lastUsedAt so the list stays ordered by recency. */
export const touchDocument = (hash: string): void => {
  const doc = readDoc(hash);
  if (!doc) return;
  doc.lastUsedAt = Date.now();
  try {
    localStorage.setItem(DOCLIB_KEY_PREFIX + hash, JSON.stringify(doc));
  } catch {
    /* best-effort */
  }
};
