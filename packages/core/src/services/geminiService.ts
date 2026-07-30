
import { Type, GenerateContentResponse } from "@google/genai";
import { Question, AnswerFormat, DocumentSource, UserAnswer, PerformanceAnalysis, CaseType } from "../types";
import { cleanJsonResponse, cleanJsonResponseDetailed, normalizeGeneratedQuestion } from "../utils/fileProcessor";
import { questionDedupKey } from "../utils/questionBank";
import { ApiError, isRetryableError } from "../utils/errors";
import { logger } from "../utils/logger";
import { DEFAULT_MODEL, getFallbackModel, getMaxOutputTokens, isOverloadError, isModelUnavailableError } from "../constants/models";

const GEMINI_DIRECT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_FILES_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

// Default ceiling on a single generateContent request so a hung connection
// can't block exam creation indefinitely. Heavier requests (large PDFs / long
// documents) pass a longer per-call timeout — reading a 50MB PDF and building a
// question bank legitimately takes longer than 90s, and a too-short deadline was
// the cause of the recurring NETWORK_TIMEOUT on big files.
const REQUEST_TIMEOUT_MS = 90000;
// Generous ceiling for file-backed extraction (big PDFs are slow to ingest).
const FILE_REQUEST_TIMEOUT_MS = 240000;
// Middle ground for large pasted/Google-Docs text.
const LARGE_TEXT_REQUEST_TIMEOUT_MS = 150000;

// Gemini caps a single generateContent request (inline data included) at ~20MB.
// base64 inflates the raw bytes by ~33%, so once the ENCODED payload passes
// ~15MB we upload the file via the Files API and reference it by URI instead of
// inlining it. This is what lets large PDFs — users routinely upload up to
// ~50MB — succeed instead of failing the request outright.
export const INLINE_MAX_BASE64_LEN = 15 * 1024 * 1024;

// Vercel serverless functions reject request bodies larger than ~4.5MB, so proxy
// mode cannot carry a big inlined file at all — surface a clear error instead.
export const PROXY_MAX_BASE64_LEN = 4 * 1024 * 1024;

const extractText = (data: any): string =>
  data?.candidates?.[0]?.content?.parts?.[0]?.text ?? data?.text ?? '';

/**
 * Pull the finish reason out of a Gemini response. 'MAX_TOKENS' means the model
 * hit the output-token ceiling mid-response — the signal that extraction needs
 * a continuation round. In proxy mode this is only present when the deployed
 * proxy forwards it (older proxies return just { text }); the truncated-JSON
 * repair flag remains the primary, mode-independent detector.
 */
const extractFinishReason = (data: any): string | undefined =>
  data?.candidates?.[0]?.finishReason ?? data?.finishReason ?? undefined;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Which AI provider the user has selected. Defaults to Google (existing behavior). */
const getProvider = (): 'google' | 'minimax' =>
  localStorage.getItem('smart_exam_provider') === 'minimax' ? 'minimax' : 'google';

/** Decode a base64 string into a Blob without inflating it through a data-URI. */
const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
};

/**
 * Upload a large file to the Gemini Files API (resumable protocol) and return a
 * `fileData` part that references it by URI. Used in direct mode when a file is
 * too big to inline (see INLINE_MAX_BASE64_LEN). The upload itself is NOT bound
 * by REQUEST_TIMEOUT_MS — large uploads legitimately take a while.
 */
const uploadFileToGemini = async (
  apiKey: string,
  base64: string,
  mimeType: string
): Promise<{ fileUri: string; mimeType: string }> => {
  const blob = base64ToBlob(base64, mimeType);
  const numBytes = blob.size;

  // 1) Start a resumable upload session.
  const startResp = await fetch(`${GEMINI_FILES_UPLOAD_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(numBytes),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: 'smartexam-upload' } }),
  });
  if (!startResp.ok) {
    const e = await startResp.json().catch(() => ({}));
    throw new Error(e.error?.message || `FILE_UPLOAD_FAILED: 無法開始上傳檔案 (${startResp.status}).`);
  }
  const uploadUrl =
    startResp.headers.get('X-Goog-Upload-URL') || startResp.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('FILE_UPLOAD_FAILED: Gemini Files API 未回傳上傳網址。');

  // 2) Upload the bytes and finalize in one shot.
  const uploadResp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(numBytes),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: blob,
  });
  if (!uploadResp.ok) {
    const e = await uploadResp.json().catch(() => ({}));
    throw new Error(e.error?.message || `FILE_UPLOAD_FAILED: 上傳檔案失敗 (${uploadResp.status}).`);
  }
  const info = await uploadResp.json();
  let file = info.file;
  if (!file?.uri) throw new Error('FILE_UPLOAD_FAILED: Files API 未回傳檔案 URI。');

  // 3) Poll until the file finishes processing (PDFs need a moment; images are
  //    usually instant). Cap the wait so a stuck file can't hang exam creation.
  let tries = 0;
  while (file.state === 'PROCESSING' && tries < 30) {
    await sleep(1000);
    tries++;
    const getResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`);
    if (getResp.ok) file = await getResp.json();
  }
  if (file.state === 'FAILED') {
    throw new Error('FILE_UPLOAD_FAILED: Gemini 無法處理上傳的檔案。請改用較細的檔案或貼上文字。');
  }

  return { fileUri: file.uri, mimeType };
};

/**
 * Resolve the file parts for a DocumentSource into the part array sent to the
 * model. In direct Google mode, oversized inline files are uploaded ONCE via the
 * Files API and replaced with a `fileData` URI reference. Small files stay
 * inline. Proxy mode keeps inline but guards against bodies too big for Vercel.
 * Called once per extraction so retries/fallbacks never re-upload.
 */
