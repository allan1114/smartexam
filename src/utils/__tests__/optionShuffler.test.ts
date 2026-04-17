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

    it('should shuffle options (very likely to be different)', () => {
      const mapping1 = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const mapping2 = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      // Very unlikely to be identical
      const mapsAreIdentical = JSON.stringify(mapping1.indexMap) === JSON.stringify(mapping2.indexMap);
      expect(mapsAreIdentical).toBeFalsy();
    });
  });

  describe('getDisplayQuestion', () => {
    it('should return question without _locked property', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const displayQ = getDisplayQuestion(mockOriginalQuestion, mapping);
      expect((displayQ as any)._locked).toBeUndefined();
    });

    it('should have shuffled options', () => {
      const mapping = createOptionMapping(mockOriginalQuestion.id, mockOriginalQuestion.options);
      const displayQ = getDisplayQuestion(mockOriginalQuestion, mapping);

      // All original options should be present
      const originalSet = new Set(mockOriginalQuestion.options);
      const displaySet = new Set(displayQ.options);
      expect(originalSet).toEqual(displaySet);

      // Very likely to be in different order
      expect(displayQ.options).not.toEqual(mockOriginalQuestion.options);
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

    it('should create unique shuffles for each call', () => {
      const { mappings: mappings1 } = getDisplayQuestions([mockOriginalQuestion]);
      const { mappings: mappings2 } = getDisplayQuestions([mockOriginalQuestion]);

      // Very unlikely to have identical shuffles
      expect(JSON.stringify(mappings1)).not.toBe(JSON.stringify(mappings2));
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
});
