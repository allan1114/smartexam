import { describe, it, expect } from 'vitest';
import {
  createOptionMapping,
  getDisplayQuestion,
  mapSelectedOptionToOriginal,
  validateAnswer,
  getDisplayQuestions,
  applyStoredMappings
} from '../optionShuffler';
import { OriginalQuestion, OptionMapping } from '../../types';

const mockOriginalQuestion: OriginalQuestion = {
  id: 1,
  question: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctAnswer: '4',
  explanation: 'Simple addition',
  sourceQuote: 'Basic math',
  topic: 'Mathematics',
  _locked: true
};

describe('optionShuffler', () => {
  describe('createOptionMapping', () => {
    it('should create mapping with all options present', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      expect(mapping.questionId).toBe(1);
      expect(Object.keys(mapping.indexMap)).toHaveLength(4);
    });

    it('should create valid index mappings', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const indices = Object.values(mapping.indexMap);
      expect(new Set(indices).size).toBe(4); // All indices should be unique
      expect(indices.sort()).toEqual([0, 1, 2, 3]); // Should have all valid indices
    });

    it('should create a valid permutation when shuffling', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const indices = Object.values(mapping.indexMap).sort((a, b) => a - b);
      // Should contain exactly [0, 1, 2, 3] - a valid permutation
      expect(indices).toEqual([0, 1, 2, 3]);
    });

    it('should create identity mapping when shuffleOptions is false (sequential mode)', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options, false);
      // Identity mapping: display index i maps to original index i
      expect(mapping.indexMap[0]).toBe(0);
      expect(mapping.indexMap[1]).toBe(1);
      expect(mapping.indexMap[2]).toBe(2);
      expect(mapping.indexMap[3]).toBe(3);
    });

    it('should produce the same identity mapping on every call in sequential mode', () => {
      const mapping1 = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options, false);
      const mapping2 = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options, false);
      expect(JSON.stringify(mapping1.indexMap)).toBe(JSON.stringify(mapping2.indexMap));
    });
  });

  describe('getDisplayQuestion', () => {
    it('should return question without _locked property', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const displayQ = getDisplayQuestion(mockOriginalQuestion, mapping);
      expect((displayQ as any)._locked).toBeUndefined();
    });

    it('should contain all original options in display question', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const displayQ = getDisplayQuestion(mockOriginalQuestion, mapping);

      // All original options should be present (order may vary)
      const originalSet = new Set(mockOriginalQuestion.options);
      const displaySet = new Set(displayQ.options);
      expect(originalSet).toEqual(displaySet);
    });

    it('should keep options in original order in sequential mode (shuffleOptions=false)', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options, false);
      const displayQ = getDisplayQuestion(mockOriginalQuestion, mapping);
      expect(displayQ.options).toEqual(mockOriginalQuestion.options);
    });

    it('should preserve question text, answer, and explanation', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const displayQ = getDisplayQuestion(mockOriginalQuestion, mapping);

      expect(displayQ.question).toBe(mockOriginalQuestion.question);
      expect(displayQ.correctAnswer).toBe(mockOriginalQuestion.correctAnswer);
      expect(displayQ.explanation).toBe(mockOriginalQuestion.explanation);
      expect(displayQ.sourceQuote).toBe(mockOriginalQuestion.sourceQuote);
      expect(displayQ.topic).toBe(mockOriginalQuestion.topic);
    });
  });

  describe('mapSelectedOptionToOriginal', () => {
    it('should find option in display order', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const displayQ = getDisplayQuestion(mockOriginalQuestion, mapping);

      // Test each option
      for (const option of displayQ.options) {
        const result = mapSelectedOptionToOriginal(option, mapping, mockOriginalQuestion.options);
        expect(result).toBe(option);
      }
    });

    it('should return null for non-existent option', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const result = mapSelectedOptionToOriginal('Non-existent', mapping, mockOriginalQuestion.options);
      expect(result).toBeNull();
    });
  });

  describe('validateAnswer', () => {
    it('should validate correct answer regardless of option order', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const isValid = validateAnswer('4', mockOriginalQuestion, mapping);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect answers', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const isValid = validateAnswer('5', mockOriginalQuestion, mapping);
      expect(isValid).toBe(false);
    });

    it('should work with different option order', () => {
      // Create multiple mappings (different shuffles) and verify answer validation works
      for (let i = 0; i < 5; i++) {
        const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
        expect(validateAnswer('4', mockOriginalQuestion, mapping)).toBe(true);
        expect(validateAnswer('3', mockOriginalQuestion, mapping)).toBe(false);
      }
    });
  });

  describe('getDisplayQuestions', () => {
    it('should process multiple questions', () => {
      const questions = [mockOriginalQuestion, {
        ...mockOriginalQuestion,
        id: 2,
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 'Paris'
      }] as OriginalQuestion[];

      const { questions: displayQs, mappings } = getDisplayQuestions(questions);

      expect(displayQs).toHaveLength(2);
      expect(mappings).toHaveLength(2);
      expect(displayQs[0].id).toBe(1);
      expect(displayQs[1].id).toBe(2);
    });

    it('should produce identical order in sequential mode (shuffleOptions=false)', () => {
      const { questions: q1, mappings: m1 } = getDisplayQuestions([mockOriginalQuestion], false);
      const { questions: q2, mappings: m2 } = getDisplayQuestions([mockOriginalQuestion], false);
      // Sequential mode must always produce the same order
      expect(q1[0].options).toEqual(q2[0].options);
      expect(q1[0].options).toEqual(mockOriginalQuestion.options);
      expect(JSON.stringify(m1)).toBe(JSON.stringify(m2));
    });

    it('should allow option shuffling in random mode (shuffleOptions=true)', () => {
      const { questions } = getDisplayQuestions([mockOriginalQuestion], true);
      // All options must still be present even when shuffled
      const displaySet = new Set(questions[0].options);
      const originalSet = new Set(mockOriginalQuestion.options);
      expect(displaySet).toEqual(originalSet);
    });
  });

  describe('applyStoredMappings', () => {
    it('should apply saved mappings to original questions', () => {
      // Create and store a mapping
      const originalMapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);

      // Apply stored mapping
      const displayQs = applyStoredMappings([mockOriginalQuestion], [originalMapping]);

      expect(displayQs).toHaveLength(1);
      expect(displayQs[0].options.length).toBe(4);
      expect(new Set(displayQs[0].options)).toEqual(new Set(mockOriginalQuestion.options));
    });

    it('should handle missing mappings by creating new shuffles', () => {
      const storedMappings: OptionMapping[] = []; // No mappings for this question
      const displayQs = applyStoredMappings([mockOriginalQuestion], storedMappings);

      expect(displayQs).toHaveLength(1);
      expect(displayQs[0].options.length).toBe(4);
    });
  });

  describe('original data preservation', () => {
    it('should never modify original question in any operation', () => {
      const originalQuestionCopy = JSON.stringify(mockOriginalQuestion);

      // Perform multiple operations
      createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      getDisplayQuestion(mockOriginalQuestion, mapping);
      mapSelectedOptionToOriginal('4', mapping, mockOriginalQuestion.options);
      validateAnswer('4', mockOriginalQuestion, mapping);
      getDisplayQuestions([mockOriginalQuestion]);
      applyStoredMappings([mockOriginalQuestion], [mapping]);

      // Original should be unchanged
      expect(JSON.stringify(mockOriginalQuestion)).toBe(originalQuestionCopy);
    });
  });

  describe('duplicate option text', () => {
    // Real exam papers repeat option strings ("0", "None of the above", …).
    // Resolving shuffled values with `originalOptions.indexOf(option)` mapped
    // both display slots to the same original index, so one option was rendered
    // twice and another disappeared from the paper entirely.
    const withDuplicates: OriginalQuestion = {
      ...mockOriginalQuestion,
      options: ['0', '5', '0', '7'],
      correctAnswer: '5',
    };

    it('maps every display slot to a distinct original index', () => {
      for (let i = 0; i < 50; i++) {
        const mapping = createOptionMapping(withDuplicates.id, withDuplicates.options);
        const targets = Object.values(mapping.indexMap);
        expect(targets).toHaveLength(4);
        expect(new Set(targets).size).toBe(4);
        expect([...targets].sort()).toEqual([0, 1, 2, 3]);
      }
    });

    it('preserves the full multiset of options after shuffling', () => {
      for (let i = 0; i < 50; i++) {
        const mapping = createOptionMapping(withDuplicates.id, withDuplicates.options);
        const display = getDisplayQuestion(withDuplicates, mapping);
        expect([...display.options].sort()).toEqual([...withDuplicates.options].sort());
      }
    });
  });
});