const resolveFileParts = async (
  source: DocumentSource
): Promise<Array<Record<string, unknown>>> => {
  if (!source.fileData) return [];
  const { data, mimeType } = source.fileData;
  const provider = getProvider();
  const useProxy = localStorage.getItem('smart_exam_use_proxy') === 'true';
  const apiKey = localStorage.getItem('smart_exam_api_key') || '';

  // MiniMax has no inline-file support here; callMinimax surfaces a clear error.
  if (provider === 'minimax') return [{ inlineData: source.fileData }];

  if (useProxy) {
    if (data.length > PROXY_MAX_BASE64_LEN) {
      throw new Error(
        'FILE_TOO_LARGE_FOR_PROXY: 此檔案太大，無法經 Backend Proxy 上傳 (上限約 3MB)。請喺 ⚙️ Settings 關閉 Proxy 改用直接 API key 模式，即可支援大型 PDF。'
      );
    }
    return [{ inlineData: source.fileData }];
  }

  // Direct mode: inline when small, otherwise upload via the Files API.
  if (apiKey && data.length > INLINE_MAX_BASE64_LEN) {
    logger.info(
      `File too large to inline (${Math.round(data.length / 1024 / 1024)}MB base64) — uploading via Files API.`,
      'geminiService.resolveFileParts'
    );
    const uploaded = await uploadFileToGemini(apiKey, data, mimeType);
    return [{ fileData: { fileUri: uploaded.fileUri, mimeType: uploaded.mimeType } }];
  }
  return [{ inlineData: source.fileData }];
};

interface MinimaxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Translate the Gemini-style `contents` (used throughout this service) into the
 * OpenAI/MiniMax `messages` array. Returns `hasFile` so the caller can reject
 * file-based input (MiniMax's chat endpoint doesn't accept inline PDFs/images
 * here). Pure + exported for unit testing.
 */
export const buildMinimaxMessages = (
  contents: any,
  systemInstruction?: string
): { messages: MinimaxMessage[]; hasFile: boolean } => {
  const messages: MinimaxMessage[] = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

  const collectText = (parts: any): string =>
    (Array.isArray(parts) ? parts : [])
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .filter(Boolean)
      .join('\n');
  const hasFilePart = (parts: any): boolean =>
    (Array.isArray(parts) ? parts : []).some((p: any) => p?.inlineData || p?.fileData);
  const toRole = (r: unknown): 'user' | 'assistant' =>
    r === 'model' || r === 'assistant' ? 'assistant' : 'user';

  // Shape 1: an array of role-tagged messages (chat history).
  if (Array.isArray(contents)) {
    for (const m of contents) messages.push({ role: toRole(m?.role), content: collectText(m?.parts) });
    return { messages, hasFile: false };
  }

  const parts = contents?.parts;
  // Shape 2: { parts: [{ role, parts }, ...] } — also a message list (chatbot).
  if (Array.isArray(parts) && parts.length > 0 && parts.every((p: any) => p && p.role && p.parts)) {
    for (const m of parts) messages.push({ role: toRole(m.role), content: collectText(m.parts) });
    return { messages, hasFile: false };
  }

  // Shape 3: a single user turn ({ parts: [{text}, {inlineData}] }).
  messages.push({ role: 'user', content: collectText(parts) });
  return { messages, hasFile: hasFilePart(parts) };
};

/**
 * Call the MiniMax (international) chat-completions endpoint. OpenAI-compatible,
 * so we map our Gemini-style request onto `messages`. Endpoint URL, model and
 * API key are read from their own localStorage keys, completely separate from
 * the Google/Gemini settings.
 */
const callMinimax = async (contents: any, config?: any): Promise<{ text: string; finishReason?: string }> => {
  const url =
    localStorage.getItem('smart_exam_minimax_url') || 'https://api.minimax.io/v1/chat/completions';
  const apiKey = localStorage.getItem('smart_exam_minimax_api_key') || '';
  const model = localStorage.getItem('smart_exam_minimax_model') || 'MiniMax-Text-01';

  if (!apiKey) {
    throw new Error(
      'NO_API_KEY: 未設定 MiniMax API key。請開啟 ⚙️ Settings → 將 AI Provider 揀做 MiniMax → 輸入 API key。'
    );
  }

  const { systemInstruction, responseMimeType, temperature, maxOutputTokens, timeoutMs } = config || {};
  const { messages, hasFile } = buildMinimaxMessages(contents, systemInstruction);

  if (hasFile) {
    throw new Error(
      'MINIMAX_NO_FILE: MiniMax 模型暫不支援直接讀取 PDF／圖片檔案。請改用 Google 模型，或用「Manual Paste」貼上文字內容。'
    );
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    ...(temperature !== undefined && { temperature }),
    ...(maxOutputTokens !== undefined && { max_tokens: maxOutputTokens }),
    ...(responseMimeType === 'application/json' && { response_format: { type: 'json_object' } }),
  };

  const resp = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  }, timeoutMs);

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({} as any));
    throw new Error(
      err.error?.message || err.base_resp?.status_msg || `MiniMax API Error: ${resp.status} ${resp.statusText}`
    );
  }

  const data = await resp.json();
  // MiniMax can return a non-zero base_resp status even with HTTP 200.
  if (data?.base_resp && data.base_resp.status_code !== 0 && data.base_resp.status_code !== undefined) {
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error(`MiniMax API Error: ${data.base_resp.status_msg || data.base_resp.status_code}`);
    }
  }
  const text = data?.choices?.[0]?.message?.content ?? '';
  return {
    text: typeof text === 'string' ? text : String(text ?? ''),
    // Normalize the OpenAI-style 'length' stop reason onto Gemini's MAX_TOKENS
    // so truncation detection is provider-agnostic.
    finishReason: data?.choices?.[0]?.finish_reason === 'length' ? 'MAX_TOKENS' : undefined,
  };
};

