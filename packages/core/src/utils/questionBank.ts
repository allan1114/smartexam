import { Question, OriginalQuestion, QuestionBank, CaseType } from '../types';
import { logger } from './logger';

const BANK_KEY_PREFIX = 'smart_exam_bank_';
const BANK_INDEX_KEY = 'smart_exam_bank_index';
/**
 * Version of the extraction pipeline. Bump when extraction quality improves
 * enough that previously cached CASE A banks should be rebuilt once:
 *  1 — continuation extraction on truncation (PR #31)
 *  2 — model-reported document total drives continuation, so voluntary early
 *      stops (clean finish with only part of the document) are caught too
 */
export const CURRENT_EXTRACTOR_VERSION = 2;
// Full CASE A banks can reach ~0.5-1MB each (e.g. a 500-question PDF); 5 banks
// keeps the worst case around the common 5MB localStorage quota alongside the
// document library and exam history.
const MAX_BANKS = 5;

const deepCloneAsLocked = (questions: Question[]): OriginalQuestion[] =>
  questions.map(q => ({ ...q, options: [...q.options], _locked: true as const }));

const getBankIndex = (): string[] => {
  try {
    const data = localStorage.getItem(BANK_INDEX_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const writeBankIndex = (index: string[]) => {
  localStorage.setItem(BANK_INDEX_KEY, JSON.stringify(index));
};

export const loadQuestionBank = (documentHash: string): QuestionBank | null => {
  try {
    const raw = localStorage.getItem(BANK_KEY_PREFIX + documentHash);
    if (!raw) return null;
    return JSON.parse(raw) as QuestionBank;
  } catch (e) {
    logger.warn(`Failed to load question bank for ${documentHash}`, 'questionBank.loadQuestionBank', e);
    return null;
  }
};

/**
 * Evict the oldest cached bank other than `keepHash`. Returns true when a bank
 * was removed. Used both for the LRU cap and to free space when a large bank
 * fails to persist on the first attempt.
 */
const evictOldestBank = (keepHash: string): boolean => {
  const index = getBankIndex();
  const evict = index.find(h => h !== keepHash);
  if (!evict) return false;
  try {
    localStorage.removeItem(BANK_KEY_PREFIX + evict);
    writeBankIndex(index.filter(h => h !== evict));
    logger.warn(`Evicted oldest question bank to free space: ${evict}`, 'questionBank.evictOldestBank');
    return true;
  } catch {
    return false;
  }
};

/** setItem with a single evict-oldest-and-retry on quota failure. */
const persistBank = (bank: QuestionBank, source: string): boolean => {
  const key = BANK_KEY_PREFIX + bank.documentHash;
  const payload = JSON.stringify(bank);
  try {
    localStorage.setItem(key, payload);
    return true;
  } catch {
    if (evictOldestBank(bank.documentHash)) {
      try {
        localStorage.setItem(key, payload);
        return true;
      } catch {
        /* fall through */
      }
    }
    // Non-fatal by design: the in-memory bank still serves this exam; it just
    // won't survive a reload. Surfaced to the caller via `persisted: false`.
    logger.warn('Failed to persist question bank (localStorage quota?)', source);
    return false;
  }
};

export const saveQuestionBank = (params: {
  documentHash: string;
  questions: Question[];
  caseType: CaseType;
  modelUsed: string;
  extractionComplete?: boolean;
}): { bank: QuestionBank; persisted: boolean } => {
  const bank: QuestionBank = {
    documentHash: params.documentHash,
    questions: deepCloneAsLocked(params.questions),
    caseType: params.caseType,
    poolSize: params.questions.length,
    createdAt: Date.now(),
    modelUsed: params.modelUsed,
    extractionComplete: params.extractionComplete,
    extractorVersion: CURRENT_EXTRACTOR_VERSION,
  };

  const persisted = persistBank(bank, 'questionBank.saveQuestionBank');
  if (persisted) {
    try {
      const index = getBankIndex().filter(h => h !== bank.documentHash);
      index.push(bank.documentHash);
      if (index.length > MAX_BANKS) {
        const evict = index.shift();
        if (evict) {
          localStorage.removeItem(BANK_KEY_PREFIX + evict);
          logger.warn(`Bank limit (${MAX_BANKS}) reached — evicted oldest bank: ${evict}`, 'questionBank.saveQuestionBank');
        }
      }
      writeBankIndex(index);
      logger.info(`Question bank saved: ${bank.documentHash} (poolSize=${bank.poolSize}, case=${bank.caseType})`, 'questionBank.saveQuestionBank');
    } catch (e) {
      logger.warn('Failed to update question bank index', 'questionBank.saveQuestionBank', e);
    }
  }

  return { bank, persisted };
};

const normalizeQuestionText = (q: string): string =>
  q.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Identity key for de-duplication: question stem PLUS the (order-insensitive)
 * option set. Keying on the stem alone wrongly collapsed distinct questions
 * that share boilerplate wording (e.g. "Which of the following is correct?")
 * but have different options. Shared with the continuation-extraction merge in
 * geminiService so both layers dedup identically.
 */
export const questionDedupKey = (q: Question): string =>
  normalizeQuestionText(q.question) +
  '||' +
  (q.options ?? []).map(normalizeQuestionText).sort().join('|');

/**
 * Merge freshly generated questions into an existing bank, de-duplicating by
 * stem + option set. Used by the "top-up" flow when the cached pool is
 * smaller than the number of questions the user asked for, so the requested
 * count is always honored. Returns the updated bank and whether it persisted.
 */
export const appendToQuestionBank = (
  documentHash: string,
  newQuestions: Question[]
): { bank: QuestionBank | null; persisted: boolean } => {
  const existing = loadQuestionBank(documentHash);
  if (!existing) return { bank: null, persisted: false };

  const seen = new Set(existing.questions.map(questionDedupKey));
  const toAdd = newQuestions.filter(q => {
    const key = questionDedupKey(q);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (toAdd.length === 0) return { bank: existing, persisted: true };

  const merged: QuestionBank = {
    ...existing,
    questions: [...existing.questions, ...deepCloneAsLocked(toAdd)],
    poolSize: existing.questions.length + toAdd.length,
  };

  const persisted = persistBank(merged, 'questionBank.appendToQuestionBank');
  if (persisted) {
    logger.info(
      `Question bank topped up: ${documentHash} (+${toAdd.length}, poolSize=${merged.poolSize})`,
      'questionBank.appendToQuestionBank'
    );
  }
  // Even when persistence failed the merged bank is real for this session.
  return { bank: merged, persisted };
};

export const deleteQuestionBank = (documentHash: string): void => {
  try {
    localStorage.removeItem(BANK_KEY_PREFIX + documentHash);
    const index = getBankIndex().filter(h => h !== documentHash);
    writeBankIndex(index);
    logger.info(`Question bank deleted: ${documentHash}`, 'questionBank.deleteQuestionBank');
  } catch (e) {
    logger.error(`Failed to delete question bank: ${documentHash}`, 'questionBank.deleteQuestionBank', e);
  }
};

/**
 * Randomly sample `count` questions from the bank using Fisher-Yates on indices.
 * Uses Math.random() — each call yields a different subset (true randomness, no seed).
 * If the bank pool is smaller than `count`, returns the entire bank (with a warn).
 * Returned questions are deep-cloned and re-numbered id = 1..N for stable downstream handling.
 */
export const sampleQuestionsFromBank = (bank: QuestionBank, count: number): Question[] => {
  const pool = bank.questions;
  if (pool.length === 0) return [];

  if (pool.length <= count) {
    if (pool.length < count) {
      logger.warn(`Bank poolSize (${pool.length}) < requested count (${count}); returning entire bank`, 'questionBank.sampleQuestionsFromBank');
    }
    const indices = Array.from({ length: pool.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.map((origIdx, k) => ({
      ...pool[origIdx],
      options: [...pool[origIdx].options],
      id: k + 1,
    }));
  }

  // Fisher-Yates partial shuffle: pick first `count` distinct indices
  const indices = Array.from({ length: pool.length }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (indices.length - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((origIdx, k) => ({
    ...pool[origIdx],
    options: [...pool[origIdx].options],
    id: k + 1,
  }));
};
