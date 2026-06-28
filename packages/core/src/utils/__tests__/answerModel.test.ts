import { describe, it, expect } from 'vitest';
import {
  getQuestionType,
  getCorrectAnswers,
  getSelectCount,
  isResponseComplete,
  isAnswerCorrect,
  formatCorrectAnswer,
  formatUserResponse,
  finalizeUserAnswer,
} from '../answerModel';
import { Question, UserAnswer } from '../../types';

const baseQ = {
  id: 1,
  question: 'Q?',
  explanation: 'because',
  sourceQuote: 'quote',
  topic: 'T',
};

const singleQ: Question = {
  ...baseQ,
  options: ['A opt', 'B opt', 'C opt', 'D opt'],
  correctAnswer: 'A opt',
};

const multiQ: Question = {
  ...baseQ,
  type: 'multiple',
  options: ['A opt', 'B opt', 'C opt', 'D opt'],
  correctAnswer: 'A opt',
  correctAnswers: ['A opt', 'C opt'],
};

const matchQ: Question = {
  ...baseQ,
  type: 'matching',
  options: ['Fix', 'Sync', 'Meet'],
  correctAnswer: 'Too many defects → Fix',
  pairs: [
    { prompt: 'Too many defects', answer: 'Fix' },
    { prompt: 'Delay in response', answer: 'Sync' },
  ],
};

const dropdownQ: Question = {
  ...baseQ,
  type: 'dropdown',
  options: ['Strategic agility', 'Tactical planning'],
  correctAnswer: 'Strategic agility',
  blanks: [{ label: 'Gain', options: ['Strategic agility', 'Tactical planning'], correctAnswer: 'Strategic agility' }],
};

const ans = (partial: Partial<UserAnswer>): UserAnswer => ({
  questionId: 1,
  selectedOption: '',
  isCorrect: false,
  timeSpent: 0,
  ...partial,
});

