
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ExamResult, Question, PerformanceAnalysis } from '../types';
import { refineMasteryInsight, generatePerformanceAnalysis } from '../services/geminiService';

interface ResultsProps {
  result: ExamResult;
  questions: Question[];
  onRestart: () => void;
  onRetake: () => void;
}

const Results: React.FC<ResultsProps> = ({ result, questions, onRestart, onRetake }) => {
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());
  const [refinedInsights, setRefinedInsights] = useState<Record<number, string>>({});
  const [loadingRefine, setLoadingRefine] = useState<Set<number>>(new Set());
  const [performanceAnalysis, setPerformanceAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  
  const percentage = Math.round((result.score / result.totalQuestions) * 100);

  const isCorrectAnswer = (selected: string | undefined, correct: string) => {
    if (!selected) return false;
    return selected.trim().toLowerCase() === correct.trim().toLowerCase();
  };
  
  const status = useMemo(() => {
    if (percentage >= 85) return { label: 'Mastered!', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    if (percentage >= 75) return { label: 'Good Job!', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    return { label: 'Keep Practicing!', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' };
  }, [percentage]);

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

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoadingAnalysis(true);
      try {
        const analysis = await generatePerformanceAnalysis(questions, result.answers);
        setPerformanceAnalysis(analysis);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAnalysis(false);
      }
    };
    fetchAnalysis();
  }, [questions, result.answers]);

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
      console.error(err);
    } finally {
      setLoadingRefine(prev => {
        const next = new Set(prev);
        next.delete(q.id);
        return next;
      });
    }
  };

  return (
    <div className="animate-fade-in py-8 space-y-8">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <button onClick={onRetake} className="bg-indigo-600 text-white p-5 rounded-2xl font-black hover:bg-indigo-700 shadow-lg">RETAKE EXAM</button>
              <button onClick={onRestart} className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white p-5 rounded-2xl font-black">NEW SESSION</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black mb-6">Topic Accuracy</h3>
            <div className="space-y-6">
                {topicStats.map((stat, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between items-end mb-2 text-sm font-bold">
                            <span>{stat.topic}</span>
                            <span>{stat.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${stat.percentage}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col transition-colors">
            <h3 className="text-xl font-black mb-6">AI Coach Feedback</h3>
            {loadingAnalysis ? (
                <div className="flex-grow flex items-center justify-center italic">Analyzing performance...</div>
            ) : performanceAnalysis ? (
                <div className="space-y-6 text-sm">
                    <p className="bg-white/10 p-4 rounded-xl italic font-medium">{performanceAnalysis.overallFeedback}</p>
                    <div>
                        <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Study Roadmap</p>
                        <ul className="space-y-1">
                            {performanceAnalysis.areasForImprovement.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                    </div>
                </div>
            ) : <p>Coach unavailable.</p>}
        </div>
      </div>

      <div className="pt-8">
        <h3 className="text-3xl font-black mb-8 px-4">Review Questions</h3>
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const userAns = result.answers.find(a => a.questionId === q.id);
            const isCorrect = userAns?.isCorrect;
            const isExpanded = expandedExplanations.has(q.id);
            const isRefining = loadingRefine.has(q.id);
            
            return (
              <div key={idx} className={`bg-white dark:bg-slate-800 rounded-[2rem] border-2 overflow-hidden ${isCorrect ? 'border-emerald-100' : 'border-red-100'}`}>
                <div className="p-8 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => toggleExplanation(q.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{q.topic || 'General'}</p>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">{idx + 1}. {q.question}</h4>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black ${isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {isCorrect ? 'CORRECT' : 'INCORRECT'}
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 space-y-6 animate-fade-in">
                    <div className="grid gap-3">
                      {q.options.map((opt, oIdx) => {
                        const isCorrectChoice = isCorrectAnswer(opt, q.correctAnswer);
                        const isUserChoice = opt === userAns?.selectedOption;
                        return (
                          <div key={oIdx} className={`p-4 rounded-xl border-2 flex items-center ${isCorrectChoice ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' : isUserChoice ? 'bg-red-50 border-red-200 text-red-900' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600'}`}>
                            <span className="w-8 font-black">{String.fromCharCode(65 + oIdx)})</span>
                            <span>{opt}</span>
                            {isCorrectChoice && <span className="ml-auto text-[10px] font-black">CORRECT</span>}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* GROUNDING EVIDENCE */}
                    {q.sourceQuote && (
                      <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <p className="text-[10px] font-black uppercase text-amber-600 mb-2 tracking-widest flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                          Document Evidence
                        </p>
                        <p className="text-sm font-medium italic text-slate-700 dark:text-slate-300">"{q.sourceQuote}"</p>
                      </div>
                    )}

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-indigo-600 mb-2 tracking-widest">Base Explanation</p>
                      <p className="text-sm font-medium leading-relaxed">{q.explanation}</p>
                    </div>
                    
                    <button onClick={(e) => { e.stopPropagation(); handleDeepDive(q); }} disabled={isRefining || !!refinedInsights[q.id]} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
                      {isRefining ? 'AI Reasoning...' : refinedInsights[q.id] ? 'Insight Ready' : 'Generate AI Mastery Deep-Dive'}
                    </button>
                    {refinedInsights[q.id] && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-2xl border border-indigo-100 animate-slide-up text-sm">
                         <div dangerouslySetInnerHTML={{ __html: refinedInsights[q.id].replace(/\n/g, '<br/>') }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Results;