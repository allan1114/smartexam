import React, { useState } from 'react';
import { ExamResult } from '../../types';

interface ExamHistoryListProps {
  history: ExamResult[];
  onViewResult: (result: ExamResult) => void;
  onDeleteHistory: (id: string) => void;
  onRenameHistory: (id: string, newName: string) => void;
}

const ExamHistoryList: React.FC<ExamHistoryListProps> = ({
  history,
  onViewResult,
  onDeleteHistory,
  onRenameHistory,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (result: ExamResult) => {
    setEditingId(result.id);
    setEditName(result.customName || result.mode.replace('_', ' '));
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onRenameHistory(id, editName);
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {history.map((result) => (
        <div
          key={result.id}
          className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm group"
        >
          <div className="flex items-center space-x-6 flex-1">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${
                result.score / result.totalQuestions >= 0.75
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {Math.round((result.score / result.totalQuestions) * 100)}%
            </div>
            <div className="flex-1">
              {editingId === result.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-indigo-500 font-black text-slate-900 dark:text-white dark:bg-slate-900 outline-none"
                  autoFocus
                />
              ) : (
                <h4
                  onClick={() => handleStartEdit(result)}
                  className="font-black text-slate-900 dark:text-white uppercase tracking-tight cursor-pointer hover:text-indigo-600"
                >
                  {result.customName || result.mode.replace('_', ' ')}
                </h4>
              )}
              <p className="text-slate-500 text-sm font-bold">
                {new Date(result.endTime).toLocaleDateString()} • {result.score}/{result.totalQuestions} Correct
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {editingId === result.id ? (
              <>
                <button
                  onClick={() => handleSaveEdit(result.id)}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-black rounded-lg hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 bg-slate-600 text-white text-xs font-black rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onViewResult(result)}
                  className="px-6 py-3 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  REVIEW
                </button>
                <button
                  onClick={() => onDeleteHistory(result.id)}
                  className="px-3 py-3 bg-red-500/10 text-red-600 text-xs font-black rounded-lg hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamHistoryList;
