/**
 * File processing utilities for document conversion
 */

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
 * Strips a leading option-letter label (e.g. "A.", "B)", "C:") from option text
 * for display only. The stored option string is preserved verbatim — this is
 * used at render time so a randomized A/B/C/D label is not duplicated when the
 * source document already embeds its own letter prefix.
 */
export const stripOptionLetterPrefix = (option: string): string => {
  if (!option) return option;
  return option.replace(/^\s*[A-Ea-e]\s*[).:、\.]\s*/, '');
};

/**
 * Cleans JSON response from markdown code blocks, reasoning preambles, and
 * any prose that some models (e.g. MiniMax-M2.7) emit around the JSON.
 *
 * Strategy:
 *   1. Drop any <think>…</think> reasoning blocks.
 *   2. Strip a single set of leading/trailing ```json … ``` fences.
 *   3. If the string still doesn't start with `{` or `[`, extract the largest
 *      span from the first `{` (or `[`) to the last matching `}` (or `]`).
 */
export const cleanJsonResponse = (text: string): string => {
  if (!text) return '';

  let cleaned = text.trim();

  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  cleaned = cleaned
    .replace(/^```(?:json|JSON)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim();

  if (!/^[\{\[]/.test(cleaned)) {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    let endChar = '';
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      endChar = '}';
    } else if (firstBracket !== -1) {
      start = firstBracket;
      endChar = ']';
    }
    if (start !== -1) {
      const end = cleaned.lastIndexOf(endChar);
      if (end > start) cleaned = cleaned.slice(start, end + 1).trim();
    }
  }

  return cleaned;
};
