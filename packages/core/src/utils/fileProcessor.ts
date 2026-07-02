/**
 * File processing utilities for document conversion
 */

import { Question, QuestionType, MatchPair, DropdownBlank } from '../types';

const QUESTION_TYPES: QuestionType[] = ['single', 'multiple', 'matching', 'dropdown'];

/** Strip a leading option label like "A) " / "B. " so answers can be matched to options. */
const cleanOptionText = (t: unknown): string => String(t ?? '').replace(/^[A-E][).]\s*/i, '').trim();

/** Find the option whose text matches `value` (ignoring label prefix and case). */
const matchToOption = (value: unknown, options: string[]): string | undefined => {
  const normalized = cleanOptionText(value).toLowerCase();
  return options.find(opt => cleanOptionText(opt).toLowerCase() === normalized);
};

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * Normalize one AI-generated question object into a strict `Question`, or return
 * `null` if it is too malformed to use (the caller drops it rather than failing
 * the whole batch). Pure + network-free so it is unit-testable with fixtures.
 *
 * `correctAnswer` is always backfilled (even for matching/dropdown) so legacy
 * code paths and the examStorage round-trip guard never see `undefined`.
 */
export const normalizeGeneratedQuestion = (raw: unknown, idx: number): Question | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.question !== 'string' || r.question.trim() === '') return null;

  const type: QuestionType = QUESTION_TYPES.includes(r.type as QuestionType)
    ? (r.type as QuestionType)
    : 'single';

  const base = {
    id: idx + 1,
    question: r.question,
    explanation: typeof r.explanation === 'string' ? r.explanation : '',
    sourceQuote: typeof r.sourceQuote === 'string' ? r.sourceQuote : '',
    topic: typeof r.topic === 'string' ? r.topic : undefined,
  };

  if (type === 'matching') {
    const rawPairs = Array.isArray(r.pairs) ? r.pairs : [];
    const pairs: MatchPair[] = rawPairs
      .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
      .map(p => ({ prompt: String(p.prompt ?? '').trim(), answer: String(p.answer ?? '').trim() }))
      .filter(p => p.prompt !== '' && p.answer !== '');
    if (pairs.length === 0) return null;
    // Options = the answer pool; ensure every correct answer is present.
    const options = asStringArray(r.options);
    pairs.forEach(p => {
      if (!options.some(o => cleanOptionText(o).toLowerCase() === p.answer.toLowerCase())) {
        options.push(p.answer);
      }
    });
    return {
      ...base,
      type,
      options,
      pairs,
      correctAnswer: `${pairs[0].prompt} → ${pairs[0].answer}`,
    };
  }

  if (type === 'dropdown') {
    const rawBlanks = Array.isArray(r.blanks) ? r.blanks : [];
    const blanks: DropdownBlank[] = rawBlanks
      .filter((b): b is Record<string, unknown> => typeof b === 'object' && b !== null)
      .map(b => {
        const opts = asStringArray(b.options);
        const correct = String(b.correctAnswer ?? '').trim();
        if (correct !== '' && !opts.some(o => cleanOptionText(o).toLowerCase() === correct.toLowerCase())) {
          opts.push(correct);
        }
        return {
          label: typeof b.label === 'string' ? b.label : undefined,
          options: opts,
          correctAnswer: correct,
        };
      })
      .filter(b => b.options.length > 0 && b.correctAnswer !== '');
    if (blanks.length === 0) return null;
    const options = Array.from(new Set(blanks.flatMap(b => b.options)));
    return {
      ...base,
      type,
      options,
      blanks,
      correctAnswer: blanks[0].correctAnswer,
    };
  }

  // single / multiple — both carry a flat options list.
  const options = asStringArray(r.options);
  if (options.length === 0) return null;

  if (type === 'multiple') {
    const rawCorrect = asStringArray(r.correctAnswers);
    const correctAnswers = rawCorrect
      .map(c => matchToOption(c, options) ?? cleanOptionText(c))
      .filter(c => c !== '');
    if (correctAnswers.length === 0) {
      // Fall back to the single correctAnswer if the array was unusable.
      const fallback = matchToOption(r.correctAnswer, options);
      if (!fallback) return null;
      return { ...base, type: 'single', options, correctAnswer: fallback };
    }
    return {
      ...base,
      type,
      options,
      correctAnswers,
      correctAnswer: correctAnswers[0],
    };
  }

  // single
  const correctAnswer = matchToOption(r.correctAnswer, options) ?? String(r.correctAnswer ?? '').trim();
  if (correctAnswer === '') return null;
  return { ...base, type: 'single', options, correctAnswer };
};

