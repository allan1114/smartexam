import React, { useMemo } from 'react';
import { ExamResult } from '../../types';

interface ResultHeaderProps {
  result: ExamResult;
  onRetake: () => void;
  onRestart: () => void;
  onRetakeWithFreshShuffles?: () => void; // Level 2
}

const ResultHeader: React.FC<ResultHeaderProps> = ({ result, onRetake, onRestart, onRetakeWithFreshShuffles }) => {
  const percentage = Math.round((result.score / result.totalQuestions) * 100);

  const status = useMemo(() => {
    if (percentage >= 85) return { label: 'Mastered!', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    if (percentage >= 75) return { label: 'Good Job!', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    return { label: 'Keep Practicing!', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' };
  }, [percentage]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
      <div className="md:flex">
        <div className={`md:w-1/3 p-12 flex flex-col items-center justify-center text-center ${status.bg} border-r border-slate-100 dark:border-slate-700`}>
          <span className={`text-xs font-black uppercase tracking-[0.2em] ${status.color} mb-4`}>{status.label}</span>
          <div className="text-7xl font-black text-slate-900 dark:text-white mb-2">{percentage}%</div>
          <p className="text-slate-600 dark:text-slate-300 font-bold text-lg">
            <span className="text-slate-900 dark:text-white font-black">{result.score}</span> / {result.totalQuestions} Correct
          </p>
        </div>

        <div className="md:w-2/3 p-12 bg-white dark:bg-slate-800 flex flex-col justify-between">
          <h3 className="text-3xl font-black mb-2 text-slate-900 dark:text-white tracking-tight">Analysis Complete</h3>
          <div className={`grid gap-4 mt-8 ${onRetakeWithFreshShuffles ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {onRetakeWithFreshShuffles && (
              <button onClick={onRetakeWithFreshShuffles} className="bg-blue-600 text-white p-5 rounded-2xl font-black hover:bg-blue-700 shadow-lg text-sm">
                RETAKE<br />(FRESH SHUFFLES)
              </button>
            )}
            <button onClick={onRetake} className="bg-indigo-600 text-white p-5 rounded-2xl font-black hover:bg-indigo-700 shadow-lg">RETAKE EXAM</button>
            <button onClick={onRestart} className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white p-5 rounded-2xl font-black">NEW SESSION</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultHeader;
