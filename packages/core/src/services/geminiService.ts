
import { Type, GenerateContentResponse } from "@google/genai";
import { Question, AnswerFormat, DocumentSource, UserAnswer, PerformanceAnalysis } from "../types";
import { cleanJsonResponse } from "../utils/fileProcessor";
import { ApiError, isRetryableError } from "../utils/errors";
import { logger } from "../utils/logger";
import { getProviderForModel } from "../constants/models";

const GEMINI_DIRECT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MINIMAX_CHAT_URL = 'https://api.minimax.io/v1/chat/completions';

const extractText = (data: any): string =>
  data?.candidates?.[0]?.content?.parts?.[0]?.text ?? data?.text ?? '';

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
    const { systemInstruction, responseMimeType, temperature, seed, responseSchema } = config || {};
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
      },
    };

    const resp = await fetch(`${GEMINI_DIRECT_BASE}/${model}:generateContent?key=${apiKey}`, {
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

  const resp = await fetch(proxyUrl, {
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
 * Convert Gemini-shape contents/config into OpenAI-style messages used by
 * Minimax's OpenAI-compatible API.
 */
const buildOpenAIMessages = (contents: any, systemInstruction?: string): Array<{ role: string; content: string }> => {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

  const collect = (parts: any[]): string =>
    (parts || [])
      .map(p => (typeof p?.text === 'string' ? p.text : ''))
      .filter(Boolean)
      .join('\n');

  if (Array.isArray(contents)) {
    contents.forEach((c: any) => {
      const role = c?.role === 'model' ? 'assistant' : 'user';
      messages.push({ role, content: collect(c?.parts || []) });
    });
  } else if (contents?.parts) {
    messages.push({ role: 'user', content: collect(contents.parts) });
  }
  return messages;
};

/**
 * Call MiniMax's OpenAI-compatible chat completion API.
 * Uses a dedicated localStorage key so a Minimax key isn't sent to Google.
 */
const callMinimax = async (
  model: string,
  contents: any,
  config?: any
): Promise<{ text: string }> => {
  const apiKey =
    localStorage.getItem('smart_exam_minimax_api_key') ||
    localStorage.getItem('smart_exam_api_key') ||
    '';

  if (!apiKey) {
    throw new Error('NO_API_KEY: No Minimax API key configured. Click ⚙️ Settings → paste your Minimax API key → Save Settings. Get one at https://platform.minimax.io.');
  }

  // Minimax M-series follows instructions more loosely than Gemini at the same
  // temperature and will gladly fabricate questions if not pinned. Force the
  // sampling to be near-deterministic, regardless of the caller's request.
  const minimaxTemperature = Math.min(config?.temperature ?? 0.1, 0.1);

  const messages = buildOpenAIMessages(contents, config?.systemInstruction);

  // Minimax (OpenAI-compat) cannot read inline binary file data — it only
  // sees text. If the caller only supplied a binary file, fail fast with a
  // clear message instead of letting the model fabricate from thin air.
  const userTextLen = messages
    .filter(m => m.role === 'user')
    .map(m => (m.content || '').replace(/<<<BEGIN_DOCUMENT>>>|<<<END_DOCUMENT>>>/g, '').trim())
    .join('')
    .length;
  const hasInlineFile = Array.isArray(contents?.parts) && contents.parts.some((p: any) => p?.inlineData);
  if (hasInlineFile && userTextLen < 20) {
    throw new Error(
      'BINARY_FILE_UNSUPPORTED: Minimax models cannot read PDF/image/binary uploads directly. Either pick a Gemini model, or use the "Manual Paste" tab on the Home screen to paste the document text.'
    );
  }

  const body: any = {
    model,
    messages,
    temperature: minimaxTemperature,
    top_p: 0.5,
    ...(config?.responseMimeType === 'application/json' && {
      response_format: { type: 'json_object' },
    }),
  };

  const resp = await fetch(MINIMAX_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({} as any));
    const rawMsg: string = err?.error?.message || err?.base_resp?.status_msg || `${resp.status} ${resp.statusText}`;

    // Minimax returns "usage limit exceeded ... (0/0 used)" when the API key
    // is not bound to a plan that has token quota (e.g. a Pay-as-you-go key
    // used against a Token/Code Plan). Surface a clearer hint.
    if (/usage limit|Token Plan|0\/0 used/i.test(rawMsg)) {
      throw new Error(
        `API_LIMIT: Minimax rejected the request: "${rawMsg}". This usually means the API key is not associated with your billing plan. Go to https://platform.minimax.io/user-center/basic-information/interface-key and (a) if you are on a Token Plan / Code Plan, create a "Token Plan Key" specifically — Pay-as-you-go keys won't work; (b) confirm you have remaining quota on the Billing page; (c) paste the new key into ⚙️ Settings → Minimax API Key.`
      );
    }
    if (/invalid|unauthorized|forbidden|api ?key/i.test(rawMsg)) {
      throw new Error(`API_KEY_NOT_FOUND: Minimax rejected the key: "${rawMsg}". Re-check ⚙️ Settings → Minimax API Key.`);
    }
    throw new Error(`Minimax API Error: ${rawMsg}`);
  }

  const data: any = await resp.json();
  let text: string = data?.choices?.[0]?.message?.content || '';
  // Minimax M-series may emit a <think>…</think> reasoning preamble; strip it.
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return { text };
};

/**
 * Dispatch an AI call to the right provider based on the model id.
 * Currently routes Minimax models to Minimax; everything else goes through
 * the existing Gemini proxy/direct path.
 */
const callAIModel = async (
  model: string,
  contents: any,
  config?: any
): Promise<{ text: string }> => {
  const provider = getProviderForModel(model);
  if (provider === 'minimax') return callMinimax(model, contents, config);
  return callGeminiViaProxy(model, contents, config);
};

/**
 * Get model name from localStorage first, then fallback to default
 */
const getModelName = (defaultModel: string = 'gemini-3-flash-preview'): string => {
  const savedModel = localStorage.getItem('smart_exam_model');
  return savedModel || defaultModel;
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
 * Parses a document into structured questions with global sampling and grounding.
 * Improved randomization logic to ensure full coverage and variety.
 */
export const parseDocumentToQuestions = async (
  source: DocumentSource,
  count: number = 10,
  modelName: string = 'gemini-3-flash-preview',
  answerFormat: AnswerFormat = 'AUTO',
  contentRange?: string,
  documentHash?: string
): Promise<Question[]> => {
  const finalModelName = getModelName(modelName);

  const rangeText = contentRange ? ` ONLY focus on the following section: "${contentRange}".` : ' Scan the ENTIRE document length to ensure a balanced sampling of questions.';

  const MAX_TEXT_LENGTH = 100000;
  const textContext = source.text ? (source.text.length > MAX_TEXT_LENGTH ? source.text.substring(0, MAX_TEXT_LENGTH) + "... [Truncated]" : source.text) : "";
  // Use document hash as deterministic seed when available, otherwise fall back to random
  const randomSeed = documentHash
    ? Math.abs(parseInt(documentHash, 36)) % 1000000
    : Math.floor(Math.random() * 1000000);

  const apiCall = async () => {
    return await callAIModel(
      finalModelName,
      {
        parts: [
          { text: source.text ? `<<<BEGIN_DOCUMENT>>>\n${textContext}\n<<<END_DOCUMENT>>>` : "Analyze the attached file and extract questions from its content." },
          ...(source.fileData ? [{ inlineData: source.fileData }] : [])
        ]
      },
      {
        systemInstruction: `You are a professional exam compiler. Your job is to FAITHFULLY transcribe questions from the source document — never to invent, rephrase, or improve them.

        TASK: Produce up to ${count} questions from the provided document.${rangeText}

        ============================================================
        RULE #0 — ABSOLUTELY NO FABRICATION (HIGHEST PRIORITY)
        ============================================================
        ▸ Every question, option, correctAnswer, sourceQuote, and explanation MUST be derived from text that appears verbatim inside the <<<BEGIN_DOCUMENT>>> … <<<END_DOCUMENT>>> block in the user message.
        ▸ Do NOT use prior knowledge, do NOT add commonly-known facts, do NOT invent plausible-sounding distractors. If a fact is not in the document, it does not exist for the purpose of this task.
        ▸ If the document does not contain enough material for ${count} questions, return FEWER. It is better to return 3 honest questions than ${count} fabricated ones.
        ▸ If the document is empty, unreadable, or contains no question-worthy content, return {"questions": []}.

        ============================================================
        RULE #1 — 100% VERBATIM TRANSCRIPTION
        ============================================================
        The user's uploaded document is the SINGLE SOURCE OF TRUTH. You MUST NOT modify its content in any way. Specifically:
        ▸ Do NOT paraphrase, reword, summarize, simplify, expand, translate, fix grammar, fix typos, normalize punctuation, change capitalization, or "improve" anything.
        ▸ Do NOT strip, add, or reorder leading labels (e.g., "A.", "1)", "Q3:"). Preserve them exactly as written.
        ▸ Do NOT alter Markdown markers, whitespace, units, numbers, or symbols. Keep characters byte-for-byte as they appear in the source text.
        ▸ Do NOT invent additional options or answers. If the source has 3 options, return 3. If 5, return 5.
        ▸ The 'correctAnswer' field MUST be a copy/paste of one of the 'options' strings — character-for-character identical.

        First, determine which CASE the document falls into:

        CASE A — The document ALREADY CONTAINS exam questions (numbered items, "Q1", "1.", multiple-choice options A/B/C/D, true/false, etc.):
        ▸ Copy the question text and every option CHARACTER-FOR-CHARACTER from the document.
        ▸ Copy the correct answer EXACTLY as it appears in the document (look for an answer key, answer line, bolded option, or marked answer). If the document does not indicate the correct answer, pick the option whose text matches the document most accurately and put that EXACT option string in 'correctAnswer'.

        CASE B — The document is STUDY MATERIAL (notes, textbook, article, slides) without pre-written questions:
        ▸ Generate questions strictly grounded in the document's text.
        ▸ Each option must reflect content actually present in the document; do not fabricate facts.
        ▸ The 'correctAnswer' must be the verbatim text of one of the 'options'.

        ============================================================
        SAMPLING & QUALITY RULES
        ============================================================
        1. COVERAGE: Divide the document into ${count} roughly equal segments and select one question per segment to ensure full coverage. Use seed ${randomSeed} as the random anchor.
        2. NO DUPLICATION: Each question must be distinct and cover a different part of the document.
        3. SOURCE QUOTE: For every question, provide a 'sourceQuote' — a verbatim excerpt (10-40 words) from the document that directly justifies the correct answer. Copy it character-for-character. If you cannot find a verbatim excerpt to justify an option, do not include that question.
        4. ANSWER FORMAT: Follow ${answerFormat}.
        5. EXPLANATION: Keep the explanation concise (1-3 sentences) and grounded in the sourceQuote.

        ============================================================
        OUTPUT
        ============================================================
        Return a JSON object with key 'questions' containing the list of questions.
        Each question must have: id, question, options, correctAnswer, explanation, sourceQuote, topic.
        The 'correctAnswer' string MUST match one of the 'options' strings exactly (character-for-character).`,
        responseMimeType: "application/json",
        temperature: 0.1,
        seed: randomSeed,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
          required: ["questions"]
        },
      }
    );
  };

  try {
    const response = await fetchWithRetry(apiCall);
    const rawText = response.text;
    if (!rawText) throw new Error("EMPTY_RESPONSE: AI returned an empty result.");
    
    const jsonStr = cleanJsonResponse(rawText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error("JSON parse error from AI response", 'geminiService.parseDocumentToQuestions', { rawTextHead: rawText.substring(0, 200) });
      throw new Error("PARSING_ERROR: The AI output was not valid JSON. Try reducing the question count.");
    }

    const questionsData = typeof parsed === 'object' && parsed !== null && 'questions' in parsed
      ? (parsed as { questions?: unknown }).questions
      : Array.isArray(parsed) ? parsed : [];

    const questions = Array.isArray(questionsData) ? questionsData : []; 
    
    if (questions.length === 0) throw new Error("NO_QUESTIONS: No questions were extracted.");

    // Preserve original options/order from AI (verbatim). Display-time shuffling is handled by optionShuffler.
    return questions
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
      .map((q: Question) => {
        const cleanOption = (t: string) => String(t).replace(/^[A-E][).]\s*/i, '').trim();
        const normalizedCorrect = cleanOption(q.correctAnswer);
        const matchingOption = q.options.find(
          (opt: string) => cleanOption(opt).toLowerCase() === normalizedCorrect.toLowerCase()
        );

        return {
          ...q,
          correctAnswer: matchingOption || q.correctAnswer
        };
      });
  } catch (error: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to parse document into questions", 'geminiService.parseDocumentToQuestions', errorObj);
    const msg = errorObj.message;
    
    if (msg.includes('Rpc failed') || msg.includes('Code 6')) {
      throw new Error(`NETWORK_TIMEOUT: 連線至 AI 伺服器時發生 RPC 錯誤 (Code 6)。請嘗試：1. 減少題目數量 2. 稍後再試一次。`);
    }
    
    throw new Error(`GENERATION_FAILED: ${msg}`);
  }
};

export const refineMasteryInsight = async (
  question: string,
  options: string[],
  correctAnswer: string,
  modelName: string = 'gemini-3-flash-preview'
): Promise<string> => {
  const finalModelName = getModelName(modelName);
  const prompt = `Provide a detailed "Mastery Insight" for this exam question: "${question}". Correct answer: "${correctAnswer}". Explain the underlying concept deeply and why other options might be confusing.`;

  const apiCall = async () => {
    return await callAIModel(
      finalModelName,
      { parts: [{ text: prompt }] },
      { temperature: 0.5 }
    );
  };

  try {
    const response = await fetchWithRetry(apiCall);
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
  const modelName = getModelName('gemini-3-flash-preview');
  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const apiCall = async () => {
    return await callAIModel(
      modelName,
      { parts: contents },
      {
        temperature: 0.7,
        systemInstruction: `You are an expert tutor. Helping a student with the following material: ${context.substring(0, 30000)}`,
      }
    );
  };

  try {
    const response = await fetchWithRetry(apiCall);
    return response.text || "";
  } catch (error) {
    return "目前連線不穩定，請稍後再試。";
  }
};

export const generatePerformanceAnalysis = async (
  questions: Question[],
  answers: UserAnswer[]
): Promise<PerformanceAnalysis> => {
  const modelName = getModelName('gemini-3-flash-preview');
  const summary = questions.map(q => ({
    topic: q.topic,
    correct: answers.find(a => a.questionId === q.id)?.isCorrect
  }));

  const apiCall = async () => {
    return await callAIModel(
      modelName,
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
    const response = await fetchWithRetry(apiCall);
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
