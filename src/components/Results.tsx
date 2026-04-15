
import React from 'react';
import { ExamResult, Question } from '../types';
import ResultHeader from './Results/ResultHeader';
import TopicStatsSection from './Results/TopicStatsSection';
import PerformanceAnalysisSection from './Results/PerformanceAnalysisSection';
import QuestionReviewSection from './Results/QuestionReviewSection';

interface ResultsProps {
  result: ExamResult;
  questions: Question[];
  onRestart: () => void;
  onRetake: () => void;
}

const Results: React.FC<ResultsProps> = ({ result, questions, onRestart, onRetake }) => {
  return (
    <div className="animate-fade-in py-8 space-y-8">
      <ResultHeader result={result} onRetake={onRetake} onRestart={onRestart} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TopicStatsSection questions={questions} result={result} />
        <PerformanceAnalysisSection questions={questions} answers={result.answers} />
      </div>

      <QuestionReviewSection questions={questions} result={result} />
    </div>
  );
};

export default Results;
