import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadSessionForRetake,
  createRetakeSession,
  getRetakeChain,
  getRetakeCount,
  clearAllExamSessions,
  saveExamSession,
  loadExamSession
} from '../examStorage';
import { Question, ExamConfig } from '../../types';

const mockQuestions: Question[] = [
  {
    id: 1,
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctAnswer: '4',
    explanation: 'Simple addition',
    sourceQuote: 'Basic math',
    topic: 'Mathematics'
  },
  {
    id: 2,
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 'Paris',
    explanation: 'France is in Western Europe',
    sourceQuote: 'Geography facts',
    topic: 'Geography'
  }
];

const mockConfig: ExamConfig = {
  mode: 'PRACTICE',
  durationMinutes: 30,
  totalQuestions: 2,
  model: 'gemini-3-flash-preview',
  questionOrder: 'SEQUENTIAL',
  answerFormat: 'MCQ_4'
};

describe('examStorage - Level 2 Retakes', () => {
  beforeEach(() => {
    clearAllExamSessions();
  });

  afterEach(() => {
    clearAllExamSessions();
  });

  describe('loadSessionForRetake', () => {
    it('should load original questions for retake', () => {
      const docHash = 'test_hash';

      const sessionId = saveExamSession(mockQuestions, docHash, mockConfig);
      const loaded = loadSessionForRetake(sessionId);

      expect(loaded).toBeTruthy();
      expect(loaded).toHaveLength(2);
      expect(loaded?.[0].question).toBe(mockQuestions[0].question);
    });

    it('should return null for non-existent session', () => {
      const loaded = loadSessionForRetake('non_existent_id');
      expect(loaded).toBeNull();
    });

    it('should preserve all original question properties', () => {
      const docHash = 'test_hash';

      const sessionId = saveExamSession(mockQuestions, docHash);
      const loaded = loadSessionForRetake(sessionId);

      expect(loaded?.[0]).toMatchObject({
        id: 1,
        question: 'What is 2 + 2?',
        correctAnswer: '4',
        explanation: 'Simple addition',
        sourceQuote: 'Basic math',
        topic: 'Mathematics'
      });
    });
  });

  describe('createRetakeSession', () => {
    it('should create retake session linked to original', () => {
      const docHash = 'test_hash';

      const originalId = saveExamSession(mockQuestions, docHash, mockConfig);
      const retakeId = createRetakeSession(originalId, mockQuestions, mockConfig);

      expect(retakeId).toBeTruthy();
      expect(retakeId).not.toBe(originalId);
    });

    it('should fail if original session not found', () => {
      const retakeId = createRetakeSession('non_existent_id', mockQuestions, mockConfig);
      expect(retakeId).toBeNull();
    });

    it('should preserve document hash from original session', () => {
      const docHash = 'unique_test_hash';

      const originalId = saveExamSession(mockQuestions, docHash);
      const retakeId = createRetakeSession(originalId, mockQuestions);

      const retakeSession = loadExamSession(retakeId);
      const originalSession = loadExamSession(originalId);

      expect(retakeSession?.documentHash).toBe(originalSession?.documentHash);
      expect(retakeSession?.documentHash).toBe(docHash);
    });

    it('should track retakeOf relationship', () => {
      const docHash = 'test_hash';

      const originalId = saveExamSession(mockQuestions, docHash);
      const retakeId = createRetakeSession(originalId, mockQuestions);

      const retakeSession = loadExamSession(retakeId);
      expect(retakeSession?.retakeOf).toBe(originalId);
    });
  });

  describe('getRetakeChain', () => {
    it('should return chain with single session', () => {
      const docHash = 'test_hash';

      const sessionId = saveExamSession(mockQuestions, docHash);
      const chain = getRetakeChain(sessionId);

      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe(sessionId);
    });

    it('should trace back to original from retake', () => {
      const docHash = 'test_hash';

      const originalId = saveExamSession(mockQuestions, docHash);
      const retakeId = createRetakeSession(originalId, mockQuestions);

      const chain = getRetakeChain(retakeId);
      expect(chain).toHaveLength(2);
      expect(chain[0].id).toBe(originalId);
      expect(chain[1].id).toBe(retakeId);
    });

    it('should build complete chain for multiple retakes', () => {
      const docHash = 'test_hash';

      const originalId = saveExamSession(mockQuestions, docHash);
      const retake1Id = createRetakeSession(originalId, mockQuestions);
      const retake2Id = createRetakeSession(retake1Id, mockQuestions);

      const chain = getRetakeChain(retake2Id);
      expect(chain).toHaveLength(3);
      expect(chain[0].id).toBe(originalId);
      expect(chain[1].id).toBe(retake1Id);
      expect(chain[2].id).toBe(retake2Id);
    });
  });

  describe('getRetakeCount', () => {
    it('should return 0 for original session', () => {
      const docHash = 'test_hash';

      const sessionId = saveExamSession(mockQuestions, docHash);
      const count = getRetakeCount(sessionId);

      expect(count).toBe(0);
    });

    it('should return 1 for first retake', () => {
      const docHash = 'test_hash';

      const originalId = saveExamSession(mockQuestions, docHash);
      const retakeId = createRetakeSession(originalId, mockQuestions);

      expect(getRetakeCount(originalId)).toBe(1); // Original has 1 retake (retakeId)
      expect(getRetakeCount(retakeId)).toBe(0); // RetakeId has no retakes
    });

    it('should count multiple retakes', () => {
      const docHash = 'test_hash';

      const originalId = saveExamSession(mockQuestions, docHash);
      const retake1Id = createRetakeSession(originalId, mockQuestions);
      const retake2Id = createRetakeSession(retake1Id, mockQuestions);

      expect(getRetakeCount(originalId)).toBe(2);
      expect(getRetakeCount(retake1Id)).toBe(1);
      expect(getRetakeCount(retake2Id)).toBe(0);
    });
  });

  describe('Level 2 - Retake flow', () => {
    it('should support complete retake workflow', () => {
      const docHash = 'test_hash';

      // Step 1: Save original exam
      const originalId = saveExamSession(mockQuestions, docHash, mockConfig);

      // Step 2: Load for retake
      const originalQuestions = loadSessionForRetake(originalId);
      expect(originalQuestions).toHaveLength(2);

      // Step 3: Create retake session
      const retakeId = createRetakeSession(originalId, originalQuestions, mockConfig);
      expect(retakeId).toBeTruthy();

      // Step 4: Verify retake is linked to original
      const retakeSession = loadExamSession(retakeId);
      expect(retakeSession?.retakeOf).toBe(originalId);

      // Step 5: Verify chain
      const chain = getRetakeChain(retakeId);
      expect(chain).toHaveLength(2);
    });
  });
});
