
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Question, ExamConfig, UserAnswer } from '../types';

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
    if (isMock && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (isMock && timeLeft === 0 && !isAutoSubmitting) {
      setIsAutoSubmitting(true);
      handleFinalSubmit();
    }
  }, [timeLeft, isMock, handleFinalSubmit, isAutoSubmitting]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (option: string) => {
    if (isAutoSubmitting || !currentQuestion) return;
    
    // In study/practice mode, once answered, don't allow changing
    if (!isMock && hasAnsweredCurrent) return;
    
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
  };

  if (!currentQuestion) return <div className="p-20 text-center">Loading Questions...</div>;

  const answeredCount = Object.keys(userAnswers).length;
  const progress = (answeredCount / questions.length) * 100;
  const isCritical = timeLeft > 0 && timeLeft < 300; // Last 5 mins

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
          
          {isMock && (
            <div className={`px-6 py-2 rounded-2xl border-2 flex flex-col items-center ${isCritical ? 'border-red-500 bg-red-50 text-red-600 animate-pulse' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
              <span className="text-[10px] font-black uppercase tracking-widest">Time Remaining</span>
              <span className="font-mono font-black text-2xl">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          {questions.map((q, idx) => {
            const ans = userAnswers[q.id];
            const isCorrect = !isMock && ans && ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
            const isWrong = !isMock && ans && ans.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase();
            
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                  currentIndex === idx 
                    ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-110 z-10' 
                    : ''
                } ${
                  !isMock && isCorrect ? 'bg-emerald-500 text-white' :
                  !isMock && isWrong ? 'bg-red-500 text-white' :
                  ans ? 'bg-indigo-600 text-white' : 
                  'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-700 p-10">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-8">{currentQuestion.question}</h3>
        <div className="grid gap-4">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectChoice = option.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
            
            let btnClass = "border-slate-100 dark:border-slate-700 hover:border-indigo-200";
            let iconClass = "bg-slate-100 dark:bg-slate-700 text-slate-500";

            if (showInstantFeedback) {
              if (isCorrectChoice) {
                btnClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20";
                iconClass = "bg-emerald-600 text-white";
              } else if (isSelected) {
                btnClass = "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100 ring-2 ring-red-500/20";
                iconClass = "bg-red-600 text-white";
              }
            } else if (isSelected) {
              btnClass = "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20";
              iconClass = "bg-indigo-600 text-white";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(option)}
                className={`w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center group ${btnClass}`}
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center mr-6 font-black shrink-0 transition-colors ${iconClass}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-lg font-bold">{option}</span>
                {showInstantFeedback && isCorrectChoice && (
                  <svg className="w-6 h-6 ml-auto text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {showInstantFeedback && (
          <div className="mt-10 p-8 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 animate-slide-up">
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
                <p className="text-sm font-medium italic text-slate-600 dark:text-slate-400 leading-relaxed">"{currentQuestion.sourceQuote}"</p>
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
