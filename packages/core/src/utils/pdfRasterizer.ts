import { logger } from './logger';

/**
 * Render a PDF's pages to PNG images in the browser.
 *
 * Why this exists: MiniMax's chat endpoint is OpenAI-compatible, and that
 * schema has no PDF content part — only text and images. But a PDF page IS an
 * image, so rasterizing client-side lets a vision model read the paper with its
 * layout, tables and figures intact. It also keeps us off MiniMax's file-upload
 * API entirely, which is one less vendor contract to depend on.
 *
 * Google's path never comes here: Gemini ingests PDF bytes directly (inline or
 * via the Files API), which is strictly better — no rasterization loss, no page
 * cap. This is the fallback for providers that only speak images.
 */

/**
 * Pages we are willing to rasterize. Each page becomes a base64 PNG that is
 * re-sent on every continuation round, so the request cost grows fast. Past
 * this the user gets a clear error naming the real page count instead of a
 * multi-megabyte request that times out.
 */
export const DEFAULT_MAX_PDF_PAGES = 20;

/**
 * Render scale. 2.0 is roughly 150dpi for a US-Letter page — enough for a
 * vision model to read body text and table cells without ballooning the PNG.
 */
const DEFAULT_SCALE = 2.0;

export interface RasterizedPage {
  /** Base64 PNG, no data: URI prefix (matches DocumentSource.fileData). */
  data: string;
  mimeType: 'image/png';
  /** 1-based page number, for logging and error messages. */
  pageNumber: number;
}

export interface RasterizeOptions {
  maxPages?: number;
  scale?: number;
  /**
   * 1-based, inclusive slice of the document to render. Without it the whole
   * PDF must fit under `maxPages`; with it only the slice has to. This is what
   * makes a long PDF usable at all on an images-only provider.
   */
  pageRange?: { start: number; end: number };
}

/** Thrown when the selected pages exceed what we will rasterize. */
export const PDF_TOO_MANY_PAGES = 'MINIMAX_PDF_TOO_MANY_PAGES';

/** Thrown when a page range starts past the end of the document. */
export const PDF_PAGE_RANGE_EMPTY = 'MINIMAX_PDF_PAGE_RANGE_EMPTY';

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/**
 * pdfjs is over a megabyte, and only the MiniMax + PDF path needs it — so it is
 * imported dynamically and code-split away from every other flow.
 */
const loadPdfjs = async () => {
  const pdfjs: any = await import('pdfjs-dist');

  // Let the bundler emit the worker and hand us its final URL. Vite rewrites it
  // per `base`, so this resolves correctly under both /smartexam/ (GitHub Pages)
  // and / (Vercel) without either target needing to know about the other.
  //
  // Outside a bundler (the test suite) this specifier doesn't resolve; pdf.js
  // then falls back to its main-thread "fake worker", which parses correctly —
  // just without the background thread.
  try {
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    logger.warn(
      'PDF worker URL unavailable — parsing on the main thread.',
      'pdfRasterizer.loadPdfjs'
    );
  }

  return pdfjs;
};

/**
 * Rasterize a base64 PDF into one PNG per page, in document order.
 *
 * Throws `MINIMAX_PDF_TOO_MANY_PAGES` when the document exceeds `maxPages`, and
 * `PDF_RENDER_FAILED` when the browser cannot render (no canvas support, or a
 * malformed file).
 */
export const rasterizePdfToImages = async (
  base64: string,
  options?: RasterizeOptions
): Promise<RasterizedPage[]> => {
  const maxPages = options?.maxPages ?? DEFAULT_MAX_PDF_PAGES;
  const scale = options?.scale ?? DEFAULT_SCALE;

  let pdfjs: any;
  try {
    pdfjs = await loadPdfjs();
  } catch (e) {
    logger.error('Failed to load pdfjs-dist', 'pdfRasterizer.rasterizePdfToImages', e as Error);
    throw new Error(
      'PDF_RENDER_FAILED: 無法載入 PDF 解析器。請重新整理頁面再試，或改用 Google 模型（可直接讀取 PDF）。'
    );
  }

  const doc = await pdfjs.getDocument({ data: base64ToUint8Array(base64) }).promise;
  const pageCount: number = doc.numPages;

  const range = options?.pageRange;
  if (range && range.start > pageCount) {
    throw new Error(
      `${PDF_PAGE_RANGE_EMPTY}: 呢份 PDF 只有 ${pageCount} 頁，但你要求由第 ${range.start} 頁開始。` +
        `請改一個喺 1-${pageCount} 範圍內嘅頁數。`
    );
  }

  // Clamp to the document: asking for 1-20 of a 12-page file should give 12
  // pages, not an error.
  const firstPage = range ? range.start : 1;
  const lastPage = range ? Math.min(range.end, pageCount) : pageCount;
  const selectedCount = lastPage - firstPage + 1;

  if (selectedCount > maxPages) {
    // The advice here has to be advice that WORKS. An earlier version pointed at
    // Focus Range generically, which does nothing on this path unless it names
    // pages — the rasterizer runs before the range ever reaches the prompt.
    const rangeNote = range
      ? `你揀咗第 ${range.start}-${range.end} 頁，即 ${selectedCount} 頁，`
      : `呢份 PDF 有 ${pageCount} 頁，`;
    throw new Error(
      `${PDF_TOO_MANY_PAGES}: ${rangeNote}超過 MiniMax 圖像模式嘅 ${maxPages} 頁上限。` +
        `MiniMax 讀唔到 PDF 本身，要逐頁轉成圖片，頁數太多會令請求過大。兩個做法：` +
        `（1）喺 ⚙️ Settings 改用 Google 模型，可以一次過直接讀完整份 ${pageCount} 頁 PDF；` +
        `（2）留喺 MiniMax，喺考試設定嘅「Focus Range」填頁數範圍，例如「Pages 1-${maxPages}」，` +
        `每次讀一段（注意：要寫明「Pages」，淨係寫「1-${maxPages}」會被當成題號範圍）。`
    );
  }

  const pages: RasterizedPage[] = [];
  for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error(
        'PDF_RENDER_FAILED: 瀏覽器唔支援 canvas，無法將 PDF 轉成圖片。請改用 Google 模型。'
      );
    }

    await page.render({ canvasContext: context, viewport }).promise;

    // toDataURL yields "data:image/png;base64,XXXX" — keep only the payload so
    // the shape matches DocumentSource.fileData everywhere else in the app.
    const dataUrl = canvas.toDataURL('image/png');
    pages.push({
      data: dataUrl.slice(dataUrl.indexOf(',') + 1),
      mimeType: 'image/png',
      pageNumber,
    });
  }

  logger.info(
    `Rasterized ${pages.length} PDF page(s) to PNG for a vision model.`,
    'pdfRasterizer.rasterizePdfToImages'
  );
  return pages;
};
