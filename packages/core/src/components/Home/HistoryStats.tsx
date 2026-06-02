import React, { useMemo, useRef } from 'react';
import { ExamResult } from '../../types';

interface HistoryStatsProps {
  history: ExamResult[];
  onClearAll: () => void;
  onImport?: (data: ExamResult[]) => void;
}

interface Stats {
  totalExams: number;
  avgScore: number;
  passRate: number;
}

const HistoryStats: React.FC<HistoryStatsProps> = ({ history, onClearAll, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartexam-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      /* best-effort backup */
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) onImport(parsed as ExamResult[]);
      } catch {
        /* ignore malformed backup file */
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // allow re-importing the same file
  };

  const statCards = [
    { label: 'Total Exams', val: stats.totalExams, color: 'indigo' },
    { label: 'Avg Accuracy', val: `${stats.avgScore}%`, color: 'emerald' },
    { label: 'Pass Rate', val: `${stats.passRate}%`, color: 'amber' }
  ];

  return (
    <div className="animate-slide-up">
      <div className="flex justify-between items-center mb-8 px-4">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Recent Progress</h2>
        <div className="flex items-center gap-4">
          <button onClick={handleExport} className="text-xs font-bold text-indigo-500 hover:underline" title="匯出全部考試記錄為 JSON 備份">匯出備份 · Export</button>
          {onImport && (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-indigo-500 hover:underline" title="從 JSON 備份匯入考試記錄">匯入 · Import</button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
            </>
          )}
          <button onClick={onClearAll} className="text-xs font-bold text-red-500 hover:underline">Clear All</button>
        </div>
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
