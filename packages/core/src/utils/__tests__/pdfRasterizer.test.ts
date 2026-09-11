// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rasterizePdfToImages, DEFAULT_MAX_PDF_PAGES, PDF_TOO_MANY_PAGES, PDF_PAGE_RANGE_EMPTY } from '../pdfRasterizer';

/**
 * pdfjs is mocked: it is a >1MB dependency loaded through a dynamic import, and
 * jsdom has no real canvas renderer. What matters here is the contract around
 * it — page cap, ordering, output shape, and the failure paths.
 */

const renderMock = vi.fn(() => ({ promise: Promise.resolve() }));

/** A fake pdfjs document with `numPages` pages. */
const fakePdfjs = (numPages: number) => ({
  GlobalWorkerOptions: { workerSrc: 'unset' },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages,
      getPage: (n: number) =>
        Promise.resolve({
          _n: n,
          getViewport: () => ({ width: 100, height: 200 }),
          render: renderMock,
        }),
    }),
  }),
});

vi.mock('pdfjs-dist', () => ({}));

/** Swap what the dynamic `import('pdfjs-dist')` resolves to, per test. */
const mockPdfjs = (numPages: number) => {
  vi.doMock('pdfjs-dist', () => fakePdfjs(numPages));
};

let pageCounter = 0;

beforeEach(() => {
  pageCounter = 0;
  renderMock.mockClear();
  vi.resetModules();

  // atob exists in jsdom; canvas does not render, so stub the 2d context and
  // hand back a distinct data URL per page so ordering is observable.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(
    () => `data:image/png;base64,PAGE${++pageCounter}`
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('pdfjs-dist');
});

/** Re-import the module under test after doMock so it picks up the fake. */
const load = async () => (await import('../pdfRasterizer')).rasterizePdfToImages;

describe('rasterizePdfToImages', () => {
  it('returns one PNG per page, in document order, with the data URI prefix stripped', async () => {
    mockPdfjs(3);
    const rasterize = await load();

    const pages = await rasterize('Zm9v');

    expect(pages).toHaveLength(3);
    expect(pages.map(p => p.pageNumber)).toEqual([1, 2, 3]);
    expect(pages.map(p => p.data)).toEqual(['PAGE1', 'PAGE2', 'PAGE3']);
    expect(pages.every(p => p.mimeType === 'image/png')).toBe(true);
    // No page carries the "data:" prefix — callers embed it themselves.
    expect(pages.some(p => p.data.startsWith('data:'))).toBe(false);
  });

  it('renders every page exactly once', async () => {
    mockPdfjs(4);
    const rasterize = await load();

    await rasterize('Zm9v');

    expect(renderMock).toHaveBeenCalledTimes(4);
  });

  it('rejects a PDF past the page cap, naming the real page count', async () => {
    mockPdfjs(DEFAULT_MAX_PDF_PAGES + 5);
    const rasterize = await load();

    await expect(rasterize('Zm9v')).rejects.toThrow(PDF_TOO_MANY_PAGES);
    await expect(rasterize('Zm9v')).rejects.toThrow(String(DEFAULT_MAX_PDF_PAGES + 5));
    // Nothing was rendered — the cap is checked before any work is done.
    expect(renderMock).not.toHaveBeenCalled();
  });

  it('accepts a PDF exactly at the cap', async () => {
    mockPdfjs(DEFAULT_MAX_PDF_PAGES);
    const rasterize = await load();

    const pages = await rasterize('Zm9v');

    expect(pages).toHaveLength(DEFAULT_MAX_PDF_PAGES);
  });

  it('honors a caller-supplied page cap', async () => {
    mockPdfjs(5);
    const rasterize = await load();

    await expect(rasterize('Zm9v', { maxPages: 2 })).rejects.toThrow(PDF_TOO_MANY_PAGES);
  });

  it('fails clearly when the browser has no canvas 2d context', async () => {
    mockPdfjs(1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const rasterize = await load();

    await expect(rasterize('Zm9v')).rejects.toThrow('PDF_RENDER_FAILED');
  });

  describe('page range', () => {
    it('renders only the requested slice of a long document', async () => {
      // The 504-page case: without a range this throws; with one it works.
      mockPdfjs(504);
      const rasterize = await load();

      const pages = await rasterize('Zm9v', { pageRange: { start: 1, end: 20 } });

      expect(pages).toHaveLength(20);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[19].pageNumber).toBe(20);
      expect(renderMock).toHaveBeenCalledTimes(20);
    });

    it('reports the document page numbers, not 1..n, for a later slice', async () => {
      mockPdfjs(504);
      const rasterize = await load();

      const pages = await rasterize('Zm9v', { pageRange: { start: 21, end: 40 } });

      expect(pages.map(p => p.pageNumber)).toEqual(
        Array.from({ length: 20 }, (_, i) => 21 + i)
      );
    });

    it('clamps a range that overruns the end of the document', async () => {
      // Asking for 1-20 of a 12-page file should give 12 pages, not an error.
      mockPdfjs(12);
      const rasterize = await load();

      const pages = await rasterize('Zm9v', { pageRange: { start: 1, end: 20 } });

      expect(pages).toHaveLength(12);
    });

    it('rejects a range starting past the end of the document', async () => {
      mockPdfjs(10);
      const rasterize = await load();

      await expect(
        rasterize('Zm9v', { pageRange: { start: 50, end: 70 } })
      ).rejects.toThrow(PDF_PAGE_RANGE_EMPTY);
    });

    it('still enforces the cap on an over-wide range, quoting the selection', async () => {
      mockPdfjs(504);
      const rasterize = await load();

      const call = rasterize('Zm9v', { pageRange: { start: 1, end: 100 } });
      await expect(call).rejects.toThrow(PDF_TOO_MANY_PAGES);
      await expect(call).rejects.toThrow('100 頁');
    });

    it('tells the user how to actually fix an over-long document', async () => {
      // The previous message pointed at Focus Range generically, which does
      // nothing here unless it names pages. Advice must be advice that works.
      mockPdfjs(504);
      const rasterize = await load();

      const call = rasterize('Zm9v');
      await expect(call).rejects.toThrow('Google');
      await expect(call).rejects.toThrow(`Pages 1-${DEFAULT_MAX_PDF_PAGES}`);
      await expect(call).rejects.toThrow('504');
    });
  });

  it('exports the page cap it enforces', () => {
    // The Settings copy and the error message both quote this number.
    expect(DEFAULT_MAX_PDF_PAGES).toBeGreaterThan(0);
    expect(rasterizePdfToImages).toBeTypeOf('function');
  });
});
