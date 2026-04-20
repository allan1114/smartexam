import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ExamConfig, Question, ExamResult, UserAnswer, DocumentSource } from './types';
import { parseDocumentToQuestions } from './services/geminiService';
import { generateUniqueId } from './utils/fileProcessor';
import { logger } from './utils/logger';
import {
  saveExamSession,
  generateDocumentHash,
  loadSessionForRetake,
  createRetakeSession
} from './utils/examStorage';
import {
  updatePerformanceProfile,
  loadPerformanceProfile,
  createSmartRetakeOrder
} from './utils/difficultyTracking';
import { getDisplayQuestions } from './utils/optionShuffler';
import Header from './components/Header';
import Home from './components/Home';
import ExamSetup from './components/ExamSetup';
import LoadingScreen from './components/LoadingScreen';
import ExamPortal from './components/ExamPortal';
import Results from './components/Results';
import ChatBot from './components/ChatBot';
import ErrorBoundary from './components/ErrorBoundary';
import Settings from './components/Settings';
import HelpModal from './components/HelpModal';


const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.HOME);
  const [docSource, setDocSource] = useState<DocumentSource | null>(null);
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<ExamResult | null>(null);
  const [error, setError] = useState<{message: string, type: string} | null>(null);
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentExamSessionId, setCurrentExamSessionId] = useState<string | null>(null);
  const [isRetaking, setIsRetaking] = useState(false);
  const [documentHash, setDocumentHash] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    try {
      const savedHistory = localStorage.getItem('smart_exam_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Clean up any null/corrupt entries from history
        setHistory(Array.isArray(parsed) ? parsed.filter(item => item !== null && typeof item === 'object' && item.id) : []);
      }
    } catch (e) {
      logger.error("Failed to load exam history from localStorage", "App.initialization", e);
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  const handleSourceLoaded = useCallback((source: DocumentSource) => {
    setDocSource(source);
    setCurrentState(AppState.SETUP);
  }, []);

  const shuffleQuestions = (array: Question[]): Question[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startExam = async (examConfig: ExamConfig) => {
    if (!docSource) return;
    setConfig(examConfig);
    setCurrentState(AppState.LOADING);
    setError(null);
    setIsRetaking(false);

    try {
      const generatedQuestions = await parseDocumentToQuestions(
        docSource,
        examConfig.totalQuestions,
        examConfig.model,
        examConfig.answerFormat,
        examConfig.contentRange
      );

      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error("NO_QUESTIONS_FOUND: AI failed to extract any valid questions from the document.");
      }

      // Generate document hash for integrity tracking
      const docHash = generateDocumentHash(docSource.text, docSource.fileData);
      setDocumentHash(docHash);

      // Save original questions to localStorage (Level 1 - preserves 100% integrity)
      const sessionId = saveExamSession(generatedQuestions, docHash, examConfig);
      setCurrentExamSessionId(sessionId);

      // Create option shuffles for display (Level 2 - applies shuffling at display layer)
      const { questions: displayQuestions } = getDisplayQuestions(generatedQuestions as any);

      // Apply question order (RANDOM or SEQUENTIAL) to display questions
      const finalQuestions = examConfig.questionOrder === 'RANDOM'
        ? shuffleQuestions(displayQuestions)
        : displayQuestions;

      setQuestions(finalQuestions);
      setCurrentState(AppState.EXAM);
    } catch (err: any) {
      const errMsg = err.message || "Failed to generate exam questions.";
      const type = errMsg.split(':')[0] || 'GENERAL_ERROR';
      setError({ message: errMsg.replace(`${type}: `, ''), type });
      setCurrentState(AppState.SETUP);
    }
  };

  const finishExam = (userAnswers: UserAnswer[]) => {
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const examResult: ExamResult = {
      id: generateUniqueId(),
      score: correctCount,
      totalQuestions: questions.length,
      answers: userAnswers,
      questions: questions,
      startTime: Date.now(),
      endTime: Date.now(),
      mode: config?.mode || 'MOCK',
      model: config?.model || 'gemini-3-flash-preview',
      customName: config?.examName,
      examSessionId: currentExamSessionId || undefined,
      retakeOf: isRetaking ? results?.id : undefined
    };

    setHistory(prev => {
      const updated = [examResult, ...prev].slice(0, 50);
      try {
        localStorage.setItem('smart_exam_history', JSON.stringify(updated));
      } catch (e) {
        logger.warn("Failed to save exam history to localStorage", "App.finishExam", e);
      }
      return updated;
    });

    // Update difficulty profile (Level 3)
    if (documentHash) {
      try {
        updatePerformanceProfile(documentHash, examResult);
        logger.info('Performance profile updated', 'App.finishExam');
      } catch (e) {
        logger.warn('Failed to update performance profile', 'App.finishExam', e);
      }
    }

    setResults(examResult);
    setCurrentState(AppState.RESULTS);
  };

  const handleRetake = useCallback(() => {
    setResults(null);
    setCurrentState(AppState.EXAM);
    setIsRetaking(false);
  }, []);

  const handleRetakeWithFreshShuffles = useCallback(async (sessionId: string) => {
    setCurrentState(AppState.LOADING);
    setError(null);

    try {
      // Load original questions from saved session (Level 2)
      const originalQuestions = loadSessionForRetake(sessionId);
      if (!originalQuestions || originalQuestions.length === 0) {
        throw new Error("SESSION_NOT_FOUND: Could not load the saved exam session for retake.");
      }

      // Create fresh option shuffles (Level 2)
      const { questions: displayQuestions } = getDisplayQuestions(originalQuestions);

      // Apply question order from config
      const finalQuestions = config?.questionOrder === 'RANDOM'
        ? shuffleQuestions(displayQuestions)
        : displayQuestions;

      // Create retake session (tracks relationship to original)
      const retakeSessionId = createRetakeSession(sessionId, originalQuestions, config || undefined);
      if (retakeSessionId) {
        setCurrentExamSessionId(retakeSessionId);
      }

      setQuestions(finalQuestions);
      setResults(null);
      setIsRetaking(true);
      setCurrentState(AppState.EXAM);

      logger.info(`Retake started with fresh shuffles for session: ${sessionId}`, 'App.handleRetakeWithFreshShuffles');
    } catch (err: any) {
      const errMsg = err.message || "Failed to load session for retake.";
      const type = errMsg.split(':')[0] || 'GENERAL_ERROR';
      setError({ message: errMsg.replace(`${type}: `, ''), type });
      setCurrentState(AppState.RESULTS);
    }
  }, [config]);

  const handleSmartRetake = useCallback(async (sessionId: string) => {
    setCurrentState(AppState.LOADING);
    setError(null);

    try {
      if (!documentHash) {
        throw new Error("SESSION_NOT_FOUND: Document hash not available for smart retake.");
      }

      // Load original questions from saved session
      const originalQuestions = loadSessionForRetake(sessionId);
      if (!originalQuestions || originalQuestions.length === 0) {
        throw new Error("SESSION_NOT_FOUND: Could not load the saved exam session for retake.");
      }

      // Load performance profile (Level 3)
      const profile = loadPerformanceProfile(documentHash);
      if (!profile) {
        throw new Error("PROFILE_NOT_FOUND: No performance data available for smart retake.");
      }

      // Create smart retake order - prioritize hard questions (Level 3)
      const smartOrderedQuestions = createSmartRetakeOrder(
        profile,
        originalQuestions,
        config?.totalQuestions
      );

      // Create fresh option shuffles
      const { questions: displayQuestions } = getDisplayQuestions(smartOrderedQuestions);

      // Create retake session
      const retakeSessionId = createRetakeSession(sessionId, smartOrderedQuestions, config || undefined);
      if (retakeSessionId) {
        setCurrentExamSessionId(retakeSessionId);
      }

      setQuestions(displayQuestions);
      setResults(null);
      setIsRetaking(true);
      setCurrentState(AppState.EXAM);

      logger.info(`Smart retake started (prioritizing difficult questions) for session: ${sessionId}`, 'App.handleSmartRetake');
    } catch (err: any) {
      const errMsg = err.message || "Failed to start smart retake.";
      const type = errMsg.split(':')[0] || 'GENERAL_ERROR';
      setError({ message: errMsg.replace(`${type}: `, ''), type });
      setCurrentState(AppState.RESULTS);
    }
  }, [documentHash, config]);

  const deleteHistory = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem('smart_exam_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const renameHistory = useCallback((id: string, newName: string) => {
    setHistory(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, customName: newName } : h);
      localStorage.setItem('smart_exam_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const importHistory = useCallback((newData: ExamResult[]) => {
    setHistory(prev => {
      const existingIds = new Set(prev.map(h => h.id));
      const filteredNewData = newData.filter(h => h && h.id && !existingIds.has(h.id));
      const updated = [...filteredNewData, ...prev].slice(0, 100);
      localStorage.setItem('smart_exam_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    const confirmed = window.confirm("Are you sure you want to permanently clear ALL exam history? This action is irreversible.");
    if (confirmed) {
      localStorage.removeItem('smart_exam_history');
      setHistory([]);
      logger.info("Exam history cleared by user", "App.clearAllHistory");
    }
  }, []);

  const viewHistoryResult = useCallback((result: ExamResult) => {
    setResults(result);
    setQuestions(result.questions);
    setCurrentState(AppState.RESULTS);
  }, []);

  const reset = useCallback(() => {
    setCurrentState(AppState.HOME);
    setDocSource(null);
    setConfig(null);
    setQuestions([]);
    setResults(null);
    setError(null);
  }, []);

  const renderError = () => {
    if (!error) return null;
    
    let advice = "Try checking the document content or format.";
    if (error.type === 'NO_QUESTIONS_FOUND') advice = "Ensure your document contains clear test questions with numbering (1, 2, 3) and options (A, B, C, D).";
    if (error.type === 'API_LIMIT') advice = "The server is busy. Please wait a few moments.";
    if (error.type === 'SAFETY_BLOCK') advice = "The content was rejected by the AI safety filters.";

    return (
      <div className="mb-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm animate-slide-up flex items-start space-x-4 dark:bg-red-900/20 dark:border-red-600">
        <div className="bg-red-500 p-2 rounded-lg mt-0.5">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h4 className="font-black text-red-900 dark:text-red-300 text-sm uppercase tracking-wider mb-1">
            {error.type.replace('_', ' ')}
          </h4>
          <p className="text-red-700 dark:text-red-400 font-medium text-sm leading-relaxed mb-2">
            {error.message}
          </p>
          <div className="flex items-center space-x-2 text-red-600/80 dark:text-red-300 italic text-xs font-bold bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-red-100 dark:border-red-900/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{advice}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Header onLogoClick={reset} isDark={isDark} toggleTheme={toggleTheme} onSettingsClick={() => setShowSettings(true)} onHelpClick={() => setShowHelp(true)} />
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} isDark={isDark} />

        <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        {renderError()}

        {currentState === AppState.HOME && (
          <Home 
            onDocLoaded={handleSourceLoaded} 
            history={history} 
            onDeleteHistory={deleteHistory}
            onRenameHistory={renameHistory}
            onImportHistory={importHistory}
            onClearAllHistory={clearAllHistory}
            onViewResult={viewHistoryResult}
          />
        )}
        {currentState === AppState.SETUP && <ExamSetup onStart={startExam} />}
        {currentState === AppState.LOADING && <LoadingScreen />}
        {currentState === AppState.EXAM && config && questions.length > 0 && (
          <ExamPortal questions={questions} config={config} onFinish={finishExam} />
        )}
        {currentState === AppState.RESULTS && results && (
          <Results
            result={results}
            questions={questions}
            onRestart={reset}
            onRetake={handleRetake}
            onRetakeWithFreshShuffles={results.examSessionId ? () => handleRetakeWithFreshShuffles(results.examSessionId!) : undefined}
            onSmartRetake={results.examSessionId ? () => handleSmartRetake(results.examSessionId!) : undefined}
          />
        )}
      </main>

        {currentState !== AppState.LOADING && (
          <ChatBot context={docSource?.text || "Document content provided via file upload."} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;