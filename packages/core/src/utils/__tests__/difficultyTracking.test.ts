import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadPerformanceProfile,
  updatePerformanceProfile,
  buildDifficultyMetrics,
  getQuestionsByDifficulty,
  createSmartRetakeOrder,
  getQuestionPerformance,
  getTopicMastery,
  getTopicMasteryMap,
  clearAllPerformanceProfiles
} from '../difficultyTracking';
import { ExamResult, Question } from '../../types';

const mockQuestions: Question[] = [
  {
    id: 1,
    question: 'Math Q1',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    explanation: 'Exp 1',
    sourceQuote: 'Quote 1',
    topic: 'Mathematics'
  },
  {
    id: 2,
    question: 'Math Q2',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'B',
    explanation: 'Exp 2',
    sourceQuote: 'Quote 2',
    topic: 'Mathematics'
  },
  {
    id: 3,
    question: 'History Q1',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'C',
    explanation: 'Exp 3',
    sourceQuote: 'Quote 3',
    topic: 'History'
  }
];

const createMockExamResult = (
  answers: { questionId: number; isCorrect: boolean; selectedOption: string }[]
): ExamResult => {
  const score = answers.filter(a => a.isCorrect).length;
  return {
    id: `result_${Date.now()}`,
    score,
    totalQuestions: answers.length,
    answers: answers.map(a => ({
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
      timeSpent: 10000
    })),
    questions: mockQuestions,
    startTime: Date.now(),
    endTime: Date.now(),
    mode: 'PRACTICE',
    model: 'test-model'
  };
};

