import { Question, ExamSession, OriginalQuestion, ExamConfig } from '../types';
import { logger } from './logger';

const STORAGE_KEY_PREFIX = 'smart_exam_session_';
const STORAGE_INDEX_KEY = 'smart_exam_session_index';
const MAX_SESSIONS = 20; // Limit stored sessions to manage localStorage

/**
 * Generate hash from document content or file data for integrity tracking
 */
export const generateDocumentHash = (text?: string, fileData?: { data: string; mimeType: string }): string => {
  try {
    const content = text || fileData?.data || '';
    // Simple hash: use first 1000 chars + length
    const key = content.substring(0, 1000) + content.length;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  } catch (e) {
    logger.warn('Failed to generate document hash', 'examStorage.generateDocumentHash', e);
    return 'unknown_' + Date.now();
  }
};

/**
 * Deep clone questions to ensure original integrity
 */
const deepCloneQuestions = (questions: Question[]): OriginalQuestion[] => {
  return questions.map(q => ({
    ...q,
    options: [...q.options],
    _locked: true as const
  })) as OriginalQuestion[];
};

/**
 * Save exam session with deep-cloned original questions
 */
export const saveExamSession = (
  questions: Question[],
  documentHash: string,
  examConfig?: ExamConfig
): string => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const session: ExamSession = {
      id: sessionId,
      originalQuestions: deepCloneQuestions(questions),
      optionMappings: questions.map(q => ({
        questionId: q.id,
        indexMap: {} // Empty initially, will be populated per exam attempt
      })),
      documentHash,
      createdAt: Date.now(),
      examConfig
    };

    const storageKey = STORAGE_KEY_PREFIX + sessionId;
    localStorage.setItem(storageKey, JSON.stringify(session));

    // Update session index
    const index = getSessionIndex();
    index.push(sessionId);
    // Keep only most recent MAX_SESSIONS
    if (index.length > MAX_SESSIONS) {
      const toDelete = index.shift();
      if (toDelete) {
        localStorage.removeItem(STORAGE_KEY_PREFIX + toDelete);
      }
    }
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));

    logger.info(`Exam session saved: ${sessionId}`, 'examStorage.saveExamSession');
    return sessionId;
  } catch (e) {
    logger.error('Failed to save exam session', 'examStorage.saveExamSession', e);
    throw new Error('STORAGE_SAVE_FAILED: Could not save exam session to local storage');
  }
};

/**
 * Load exam session by ID
 */
export const loadExamSession = (sessionId: string): ExamSession | null => {
  try {
    const storageKey = STORAGE_KEY_PREFIX + sessionId;
    const data = localStorage.getItem(storageKey);
    if (!data) return null;

    const session = JSON.parse(data) as ExamSession;
    return session;
  } catch (e) {
    logger.error(`Failed to load exam session: ${sessionId}`, 'examStorage.loadExamSession', e);
    return null;
  }
};

/**
 * Validate that original questions haven't been modified
 */
export const validateOriginalQuestions = (
  original: OriginalQuestion[],
  current: Question[]
): boolean => {
  if (original.length !== current.length) return false;

  return original.every((origQ, idx) => {
    const currQ = current[idx];
    if (!currQ) return false;

    // Check question text
    if (origQ.question !== currQ.question) return false;

    // Check answer
    if (origQ.correctAnswer !== currQ.correctAnswer) return false;

    // Check explanation
    if (origQ.explanation !== currQ.explanation) return false;

    // Check source quote
    if (origQ.sourceQuote !== currQ.sourceQuote) return false;

    // Check all options exist (in any order due to shuffling)
    const origOptSet = new Set(origQ.options);
    const currOptSet = new Set(currQ.options);
    if (origOptSet.size !== currOptSet.size) return false;

    for (const opt of origOptSet) {
      if (!currOptSet.has(opt)) return false;
    }

    return true;
  });
};

/**
 * Get all session IDs from index
 */
