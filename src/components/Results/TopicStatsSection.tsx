import React, { useMemo } from 'react';
import { Question, ExamResult } from '../../types';

interface TopicStatsSectionProps {
  questions: Question[];
  result: ExamResult;
}

const TopicStatsSection: React.FC<TopicStatsSectionProps> = ({ questions, result }) => {
  const topicStats = useMemo(() => {
    const stats: Record<string, { total: number; correct: number }> = {};
    questions.forEach(q => {
      const topic = q.topic || 'General Knowledge';
      if (!stats[topic]) stats[topic] = { total: 0, correct: 0 };
      stats[topic].total += 1;
      const userAns = result.answers.find(a => a.questionId === q.id);
      if (userAns && userAns.isCorrect) stats[topic].correct += 1;
    });
    return Object.entries(stats)
      .map(([topic, data]) => ({ topic, ...data, percentage: Math.round((data.correct / data.total) * 100) }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [questions, result.answers]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
      <h3 className="text-xl font-black mb-6 text-slate-900 dark:text-white">Topic Accuracy</h3>
      <div className="space-y-6">
        {topicStats.map((stat, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-end mb-2 text-sm font-bold">
              <span className="text-slate-900 dark:text-white">{stat.topic}</span>
              <span className="text-indigo-600">{stat.percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${stat.percentage}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicStatsSection;
