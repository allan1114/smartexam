import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { Question, ExamResult } from '../../types';
import { refineMasteryInsight } from '../../services/geminiService';

interface QuestionReviewSectionProps {
  questions: Question[];
  result: ExamResult;
}

const QuestionReviewSection: React.FC<QuestionReviewSectionProps> = ({ questions, result }) => {
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());
  const [refinedInsights, setRefinedInsights] = useState<Record<number, string>>({});
  const [loadingRefine, setLoadingRefine] = useState<Set<number>>(new Set());

  const isCorrectAnswer = (selected: string | undefined, correct: string) => {
    if (!selected) return false;
    return selected.trim().toLowerCase() === correct.trim().toLowerCase();
  };

  const toggleExplanation = (id: number) => {
    setExpandedExplanations(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeepDive = async (q: Question) => {
    if (refinedInsights[q.id]) return;
    setLoadingRefine(prev => new Set(prev).add(q.id));
    try {
      const insight = await refineMasteryInsight(q.question, q.options, q.correctAnswer, result.model);
      setRefinedInsights(prev => ({ ...prev, [q.id]: insight }));
    } catch (err) {
      console.error('Failed to generate deep dive insight:', err);
    } finally {
      setLoadingRefine(prev => {
        const next = new Set(prev);
        next.delete(q.id);
        return next;
      });
    }
  };

  return (
    <div className="pt-8">
      <h3 className="text-3xl font-black mb-8 px-4 text-slate-900 dark:text-white">Review Questions</h3>
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const userAns = result.answers.find(a => a.questionId === q.id);
          const isCorrect = userAns?.isCorrect;
          const isExpanded = expandedExplanations.has(q.id);
          const isRefining = loadingRefine.has(q.id);

          return (
            <div
              key={idx}
              className={`bg-white dark:bg-slate-800 rounded-[2rem] border-2 overflow-hidden transition-colors ${
                isCorrect ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-red-100 dark:border-red-900/30'
              }`}
            >
              <div
                className="p-8 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleExplanation(q.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{q.topic || 'General'}</p>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">{idx + 1}. {q.question}</h4>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap ml-4 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                    {isCorrect ? 'CORRECT' : 'INCORRECT'}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in">
                  <div className="grid gap-3">
                    {q.options.map((opt, oIdx) => {
                      const isCorrectChoice = isCorrectAnswer(opt, q.correctAnswer);
                      const isUserChoice = opt === userAns?.selectedOption;
                      return (
                        <div
                          key={oIdx}
                          className={`p-4 rounded-xl border-2 flex items-center transition-colors ${
                            isCorrectChoice
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold'
                              : isUserChoice
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
                              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="w-8 font-black">{String.fromCharCode(65 + oIdx)})</span>
                          <span>{opt}</span>
                          {isCorrectChoice && <span className="ml-auto text-[10px] font-black">CORRECT</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.sourceQuote && (
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                      <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 mb-2 tracking-widest flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                        </svg>
                        Document Evidence
                      </p>
                      <p className="text-sm font-medium italic text-slate-700 dark:text-slate-300">&quot;{q.sourceQuote}&quot;</p>
                    </div>
                  )}

                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-2 tracking-widest">Base Explanation</p>
                    <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">{q.explanation}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeepDive(q);
                    }}
                    disabled={isRefining || !!refinedInsights[q.id]}
                    className="w-full py-4 bg-indigo-600 dark:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all disabled:opacity-50"
                  >
                    {isRefining ? 'AI Reasoning...' : refinedInsights[q.id] ? 'Insight Ready' : 'Generate AI Mastery Deep-Dive'}
                  </button>

                  {refinedInsights[q.id] && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 animate-slide-up text-sm text-slate-700 dark:text-slate-300">
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(refinedInsights[q.id].replace(/\n/g, '<br/>')) }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionReviewSection;
