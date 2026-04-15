
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question, AnswerFormat, DocumentSource, UserAnswer, PerformanceAnalysis } from "../types";
import { cleanJsonResponse, shuffleArray } from "../utils/fileProcessor";
import { ApiError, isRetryableError } from "../utils/errors";
import { logger } from "../utils/logger";

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
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  
  const rangeText = contentRange ? ` ONLY focus on the following section: "${contentRange}".` : ' Scan the ENTIRE document length to ensure a balanced sampling of questions.';
  
  const MAX_TEXT_LENGTH = 100000;
  const textContext = source.text ? (source.text.length > MAX_TEXT_LENGTH ? source.text.substring(0, MAX_TEXT_LENGTH) + "... [Truncated]" : source.text) : "";
  const randomSeed = Math.floor(Math.random() * 1000000);

  const apiCall = async () => {
    return await ai.models.generateContent({
      model: modelName,
      contents: { 
        parts: [
          { text: source.text ? `DOCUMENT CONTENT:\n${textContext}` : "Analyze the attached file and extract questions from its content." },
          ...(source.fileData ? [{ inlineData: source.fileData }] : [])
        ] 
      },
      config: {
        systemInstruction: `You are a professional exam creator. 
        TASK: Extract exactly ${count} high-quality questions from the provided document.${rangeText}

        STRICT RANDOMIZATION RULES:
        1. STRIDE SAMPLING: Divide the document into ${count} roughly equal conceptual segments. Extract at least one unique question from each segment to ensure 100% coverage.
        2. RANDOM ANCHOR: Use the seed ${randomSeed} to determine your starting perspective. Do NOT prioritize the beginning of the document or "obvious" headers.
        3. DIVERSITY: Avoid repetitive patterns. If a topic was covered in one question, move to a different sub-topic for the next.
        4. VERBATIM GROUNDING: Provide a 'sourceQuote' (verbatim excerpt) for every correct answer.
        5. FORMAT: Use ${answerFormat}.
        6. NO REPETITION: Ensure every question is distinct and covers a different part of the text.

        OUTPUT SCHEMA: Return a JSON object with a key 'questions' containing the list of questions.`,
        responseMimeType: "application/json",
        temperature: 0.85, // Higher temperature for significantly more variety in question selection
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
      },
    });
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

    // Secondary layer of randomization: Shuffle options and map correct answers
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
        const shuffledOptions = shuffleArray(q.options);

        const matchingOption = shuffledOptions.find(
          (opt: string) => cleanOption(opt).toLowerCase() === normalizedCorrect.toLowerCase()
        );

        return {
          ...q,
          options: shuffledOptions,
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
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const prompt = `Provide a detailed "Mastery Insight" for this exam question: "${question}". Correct answer: "${correctAnswer}". Explain the underlying concept deeply and why other options might be confusing.`;
  
  const apiCall = async () => {
    return await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] },
      config: { temperature: 0.5 }
    });
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
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const apiCall = async () => {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        temperature: 0.7,
        systemInstruction: `You are an expert tutor. Helping a student with the following material: ${context.substring(0, 30000)}`,
      },
    });
    return await chat.sendMessage({ message });
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
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const summary = questions.map(q => ({ 
    topic: q.topic, 
    correct: answers.find(a => a.questionId === q.id)?.isCorrect 
  }));
  
  const apiCall = async () => {
    return await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: `Analyze this exam performance data and provide constructive feedback in a encouraging tone: ${JSON.stringify(summary)}` }] },
      config: {
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
      },
    });
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
