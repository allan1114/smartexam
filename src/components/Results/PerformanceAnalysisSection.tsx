import React, { useState, useEffect } from 'react';
import { Question, UserAnswer } from '../../types';
import { generatePerformanceAnalysis, PerformanceAnalysis } from '../../services/geminiService';

interface PerformanceAnalysisSectionProps {
  questions: Question[];
  answers: UserAnswer[];
}

const PerformanceAnalysisSection: React.FC<PerformanceAnalysisSectionProps> = ({ questions, answers }) => {
  const [performanceAnalysis, setPerformanceAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoadingAnalysis(true);
      try {
        const analysis = await generatePerformanceAnalysis(questions, answers);
        setPerformanceAnalysis(analysis);
      } catch (e) {
        console.error('Failed to generate performance analysis:', e);
      } finally {
        setLoadingAnalysis(false);
      }
    };
    fetchAnalysis();
  }, [questions, answers]);

  return (
    <div className="bg-indigo-900 dark:bg-indigo-950 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col transition-colors">
      <h3 className="text-xl font-black mb-6">AI Coach Feedback</h3>
      {loadingAnalysis ? (
        <div className="flex-grow flex items-center justify-center italic">Analyzing performance...</div>
      ) : performanceAnalysis ? (
        <div className="space-y-6 text-sm">
          <p className="bg-white/10 p-4 rounded-xl italic font-medium">{performanceAnalysis.overallFeedback}</p>
          <div>
            <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Study Roadmap</p>
            <ul className="space-y-1">
              {performanceAnalysis.areasForImprovement.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p>Coach unavailable.</p>
      )}
    </div>
  );
};

export default PerformanceAnalysisSection;
