import { OriginalQuestion, OptionMapping, Question } from '../types';
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

/**
 * Create option mapping for a question (shuffle tracking without modifying original)
 */
export const createOptionMapping = (
  questionId: number,
  originalOptions: string[]
): OptionMapping => {
  const shuffledOptions = shuffleInPlace(originalOptions);

  // Create index mapping: displayIndex -> originalIndex
  const indexMap: Record<number, number> = {};
  shuffledOptions.forEach((option, displayIdx) => {
    const originalIdx = originalOptions.indexOf(option);
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
  mapping: OptionMapping
): boolean => {
  const originalCorrectAnswer = originalQuestion.correctAnswer;

  // The correct answer is always the same string - option shuffling doesn't change it
  // We just need to verify the user selected the right option text
  return userSelectedOption === originalCorrectAnswer;
};

/**
 * Get all display questions for an exam with fresh shuffles
 * This generates new shuffles each time - for same questions, use stored mappings instead
 */
export const getDisplayQuestions = (
  originalQuestions: OriginalQuestion[]
): { questions: Question[]; mappings: OptionMapping[] } => {
  const mappings: OptionMapping[] = [];
  const questions: Question[] = [];

  originalQuestions.forEach(original => {
    const mapping = createOptionMapping(original.id, original.options);
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
        `No mapping found for question ${original.id}`,
        'optionShuffler.applyStoredMappings'
      );
      // Fallback: return original with shuffled options
      const newMapping = createOptionMapping(original.id, original.options);
      return getDisplayQuestion(original, newMapping);
    }
    return getDisplayQuestion(original, mapping);
  });
};
