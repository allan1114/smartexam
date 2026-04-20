
import React, { useState, useEffect, useCallback } from 'react';
import { Question, ExamConfig, UserAnswer } from '../types';
import TimerDisplay from './ExamPortal/TimerDisplay';
import QuestionNavigator from './ExamPortal/QuestionNavigator';
import QuestionDisplay from './ExamPortal/QuestionDisplay';

interface ExamPortalProps {
  questions: Question[];
  config: ExamConfig;
  onFinish: (answers: UserAnswer[]) => void;
}

const ExamPortal: React.FC<ExamPortalProps> = ({ questions, config, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(config.mode === 'MOCK' ? config.durationMinutes * 60 : 0);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isMock = config.mode === 'MOCK';
  const selectedOption = userAnswers[currentQuestion?.id];
  const hasAnsweredCurrent = !!selectedOption;
  const showInstantFeedback = !isMock && hasAnsweredCurrent;
  const answeredCount = Object.keys(userAnswers).length;
  const progress = (answeredCount / questions.length) * 100;
  const isCritical = timeLeft > 0 && timeLeft < 300;

  const handleFinalSubmit = useCallback(() => {
    const finalAnswers: UserAnswer[] = questions.map(q => {
      const selected = userAnswers[q.id];
      const isCorrect = selected?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
      return {
        questionId: q.id,
        selectedOption: selected || '',
        isCorrect,
        timeSpent: 0
      };
    });
    onFinish(finalAnswers);
  }, [questions, userAnswers, onFinish]);

  useEffect(() => {
    if (!isMock) return undefined;

    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }

    if (timeLeft === 0 && !isAutoSubmitting) {
      setIsAutoSubmitting(true);
      handleFinalSubmit();
    }
    return undefined;
  }, [timeLeft, isMock, handleFinalSubmit, isAutoSubmitting]);

  const handleOptionSelect = (option: string) => {
    if (isAutoSubmitting || !currentQuestion) return;
    if (!isMock && hasAnsweredCurrent) return;
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
  };

  if (!currentQuestion) return <div className="p-20 text-center">Loading Questions...</div>;

  return (
    <div className="animate-fade-in relative pb-32 max-w-4xl mx-auto">
      <div className="sticky top-[73px] bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm pt-2 pb-4 z-30 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
              {config.mode === 'MOCK' ? 'Exam Mode' : config.mode === 'PRACTICE' ? 'Practice Mode' : 'Study Mode'}
            </span>
            <p className="font-black text-slate-900 dark:text-white text-lg">Question {currentIndex + 1} of {questions.length}</p>
          </div>

          <TimerDisplay timeLeft={timeLeft} isMock={isMock} isWarning={isCritical} />
        </div>

        <QuestionNavigator
          questions={questions}
          currentIndex={currentIndex}
          onSelectQuestion={setCurrentIndex}
          userAnswers={userAnswers}
          config={config}
        />

        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="mt-8">
        <QuestionDisplay
          question={currentQuestion}
          config={config}
          selectedOption={selectedOption}
          onSelectOption={handleOptionSelect}
          isAnswered={hasAnsweredCurrent}
          showInstantFeedback={showInstantFeedback}
        />

        {showInstantFeedback && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 mb-8 animate-slide-up">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedOption === currentQuestion.correctAnswer ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {selectedOption === currentQuestion.correctAnswer ? 'Correct' : 'Incorrect'}
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Explanation</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium mb-6 leading-relaxed text-lg italic">
              {currentQuestion.explanation}
            </p>
            {currentQuestion.sourceQuote && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 mb-2 tracking-widest">Document Reference</p>
                <p className="text-sm font-medium italic text-slate-600 dark:text-slate-400 leading-relaxed">&quot;{currentQuestion.sourceQuote}&quot;</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-6 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
            disabled={currentIndex === 0}
            className="px-8 py-4 font-black text-slate-500 disabled:opacity-30 hover:text-indigo-600 transition-colors"
          >
            PREVIOUS
          </button>

          <div className="flex space-x-4">
            {currentIndex === questions.length - 1 ? (
              <button
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
              >
                FINISH SESSION
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(p => p + 1)}
                className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
              >
                NEXT QUESTION
              </button>
            )}
          </div>
        </div>
      </div>

      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-3xl font-black mb-4 text-slate-900 dark:text-white">Submit Session?</h4>
            <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium">
              You have answered {answeredCount} out of {questions.length} questions. Are you ready to view your performance analysis?
            </p>
            <div className="space-y-4">
              <button onClick={handleFinalSubmit} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">YES, SHOW RESULTS</button>
              <button onClick={() => setIsSubmitConfirmOpen(false)} className="w-full py-4 font-black text-slate-400 hover:text-slate-600 transition-colors">CONTINUE REVIEWING</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPortal;
