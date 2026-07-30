import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { putFile, getFile, deleteFile, MAX_STORED_FILE_LEN } from '../fileStore';

/**
 * These run in the node env, where IndexedDB does not exist — which is exactly
 * the degradation path that must never throw into the upload flow. The happy
 * path (bytes actually surviving a reload) is covered end-to-end in a real
 * browser, since only a real IndexedDB proves persistence.
 */
describe('fileStore — graceful degradation without IndexedDB', () => {
  beforeEach(() => {
    delete (globalThis as any).indexedDB;
  });

  it('putFile reports not-stored instead of throwing', async () => {
    await expect(putFile('h1', { data: 'AAAA', mimeType: 'application/pdf' })).resolves.toBe(false);
  });

  it('getFile resolves null', async () => {
    await expect(getFile('h1')).resolves.toBeNull();
  });

  it('deleteFile resolves quietly', async () => {
    await expect(deleteFile('h1')).resolves.toBeUndefined();
  });
});

describe('fileStore — size policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).indexedDB;
  });

  it('refuses a file over the cap without ever touching IndexedDB', async () => {
    // If the cap were not enforced first, this would try to open the DB.
    const open = vi.fn();
    (globalThis as any).indexedDB = { open };

    const oversized = { data: 'x'.repeat(MAX_STORED_FILE_LEN + 1), mimeType: 'application/pdf' };
    await expect(putFile('big', oversized)).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('refuses empty data', async () => {
    const open = vi.fn();
    (globalThis as any).indexedDB = { open };

    await expect(putFile('empty', { data: '', mimeType: 'application/pdf' })).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('survives an IndexedDB implementation that throws on open', async () => {
    (globalThis as any).indexedDB = {
      open: () => { throw new Error('blocked by browser policy'); },
    };

    await expect(putFile('h', { data: 'AAAA', mimeType: 'application/pdf' })).resolves.toBe(false);
    await expect(getFile('h')).resolves.toBeNull();
  });
});
