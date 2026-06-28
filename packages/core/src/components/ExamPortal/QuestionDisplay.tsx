import React from 'react';
import { Question, ExamConfig, UserAnswer } from '../../types';
import {
  getQuestionType,
  getCorrectAnswers,
  getSelectCount,
  isAnswerCorrect,
} from '../../utils/answerModel';

interface QuestionDisplayProps {
  question: Question;
  config: ExamConfig;
  answer: UserAnswer | undefined;
  onChangeAnswer: (update: Partial<UserAnswer>) => void;
  isAnswered: boolean;
  showInstantFeedback: boolean;
}

const sameStr = (a: string | undefined, b: string | undefined) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase() && (a ?? '').trim() !== '';

/** Detect a GitHub-Markdown table so table-bearing question text stays readable. */
const looksLikeTable = (text: string): boolean =>
  /\n\s*\|.*\|/.test(text) && /\n\s*\|?[\s:-]*-{3,}[\s:|-]*/.test(text);

const QuestionText: React.FC<{ text: string }> = ({ text }) => {
  if (looksLikeTable(text)) {
    return (
      <div className="mb-8">
        <pre className="text-sm font-mono whitespace-pre overflow-x-auto bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed">
          {text}
        </pre>
      </div>
    );
  }
  return (
    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8 leading-relaxed whitespace-pre-line">
      {text}
    </h2>
  );
};

const selectClass =
  'rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed';

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  config,
  answer,
  onChangeAnswer,
  isAnswered,
  showInstantFeedback,
}) => {
  const isMock = config.mode === 'MOCK';
  const locked = !isMock && isAnswered;
  const type = getQuestionType(question);
  const correctSet = getCorrectAnswers(question);
  const isCorrectOverall = isAnswerCorrect(question, answer);

  // ---- Single / Multiple shared option button renderer ----
  const renderOptionButtons = () => {
    const selected = type === 'multiple'
      ? answer?.selectedOptions ?? []
      : answer?.selectedOption
        ? [answer.selectedOption]
        : [];

    const toggle = (option: string) => {
      if (locked) return;
      if (type === 'multiple') {
        const set = answer?.selectedOptions ?? [];
        const next = set.includes(option) ? set.filter(o => o !== option) : [...set, option];
        onChangeAnswer({ selectedOptions: next });
      } else {
        onChangeAnswer({ selectedOption: option });
      }
    };

    return (
      <div className="space-y-3">
        {question.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selected.includes(option);
          const isCorrectOption = correctSet.some(c => sameStr(c, option));

          let bg = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600';
          let text = 'text-slate-900 dark:text-white';
          let border = 'border-slate-200 dark:border-slate-600';

          if (showInstantFeedback && isAnswered && isCorrectOption) {
            // Always reveal correct options once answered (practice/study).
            bg = 'bg-emerald-100 dark:bg-emerald-900/20';
            border = 'border-emerald-500';
            text = 'text-emerald-900 dark:text-emerald-200';
          } else if (isSelected) {
            if (isMock || !isAnswered) {
              bg = 'bg-indigo-100 dark:bg-indigo-900/20';
              border = 'border-indigo-500';
            } else {
              // Answered + selected but not correct ⇒ a wrong pick.
              bg = 'bg-red-100 dark:bg-red-900/20';
              border = 'border-red-500';
              text = 'text-red-900 dark:text-red-200';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => toggle(option)}
              disabled={locked}
              aria-pressed={isSelected}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-bold ${bg} ${border} ${text} ${
                locked ? 'cursor-not-allowed' : 'hover:border-indigo-500 cursor-pointer'
              }`}
            >
              <span className="inline-block mr-4 font-black">
                {type === 'multiple' ? (isSelected ? '☑' : '☐') : `${letter}.`}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    );
  };

  // ---- Dropdown (hotspot) ----
  const renderDropdown = () => {
    const blanks = question.blanks ?? [];
    const picks = answer?.blankAnswers ?? [];
    const onPick = (i: number, value: string) => {
      if (locked) return;
      const next = [...picks];
      next[i] = value;
      onChangeAnswer({ blankAnswers: next });
    };
    return (
      <div className="space-y-4">
        {blanks.map((blank, i) => {
          const picked = picks[i] ?? '';
          const correct = showInstantFeedback && isAnswered && sameStr(picked, blank.correctAnswer);
          const wrong = showInstantFeedback && isAnswered && picked !== '' && !sameStr(picked, blank.correctAnswer);
          return (
            <div key={i} className="flex flex-wrap items-center gap-3">
              {blank.label && <span className="font-bold text-slate-700 dark:text-slate-300">{blank.label}</span>}
              <select
                value={picked}
                disabled={locked}
                onChange={e => onPick(i, e.target.value)}
                className={`${selectClass} ${correct ? 'border-emerald-500' : wrong ? 'border-red-500' : ''}`}
              >
                <option value="">請選擇… / Select…</option>
                {blank.options.map((opt, oi) => (
                  <option key={oi} value={opt}>{opt}</option>
                ))}
              </select>
              {showInstantFeedback && isAnswered && !sameStr(picked, blank.correctAnswer) && (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ {blank.correctAnswer}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Matching (drag-drop) via select-based pairing ----
  const renderMatching = () => {
    const pairs = question.pairs ?? [];
    const matches = answer?.matchAnswers ?? {};
    const onMatch = (prompt: string, value: string) => {
      if (locked) return;
      onChangeAnswer({ matchAnswers: { ...matches, [prompt]: value } });
    };
    return (
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">配對 / Match each item</p>
        {pairs.map((pair, i) => {
          const picked = matches[pair.prompt] ?? '';
          const correct = showInstantFeedback && isAnswered && sameStr(picked, pair.answer);
          const wrong = showInstantFeedback && isAnswered && picked !== '' && !sameStr(picked, pair.answer);
          return (
            <div
              key={i}
              className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50"
            >
              <span className="flex-1 min-w-[40%] font-bold text-slate-900 dark:text-white">{pair.prompt}</span>
              <span className="text-slate-400 font-black">→</span>
              <select
                value={picked}
                disabled={locked}
                onChange={e => onMatch(pair.prompt, e.target.value)}
                className={`${selectClass} flex-1 min-w-[40%] ${correct ? 'border-emerald-500' : wrong ? 'border-red-500' : ''}`}
              >
                <option value="">請選擇… / Select…</option>
                {question.options.map((opt, oi) => (
                  <option key={oi} value={opt}>{opt}</option>
                ))}
              </select>
              {wrong && (
                <span className="w-full text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ {pair.answer}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-10 mb-8">
      <QuestionText text={question.question} />

      {type === 'multiple' && (
        <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-4">
          選擇 {getSelectCount(question)} 項 / Choose {getSelectCount(question)}
        </p>
      )}

      {(type === 'single' || type === 'multiple') && renderOptionButtons()}
      {type === 'dropdown' && renderDropdown()}
      {type === 'matching' && renderMatching()}

      {showInstantFeedback && isAnswered && (type === 'matching' || type === 'dropdown') && (
        <p className={`mt-5 text-sm font-black uppercase tracking-widest ${isCorrectOverall ? 'text-emerald-600' : 'text-red-600'}`}>
          {isCorrectOverall ? '✓ 全部正確 / All correct' : '✗ 未全對 / Not all correct'}
        </p>
      )}
    </div>
  );
};

export default QuestionDisplay;
