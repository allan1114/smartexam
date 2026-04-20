import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveExamSession,
  loadExamSession,
  generateDocumentHash,
  validateOriginalQuestions,
  deleteExamSession,
  clearAllExamSessions,
  listExamSessions
} from '../examStorage';
import { Question, OriginalQuestion, ExamConfig } from '../../types';

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

describe('examStorage', () => {
  beforeEach(() => {
    clearAllExamSessions();
  });

  afterEach(() => {
    clearAllExamSessions();
  });

  describe('generateDocumentHash', () => {
    it('should generate consistent hashes for same content', () => {
      const text = 'Sample document content';
      const hash1 = generateDocumentHash(text);
      const hash2 = generateDocumentHash(text);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generateDocumentHash('Content 1');
      const hash2 = generateDocumentHash('Content 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty content', () => {
      const hash = generateDocumentHash();
      expect(hash).toBeTruthy();
    });
  });

  describe('saveExamSession', () => {
    it('should save exam session and return session ID', () => {
      const docHash = generateDocumentHash('test doc');
      const sessionId = saveExamSession(mockQuestions, docHash, mockConfig);
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^session_/);
    });

    it('should deep-clone questions to preserve integrity', () => {
      const docHash = generateDocumentHash('test doc');
      const sessionId = saveExamSession(mockQuestions, docHash);

      const session = loadExamSession(sessionId);
      expect(session).toBeTruthy();
      // Verify all original question data is preserved
      expect(session?.originalQuestions[0].question).toBe(mockQuestions[0].question);
      expect(session?.originalQuestions[0].correctAnswer).toBe(mockQuestions[0].correctAnswer);
      expect(session?.originalQuestions[0].options).toEqual(mockQuestions[0].options);
      expect(session?.originalQuestions[0]._locked).toBe(true);
    });

    it('should mark questions as locked', () => {
      const docHash = generateDocumentHash('test doc');
      const sessionId = saveExamSession(mockQuestions, docHash);

      const session = loadExamSession(sessionId);
      expect(session?.originalQuestions[0]._locked).toBe(true);
    });
  });

  describe('loadExamSession', () => {
    it('should return null for non-existent session', () => {
      const session = loadExamSession('non_existent_123');
      expect(session).toBeNull();
    });

    it('should load saved session with all data intact', () => {
      const docHash = generateDocumentHash('test doc');
      const sessionId = saveExamSession(mockQuestions, docHash, mockConfig);

      const session = loadExamSession(sessionId);
      expect(session?.id).toBe(sessionId);
      expect(session?.documentHash).toBe(docHash);
      expect(session?.originalQuestions).toHaveLength(2);
      expect(session?.examConfig).toEqual(mockConfig);
      expect(session?.createdAt).toBeTruthy();
    });
  });

  describe('validateOriginalQuestions', () => {
    it('should validate identical questions as valid', () => {
      const originalQuestions = mockQuestions as OriginalQuestion[];
      const valid = validateOriginalQuestions(originalQuestions, mockQuestions);
      expect(valid).toBe(true);
    });

    it('should fail if question text is modified', () => {
      const originalQuestions = mockQuestions as OriginalQuestion[];
      const modified = [
        { ...mockQuestions[0], question: 'Modified question' },
        mockQuestions[1]
      ];
      const valid = validateOriginalQuestions(originalQuestions, modified);
      expect(valid).toBe(false);
    });

    it('should fail if correct answer is modified', () => {
      const originalQuestions = mockQuestions as OriginalQuestion[];
      const modified = [
        { ...mockQuestions[0], correctAnswer: 'Wrong answer' },
        mockQuestions[1]
      ];
      const valid = validateOriginalQuestions(originalQuestions, modified);
      expect(valid).toBe(false);
    });

    it('should pass if options are reordered (preserves integrity)', () => {
      const originalQuestions = mockQuestions as OriginalQuestion[];
      const reordered = [
        { ...mockQuestions[0], options: ['4', '3', '5', '6'] }, // Reordered options
        mockQuestions[1]
      ];
      const valid = validateOriginalQuestions(originalQuestions, reordered);
      expect(valid).toBe(true); // Should be true because all original options are present
    });

    it('should fail if options are removed', () => {
      const originalQuestions = mockQuestions as OriginalQuestion[];
      const modified = [
        { ...mockQuestions[0], options: ['3', '4', '5'] }, // Missing '6'
        mockQuestions[1]
      ];
      const valid = validateOriginalQuestions(originalQuestions, modified);
      expect(valid).toBe(false);
    });

    it('should fail if question count differs', () => {
      const originalQuestions = mockQuestions as OriginalQuestion[];
      const modified = [mockQuestions[0]]; // Only one question
      const valid = validateOriginalQuestions(originalQuestions, modified);
      expect(valid).toBe(false);
    });
  });

  describe('session management', () => {
    it('should list all saved sessions', () => {
      const docHash = generateDocumentHash('test doc');
      const id1 = saveExamSession(mockQuestions, docHash);
      const id2 = saveExamSession(mockQuestions, docHash);

      const sessions = listExamSessions();
      expect(sessions).toHaveLength(2);
      // Verify both sessions are present (order may vary due to timestamp precision)
      const sessionIds = sessions.map(s => s.id);
      expect(sessionIds).toContain(id1);
      expect(sessionIds).toContain(id2);
    });

    it('should delete specific session', () => {
      const docHash = generateDocumentHash('test doc');
      const id1 = saveExamSession(mockQuestions, docHash);
      const id2 = saveExamSession(mockQuestions, docHash);

      deleteExamSession(id1);

      const sessions = listExamSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(id2);
    });

    it('should clear all sessions', () => {
      const docHash = generateDocumentHash('test doc');
      saveExamSession(mockQuestions, docHash);
      saveExamSession(mockQuestions, docHash);

      clearAllExamSessions();

      const sessions = listExamSessions();
      expect(sessions).toHaveLength(0);
    });

    it('should limit stored sessions to maintain localStorage', () => {
      const docHash = generateDocumentHash('test doc');

      // Create more than MAX_SESSIONS (20)
      for (let i = 0; i < 25; i++) {
        saveExamSession(mockQuestions, docHash);
      }

      const sessions = listExamSessions();
      expect(sessions.length).toBeLessThanOrEqual(20);
    });
  });
});