const getSessionIndex = (): string[] => {
  try {
    const data = localStorage.getItem(STORAGE_INDEX_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    logger.warn('Failed to read session index', 'examStorage.getSessionIndex');
    return [];
  }
};

/**
 * List all available sessions
 */
export const listExamSessions = (): ExamSession[] => {
  const index = getSessionIndex();
  return index
    .map(sessionId => loadExamSession(sessionId))
    .filter((session): session is ExamSession => session !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Delete exam session
 */
export const deleteExamSession = (sessionId: string): void => {
  try {
    const storageKey = STORAGE_KEY_PREFIX + sessionId;
    localStorage.removeItem(storageKey);

    const index = getSessionIndex();
    const updated = index.filter(id => id !== sessionId);
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(updated));

    logger.info(`Exam session deleted: ${sessionId}`, 'examStorage.deleteExamSession');
  } catch (e) {
    logger.error(`Failed to delete exam session: ${sessionId}`, 'examStorage.deleteExamSession', e);
  }
};

/**
 * Clear all exam sessions (for cleanup)
 */
export const clearAllExamSessions = (): void => {
  try {
    const index = getSessionIndex();
    index.forEach(sessionId => {
      localStorage.removeItem(STORAGE_KEY_PREFIX + sessionId);
    });
    localStorage.removeItem(STORAGE_INDEX_KEY);
    logger.info('All exam sessions cleared', 'examStorage.clearAllExamSessions');
  } catch (e) {
    logger.error('Failed to clear all exam sessions', 'examStorage.clearAllExamSessions', e);
  }
};

/**
 * Load a session for retake - returns original questions for reuse
 * Level 2: Enable retaking with fresh option shuffles
 */
export const loadSessionForRetake = (sessionId: string): OriginalQuestion[] | null => {
  try {
    const session = loadExamSession(sessionId);
    if (!session) {
      logger.warn(`Session not found for retake: ${sessionId}`, 'examStorage.loadSessionForRetake');
      return null;
    }

    logger.info(`Loaded session for retake: ${sessionId}`, 'examStorage.loadSessionForRetake');
    return session.originalQuestions;
  } catch (e) {
    logger.error(`Failed to load session for retake: ${sessionId}`, 'examStorage.loadSessionForRetake', e);
    return null;
  }
};

/**
 * Create a retake session from an original session
 * Level 2: Track retake chain for analytics
 */
export const createRetakeSession = (
  originalSessionId: string,
  questions: Question[],
  examConfig?: ExamConfig
): string | null => {
  try {
    const originalSession = loadExamSession(originalSessionId);
    if (!originalSession) {
      logger.warn(`Original session not found for retake: ${originalSessionId}`, 'examStorage.createRetakeSession');
      return null;
    }

    const retakeSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const retakeSession: ExamSession = {
      id: retakeSessionId,
      originalQuestions: deepCloneQuestions(questions),
      optionMappings: questions.map(q => ({
        questionId: q.id,
        indexMap: {}
      })),
      documentHash: originalSession.documentHash,
      createdAt: Date.now(),
      examConfig,
      retakeOf: originalSessionId // Track that this is a retake
    };

    const storageKey = STORAGE_KEY_PREFIX + retakeSessionId;
    localStorage.setItem(storageKey, JSON.stringify(retakeSession));

    // Update index
    const index = getSessionIndex();
    index.push(retakeSessionId);
    if (index.length > MAX_SESSIONS) {
      const toDelete = index.shift();
      if (toDelete) {
        localStorage.removeItem(STORAGE_KEY_PREFIX + toDelete);
      }
    }
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));

    logger.info(`Retake session created: ${retakeSessionId} (retake of ${originalSessionId})`, 'examStorage.createRetakeSession');
    return retakeSessionId;
  } catch (e) {
    logger.error(`Failed to create retake session for: ${originalSessionId}`, 'examStorage.createRetakeSession', e);
    return null;
  }
};

/**
 * Get retake chain - shows original session and all retakes
 * Level 2: Track exam attempt history
 */
export const getRetakeChain = (sessionId: string): ExamSession[] => {
  try {
    const chain: ExamSession[] = [];
    let currentId: string | undefined = sessionId;

    // Walk backwards to find the original session
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const session = loadExamSession(currentId);
      if (!session) break;

      chain.unshift(session);
      currentId = session.retakeOf;
    }

    // Find all retakes of this session (forward chain)
    const allSessions = listExamSessions();
    const findRetakes = (parentId: string): ExamSession[] => {
      return allSessions.filter(s => s.retakeOf === parentId);
    };

    const addRetakes = (baseId: string) => {
      const retakes = findRetakes(baseId);
      for (const retake of retakes) {
        chain.push(retake);
        addRetakes(retake.id);
      }
    };

    if (chain.length > 0) {
      addRetakes(chain[chain.length - 1].id);
    }

    return chain;
  } catch (e) {
    logger.error(`Failed to get retake chain for: ${sessionId}`, 'examStorage.getRetakeChain', e);
    return [];
  }
};

/**
 * Count how many times this specific session has been retaken
 * Level 2: For analytics and performance tracking
 */
export const getRetakeCount = (sessionId: string): number => {
  try {
    const allSessions = listExamSessions();
    let count = 0;

    // Count how many sessions have this sessionId as their retakeOf
    const countDirectRetakes = (parentId: string): number => {
      let total = 0;
      const directRetakes = allSessions.filter(s => s.retakeOf === parentId);
      for (const retake of directRetakes) {
        total += 1 + countDirectRetakes(retake.id);
      }
      return total;
    };

    count = countDirectRetakes(sessionId);
    return count;
  } catch (e) {
    logger.error(`Failed to get retake count for: ${sessionId}`, 'examStorage.getRetakeCount', e);
    return 0;
  }
};