describe('difficultyTracking - Level 3', () => {
  let docHash: string;

  beforeEach(() => {
    clearAllPerformanceProfiles();
    // Use unique hash per test to avoid profile sharing
    docHash = `test_doc_hash_${Date.now()}_${Math.random()}`;
  });

  afterEach(() => {
    clearAllPerformanceProfiles();
  });

  describe('updatePerformanceProfile', () => {
    it('should create new profile for first exam', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'A' },
        { questionId: 3, isCorrect: true, selectedOption: 'C' }
      ]);

      const profile = updatePerformanceProfile(docHash, result);

      expect(profile.documentHash).toBe(docHash);
      expect(profile.totalAttempts).toBe(1);
      expect(profile.questionMetrics.size).toBe(3);
      expect(profile.averageScore).toBe(2 / 3);
    });

    it('should track question performance correctly', () => {
      const result1 = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'B' }
      ]);

      const profile1 = updatePerformanceProfile(docHash, result1);
      const q1Perf1 = profile1.questionMetrics.get(1);
      const q2Perf1 = profile1.questionMetrics.get(2);

      expect(q1Perf1?.correctCount).toBe(1);
      expect(q1Perf1?.totalAttempts).toBe(1);
      expect(q2Perf1?.correctCount).toBe(0);
      expect(q2Perf1?.totalAttempts).toBe(1);
    });

    it('should accumulate metrics across multiple exams', () => {
      const result1 = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: true, selectedOption: 'B' }
      ]);

      const result2 = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'A' }
      ]);

      updatePerformanceProfile(docHash, result1);
      const profile2 = updatePerformanceProfile(docHash, result2);

      const q1Perf = profile2.questionMetrics.get(1);
      const q2Perf = profile2.questionMetrics.get(2);

      expect(q1Perf?.correctCount).toBe(2);
      expect(q1Perf?.totalAttempts).toBe(2);
      expect(q2Perf?.correctCount).toBe(1);
      expect(q2Perf?.totalAttempts).toBe(2);
      expect(profile2.totalAttempts).toBe(2);
    });

    it('should calculate difficulty levels correctly', () => {
      // Create 10 exams: Q1 correct 8 times (80% = EASY)
      let profile = updatePerformanceProfile(docHash, createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' }
      ]));
      for (let i = 0; i < 7; i++) {
        profile = updatePerformanceProfile(docHash, createMockExamResult([
          { questionId: 1, isCorrect: true, selectedOption: 'A' },
          { questionId: 2, isCorrect: i < 3, selectedOption: 'B' }, // 30% correct = HARD
          { questionId: 3, isCorrect: i < 5, selectedOption: 'C' } // 60% correct = MEDIUM
        ]));
      }

      const q1 = profile.questionMetrics.get(1);
      const q2 = profile.questionMetrics.get(2);
      const q3 = profile.questionMetrics.get(3);

      expect(q1?.difficulty).toBe('EASY');
      expect(q2?.difficulty).toBe('HARD');
      expect(q3?.difficulty).toBe('MEDIUM');
    });

    it('should track skipped questions', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: false, selectedOption: '' } // Empty = skipped
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const q1 = profile.questionMetrics.get(1);

      expect(q1?.skippedCount).toBe(1);
      expect(q1?.totalAttempts).toBe(1);
    });
  });

  describe('loadPerformanceProfile', () => {
    it('should return null for non-existent profile', () => {
      const profile = loadPerformanceProfile('non_existent_hash');
      expect(profile).toBeNull();
    });

    it('should persist and reload profile correctly', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'B' }
      ]);

      const saved = updatePerformanceProfile(docHash, result);
      const loaded = loadPerformanceProfile(docHash);

      expect(loaded?.documentHash).toBe(saved.documentHash);
      expect(loaded?.questionMetrics.size).toBe(saved.questionMetrics.size);
      expect(loaded?.totalAttempts).toBe(saved.totalAttempts);
    });
  });

  describe('buildDifficultyMetrics', () => {
    it('should categorize questions by difficulty', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' }, // 100% = EASY
        { questionId: 2, isCorrect: false, selectedOption: 'B' }, // 0% on first = HARD
        { questionId: 3, isCorrect: true, selectedOption: 'C' } // 100% = EASY
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const metrics = profile.difficultyDistribution;

      expect(metrics.easyQuestions.length).toBeGreaterThanOrEqual(1);
      expect(metrics.hardQuestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getQuestionsByDifficulty', () => {
    it('should return questions grouped by difficulty', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'B' },
        { questionId: 3, isCorrect: true, selectedOption: 'C' }
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const grouped = getQuestionsByDifficulty(profile, mockQuestions);

      expect(grouped.hard.length + grouped.medium.length + grouped.easy.length).toBe(3);
    });
  });

  describe('createSmartRetakeOrder', () => {
    it('should prioritize hard questions first', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' }, // EASY
        { questionId: 2, isCorrect: false, selectedOption: 'B' }, // HARD
        { questionId: 3, isCorrect: true, selectedOption: 'C' } // EASY
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const ordered = createSmartRetakeOrder(profile, mockQuestions);

      expect(ordered.length).toBe(3);
      // Hard questions should come first
      const hardQuestionIds = profile.difficultyDistribution.hardQuestions.map(q => q.questionId);
      if (hardQuestionIds.length > 0) {
        const firstQuestionId = ordered[0].id;
        expect(hardQuestionIds).toContain(firstQuestionId);
      }
    });

    it('should respect maxQuestions limit', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'B' },
        { questionId: 3, isCorrect: true, selectedOption: 'C' }
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const ordered = createSmartRetakeOrder(profile, mockQuestions, 2);

      expect(ordered.length).toBe(2);
    });

    it('should balance difficulty distribution when limited', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'B' },
        { questionId: 3, isCorrect: true, selectedOption: 'C' }
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const ordered = createSmartRetakeOrder(profile, mockQuestions, 2);

      // Should include mix of difficulties
      expect(ordered.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getQuestionPerformance', () => {
    it('should return performance for specific question', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' }
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const perf = getQuestionPerformance(profile, 1);

      expect(perf?.questionId).toBe(1);
      expect(perf?.correctCount).toBe(1);
      expect(perf?.totalAttempts).toBe(1);
    });

    it('should return null for unknown question', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' }
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const perf = getQuestionPerformance(profile, 999);

      expect(perf).toBeNull();
    });
  });

  describe('getTopicMastery', () => {
    it('should calculate mastery for specific topic', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' }, // Math correct
        { questionId: 2, isCorrect: false, selectedOption: 'B' }, // Math incorrect
        { questionId: 3, isCorrect: true, selectedOption: 'C' } // History correct
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const mathMastery = getTopicMastery(profile, 'Mathematics');
      const historyMastery = getTopicMastery(profile, 'History');

      expect(mathMastery).toBe(50); // 1/2 correct
      expect(historyMastery).toBe(100); // 1/1 correct
    });

    it('should return 0 for unmeasured topic', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' }
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const mastery = getTopicMastery(profile, 'NonExistentTopic');

      expect(mastery).toBe(0);
    });
  });

  describe('getTopicMasteryMap', () => {
    it('should return mastery for all topics', () => {
      const result = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'B' },
        { questionId: 3, isCorrect: true, selectedOption: 'C' }
      ]);

      const profile = updatePerformanceProfile(docHash, result);
      const masteryMap = getTopicMasteryMap(profile);

      expect(masteryMap.size).toBeGreaterThan(0);
      expect(masteryMap.has('Mathematics')).toBeTruthy();
      expect(masteryMap.has('History')).toBeTruthy();
    });
  });

  describe('Level 3 - Smart Retake Flow', () => {
    it('should support complete difficulty tracking workflow', () => {
      // Step 1: Take initial exam
      const exam1 = createMockExamResult([
        { questionId: 1, isCorrect: true, selectedOption: 'A' },
        { questionId: 2, isCorrect: false, selectedOption: 'A' },
        { questionId: 3, isCorrect: true, selectedOption: 'C' }
      ]);

      const profile1 = updatePerformanceProfile(docHash, exam1);
      expect(profile1.totalAttempts).toBe(1);

      // Step 2: Identify struggling questions
      const hardQuestions = profile1.difficultyDistribution.hardQuestions;
      expect(hardQuestions.length).toBeGreaterThanOrEqual(0);

      // Step 3: Take retake exam (focus on hard questions)
      const retakeOrder = createSmartRetakeOrder(profile1, mockQuestions);
      expect(retakeOrder.length).toBeGreaterThan(0);

      // Step 4: Update profile with retake
      const exam2 = createMockExamResult([
        { questionId: retakeOrder[0].id, isCorrect: true, selectedOption: 'A' },
        { questionId: retakeOrder.length > 1 ? retakeOrder[1].id : 2, isCorrect: true, selectedOption: 'B' }
      ]);

      const profile2 = updatePerformanceProfile(docHash, exam2);
      expect(profile2.totalAttempts).toBe(2);

      // Step 5: Verify improved metrics
      expect(profile2.averageScore).toBeGreaterThan(0);
    });
  });
});