/**
 * fetch() wrapper that aborts after REQUEST_TIMEOUT_MS. A timeout is surfaced as
 * a retryable "deadline exceeded" error (see isRetryableError).
 */
const fetchWithTimeout = async (
  input: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `NETWORK_TIMEOUT: 請求超過 ${Math.round(timeoutMs / 1000)}s 未完成 (deadline exceeded)。` +
          `如果係大型 PDF，請試下：1) 減少題目數量 2) 喺「內容範圍」只揀部分章節 3) 將 PDF 分拆成細檔。`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Call Gemini API — proxy mode (Vercel/backend) or direct mode (browser API key).
 * Mode is controlled by localStorage smart_exam_use_proxy and smart_exam_api_key.
 */
const callGeminiViaProxy = async (
  model: string,
  contents: any,
  config?: any
): Promise<{ text: string; finishReason?: string }> => {
  // MiniMax is a separate provider with its own endpoint/key — route early so the
  // Google/Gemini path below (and its settings) stays completely untouched.
  if (getProvider() === 'minimax') {
    return callMinimax(contents, config);
  }

  // Default is direct mode (false). Only proxy mode if explicitly set to 'true'.
  const useProxy = localStorage.getItem('smart_exam_use_proxy') === 'true';
  const proxyUrl = localStorage.getItem('smart_exam_proxy_url') || '/api/proxy-gemini';
  const apiKey = localStorage.getItem('smart_exam_api_key') || '';

  // Per-call request timeout (not a Gemini field — never forwarded upstream).
  const timeoutMs: number | undefined = config?.timeoutMs;

  if (!useProxy && !apiKey) {
    throw new Error('NO_API_KEY: No API key configured. Click ⚙️ Settings → paste your Gemini API key → Save Settings.');
  }

  if (!useProxy && apiKey) {
    const { systemInstruction, responseMimeType, temperature, seed, responseSchema, maxOutputTokens } = config || {};
    const contentsArray = Array.isArray(contents)
      ? contents
      : [{ role: 'user', parts: contents.parts || [{ text: JSON.stringify(contents) }] }];

    const body: any = {
      contents: contentsArray,
      ...(systemInstruction && {
        systemInstruction: { parts: [{ text: systemInstruction }] }
      }),
      generationConfig: {
        ...(responseMimeType && { responseMimeType }),
        ...(temperature !== undefined && { temperature }),
        ...(seed !== undefined && { seed }),
        ...(responseSchema && { responseSchema }),
        ...(maxOutputTokens !== undefined && { maxOutputTokens }),
      },
    };

    const resp = await fetchWithTimeout(`${GEMINI_DIRECT_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, timeoutMs);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API Error: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    return { text: extractText(data), finishReason: extractFinishReason(data) };
  }

  // Proxy mode: strip the client-only timeoutMs so it never leaks into the
  // upstream generationConfig (Gemini would reject the unknown field).
  const { timeoutMs: _omitTimeout, ...forwardConfig } = config || {};
  const resp = await fetchWithTimeout(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, contents, config: forwardConfig }),
  }, timeoutMs);

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `API Error: ${resp.statusText}`);
  }

  const data = await resp.json();
  return { text: extractText(data), finishReason: extractFinishReason(data) };
};

/**
 * Get model name from localStorage first, then fallback to default
 */
const getModelName = (defaultModel: string = DEFAULT_MODEL): string => {
  const savedModel = localStorage.getItem('smart_exam_model');
  return savedModel || defaultModel;
};

/**
 * Run an API call, and if it fails because the upstream model is overloaded
 * (429 / 503 / RESOURCE_EXHAUSTED / "high demand"), retry once with a stable
 * fallback model and surface a hint to the UI on which model actually ran.
 */
const callWithFallback = async <T>(
  primaryModel: string,
  run: (model: string) => Promise<T>
): Promise<T> => {
  try {
    return await run(primaryModel);
  } catch (err) {
    // Fall back both when the model is transiently overloaded (429/503) AND when
    // the chosen model id is invalid/unavailable (400/404 "model not found") —
    // the latter previously surfaced as a hard error with no recovery.
    if (!isOverloadError(err) && !isModelUnavailableError(err)) throw err;
    const fallback = getFallbackModel(primaryModel);
    if (fallback === primaryModel) throw err;
    const reason = isOverloadError(err) ? 'overloaded' : 'unavailable/invalid';
    logger.warn(
      `Model ${primaryModel} ${reason} — falling back to ${fallback}`,
      'geminiService.callWithFallback'
    );
    try {
      const result = await run(fallback);
      try {
        sessionStorage.setItem(
          'smart_exam_last_fallback',
          JSON.stringify({ from: primaryModel, to: fallback, at: Date.now() })
        );
      } catch {}
      return result;
    } catch (fallbackErr) {
      const originalMsg = err instanceof Error ? err.message : String(err);
      const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(
        `MODEL_OVERLOADED: ${primaryModel} 過載 (${originalMsg.substring(0, 120)})。已嘗試 fallback ${fallback} 仍失敗 (${fbMsg.substring(0, 120)})。請稍後再試或喺 Settings 揀另一個 model。`
      );
    }
  }
};

/**
 * Enhanced fetch with robust retry logic for transient API/Network errors.
 */
const fetchWithRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1500): Promise<T> => {
  let lastError: Error = new Error('Unknown error');
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errorMessage = lastError.message || String(err);

      if (isRetryableError(err) && i < maxRetries) {
        const backoff = initialDelay * Math.pow(2, i);
        logger.warn(`Attempt ${i + 1} failed: ${errorMessage.substring(0, 100)}. Retrying in ${backoff}ms...`, 'geminiService.fetchWithRetry');
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
};

/**
 * Extracts a "question bank" from a document — ALL questions in CASE A,
 * or a large pool in CASE B. Per-attempt sampling is done locally in
 * questionBank.ts so that each exam attempt yields different questions
 * without making additional Gemini calls.
 *
 * Temperature defaults to 0.3 (verbatim-faithful). Users may override via
 * Settings; raising it gives the model more freedom (NOT recommended for
 * CASE A exam files where wording must be preserved).
 */
export interface ExtractionProgress {
  /** Unique questions accumulated so far. */
  extracted: number;
  /** 1-based extraction round (round 1 is the initial call). */
  round: number;
  /** Total questions the model reports the document contains (when known). */
  total?: number;
}

/** How many continuation rounds may follow the initial extraction call. */
const MAX_CONTINUATION_ROUNDS = 11;

/** Treat absurd model-reported document totals as unknown. */
const sanitizeReportedTotal = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? Math.floor(v) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 5000 ? n : undefined;
};

export const extractQuestionBank = async (
  source: DocumentSource,
  targetPoolSize: number = 30,
  modelName: string = DEFAULT_MODEL,
  answerFormat: AnswerFormat = 'AUTO',
  contentRange?: string,
  temperature: number = 0.3,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<{ questions: Question[]; caseType: CaseType; extractionComplete: boolean }> => {
  const finalModelName = getModelName(modelName);

  const rangeText = contentRange ? ` ONLY focus on the following section: "${contentRange}".` : ' Scan the ENTIRE document length to extract questions covering all sections.';

  // Long pasted/text documents are sent through a sliding window: round 1 sees
  // the first 100k chars, and continuation rounds recenter the window on the
  // last extracted question so content past 100k is reachable (it previously
  // was silently dropped). File sources (inlineData / Files API URI) always
  // carry the whole document, so the window machinery is inert for them.
  const MAX_TEXT_LENGTH = 100000;
  const fullText = source.text ?? '';
  let windowStart = 0;

  const currentTextContext = (): string => {
    if (!fullText) return '';
    const windowEnd = windowStart + MAX_TEXT_LENGTH;
    const prefix = windowStart > 0 ? '[... earlier content omitted — already processed ...]\n' : '';
    const suffix = windowEnd < fullText.length ? '\n... [Truncated]' : '';
    return prefix + fullText.substring(windowStart, windowEnd) + suffix;
  };
  const hasMoreText = (): boolean => !!fullText && windowStart + MAX_TEXT_LENGTH < fullText.length;
  /** Recenter the window just before the anchor question so the model can locate it and read past it. */
  const advanceTextWindow = (anchor?: Question): void => {
    if (!fullText) return;
    for (const len of [80, 40]) {
      const snippet = anchor?.question.substring(0, len);
      if (snippet && snippet.length >= 20) {
        const pos = fullText.indexOf(snippet, windowStart);
        if (pos >= 0) {
          windowStart = Math.max(0, pos - 2000);
          return;
        }
      }
    }
    // Anchor not found verbatim — advance sequentially with a small overlap.
    windowStart = windowStart + MAX_TEXT_LENGTH - 5000;
  };

  // Reassignable so a parse failure (often caused by an over-large, truncated
  // response) can transparently retry with a smaller CASE-B pool target.
  let effectivePoolSize = targetPoolSize;

  // Expand the answerFormat token (previously injected as a bare label) into
  // concrete guidance for the model.
  const answerFormatInstruction = (() => {
    switch (answerFormat) {
      case 'MCQ_4':
        return "Prefer 4-option multiple-choice (A–D) for single/multiple-answer questions.";
      case 'MCQ_5':
        return "Prefer 5-option multiple-choice (A–E) for single/multiple-answer questions.";
      case 'TF':
        return "Prefer True/False questions: type 'single' with exactly two options ('True','False').";
      case 'AUTO':
      default:
        return "Choose the most faithful option count and question type per question based on the source.";
    }
  })();

  // Resolve file input ONCE up front: oversized files are uploaded via the
  // Gemini Files API (direct mode) so big PDFs don't blow the inline request cap.
  // Reused across the retry/fallback attempts below so we never re-upload.
  const fileParts = await resolveFileParts(source);

  // A file-backed or very long document needs much more than the default 90s to
  // ingest + generate a bank — give it a generous per-call deadline. "heavy"
  // requests also skip the inner network-retry loop so a timeout doesn't get
  // multiplied into many doomed attempts (the old cause of the 6-minute hang).
  const isHeavy = fileParts.length > 0 || fullText.length > 40000;
  const requestTimeoutMs = fileParts.length > 0
    ? FILE_REQUEST_TIMEOUT_MS
    : (fullText.length > 40000 ? LARGE_TEXT_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS);

  /** State handed to a continuation round so the model resumes instead of restarting. */
  interface Continuation {
    extractedCount: number;
    anchor: Question;
    /** Model-reported total questions in the document, when known. */
    totalCount?: number;
    /**
     * Fallback positioning: instead of locating the anchor question by its
     * text, instruct the model to skip the first N questions by ordinal. Used
     * once when an anchor-based round returns nothing new (the model ignored
     * the anchor or re-emitted from the top).
     */
    useOrdinal?: boolean;
  }

  const buildContinuationBlock = (c: Continuation): string => {
    const totalLine = c.totalCount
      ? `\n        The document contains approximately ${c.totalCount} questions in total; ${c.extractedCount} have been extracted so far — ${Math.max(0, c.totalCount - c.extractedCount)} remain. Keep extracting until ALL are covered.`
      : '';
    const positioning = c.useOrdinal
      ? `        ▸ SKIP the FIRST ${c.extractedCount} questions of the document (in document order) WITHOUT re-emitting them, then extract question #${c.extractedCount + 1} onwards.`
      : `        The LAST question already extracted is (verbatim):
        "${c.anchor.question.substring(0, 300)}"
        with options: ${c.anchor.options.slice(0, 5).map(o => `"${o.substring(0, 80)}"`).join(', ')}
        ▸ Locate this exact question in the document, then CONTINUE extracting from the question that appears IMMEDIATELY AFTER it.
        ▸ Do NOT re-emit that question or ANY question that appears before it in the document.`;
    return `

        ============================================================
        CONTINUATION — THIS IS A LATER ROUND OF A MULTI-PART EXTRACTION
        ============================================================
        You have ALREADY extracted ${c.extractedCount} questions from this document in previous rounds.${totalLine}
${positioning}
        ▸ Number the new questions starting at id ${c.extractedCount + 1}.
        ▸ Emit AS MANY of the remaining questions as fit in this response — do NOT stop after a handful.
        ▸ If NO questions remain after that point (the document is fully extracted), return an EMPTY 'questions' array — do NOT re-emit questions already extracted.
        ▸ Keep 'caseType' identical to the previous rounds ('A').
        All other extraction rules above still apply.`;
  };

  const apiCall = async (modelOverride: string, continuation?: Continuation) => {
    const textContext = currentTextContext();
    return await callGeminiViaProxy(
      modelOverride,
      {
        parts: [
          { text: source.text ? `DOCUMENT CONTENT:\n${textContext}` : "Analyze the attached file and extract questions from its content." },
          ...fileParts
        ]
      },
      {
        systemInstruction: `You are a professional exam compiler. Your job is to FAITHFULLY transcribe questions from the source document — never to invent, rephrase, or improve them.

        TASK: Build a question BANK from the provided document.${rangeText}

        ============================================================
        STEP 1 — CLASSIFY THE DOCUMENT (set 'caseType' in the response)
        ============================================================
        CASE A — The document ALREADY CONTAINS exam questions (numbered items, "Q1", "1.", multiple-choice options A/B/C/D, true/false, etc.).
        CASE B — The document is STUDY MATERIAL (notes, textbook, article, slides) without pre-written questions.

        ============================================================
        STEP 2 — EXTRACT / GENERATE
        ============================================================
        If CASE A:
        ▸ FIRST, COUNT every question in the ENTIRE document (scan to the very end) and set 'totalQuestionCount' to that number — even if you cannot output them all in this response.
        ▸ Extract EVERY SINGLE question present in the document. Do NOT impose a maximum count. If the document contains 50 questions, return 50. If 500, return 500.
        ▸ If there are more questions than fit in one response, output as many complete questions as possible IN DOCUMENT ORDER and stop cleanly — you will be asked to CONTINUE in a follow-up request. NEVER skip, sample, or summarize questions to make them fit.
        ▸ You MUST copy the question text CHARACTER-FOR-CHARACTER. Do not paraphrase, reword, summarize, simplify, fix typos, translate, or "improve" anything.
        ▸ You MUST copy each option CHARACTER-FOR-CHARACTER. Preserve exact wording, punctuation, capitalization, numbers, units, and ordering.
        ▸ You MUST copy the correct answer EXACTLY as it appears in the document (look for an answer key, answer line, bolded option, or marked answer). If the document does not indicate the correct answer, choose the option whose text matches the document most accurately and put that EXACT option text in 'correctAnswer'.
        ▸ Do NOT invent additional options. If the source has 3 options, return 3. If 5, return 5.
        ▸ Treat Markdown syntax (**, *, _, #, \`, lists) as PLAIN TEXT to be ignored — extract the underlying text content, not the markup.
        ▸ The 'correctAnswer' field MUST be one of the strings inside the 'options' array — copy/paste exactly.

        If CASE B:
        ▸ Generate exactly ${effectivePoolSize} distinct questions strictly grounded in the document's text. Cover the ENTIRE document — do not cluster around a few sections.
        ▸ Each option must reflect content actually present in the document; do not fabricate facts.
        ▸ The 'correctAnswer' must be the verbatim text of one of the 'options'.

        ============================================================
        STEP 3 — QUESTION TYPE (set 'type' on every question)
        ============================================================
        Choose the 'type' that matches the source question (CASE A) or the content (CASE B):
        ▸ 'single'   — exactly ONE correct option. Fill 'options' and 'correctAnswer'. (Default — use this when unsure.)
        ▸ 'multiple' — the question asks to select MORE THAN ONE answer (look for "(Choose two)", "(Choose three)", "Select all that apply", "Select N"). Fill 'options', and put EVERY correct option (verbatim) in the 'correctAnswers' array. Also set 'correctAnswer' to the first correct option.
        ▸ 'matching' — DRAG DROP / matching questions where left-side items each pair with a right-side item. Fill 'pairs' as [{prompt, answer}] (prompt = left item, answer = the correct right item). Put the full pool of right-side choices (every distinct 'answer', plus any distractors) into 'options'. Set 'correctAnswer' to the first pair rendered as "prompt → answer".
        ▸ 'dropdown' — HOTSPOT / fill-in-the-blank questions answered by picking from a dropdown. Fill 'blanks' as [{label, options, correctAnswer}] (one entry per dropdown). Put the union of all blank options into the top-level 'options'. Set 'correctAnswer' to the first blank's correctAnswer.
        For 'single'/'multiple', the correct option text MUST appear verbatim in 'options'. For 'matching', every pair.answer MUST appear in 'options'. For 'dropdown', every blank.correctAnswer MUST appear in that blank's options.

        ============================================================
        QUALITY RULES (BOTH CASES)
        ============================================================
        1. NO DUPLICATION: Each question must be distinct from every other question in the bank.
        2. SOURCE QUOTE: For every question, provide a 'sourceQuote' — a verbatim excerpt (10-40 words) from the document that directly justifies the correct answer. Copy it character-for-character.
        3. ANSWER FORMAT: ${answerFormatInstruction}
        4. EXPLANATION: Keep the explanation concise (1-3 sentences) and grounded in the sourceQuote.
        5. VISUAL/TABLE FIDELITY: If a question's context includes a TABLE, chart, or other structured visual in the source, reproduce it faithfully INSIDE the 'question' text as a plain-text GitHub-Markdown table (pipe-separated rows with a header separator line). Preserve every row, column, header, number and unit. Never drop or summarize a table that the question depends on.

        ============================================================
        OUTPUT
        ============================================================
        Return a JSON object with keys:
          - 'caseType': either 'A' or 'B'
          - 'totalQuestionCount': CASE A — the TOTAL number of questions in the whole document (from your count above, NOT just this response); CASE B — the number of questions you generated
          - 'questions': the list of questions
        Each question must have: id, question, type, options, correctAnswer, explanation, sourceQuote, topic — plus 'correctAnswers' for 'multiple', 'pairs' for 'matching', and 'blanks' for 'dropdown'.
        The 'correctAnswer' string MUST match one of the 'options' strings exactly (character-for-character).${continuation ? buildContinuationBlock(continuation) : ''}`,
        responseMimeType: "application/json",
        temperature,
        // Request the model's full output ceiling so a big CASE A bank carries
        // as many questions per response as the model allows. Google only —
        // MiniMax keeps its own default (its model ids aren't in our catalog).
        ...(getProvider() === 'google' && { maxOutputTokens: getMaxOutputTokens(modelOverride) }),
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caseType: { type: Type.STRING },
            totalQuestionCount: { type: Type.INTEGER },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["single", "multiple", "matching", "dropdown"] },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  correctAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        prompt: { type: Type.STRING },
                        answer: { type: Type.STRING },
                      },
                      required: ["prompt", "answer"],
                    },
                  },
                  blanks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                      },
                      required: ["options", "correctAnswer"],
                    },
                  },
                  explanation: { type: Type.STRING },
                  sourceQuote: { type: Type.STRING },
                  topic: { type: Type.STRING },
                },
                required: ["id", "question", "type", "options", "correctAnswer", "explanation", "sourceQuote", "topic"],
              }
            }
          },
          required: ["caseType", "totalQuestionCount", "questions"]
        },
        timeoutMs: requestTimeoutMs,
      }
    );
  };

  const runRound = async (
    continuation?: Continuation
  ): Promise<{ questions: Question[]; caseType: CaseType; wasTruncated: boolean; reportedTotal?: number }> => {
    // Heavy (file/large-doc) calls already use a long deadline; don't let the
    // inner retry loop multiply a slow request into several doomed attempts.
    // Transient overload is still handled by callWithFallback (model fallback)
    // and the outer reduced-pool retry below.
    const maxRetries = isHeavy ? 0 : 3;
    const response = await callWithFallback(finalModelName, (m) => fetchWithRetry(() => apiCall(m, continuation), maxRetries));
    const rawText = response.text;
    if (!rawText) throw new Error("EMPTY_RESPONSE: AI returned an empty result.");

    const { json: jsonStr, wasTruncated: wasRepaired } = cleanJsonResponseDetailed(rawText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error("JSON parse error from AI response", 'geminiService.extractQuestionBank', { rawTextHead: rawText.substring(0, 200) });
      throw new Error("PARSING_ERROR: The AI output was not valid JSON. Try reducing the pool size.");
    }

    const parsedObj = (typeof parsed === 'object' && parsed !== null) ? parsed as Record<string, unknown> : {};
    const questionsData = 'questions' in parsedObj
      ? parsedObj.questions
      : Array.isArray(parsed) ? parsed : [];
    const rawCaseType = 'caseType' in parsedObj ? String(parsedObj.caseType).toUpperCase() : '';
    const caseType: CaseType = rawCaseType === 'A' ? 'A' : 'B';

    const questions = Array.isArray(questionsData) ? questionsData : [];

    // An empty CONTINUATION round is the model's explicit "nothing remains
    // after the anchor" confirmation — a valid, expected completion signal for
    // the verification probe. Only the initial round treats empty as an error.
    if (questions.length === 0 && !continuation) throw new Error("NO_QUESTIONS: No questions were extracted.");

    // Preserve original options/order from AI (verbatim). Display-time shuffling is handled by optionShuffler.
    // normalizeGeneratedQuestion validates + canonicalizes each question per type
    // and drops malformed entries (rather than failing the whole batch).
    const cleaned = questions
      .map((q: unknown, idx: number) => normalizeGeneratedQuestion(q, idx))
      .filter((q): q is Question => q !== null);

    return {
      questions: cleaned,
      caseType,
      wasTruncated: wasRepaired || response.finishReason === 'MAX_TOKENS',
      reportedTotal: sanitizeReportedTotal(parsedObj.totalQuestionCount),
    };
  };

  try {
    // ---- Round 1 (with the pre-existing reduced-pool recovery) ----
    let first: { questions: Question[]; caseType: CaseType; wasTruncated: boolean; reportedTotal?: number };
    try {
      first = await runRound();
    } catch (firstErr: unknown) {
      // A truncated/over-large response → PARSING_ERROR or EMPTY_RESPONSE. A
      // request that ran out of time → NETWORK_TIMEOUT; a smaller pool generates
      // less output and is more likely to finish within the deadline, so retry
      // it once too instead of surfacing the timeout straight away.
      const m = firstErr instanceof Error ? firstErr.message : String(firstErr);
      const recoverable =
        m.includes('PARSING_ERROR') || m.includes('EMPTY_RESPONSE') || m.includes('NETWORK_TIMEOUT');
      const reduced = Math.max(15, Math.floor(effectivePoolSize / 2));
      if (recoverable && reduced < effectivePoolSize) {
        logger.warn(
          `Extraction failed (${m.substring(0, 80)}). Retrying with reduced pool ${effectivePoolSize} → ${reduced}.`,
          'geminiService.extractQuestionBank'
        );
        effectivePoolSize = reduced;
        first = await runRound();
      } else {
        throw firstErr;
      }
    }

    // ---- Merge state shared across rounds ----
    const merged: Question[] = [];
    const seen = new Set<string>();
    /** Returns the questions this round actually contributed (duplicates dropped). */
    const addRound = (qs: Question[]): Question[] => {
      const added: Question[] = [];
      for (const q of qs) {
        const key = questionDedupKey(q);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(q);
        added.push(q);
      }
      return added;
    };

    /**
     * Where the model stopped reading. Must be the last question the round
     * actually CONTRIBUTED, not the last it emitted: models routinely append a
     * few already-seen questions after the new ones, and anchoring on one of
     * those walks the anchor backwards — the next round is then asked to
     * continue from a point it already passed, returns only duplicates, and
     * extraction stops early with a truncated bank.
     */
    const anchorOf = (added: Question[], emitted: Question[]): Question | undefined =>
      added[added.length - 1] ?? emitted[emitted.length - 1];

    const firstAdded = addRound(first.questions);
    const caseType = first.caseType;
    let wasTruncated = first.wasTruncated;
    // The model's own count of questions in the whole document. This is what
    // lets us catch VOLUNTARY early stops: a clean (non-truncated) response
    // that still covers fewer questions than the document holds.
    let reportedTotal = first.reportedTotal;
    // Anchor = the last question the LATEST round contributed (not of the merged
    // pool) — that's how far into the document the model actually got.
    let anchor: Question | undefined = anchorOf(firstAdded, first.questions);
    let round = 1;
    onProgress?.({ extracted: merged.length, round, total: reportedTotal });
    logger.info(
      `Extraction round 1: ${merged.length} questions (docTotal=${reportedTotal ?? '?'}, truncated=${wasTruncated})`,
      'geminiService.extractQuestionBank'
    );

    // ---- Continuation rounds (CASE A only) ----
    // Keep going while ANY signal says the document has more to give:
    //  - the response was cut off by the output-token limit, or
    //  - a long text source still has unscanned window, or
    //  - the model itself reported more questions than we've extracted
    //    (catches the model stopping early with a clean finish).
    const stillShortOfTotal = () =>
      reportedTotal !== undefined && merged.length < reportedTotal;
    let ordinalFallbackUsed = false;
    // A clean finish is NOT trusted on its own for CASE A: models routinely
    // stop after ~60-70 questions of a 500-question document with a clean STOP
    // while reporting (or omitting) a totalQuestionCount that matches only what
    // they emitted — so neither truncation nor the reported total fires and the
    // bank silently freezes at a fraction of the document. Until the model
    // explicitly confirms "nothing remains after the last question" (an empty
    // continuation round) — or probing stops yielding anything new — keep
    // asking it to continue past the anchor.
    let pendingVerification = caseType === 'A';

    while (
      caseType === 'A' &&
      anchor &&
      (wasTruncated || hasMoreText() || stillShortOfTotal() || pendingVerification) &&
      round <= MAX_CONTINUATION_ROUNDS
    ) {
      advanceTextWindow(anchor);
      let result: { questions: Question[]; caseType: CaseType; wasTruncated: boolean; reportedTotal?: number };
      try {
        result = await runRound({
          extractedCount: merged.length,
          anchor,
          totalCount: reportedTotal,
          useOrdinal: ordinalFallbackUsed,
        });
      } catch (roundErr: unknown) {
        // A failed continuation round must not throw away what we already have.
        logger.warn(
          `Continuation round ${round + 1} failed (${roundErr instanceof Error ? roundErr.message.substring(0, 100) : String(roundErr)}) — keeping ${merged.length} questions.`,
          'geminiService.extractQuestionBank'
        );
        break;
      }
      // The model explicitly confirmed nothing remains after the anchor (clean
      // empty continuation) and no unscanned text window is left — extraction
      // is verified complete.
      if (result.questions.length === 0 && !result.wasTruncated && !hasMoreText()) {
        pendingVerification = false;
        wasTruncated = false;
        round++;
        logger.info(
          `Extraction round ${round}: model confirmed no questions remain — bank complete at ${merged.length}.`,
          'geminiService.extractQuestionBank'
        );
        break;
      }

      const addedThisRound = addRound(result.questions);
      const netNew = addedThisRound.length;
      // Models sometimes re-report the total per round; keep the largest sane value.
      if (result.reportedTotal !== undefined) {
        reportedTotal = Math.max(reportedTotal ?? 0, result.reportedTotal);
      }
      round++;
      onProgress?.({ extracted: merged.length, round, total: reportedTotal });
      logger.info(
        `Extraction round ${round}: +${netNew} → ${merged.length}/${reportedTotal ?? '?'} (truncated=${result.wasTruncated})`,
        'geminiService.extractQuestionBank'
      );

      if (netNew === 0) {
        // Unproductive round: the model only re-emitted known questions, so
        // its finish state says nothing about coverage — keep the previous
        // truncation signals and do NOT move the anchor. Retry ONCE with
        // ordinal positioning ("skip the first N questions") before giving up.
        if (!ordinalFallbackUsed) {
          ordinalFallbackUsed = true;
          logger.warn(
            `Continuation round ${round} added no new questions — retrying once with ordinal positioning.`,
            'geminiService.extractQuestionBank'
          );
          continue;
        }
        // Both anchor- and ordinal-positioned probes found nothing new — the
        // document has been mined dry; that's as verified as it gets.
        pendingVerification = false;
        // A truncation flag left over from an earlier round no longer implies
        // missing content once two independent probes have come back dry AND we
        // have at least as many questions as the model says the document holds.
        // Without this a full bank is reported incomplete on nearly every large
        // PDF (the last productive round almost always ends on MAX_TOKENS), and
        // a warning that fires on healthy extractions is a warning users learn
        // to ignore. Still short of the reported total ⇒ stays incomplete.
        if (!stillShortOfTotal() && reportedTotal !== undefined) wasTruncated = false;
        logger.warn(`Continuation round ${round} added no new questions — stopping.`, 'geminiService.extractQuestionBank');
        break;
      }

      // Productive round: adopt its signals and re-anchor on the last question
      // it contributed (trailing duplicates must not drag the anchor back).
      anchor = anchorOf(addedThisRound, result.questions);
      wasTruncated = result.wasTruncated;
      ordinalFallbackUsed = false;
    }

    const extractionComplete =
      caseType !== 'A' ||
      (!wasTruncated && !hasMoreText() && !stillShortOfTotal() && !pendingVerification);
    if (!extractionComplete) {
      logger.warn(
        `Extraction stopped incomplete after ${round} round(s) with ${merged.length}/${reportedTotal ?? '?'} questions (truncated=${wasTruncated}, moreText=${hasMoreText()}).`,
        'geminiService.extractQuestionBank'
      );
    }

    return {
      questions: merged.map((q, idx) => ({ ...q, id: idx + 1 })),
      caseType,
      extractionComplete,
    };
  } catch (error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to extract question bank", 'geminiService.extractQuestionBank', errorObj);
    const msg = errorObj.message;

    if (msg.includes('Rpc failed') || msg.includes('Code 6')) {
      throw new Error(`NETWORK_TIMEOUT: 連線至 AI 伺服器時發生 RPC 錯誤 (Code 6)。請嘗試：1. 減少題目數量 2. 稍後再試一次。`);
    }

    throw new Error(`GENERATION_FAILED: ${msg}`);
  }
};

