import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDocument,
  saveDocumentFile,
  listDocuments,
  loadDocument,
  loadDocumentAsync,
  deleteDocument,
} from '../documentLibrary';
import { generateDocumentHash } from '../examStorage';

// jsdom supplies a real localStorage (see src/__tests__/setup.ts); just reset
// it between tests. The previous MemoryStorage shim existed only because the
// suite used to run in the node environment, and assigning over jsdom's
// read-only `localStorage` accessor throws.
beforeEach(() => {
  localStorage.clear();
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

  it('stores metadata for file documents; sync loadDocument stays text-only', () => {
    const saved = saveDocument({ fileData: { data: 'BASE64DATA', mimeType: 'application/pdf' }, name: 'paper.pdf' });
    expect(saved!.kind).toBe('file');
    expect(saved!.mimeType).toBe('application/pdf');
    // Bytes live in IndexedDB, so the synchronous accessor never returns them.
    expect(loadDocument(saved!.hash)).toBeNull();
  });

  it('loadDocumentAsync restores text documents without touching the file store', async () => {
    const saved = saveDocument({ text: 'async notes', name: 'n.txt' })!;
    const restored = await loadDocumentAsync(saved.hash);
    expect(restored?.text).toBe('async notes');
    expect(restored?.name).toBe('n.txt');
  });

  it('loadDocumentAsync returns null for a file whose bytes were never stored', async () => {
    // No IndexedDB in this env — the re-upload prompt path.
    const saved = saveDocument({ fileData: { data: 'BASE64DATA', mimeType: 'application/pdf' }, name: 'p.pdf' })!;
    await expect(loadDocumentAsync(saved.hash)).resolves.toBeNull();
    await expect(saveDocumentFile(saved.hash, { data: 'BASE64DATA', mimeType: 'application/pdf' })).resolves.toBe(false);
  });

  it('loadDocumentAsync returns null for an unknown hash', async () => {
    await expect(loadDocumentAsync('does-not-exist')).resolves.toBeNull();
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