describe('answerModel', () => {
  describe('getQuestionType', () => {
    it('defaults to single when type absent', () => {
      expect(getQuestionType(singleQ)).toBe('single');
    });
    it('reads explicit types', () => {
      expect(getQuestionType(multiQ)).toBe('multiple');
      expect(getQuestionType(matchQ)).toBe('matching');
      expect(getQuestionType(dropdownQ)).toBe('dropdown');
    });
  });

  describe('getCorrectAnswers', () => {
    it('single → [correctAnswer]', () => {
      expect(getCorrectAnswers(singleQ)).toEqual(['A opt']);
    });
    it('multiple → correctAnswers', () => {
      expect(getCorrectAnswers(multiQ)).toEqual(['A opt', 'C opt']);
    });
    it('matching → rendered pairs', () => {
      expect(getCorrectAnswers(matchQ)).toEqual([
        'Too many defects → Fix',
        'Delay in response → Sync',
      ]);
    });
  });

  describe('getSelectCount', () => {
    it('reflects number of correct answers', () => {
      expect(getSelectCount(multiQ)).toBe(2);
      expect(getSelectCount(singleQ)).toBe(1);
    });
  });

  describe('isAnswerCorrect — single', () => {
    it('case/space insensitive match', () => {
      expect(isAnswerCorrect(singleQ, ans({ selectedOption: '  a OPT ' }))).toBe(true);
    });
    it('wrong option', () => {
      expect(isAnswerCorrect(singleQ, ans({ selectedOption: 'B opt' }))).toBe(false);
    });
    it('empty', () => {
      expect(isAnswerCorrect(singleQ, ans({}))).toBe(false);
    });
  });

  describe('isAnswerCorrect — multiple (all-or-nothing)', () => {
    it('exact set correct (order independent)', () => {
      expect(isAnswerCorrect(multiQ, ans({ selectedOptions: ['C opt', 'A opt'] }))).toBe(true);
    });
    it('subset is wrong', () => {
      expect(isAnswerCorrect(multiQ, ans({ selectedOptions: ['A opt'] }))).toBe(false);
    });
    it('superset is wrong', () => {
      expect(isAnswerCorrect(multiQ, ans({ selectedOptions: ['A opt', 'C opt', 'B opt'] }))).toBe(false);
    });
  });

  describe('isAnswerCorrect — matching', () => {
    it('all pairs correct', () => {
      expect(
        isAnswerCorrect(matchQ, ans({ matchAnswers: { 'Too many defects': 'Fix', 'Delay in response': 'Sync' } })),
      ).toBe(true);
    });
    it('one pair wrong', () => {
      expect(
        isAnswerCorrect(matchQ, ans({ matchAnswers: { 'Too many defects': 'Sync', 'Delay in response': 'Sync' } })),
      ).toBe(false);
    });
    it('missing pair', () => {
      expect(isAnswerCorrect(matchQ, ans({ matchAnswers: { 'Too many defects': 'Fix' } }))).toBe(false);
    });
  });

  describe('isAnswerCorrect — dropdown', () => {
    it('correct blank', () => {
      expect(isAnswerCorrect(dropdownQ, ans({ blankAnswers: ['Strategic agility'] }))).toBe(true);
    });
    it('wrong blank', () => {
      expect(isAnswerCorrect(dropdownQ, ans({ blankAnswers: ['Tactical planning'] }))).toBe(false);
    });
  });

  describe('isResponseComplete', () => {
    it('multiple needs the expected number of selections', () => {
      expect(isResponseComplete(multiQ, ans({ selectedOptions: ['A opt'] }))).toBe(false);
      expect(isResponseComplete(multiQ, ans({ selectedOptions: ['A opt', 'C opt'] }))).toBe(true);
      expect(isResponseComplete(multiQ, ans({ selectedOptions: [] }))).toBe(false);
    });
    it('matching needs every prompt filled', () => {
      expect(isResponseComplete(matchQ, ans({ matchAnswers: { 'Too many defects': 'Fix' } }))).toBe(false);
      expect(
        isResponseComplete(matchQ, ans({ matchAnswers: { 'Too many defects': 'Fix', 'Delay in response': 'Sync' } })),
      ).toBe(true);
    });
    it('dropdown needs every blank filled', () => {
      expect(isResponseComplete(dropdownQ, ans({ blankAnswers: ['Strategic agility'] }))).toBe(true);
      expect(isResponseComplete(dropdownQ, ans({ blankAnswers: [] }))).toBe(false);
    });
  });

  describe('formatting', () => {
    it('formatCorrectAnswer joins correct answers', () => {
      expect(formatCorrectAnswer(multiQ)).toBe('A opt; C opt');
    });
    it('formatUserResponse renders matching', () => {
      expect(formatUserResponse(matchQ, ans({ matchAnswers: { 'Too many defects': 'Fix', 'Delay in response': 'Meet' } }))).toBe(
        'Too many defects → Fix; Delay in response → Meet',
      );
    });
  });

  describe('finalizeUserAnswer', () => {
    it('computes isCorrect and summary for multiple', () => {
      const a = finalizeUserAnswer(multiQ, { questionId: 1, selectedOptions: ['A opt', 'C opt'], timeSpent: 0 });
      expect(a.isCorrect).toBe(true);
      expect(a.selectedOption).toBe('A opt, C opt');
    });
    it('keeps single selectedOption as-is', () => {
      const a = finalizeUserAnswer(singleQ, { questionId: 1, selectedOption: 'A opt', timeSpent: 0 });
      expect(a.isCorrect).toBe(true);
      expect(a.selectedOption).toBe('A opt');
    });
  });

  describe('backward compatibility', () => {
    it('legacy single UserAnswer still grades', () => {
      const legacy: UserAnswer = { questionId: 1, selectedOption: 'A opt', isCorrect: true, timeSpent: 0 };
      expect(isAnswerCorrect(singleQ, legacy)).toBe(true);
    });
  });
});
