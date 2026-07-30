// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  saveQuestionBank,
  loadQuestionBank,
  appendToQuestionBank,
  questionDedupKey,
  sampleQuestionsFromBank,
  CURRENT_EXTRACTOR_VERSION,
} from '../questionBank';
import { Question } from '../../types';

const q = (id: number, question: string, options: string[] = ['A', 'B', 'C']): Question => ({
  id,
  question,
  options,
  correctAnswer: options[0],
  explanation: 'e',
  sourceQuote: 's',
  topic: 'T',
});

describe('questionBank', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('questionDedupKey', () => {
    it('same stem + different options are DISTINCT', () => {
      const a = q(1, 'Which of the following is correct?', ['Apple', 'Pear']);
      const b = q(2, 'Which of the following is correct?', ['Cat', 'Dog']);
      expect(questionDedupKey(a)).not.toBe(questionDedupKey(b));
    });

    it('same stem + same options in different order are EQUAL', () => {
      const a = q(1, 'Q?', ['X', 'Y', 'Z']);
      const b = q(2, ' q? ', ['Z', 'X', 'Y']);
      expect(questionDedupKey(a)).toBe(questionDedupKey(b));
    });
  });

  describe('saveQuestionBank', () => {
    it('persists and reports persisted=true', () => {
      const { bank, persisted } = saveQuestionBank({
        documentHash: 'h1',
        questions: [q(1, 'Q1')],
        caseType: 'A',
        modelUsed: 'm',
        extractionComplete: true,
      });
      expect(persisted).toBe(true);
      expect(bank.extractionComplete).toBe(true);
      expect(bank.extractorVersion).toBe(CURRENT_EXTRACTOR_VERSION);
      expect(loadQuestionBank('h1')?.questions).toHaveLength(1);
      expect(loadQuestionBank('h1')?.extractionComplete).toBe(true);
      expect(loadQuestionBank('h1')?.extractorVersion).toBe(CURRENT_EXTRACTOR_VERSION);
    });

    it('reports persisted=false when localStorage keeps failing', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      const { bank, persisted } = saveQuestionBank({
        documentHash: 'h2',
        questions: [q(1, 'Q1')],
        caseType: 'A',
        modelUsed: 'm',
      });
      expect(persisted).toBe(false);
      // In-memory bank still usable for this session.
      expect(bank.questions).toHaveLength(1);
    });

    it('evicts an older bank and retries when the first save fails', () => {
      saveQuestionBank({ documentHash: 'old', questions: [q(1, 'Old')], caseType: 'A', modelUsed: 'm' });

      const realSetItem = Storage.prototype.setItem;
      let failedOnce = false;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
        if (key === 'smart_exam_bank_big' && !failedOnce) {
          failedOnce = true;
          throw new DOMException('QuotaExceededError');
        }
        realSetItem.call(this, key, value);
      });

      const { persisted } = saveQuestionBank({
        documentHash: 'big',
        questions: [q(1, 'Big')],
        caseType: 'A',
        modelUsed: 'm',
      });
      expect(persisted).toBe(true);
      expect(loadQuestionBank('old')).toBeNull(); // evicted to make room
      expect(loadQuestionBank('big')?.questions).toHaveLength(1);
    });

    it('keeps at most 5 banks (LRU)', () => {
      for (let i = 1; i <= 6; i++) {
        saveQuestionBank({ documentHash: `h${i}`, questions: [q(1, `Q${i}`)], caseType: 'A', modelUsed: 'm' });
      }
      expect(loadQuestionBank('h1')).toBeNull(); // oldest evicted
      expect(loadQuestionBank('h6')).not.toBeNull();
    });
  });

  describe('appendToQuestionBank', () => {
    it('same-stem different-options questions both survive', () => {
      saveQuestionBank({
        documentHash: 'h',
        questions: [q(1, 'Which is correct?', ['Apple', 'Pear'])],
        caseType: 'A',
        modelUsed: 'm',
      });
      const { bank, persisted } = appendToQuestionBank('h', [q(2, 'Which is correct?', ['Cat', 'Dog'])]);
      expect(persisted).toBe(true);
      expect(bank?.questions).toHaveLength(2);
    });

    it('true duplicates are dropped', () => {
      saveQuestionBank({
        documentHash: 'h',
        questions: [q(1, 'Q1', ['A', 'B'])],
        caseType: 'A',
        modelUsed: 'm',
      });
      const { bank } = appendToQuestionBank('h', [q(9, ' q1 ', ['B', 'A'])]);
      expect(bank?.questions).toHaveLength(1);
    });

    it('returns null bank when no existing bank', () => {
      const { bank, persisted } = appendToQuestionBank('missing', [q(1, 'Q')]);
      expect(bank).toBeNull();
      expect(persisted).toBe(false);
    });
  });

  describe('sampleQuestionsFromBank', () => {
    const makeBank = (n: number) => {
      const { bank } = saveQuestionBank({
        documentHash: 'sample',
        questions: Array.from({ length: n }, (_, i) => q(i + 1, `Q${i + 1}`, [`A${i}`, `B${i}`])),
        caseType: 'A',
        modelUsed: 'm',
      });
      return bank;
    };

    it('returns every question when count >= poolSize', () => {
      const picked = sampleQuestionsFromBank(makeBank(40), 40);
      expect(picked).toHaveLength(40);
      const stems = picked.map(p => p.question).sort();
      expect(new Set(stems).size).toBe(40);
    });

    it('preserveOrder keeps document order for the whole bank', () => {
      const picked = sampleQuestionsFromBank(makeBank(30), 30, { preserveOrder: true });
      expect(picked.map(p => p.question)).toEqual(
        Array.from({ length: 30 }, (_, i) => `Q${i + 1}`)
      );
      // ids are renumbered 1..N in the emitted order
      expect(picked.map(p => p.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    });

    it('preserveOrder keeps document order for a partial sample too', () => {
      const picked = sampleQuestionsFromBank(makeBank(50), 10, { preserveOrder: true });
      expect(picked).toHaveLength(10);
      const positions = picked.map(p => parseInt(p.question.replace('Q', ''), 10));
      expect([...positions]).toEqual([...positions].sort((a, b) => a - b));
      expect(new Set(positions).size).toBe(10);
    });

    it('without preserveOrder the order is shuffled (not document order)', () => {
      const bank = makeBank(60);
      // Over 5 draws of a 60-question bank, an exact document-order result every
      // time would mean sampling isn't shuffling at all.
      const anyShuffled = Array.from({ length: 5 }, () =>
        sampleQuestionsFromBank(bank, 60).map(p => p.question)
      ).some(order => order.join('|') !== Array.from({ length: 60 }, (_, i) => `Q${i + 1}`).join('|'));
      expect(anyShuffled).toBe(true);
    });

    it('caps at poolSize when more questions are requested than exist', () => {
      const picked = sampleQuestionsFromBank(makeBank(12), 100, { preserveOrder: true });
      expect(picked).toHaveLength(12);
    });

    it('returns an empty array for an empty bank', () => {
      const { bank } = saveQuestionBank({
        documentHash: 'empty',
        questions: [],
        caseType: 'B',
        modelUsed: 'm',
      });
      expect(sampleQuestionsFromBank(bank, 10)).toEqual([]);
    });
  });
});
