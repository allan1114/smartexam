
import { Type, GenerateContentResponse } from "@google/genai";
import { Question, AnswerFormat, DocumentSource, UserAnswer, PerformanceAnalysis, CaseType } from "../types";
import { cleanJsonResponse } from "../utils/fileProcessor";
import { ApiError, isRetryableError } from "../utils/errors";
import { logger } from "../utils/logger";
import { DEFAULT_MODEL, getFallbackModel, isOverloadError, isModelUnavailableError } from "../constants/models";

const GEMINI_DIRECT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Hard ceiling on a single generateContent request so a hung connection can't
// block exam creation indefinitely.
const REQUEST_TIMEOUT_MS = 90000;

const extractText = (data: any): string =>
  data?.candidates?.[0]?.content?.parts?.[0]?.text ?? data?.text ?? '';

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

  const apiCall = async (modelOverride: string) => {
    return await callGeminiViaProxy(
      modelOverride,
      {
        parts: [
          { text: source.text ? `DOCUMENT CONTENT:\n${textContext}` : "Analyze the attached file and extract questions from its content." },
          ...(source.fileData ? [{ inlineData: source.fileData }] : [])
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
        QUALITY RULES (BOTH CASES)
        ============================================================
        1. NO DUPLICATION: Each question must be distinct from every other question in the bank.
        2. SOURCE QUOTE: For every question, provide a 'sourceQuote' — a verbatim excerpt (10-40 words) from the document that directly justifies the correct answer. Copy it character-for-character.
        3. ANSWER FORMAT: Follow ${answerFormat}.
        4. EXPLANATION: Keep the explanation concise (1-3 sentences) and grounded in the sourceQuote.

        ============================================================
        OUTPUT
        ============================================================
        Return a JSON object with keys:
          - 'caseType': either 'A' or 'B'
          - 'questions': the list of questions
        Each question must have: id, question, options, correctAnswer, explanation, sourceQuote, topic.
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
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  sourceQuote: { type: Type.STRING },
                  topic: { type: Type.STRING },
                },
                required: ["id", "question", "options", "correctAnswer", "explanation", "sourceQuote", "topic"],
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
    const cleaned = questions
      .filter((q: unknown): q is Question => {
        return (
          typeof q === 'object' &&
          q !== null &&
          'id' in q &&
          'question' in q &&
          'options' in q &&
          'correctAnswer' in q
        );
      })
      .map((q: Question, idx: number) => {
        const cleanOption = (t: string) => String(t).replace(/^[A-E][).]\s*/i, '').trim();
        const normalizedCorrect = cleanOption(q.correctAnswer);
        const matchingOption = q.options.find(
          (opt: string) => cleanOption(opt).toLowerCase() === normalizedCorrect.toLowerCase()
        );

        return {
          ...q,
          id: idx + 1,
          correctAnswer: matchingOption || q.correctAnswer
        };
      });

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
