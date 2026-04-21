import React from 'react';
import { Question, ExamConfig } from '../../types';

interface QuestionDisplayProps {
  question: Question;
  config: ExamConfig;
  selectedOption: string | undefined;
  onSelectOption: (option: string) => void;
  isAnswered: boolean;
  showInstantFeedback: boolean;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  config,
  selectedOption,
  onSelectOption,
  isAnswered,
  showInstantFeedback,
}) => {
  const isMock = config.mode === 'MOCK';
  const isCorrect = selectedOption?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-10 mb-8">
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 leading-relaxed">
        {question.question}
      </h2>

      <div className="space-y-3">
        {question.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const selected = selectedOption === option;
          const isCorrectOption = option === question.correctAnswer;

          let backgroundColor = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600';
          let textColor = 'text-slate-900 dark:text-white';
          let borderColor = 'border-slate-200 dark:border-slate-600';

          if (selected) {
            if (isMock || !isAnswered) {
              backgroundColor = 'bg-indigo-100 dark:bg-indigo-900/20';
              borderColor = 'border-indigo-500';
            } else if (showInstantFeedback && isCorrect) {
              backgroundColor = 'bg-emerald-100 dark:bg-emerald-900/20';
              borderColor = 'border-emerald-500';
              textColor = 'text-emerald-900 dark:text-emerald-200';
            } else if (showInstantFeedback && !isCorrect) {
              backgroundColor = 'bg-red-100 dark:bg-red-900/20';
              borderColor = 'border-red-500';
              textColor = 'text-red-900 dark:text-red-200';
            }
          } else if (showInstantFeedback && isAnswered && isCorrectOption) {
            backgroundColor = 'bg-emerald-100 dark:bg-emerald-900/20';
            borderColor = 'border-emerald-500';
            textColor = 'text-emerald-900 dark:text-emerald-200';
          }

          return (
            <button
              key={idx}
              onClick={() => onSelectOption(option)}
              disabled={!isMock && isAnswered}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-bold ${backgroundColor} ${borderColor} ${textColor} ${
                !isMock && isAnswered ? 'cursor-not-allowed' : 'hover:border-indigo-500 cursor-pointer'
              }`}
            >
              <span className="inline-block mr-4 font-black">{letter}.</span>
              {option}
            </button>
          );
        })}
      </div>

    </div>
  );
};

export default QuestionDisplay;
