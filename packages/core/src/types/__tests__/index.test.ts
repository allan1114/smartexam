import { describe, it, expect } from 'vitest';
import {
  AppState,
  Question,
  UserAnswer,
  ExamResult,
  ExamConfig,
  DocumentSource,
  PerformanceAnalysis,
} from '../index';

describe('Type definitions', () => {
  describe('AppState enum', () => {
    it('should have all required states', () => {
      expect(AppState.HOME).toBe('HOME');
      expect(AppState.SETUP).toBe('SETUP');
      expect(AppState.LOADING).toBe('LOADING');
      expect(AppState.EXAM).toBe('EXAM');
      expect(AppState.RESULTS).toBe('RESULTS');
    });
  });

  describe('Question interface', () => {
    it('should validate a valid Question object', () => {
      const question: Question = {
        id: 1,
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        explanation: 'Basic arithmetic',
        sourceQuote: '2+2 equals 4',
        topic: 'Mathematics',
      };
      expect(question.id).toBe(1);
      expect(question.question).toBeDefined();
      expect(question.options.length).toBe(4);
    });

    it('should allow optional fields', () => {
      const question: Question = {
        id: 1,
        question: 'Test',
        options: ['A', 'B'],
        correctAnswer: 'A',
        explanation: 'Explanation',
        sourceQuote: 'Quote',
      };
      expect(question.refinedInsight).toBeUndefined();
      expect(question.topic).toBeUndefined();
    });
  });

  describe('UserAnswer interface', () => {
    it('should create a valid UserAnswer', () => {
      const answer: UserAnswer = {
        questionId: 1,
        selectedOption: 'A',
        isCorrect: true,
        timeSpent: 30,
      };
      expect(answer.questionId).toBe(1);
      expect(answer.isCorrect).toBe(true);
    });
  });

  describe('ExamConfig interface', () => {
    it('should validate a valid ExamConfig', () => {
      const config: ExamConfig = {
        mode: 'MOCK',
        durationMinutes: 60,
        totalQuestions: 10,
        model: 'gemini-3-flash-preview',
        questionOrder: 'RANDOM',
        answerFormat: 'MCQ_4',
        examName: 'Practice Test',
      };
      expect(config.mode).toBe('MOCK');
      expect(config.totalQuestions).toBe(10);
    });

    it('should allow optional contentRange', () => {
      const config: ExamConfig = {
        mode: 'PRACTICE',
        durationMinutes: 30,
        totalQuestions: 5,
        model: 'gemini-3-flash-preview',
        questionOrder: 'SEQUENTIAL',
        answerFormat: 'TF',
        contentRange: 'Chapter 1-2',
      };
      expect(config.contentRange).toBe('Chapter 1-2');
    });

    it('should accept different answer formats', () => {
      const formats: Array<ExamConfig['answerFormat']> = ['MCQ_4', 'MCQ_5', 'TF', 'AUTO'];
      formats.forEach(format => {
        const config: ExamConfig = {
          mode: 'STUDY_GUIDE',
          durationMinutes: 45,
          totalQuestions: 8,
          model: 'gemini-3-flash-preview',
          questionOrder: 'SEQUENTIAL',
          answerFormat: format,
        };
        expect(config.answerFormat).toBe(format);
      });
    });
  });

  describe('ExamResult interface', () => {
    it('should create a valid ExamResult', () => {
      const result: ExamResult = {
        id: 'result-123',
        score: 8,
        totalQuestions: 10,
        answers: [],
        questions: [],
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        mode: 'MOCK',
        model: 'gemini-3-flash-preview',
        customName: 'Test Result',
      };
      expect(result.id).toBe('result-123');
      expect(result.score).toBe(8);
      expect(result.mode).toBe('MOCK');
    });
  });

  describe('DocumentSource interface', () => {
    it('should accept text content', () => {
      const source: DocumentSource = {
        text: 'Document content here',
      };
      expect(source.text).toBeDefined();
    });

    it('should accept file data', () => {
      const source: DocumentSource = {
        fileData: {
          data: 'base64encodeddata',
          mimeType: 'application/pdf',
        },
      };
      expect(source.fileData).toBeDefined();
      expect(source.fileData.mimeType).toBe('application/pdf');
    });

    it('should accept both text and fileData', () => {
      const source: DocumentSource = {
        text: 'Some text',
        fileData: {
          data: 'base64data',
          mimeType: 'text/plain',
        },
      };
      expect(source.text).toBeDefined();
      expect(source.fileData).toBeDefined();
    });
  });

  describe('PerformanceAnalysis interface', () => {
    it('should create valid performance analysis', () => {
      const analysis: PerformanceAnalysis = {
        overallFeedback: 'Good job!',
        strengths: ['Quick answers', 'Accurate'],
        areasForImprovement: ['Time management'],
        commonMistakes: ['Rushing'],
      };
      expect(analysis.strengths).toHaveLength(2);
      expect(analysis.commonMistakes).toHaveLength(1);
    });
  });
});
