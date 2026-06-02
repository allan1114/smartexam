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

export const cleanJsonResponse = (text: string): string => {
  if (!text) return '';

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
    return cleaned;
  } catch {
    // Truncated response? Attempt a structural repair; only use it if it parses.
    try {
      const repaired = repairTruncatedJson(cleaned);
      if (repaired !== cleaned) {
        JSON.parse(repaired);
        return repaired;
      }
    } catch {
      /* fall through — return cleaned as before */
    }
  }

  return cleaned;
};
