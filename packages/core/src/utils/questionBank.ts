import { Question, OriginalQuestion, QuestionBank, CaseType } from '../types';
import { logger } from './logger';

const BANK_KEY_PREFIX = 'smart_exam_bank_';
const BANK_INDEX_KEY = 'smart_exam_bank_index';
const MAX_BANKS = 10;

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

export const saveQuestionBank = (params: {
  documentHash: string;
  questions: Question[];
  caseType: CaseType;
  modelUsed: string;
}): QuestionBank => {
  const bank: QuestionBank = {
    documentHash: params.documentHash,
    questions: deepCloneAsLocked(params.questions),
    caseType: params.caseType,
    poolSize: params.questions.length,
    createdAt: Date.now(),
    modelUsed: params.modelUsed,
  };

  try {
    localStorage.setItem(BANK_KEY_PREFIX + bank.documentHash, JSON.stringify(bank));
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
    logger.error('Failed to save question bank', 'questionBank.saveQuestionBank', e);
  }

  return bank;
};

const normalizeQuestionText = (q: string): string =>
  q.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Merge freshly generated questions into an existing bank, de-duplicating by
 * normalized question text. Used by the "top-up" flow when the cached pool is
 * smaller than the number of questions the user asked for, so the requested
 * count is always honored. Returns the updated bank.
 */
export const appendToQuestionBank = (
  documentHash: string,
  newQuestions: Question[]
): QuestionBank | null => {
  const existing = loadQuestionBank(documentHash);
  if (!existing) return null;

  const seen = new Set(existing.questions.map(q => normalizeQuestionText(q.question)));
  const toAdd = newQuestions.filter(q => {
    const key = normalizeQuestionText(q.question);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (toAdd.length === 0) return existing;

  const merged: QuestionBank = {
    ...existing,
    questions: [...existing.questions, ...deepCloneAsLocked(toAdd)],
    poolSize: existing.questions.length + toAdd.length,
  };

  try {
    localStorage.setItem(BANK_KEY_PREFIX + documentHash, JSON.stringify(merged));
    logger.info(
      `Question bank topped up: ${documentHash} (+${toAdd.length}, poolSize=${merged.poolSize})`,
      'questionBank.appendToQuestionBank'
    );
  } catch (e) {
    logger.error('Failed to append to question bank', 'questionBank.appendToQuestionBank', e);
    return existing;
  }

  return merged;
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
