import { OriginalQuestion, OptionMapping, Question } from '../types';
import { getQuestionType } from './answerModel';
import { logger } from './logger';

/**
 * Shuffle array in-place Fisher-Yates algorithm
 */
const shuffleInPlace = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** Fisher-Yates over positions 0..n-1, so duplicate option TEXT can't collide. */
const shuffledIndices = (length: number): number[] =>
  shuffleInPlace(Array.from({ length }, (_, i) => i));

/**
 * Create an identity mapping (no shuffle) - options stay in original order
 */
const createIdentityMapping = (questionId: number, originalOptions: string[]): OptionMapping => {
  const indexMap: Record<number, number> = {};
  originalOptions.forEach((_, idx) => {
    indexMap[idx] = idx;
  });
  return { questionId, indexMap };
};

/**
 * Create option mapping for a question (shuffle tracking without modifying original)
 * @param shuffleOptions - if false, options remain in original order (identity mapping)
 */
export const createOptionMapping = (
  questionId: number,
  originalOptions: string[],
  shuffleOptions: boolean = true
): OptionMapping => {
  if (!shuffleOptions) {
    return createIdentityMapping(questionId, originalOptions);
  }

  // Shuffle POSITIONS, not values. Resolving each shuffled value back with
  // `originalOptions.indexOf(option)` broke any question with two identical
  // option strings (e.g. two options both "0"): both display slots resolved to
  // the same original index, so one option was shown twice and another vanished
  // from the paper entirely.
  const indexMap: Record<number, number> = {};
  shuffledIndices(originalOptions.length).forEach((originalIdx, displayIdx) => {
    indexMap[displayIdx] = originalIdx;
  });

  return {
    questionId,
    indexMap
  };
};

/**
 * Get display question with shuffled options
 * Preserves original, returns new object with shuffled options for display
 */
export const getDisplayQuestion = (
  original: OriginalQuestion,
  mapping: OptionMapping
): Question => {
  // Create new array with options in shuffled order
  const displayOptions = Object.keys(mapping.indexMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(displayIdx => original.options[mapping.indexMap[displayIdx]]);

  return {
    ...original,
    options: displayOptions,
    _locked: undefined // Remove lock from display version
  } as Question;
};

/**
 * Map user-selected option back to original index
 * Used for answer validation
 */
export const mapSelectedOptionToOriginal = (
  selectedOption: string,
  mapping: OptionMapping,
  originalOptions: string[]
): string | null => {
  // Find which display index this option is at
  const displayIndices = Object.keys(mapping.indexMap).map(Number);
  for (const displayIdx of displayIndices) {
    const originalIdx = mapping.indexMap[displayIdx];
    if (originalOptions[originalIdx] === selectedOption) {
      return selectedOption; // Return the actual option string
    }
  }
  return null;
};

/**
 * Validate if user answer matches correct answer considering option shuffling
 */
export const validateAnswer = (
  userSelectedOption: string,
  originalQuestion: OriginalQuestion,
  _mapping: OptionMapping
): boolean => {
  const originalCorrectAnswer = originalQuestion.correctAnswer;

  // The correct answer is always the same string - option shuffling doesn't change it
  // We just need to verify the user selected the right option text
  return userSelectedOption === originalCorrectAnswer;
};

/**
 * Get all display questions for an exam
 * @param shuffleOptions - if true (RANDOM mode), shuffle A/B/C/D order; if false (SEQUENTIAL mode), keep original order
 */
export const getDisplayQuestions = (
  originalQuestions: OriginalQuestion[],
  shuffleOptions: boolean = true
): { questions: Question[]; mappings: OptionMapping[] } => {
  const mappings: OptionMapping[] = [];
  const questions: Question[] = [];

  originalQuestions.forEach(original => {
    // Matching/dropdown answers are validated by text (see answerModel), and their
    // option pools may repeat strings — which would corrupt the index map. Keep
    // their option order as-is; only A/B/C/D-style questions get position shuffle.
    const isFlat = getQuestionType(original) === 'single' || getQuestionType(original) === 'multiple';
    const mapping = createOptionMapping(original.id, original.options, shuffleOptions && isFlat);
    mappings.push(mapping);
    questions.push(getDisplayQuestion(original, mapping));
  });

  return { questions, mappings };
};

/**
 * Apply stored option mappings to original questions
 * Used when resuming a saved exam session
 */
export const applyStoredMappings = (
  originalQuestions: OriginalQuestion[],
  storedMappings: OptionMapping[]
): Question[] => {
  return originalQuestions.map(original => {
    const mapping = storedMappings.find(m => m.questionId === original.id);
    if (!mapping) {
      logger.warn(
        `No mapping found for question ${original.id} — using identity mapping as safe fallback`,
        'optionShuffler.applyStoredMappings'
      );
      // Fallback: use identity mapping (no shuffle) so options stay in original order
      const safeMapping = createOptionMapping(original.id, original.options, false);
      return getDisplayQuestion(original, safeMapping);
    }
    return getDisplayQuestion(original, mapping);
  });
};