/**
 * Converts a File to base64 string
 * @param file - File object to convert
 * @returns Promise<string> - Base64 encoded string
 * @throws {Error} If file reading fails
 */
export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      } catch (e) {
        reject(new Error('Failed to extract base64 from file'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Reads file as text
 * @param file - File object to read
 * @returns Promise<string> - File content as text
 */
export const readFileAsText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string | null;
      if (content) {
        resolve(content);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

/**
 * Extracts Google Docs ID from URL
 * @param url - Google Docs URL
 * @returns string | null - Document ID or null if invalid URL
 */
export const extractGoogleDocId = (url: string): string | null => {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

/**
 * Generates a unique ID for exam results
 * @returns string - Unique identifier
 */
export const generateUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};

/**
 * Shuffles array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns T[] - Shuffled array (new array, original unchanged)
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Cleans JSON response from markdown code blocks
 * @param text - Raw response text from API
 * @returns string - Cleaned JSON string
 */
/**
 * Best-effort repair of a JSON object whose tail was cut off (e.g. the model
 * hit an output-token limit mid-array). Finds the last fully-completed element
 * inside an array, truncates there, and re-balances the open brackets. Returns
 * the original string if no safe cut point exists.
 */
const repairTruncatedJson = (s: string): string => {
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  let lastGoodCut = -1;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{' || c === '[') {
      stack.push(c);
    } else if (c === '}' || c === ']') {
      stack.pop();
      // Just finished a value whose parent is an array → safe to cut here.
      if (stack.length > 0 && stack[stack.length - 1] === '[') {
        lastGoodCut = i + 1;
      }
    }
  }

  if (lastGoodCut === -1) return s;

  const prefix = s.slice(0, lastGoodCut);
  // Re-derive the open-bracket stack for the prefix so we know what to close.
  inStr = false; esc = false;
  const st2: string[] = [];
  for (let i = 0; i < prefix.length; i++) {
    const c = prefix[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{' || c === '[') st2.push(c);
    else if (c === '}' || c === ']') st2.pop();
  }

  let closers = '';
  for (let i = st2.length - 1; i >= 0; i--) closers += st2[i] === '[' ? ']' : '}';
  return prefix + closers;
};

export interface CleanJsonResult {
  json: string;
  /**
   * True when the structural repair path had to salvage a truncated response —
   * i.e. the model's output was cut off (usually by the output-token limit) and
   * everything after the last complete array element was discarded. Callers use
   * this to trigger continuation extraction instead of silently accepting a
   * partial result.
   */
  wasTruncated: boolean;
}

export const cleanJsonResponseDetailed = (text: string): CleanJsonResult => {
  if (!text) return { json: '', wasTruncated: false };

  // Remove markdown code blocks if present
  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // If there's still markdown after cleaning, try a more aggressive approach
  if (cleaned.includes('```')) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];
  }

  // Fast path: already valid JSON → return unchanged (keeps behavior stable).
  try {
    JSON.parse(cleaned);
    return { json: cleaned, wasTruncated: false };
  } catch {
    // Truncated response? Attempt a structural repair; only use it if it parses.
    try {
      const repaired = repairTruncatedJson(cleaned);
      if (repaired !== cleaned) {
        JSON.parse(repaired);
        return { json: repaired, wasTruncated: true };
      }
    } catch {
      /* fall through — return cleaned as before */
    }
  }

  return { json: cleaned, wasTruncated: false };
};

export const cleanJsonResponse = (text: string): string =>
  cleanJsonResponseDetailed(text).json;
