
import { Type, GenerateContentResponse } from "@google/genai";
import { Question, AnswerFormat, DocumentSource, UserAnswer, PerformanceAnalysis, CaseType } from "../types";
import { cleanJsonResponse, normalizeGeneratedQuestion } from "../utils/fileProcessor";
import { ApiError, isRetryableError } from "../utils/errors";
import { logger } from "../utils/logger";
import { DEFAULT_MODEL, getFallbackModel, isOverloadError, isModelUnavailableError } from "../constants/models";

const GEMINI_DIRECT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_FILES_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

// Hard ceiling on a single generateContent request so a hung connection can't
// block exam creation indefinitely.
const REQUEST_TIMEOUT_MS = 90000;

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
const callMinimax = async (contents: any, config?: any): Promise<{ text: string }> => {
  const url =
    localStorage.getItem('smart_exam_minimax_url') || 'https://api.minimax.io/v1/chat/completions';
  const apiKey = localStorage.getItem('smart_exam_minimax_api_key') || '';
  const model = localStorage.getItem('smart_exam_minimax_model') || 'MiniMax-Text-01';

  if (!apiKey) {
    throw new Error(
      'NO_API_KEY: 未設定 MiniMax API key。請開啟 ⚙️ Settings → 將 AI Provider 揀做 MiniMax → 輸入 API key。'
    );
  }

  const { systemInstruction, responseMimeType, temperature, maxOutputTokens } = config || {};
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
  });

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
  return { text: typeof text === 'string' ? text : String(text ?? '') };
};

/**
 * fetch() wrapper that aborts after REQUEST_TIMEOUT_MS. A timeout is surfaced as
 * a retryable "deadline exceeded" error (see isRetryableError).
 */
const fetchWithTimeout = async (input: string, init: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`NETWORK_TIMEOUT: 請求超過 ${REQUEST_TIMEOUT_MS / 1000}s 未完成 (deadline exceeded)。請減少題目數量或稍後再試。`);
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
): Promise<{ text: string }> => {
  // MiniMax is a separate provider with its own endpoint/key — route early so the
  // Google/Gemini path below (and its settings) stays completely untouched.
  if (getProvider() === 'minimax') {
    return callMinimax(contents, config);
  }

  // Default is direct mode (false). Only proxy mode if explicitly set to 'true'.
  const useProxy = localStorage.getItem('smart_exam_use_proxy') === 'true';
  const proxyUrl = localStorage.getItem('smart_exam_proxy_url') || '/api/proxy-gemini';
  const apiKey = localStorage.getItem('smart_exam_api_key') || '';

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
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API Error: ${resp.status} ${resp.statusText}`);
    }

    return { text: extractText(await resp.json()) };
  }

  const resp = await fetchWithTimeout(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, contents, config }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `API Error: ${resp.statusText}`);
  }

  return { text: extractText(await resp.json()) };
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
export const extractQuestionBank = async (
  source: DocumentSource,
  targetPoolSize: number = 30,
  modelName: string = DEFAULT_MODEL,
  answerFormat: AnswerFormat = 'AUTO',
  contentRange?: string,
  temperature: number = 0.3
): Promise<{ questions: Question[]; caseType: CaseType }> => {
  const finalModelName = getModelName(modelName);

  const rangeText = contentRange ? ` ONLY focus on the following section: "${contentRange}".` : ' Scan the ENTIRE document length to extract questions covering all sections.';

  const MAX_TEXT_LENGTH = 100000;
  const textContext = source.text ? (source.text.length > MAX_TEXT_LENGTH ? source.text.substring(0, MAX_TEXT_LENGTH) + "... [Truncated]" : source.text) : "";

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

  const apiCall = async (modelOverride: string) => {
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
        ▸ Extract EVERY SINGLE question present in the document. Do NOT impose a maximum count. If the document contains 50 questions, return 50. If 200, return 200.
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
          - 'questions': the list of questions
        Each question must have: id, question, type, options, correctAnswer, explanation, sourceQuote, topic — plus 'correctAnswers' for 'multiple', 'pairs' for 'matching', and 'blanks' for 'dropdown'.
        The 'correctAnswer' string MUST match one of the 'options' strings exactly (character-for-character).`,
        responseMimeType: "application/json",
        temperature,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caseType: { type: Type.STRING },
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
          required: ["caseType", "questions"]
        },
      }
    );
  };

  const runOnce = async (): Promise<{ questions: Question[]; caseType: CaseType }> => {
    const response = await callWithFallback(finalModelName, (m) => fetchWithRetry(() => apiCall(m)));
    const rawText = response.text;
    if (!rawText) throw new Error("EMPTY_RESPONSE: AI returned an empty result.");

    const jsonStr = cleanJsonResponse(rawText);
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

    if (questions.length === 0) throw new Error("NO_QUESTIONS: No questions were extracted.");

    // Preserve original options/order from AI (verbatim). Display-time shuffling is handled by optionShuffler.
    // normalizeGeneratedQuestion validates + canonicalizes each question per type
    // and drops malformed entries (rather than failing the whole batch).
    const cleaned = questions
      .map((q: unknown, idx: number) => normalizeGeneratedQuestion(q, idx))
      .filter((q): q is Question => q !== null);

    return { questions: cleaned, caseType };
  };

  try {
    try {
      return await runOnce();
    } catch (firstErr: unknown) {
      // A truncated/over-large response shows up as PARSING_ERROR or EMPTY_RESPONSE.
      // Auto-retry ONCE with a smaller CASE-B pool target before giving up — this
      // is what the old error message asked the user to do by hand.
      const m = firstErr instanceof Error ? firstErr.message : String(firstErr);
      const recoverable = m.includes('PARSING_ERROR') || m.includes('EMPTY_RESPONSE');
      const reduced = Math.max(15, Math.floor(effectivePoolSize / 2));
      if (recoverable && reduced < effectivePoolSize) {
        logger.warn(
          `Extraction failed (${m.substring(0, 80)}). Retrying with reduced pool ${effectivePoolSize} → ${reduced}.`,
          'geminiService.extractQuestionBank'
        );
        effectivePoolSize = reduced;
        return await runOnce();
      }
      throw firstErr;
    }
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
