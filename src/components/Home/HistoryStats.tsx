import React, { useMemo } from 'react';
import { ExamResult } from '../../types';

interface HistoryStatsProps {
  history: ExamResult[];
  onClearAll: () => void;
}

interface Stats {
  totalExams: number;
  avgScore: number;
  passRate: number;
}

const HistoryStats: React.FC<HistoryStatsProps> = ({ history, onClearAll }) => {
  const stats = useMemo((): Stats | null => {
    const validHistory = history.filter(h => h && h.totalQuestions > 0);
    if (validHistory.length === 0) return null;

    const totalExams = validHistory.length;
    const avgScore = validHistory.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / totalExams;
    const passRate = validHistory.filter(h => (h.score / h.totalQuestions) >= 0.75).length / totalExams;

    return {
      totalExams,
      avgScore: Math.round(avgScore * 100),
      passRate: Math.round(passRate * 100),
    };
  }, [history]);

  if (!stats) return null;

  const statCards = [
    { label: 'Total Exams', val: stats.totalExams, color: 'indigo' },
    { label: 'Avg Accuracy', val: `${stats.avgScore}%`, color: 'emerald' },
    { label: 'Pass Rate', val: `${stats.passRate}%`, color: 'amber' }
  ];

  return (
    <div className="animate-slide-up">
      <div className="flex justify-between items-center mb-8 px-4">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Recent Progress</h2>
        <button onClick={onClearAll} className="text-xs font-bold text-red-500 hover:underline">Clear All</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {statCards.map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</span>
            <span className="text-3xl font-black text-slate-900 dark:text-white">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryStats;