/**
 * Backward-compatible wrapper. New code should call extractQuestionBank directly.
 * @deprecated Use extractQuestionBank + local sampling via questionBank utility.
 */
export const parseDocumentToQuestions = async (
  source: DocumentSource,
  count: number = 10,
  modelName: string = DEFAULT_MODEL,
  answerFormat: AnswerFormat = 'AUTO',
  contentRange?: string,
  _documentHash?: string,
  temperature: number = 0.3
): Promise<Question[]> => {
  const { questions } = await extractQuestionBank(
    source,
    Math.max(count * 3, 30),
    modelName,
    answerFormat,
    contentRange,
    temperature
  );
  return questions.slice(0, count);
};

export const refineMasteryInsight = async (
  question: string,
  options: string[],
  correctAnswer: string,
  modelName: string = DEFAULT_MODEL
): Promise<string> => {
  const finalModelName = getModelName(modelName);
  const prompt = `Provide a detailed "Mastery Insight" for this exam question: "${question}". Correct answer: "${correctAnswer}". Explain the underlying concept deeply and why other options might be confusing.`;

  const apiCall = async (modelOverride: string) => {
    return await callGeminiViaProxy(
      modelOverride,
      { parts: [{ text: prompt }] },
      { temperature: 0.5 }
    );
  };

  try {
    const response = await callWithFallback(finalModelName, (m) => fetchWithRetry(() => apiCall(m)));
    return response.text || "No further insight available.";
  } catch (error) {
    return "Failed to connect to AI for insights. Please check your connection.";
  }
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const getChatbotResponse = async (
  history: ChatMessage[],
  message: string,
  context: string
): Promise<string> => {
  const modelName = getModelName(DEFAULT_MODEL);
  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const apiCall = async (modelOverride: string) => {
    return await callGeminiViaProxy(
      modelOverride,
      { parts: contents },
      {
        temperature: 0.7,
        systemInstruction: `You are an expert tutor. Helping a student with the following material: ${context.substring(0, 30000)}`,
      }
    );
  };

  try {
    const response = await callWithFallback(modelName, (m) => fetchWithRetry(() => apiCall(m)));
    return response.text || "";
  } catch (error) {
    return "目前連線不穩定，請稍後再試。";
  }
};

export const generatePerformanceAnalysis = async (
  questions: Question[],
  answers: UserAnswer[]
): Promise<PerformanceAnalysis> => {
  const modelName = getModelName(DEFAULT_MODEL);
  const summary = questions.map(q => ({
    topic: q.topic,
    correct: answers.find(a => a.questionId === q.id)?.isCorrect
  }));

  const apiCall = async (modelOverride: string) => {
    return await callGeminiViaProxy(
      modelOverride,
      {
        parts: [{ text: `Analyze this exam performance data and provide constructive feedback in a encouraging tone: ${JSON.stringify(summary)}` }]
      },
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallFeedback: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
            commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["overallFeedback", "strengths", "areasForImprovement", "commonMistakes"],
        },
        temperature: 0.7,
      }
    );
  };

  try {
    const response = await callWithFallback(modelName, (m) => fetchWithRetry(() => apiCall(m)));
    const text = response.text;
    if (!text) throw new Error("No analysis received");
    return JSON.parse(cleanJsonResponse(text)) as PerformanceAnalysis;
  } catch (error) {
    return {
      overallFeedback: "You've successfully completed the session. Review your errors below to improve!",
      strengths: ["Session completion"],
      areasForImprovement: ["Topic specific review"],
      commonMistakes: ["Insufficient data for detailed analysis"]
    };
  }
};
