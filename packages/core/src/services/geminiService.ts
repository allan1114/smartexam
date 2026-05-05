
import { Type, GenerateContentResponse } from "@google/genai";
import { Question, AnswerFormat, DocumentSource, UserAnswer, PerformanceAnalysis } from "../types";
import { cleanJsonResponse } from "../utils/fileProcessor";
import { ApiError, isRetryableError } from "../utils/errors";
import { logger } from "../utils/logger";

const GEMINI_DIRECT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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
  contentRange?: string
): Promise<Question[]> => {
  const finalModelName = getModelName(modelName);

  const rangeText = contentRange ? ` ONLY focus on the following section: "${contentRange}".` : ' Scan the ENTIRE document length to ensure a balanced sampling of questions.';

  const MAX_TEXT_LENGTH = 100000;
  const textContext = source.text ? (source.text.length > MAX_TEXT_LENGTH ? source.text.substring(0, MAX_TEXT_LENGTH) + "... [Truncated]" : source.text) : "";
  const randomSeed = Math.floor(Math.random() * 1000000);

  const apiCall = async () => {
    return await callGeminiViaProxy(
      finalModelName,
      {
        parts: [
          { text: source.text ? `DOCUMENT CONTENT:\n${textContext}` : "Analyze the attached file and extract questions from its content." },
          ...(source.fileData ? [{ inlineData: source.fileData }] : [])
        ]
      },
      {
        systemInstruction: `You are a professional exam compiler. Your job is to FAITHFULLY transcribe questions from the source document — never to invent, rephrase, or improve them.

        TASK: Produce exactly ${count} questions from the provided document.${rangeText}

        ============================================================
        ABSOLUTE RULE — VERBATIM TRANSCRIPTION (HIGHEST PRIORITY)
        ============================================================
        First, determine which CASE the document falls into:

        CASE A — The document ALREADY CONTAINS exam questions (numbered items, "Q1", "1.", multiple-choice options A/B/C/D, true/false, etc.):
        ▸ You MUST copy the question text CHARACTER-FOR-CHARACTER from the document. Do not paraphrase, reword, summarize, simplify, fix typos, translate, or "improve" anything.
        ▸ You MUST copy each option CHARACTER-FOR-CHARACTER. Preserve exact wording, punctuation, capitalization, numbers, units, and ordering.
        ▸ You MUST copy the correct answer EXACTLY as it appears in the document (look for an answer key, answer line, bolded option, or marked answer). If the document does not indicate the correct answer, choose the option whose text matches the document most accurately and put that EXACT option text in 'correctAnswer'.
        ▸ Do NOT invent additional options. If the source has 3 options, return 3. If 5, return 5.
        ▸ Treat Markdown syntax (**, *, _, #, \`, lists) as PLAIN TEXT to be ignored — extract the underlying text content, not the markup. Do NOT render the markdown as HTML; just strip the markdown syntax characters and use the raw text.
        ▸ The 'correctAnswer' field MUST be one of the strings inside the 'options' array — copy/paste exactly.

        CASE B — The document is STUDY MATERIAL (notes, textbook, article, slides) without pre-written questions:
        ▸ Generate questions strictly grounded in the document's text.
        ▸ Each option must reflect content actually present in the document; do not fabricate facts.
        ▸ The 'correctAnswer' must be the verbatim text of one of the 'options'.

        ============================================================
        SAMPLING & QUALITY RULES
        ============================================================
        1. COVERAGE: Divide the document into ${count} roughly equal segments and select one question per segment to ensure full coverage. Use seed ${randomSeed} as the random anchor.
        2. NO DUPLICATION: Each question must be distinct and cover a different part of the document.
        3. SOURCE QUOTE: For every question, provide a 'sourceQuote' — a verbatim excerpt (10-40 words) from the document that directly justifies the correct answer. Copy it character-for-character.
        4. ANSWER FORMAT: Follow ${answerFormat}.
        5. EXPLANATION: Keep the explanation concise (1-3 sentences) and grounded in the sourceQuote.

        ============================================================
        OUTPUT
        ============================================================
        Return a JSON object with key 'questions' containing the list of questions.
        Each question must have: id, question, options, correctAnswer, explanation, sourceQuote, topic.
        The 'correctAnswer' string MUST match one of the 'options' strings exactly (character-for-character).`,
        responseMimeType: "application/json",
        temperature: 0.3,
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
    return await callGeminiViaProxy(
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
    return await callGeminiViaProxy(
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
    return await callGeminiViaProxy(
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
