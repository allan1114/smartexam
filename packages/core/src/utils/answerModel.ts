import { Question, QuestionType, UserAnswer } from '../types';

/**
 * Single source of truth for "what type is this question and is a response
 * correct". Every UI/scoring call site delegates here instead of re-implementing
 * string comparisons, which keeps the four question types
 * ('single' | 'multiple' | 'matching' | 'dropdown') consistent and keeps legacy
 * single-answer data working (a question without `type` is treated as 'single').
 */

/** Normalise a string for tolerant comparison (trim + lowercase). */
const norm = (s: string | undefined): string => (s ?? '').trim().toLowerCase();

/** Non-empty case/space-insensitive string equality. */
const sameStr = (a: string | undefined, b: string | undefined): boolean =>
  norm(a) !== '' && norm(a) === norm(b);

export const getQuestionType = (q: Question): QuestionType => q.type ?? 'single';

export const isSingle = (q: Question): boolean => getQuestionType(q) === 'single';
export const isMultiple = (q: Question): boolean => getQuestionType(q) === 'multiple';
export const isMatching = (q: Question): boolean => getQuestionType(q) === 'matching';
export const isDropdown = (q: Question): boolean => getQuestionType(q) === 'dropdown';

/** How many options a 'multiple' question expects (falls back to 1). */
export const getSelectCount = (q: Question): number =>
  getCorrectAnswers(q).length || 1;

/**
 * Canonical list of correct answer strings. Used for display ("Correct answer")
 * and for marking options in review/report. For matching/dropdown this is a
 * human-readable rendering of each pair/blank.
 */
export const getCorrectAnswers = (q: Question): string[] => {
  switch (getQuestionType(q)) {
    case 'multiple':
      return q.correctAnswers && q.correctAnswers.length > 0
        ? q.correctAnswers
        : [q.correctAnswer];
    case 'matching':
      return (q.pairs ?? []).map(p => `${p.prompt} → ${p.answer}`);
    case 'dropdown':
      return (q.blanks ?? []).map(
        (b, i) => `${b.label ?? `#${i + 1}`}: ${b.correctAnswer}`,
      );
    default:
      return [q.correctAnswer];
  }
};

/**
 * Whether the user has supplied enough of an answer to count as "answered"
 * (used for progress/navigation and to gate instant feedback). For multi-part
 * types this requires every part to be filled.
 */
export const isResponseComplete = (q: Question, a: UserAnswer | undefined): boolean => {
  if (!a) return false;
  switch (getQuestionType(q)) {
    case 'single':
      return norm(a.selectedOption) !== '';
    case 'multiple':
      // Treat as answered only once the expected number of options is selected,
      // so practice-mode instant feedback doesn't fire mid-selection.
      return (a.selectedOptions?.length ?? 0) >= getSelectCount(q);
    case 'matching': {
      const pairs = q.pairs ?? [];
      return pairs.length > 0 && pairs.every(p => norm(a.matchAnswers?.[p.prompt]) !== '');
    }
    case 'dropdown': {
      const blanks = q.blanks ?? [];
      return (
        blanks.length > 0 &&
        blanks.every((_, i) => norm(a.blankAnswers?.[i]) !== '')
      );
    }
  }
};

/**
 * THE scoring function. All-or-nothing for every multi-part type: the response
 * must match the full correct set exactly (no missing and no extra answers).
 */
export const isAnswerCorrect = (q: Question, a: UserAnswer | undefined): boolean => {
  if (!a) return false;
  switch (getQuestionType(q)) {
    case 'single':
      return sameStr(a.selectedOption, q.correctAnswer);
    case 'multiple': {
      const want = getCorrectAnswers(q).map(norm).sort();
      const got = (a.selectedOptions ?? []).map(norm).sort();
      return (
        want.length > 0 &&
        want.length === got.length &&
        want.every((w, i) => w === got[i])
      );
    }
    case 'matching': {
      const pairs = q.pairs ?? [];
      return pairs.length > 0 && pairs.every(p => sameStr(a.matchAnswers?.[p.prompt], p.answer));
    }
    case 'dropdown': {
      const blanks = q.blanks ?? [];
      return (
        blanks.length > 0 &&
        blanks.every((b, i) => sameStr(a.blankAnswers?.[i], b.correctAnswer))
      );
    }
  }
};

/** Human-readable rendering of the correct answer(s) for display/report. */
export const formatCorrectAnswer = (q: Question): string =>
  getCorrectAnswers(q).join('; ');

/** Human-readable rendering of the user's response for display/report. */
export const formatUserResponse = (q: Question, a: UserAnswer | undefined): string => {
  if (!a) return '';
  switch (getQuestionType(q)) {
    case 'single':
      return a.selectedOption ?? '';
    case 'multiple':
      return (a.selectedOptions ?? []).join(', ');
    case 'matching':
      return (q.pairs ?? [])
        .map(p => `${p.prompt} → ${a.matchAnswers?.[p.prompt] ?? '—'}`)
        .join('; ');
    case 'dropdown':
      return (q.blanks ?? [])
        .map((b, i) => `${b.label ?? `#${i + 1}`}: ${a.blankAnswers?.[i] ?? '—'}`)
        .join('; ');
  }
};

/**
 * Build the answer-correctness summary for a question given a (possibly partial)
 * UserAnswer, filling in `isCorrect` and a stringified `selectedOption` summary.
 */
export const finalizeUserAnswer = (
  q: Question,
  partial: Omit<UserAnswer, 'isCorrect' | 'selectedOption'> & { selectedOption?: string },
): UserAnswer => {
  const answer: UserAnswer = {
    ...partial,
    selectedOption: partial.selectedOption ?? '',
    isCorrect: false,
  };
  answer.isCorrect = isAnswerCorrect(q, answer);
  // Keep selectedOption populated as a readable summary for legacy code/reports.
  if (!isSingle(q)) {
    answer.selectedOption = formatUserResponse(q, answer);
  }
  return answer;
};
