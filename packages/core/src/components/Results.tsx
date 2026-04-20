
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
  onRetakeWithFreshShuffles?: () => void; // Level 2: Retake with fresh option shuffles
  onSmartRetake?: () => void; // Level 3: Smart retake prioritizing difficult questions
}

const Results: React.FC<ResultsProps> = ({ result, questions, onRestart, onRetake, onRetakeWithFreshShuffles, onSmartRetake }) => {
  return (
    <div className="animate-fade-in py-8 space-y-8">
      <ResultHeader result={result} onRetake={onRetake} onRestart={onRestart} onRetakeWithFreshShuffles={onRetakeWithFreshShuffles} onSmartRetake={onSmartRetake} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TopicStatsSection questions={questions} result={result} />
        <PerformanceAnalysisSection questions={questions} answers={result.answers} />
      </div>

      <QuestionReviewSection questions={questions} result={result} />
    </div>
  );
};

export default Results;
