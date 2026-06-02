import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDocument,
  listDocuments,
  loadDocument,
  deleteDocument,
} from '../documentLibrary';
import { generateDocumentHash } from '../examStorage';

// Minimal in-memory localStorage so these tests run in the node test env.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

beforeEach(() => {
  (globalThis as any).localStorage = new MemoryStorage();
});

describe('documentLibrary', () => {
  it('saves and restores a text document', () => {
    const saved = saveDocument({ text: 'Hello world study notes', name: 'notes.txt' });
    expect(saved).not.toBeNull();
    expect(saved!.kind).toBe('text');

    const restored = loadDocument(saved!.hash);
    expect(restored).not.toBeNull();
    expect(restored!.text).toBe('Hello world study notes');
  });

  it('keys documents by content hash and de-duplicates re-saves', () => {
    saveDocument({ text: 'same content', name: 'a.txt' });
    saveDocument({ text: 'same content', name: 'a.txt' });
    const hash = generateDocumentHash('same content', undefined);
    const list = listDocuments();
    expect(list.filter(d => d.hash === hash).length).toBe(1);
  });

  it('stores only metadata for file documents (no base64 restore)', () => {
    const saved = saveDocument({ fileData: { data: 'BASE64DATA', mimeType: 'application/pdf' }, name: 'paper.pdf' });
    expect(saved!.kind).toBe('file');
    expect(saved!.mimeType).toBe('application/pdf');
    // File bytes are intentionally not restorable.
    expect(loadDocument(saved!.hash)).toBeNull();
  });

  it('lists most-recently-used first', () => {
    const a = saveDocument({ text: 'first doc' })!;
    const b = saveDocument({ text: 'second doc' })!;
    const list = listDocuments();
    expect(list[0].hash).toBe(b.hash);
    expect(list[1].hash).toBe(a.hash);
  });

  it('deletes a document', () => {
    const saved = saveDocument({ text: 'to be removed' })!;
    deleteDocument(saved.hash);
    expect(loadDocument(saved.hash)).toBeNull();
    expect(listDocuments().find(d => d.hash === saved.hash)).toBeUndefined();
  });
});
