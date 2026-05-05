import React from 'react';
import { Question, ExamConfig } from '../../types';

interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
  userAnswers: Record<number, string>;
  config: ExamConfig;
  flaggedIds?: Set<number>;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  onSelectQuestion,
  userAnswers,
  config,
  flaggedIds,
}) => {
  const isMock = config.mode === 'MOCK';

  return (
    <div className="flex flex-wrap gap-1.5 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
      {questions.map((q, idx) => {
        const ans = userAnswers[q.id];
        const isCorrect = !isMock && ans && ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        const isWrong = !isMock && ans && ans.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase();
        const isAnswered = !!ans;
        const isCurrent = idx === currentIndex;
        const isFlagged = !!flaggedIds?.has(q.id);

        return (
          <button
            key={q.id}
            onClick={() => onSelectQuestion(idx)}
            title={isFlagged ? 'Flagged for review' : undefined}
            className={`relative w-8 h-8 rounded-lg text-xs font-black transition-all ${
              isCurrent
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                : isCorrect
                ? 'bg-emerald-500 text-white'
                : isWrong
                ? 'bg-red-500 text-white'
                : isAnswered
                ? 'bg-blue-400 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {idx + 1}
            {isFlagged && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-800"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default QuestionNavigator;
