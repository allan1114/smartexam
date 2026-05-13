import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ExamConfig, Question, ExamResult, UserAnswer, DocumentSource } from './types';
import { parseDocumentToQuestions } from './services/geminiService';
import { generateUniqueId } from './utils/fileProcessor';
import { logger } from './utils/logger';
import {
  saveExamSession,
  generateDocumentHash,
  loadSessionForRetake,
  createRetakeSession,
  loadExamSession
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
        if (Array.isArray(parsed)) {
          const validItems = parsed.filter(item => item !== null && typeof item === 'object' && item.id);
          const corruptCount = parsed.length - validItems.length;
          if (corruptCount > 0) {
            logger.warn(`Filtered ${corruptCount} corrupt entries from exam history`, "App.initialization");
          }
          setHistory(validItems);
        } else {
          logger.warn("Exam history in localStorage is not an array, resetting", "App.initialization");
          setHistory([]);
        }
      }
    } catch (e) {
      logger.error("Exam history JSON is corrupt, resetting to empty", "App.initialization", e);
      setHistory([]);
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
      // Generate document hash before calling Gemini for deterministic seeding
      const docHash = generateDocumentHash(docSource.text, docSource.fileData);
      setDocumentHash(docHash);

      const generatedQuestions = await parseDocumentToQuestions(
        docSource,
        examConfig.totalQuestions,
        examConfig.model,
        examConfig.answerFormat,
        examConfig.contentRange,
        docHash
      );

      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error("NO_QUESTIONS_FOUND: AI failed to extract any valid questions from the document.");
      }

      // Save original questions to localStorage (Level 1 - preserves 100% integrity)
      const sessionId = saveExamSession(generatedQuestions, docHash, examConfig);
      setCurrentExamSessionId(sessionId);

      // Options are ALWAYS shuffled — core feature for exam practice.
      // questionOrder only controls the order of questions, not options.
      const { questions: displayQuestions } = getDisplayQuestions(generatedQuestions as any, true);

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

  const handleRetakeWithFreshShuffles = useCallback(async (sessionId: string) => {
    setCurrentState(AppState.LOADING);
    setError(null);

    try {
      // Load original questions from saved session (Level 2)
      const originalQuestions = loadSessionForRetake(sessionId);
      if (!originalQuestions || originalQuestions.length === 0) {
        throw new Error("SESSION_NOT_FOUND: Could not load the saved exam session for retake.");
      }

      // Options are ALWAYS shuffled — core feature for exam practice.
      const { questions: displayQuestions } = getDisplayQuestions(originalQuestions, true);

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

      // Options are ALWAYS shuffled — core feature for exam practice.
      const { questions: displayQuestions } = getDisplayQuestions(smartOrderedQuestions, true);

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

    // Restore session-related state so retake buttons work from history view
    if (result.examSessionId) {
      const session = loadExamSession(result.examSessionId);
      if (session) {
        setCurrentExamSessionId(result.examSessionId);
        if (session.examConfig) setConfig(session.examConfig);
        if (session.documentHash) setDocumentHash(session.documentHash);
      }
    }

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

    const msg = (error.message || '').toLowerCase();
    const type = (error.type || '').toUpperCase();

    type ErrorQA = { question: string; explanation: string; steps: string[] };
    let qa: ErrorQA = {
      question: "What does this error mean?",
      explanation: "An unexpected problem occurred while generating questions.",
      steps: [
        "Check that the document has clear, readable content.",
        "Try again with fewer questions (e.g. 5–10).",
        "Open Help (top right) → API Key Errors & FAQ for more details."
      ]
    };

    const matches = (...needles: string[]) =>
      needles.some(n => type.includes(n) || msg.includes(n.toLowerCase()));

    if (matches('API_KEY_NOT_FOUND', 'NO_API_KEY', 'API key', 'API_KEY')) {
      qa = {
        question: "Why is the API key missing or invalid?",
        explanation: "SmartExam needs a Google Gemini API key to call the AI. Either none is configured, or the saved key was rejected.",
        steps: [
          "Go to https://aistudio.google.com/app/apikey and create/copy a Gemini API key.",
          "Click ⚙️ Settings → paste the key into 'Gemini API Key' → Save.",
          "Make sure you copied the full key with no extra spaces."
        ]
      };
    } else if (matches('API_LIMIT', 'QUOTA', 'RATE', 'rate limit', 'reach limit', 'limit', '429', 'exhausted', 'too many requests')) {
      qa = {
        question: "Why did the API reach its limit?",
        explanation: "Google Gemini enforces per-minute and per-day quotas. The free tier is small (≈15 requests/min). Your key just hit one of these caps.",
        steps: [
          "Wait 1–2 minutes, then try again.",
          "Reduce 'Total Questions' (try 5–10 at a time).",
          "Upgrade your Gemini plan in Google AI Studio for higher quotas.",
          "Open Help → API Key Errors & FAQ for more troubleshooting."
        ]
      };
    } else if (matches('NETWORK_TIMEOUT', 'RPC', 'Code 6', 'timeout', 'fetch failed', 'network')) {
      qa = {
        question: "Why did the network/RPC call fail?",
        explanation: "The connection to Google's AI server timed out or was dropped before a response was returned.",
        steps: [
          "Check your internet connection.",
          "Reduce the number of questions — large requests are more likely to time out.",
          "Try a faster model (e.g. Flash) in the AI Engine selector.",
          "Wait a moment and retry."
        ]
      };
    } else if (matches('SAFETY_BLOCK', 'safety', 'blocked')) {
      qa = {
        question: "Why was the content blocked?",
        explanation: "The AI's safety filters rejected something in the document or the generated output.",
        steps: [
          "Remove or rephrase sensitive sections in the source.",
          "Try uploading a different section of the same material.",
          "Switch to another AI Engine in Setup."
        ]
      };
    } else if (matches('NO_QUESTIONS', 'NO_QUESTIONS_FOUND', 'PARSING_ERROR', 'EMPTY_RESPONSE', 'parse', 'empty')) {
      qa = {
        question: "Why couldn't questions be extracted?",
        explanation: "The AI either returned no questions, or its output couldn't be parsed as valid JSON.",
        steps: [
          "Make sure the document contains clear question/answer content.",
          "Reduce 'Total Questions' to 5–10 — large counts often break JSON output.",
          "If your file is a scan/PDF, ensure the text is selectable (not just an image).",
          "Try again — large-model JSON output can occasionally fail."
        ]
      };
    } else if (matches('SESSION_NOT_FOUND', 'PROFILE_NOT_FOUND')) {
      qa = {
        question: "Why can't the saved session be loaded?",
        explanation: "The original exam session was not found in your browser storage, so a retake with fresh shuffles isn't possible.",
        steps: [
          "Start a new exam from Home — older sessions may have been cleared.",
          "Avoid clearing browser data if you want to keep retake history.",
          "Take at least one exam before using Smart Retake (it needs performance data)."
        ]
      };
    } else if (matches('CORS')) {
      qa = {
        question: "Why is CORS blocking the request?",
        explanation: "Your browser refused the cross-origin call to the backend proxy.",
        steps: [
          "Switch to Direct mode in ⚙️ Settings (uncheck 'Use Backend Proxy').",
          "If you really need proxy mode, configure CORS on your backend to allow this origin."
        ]
      };
    }

    return (
      <div className="mb-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-r-xl shadow-sm animate-slide-up flex items-start space-x-4 dark:bg-red-900/20 dark:border-red-600">
        <div className="bg-red-500 p-2 rounded-lg mt-0.5">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div className="flex-1">
          <h4 className="font-black text-red-900 dark:text-red-300 text-sm uppercase tracking-wider mb-1">
            {error.type.replace(/_/g, ' ')}
          </h4>
          <p className="text-red-700 dark:text-red-400 font-medium text-sm leading-relaxed mb-3">
            {error.message}
          </p>
          <div className="bg-white/70 dark:bg-black/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50 space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-red-700 dark:text-red-300">
              ❓ Q: {qa.question}
            </p>
            <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
              <strong>A:</strong> {qa.explanation}
            </p>
            <ul className="text-xs text-red-800 dark:text-red-200 leading-relaxed list-disc list-inside space-y-1">
              {qa.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <button
              onClick={() => setShowHelp(true)}
              className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Open full API Key Errors & FAQ →
            </button>
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
            onRetakeWithFreshShuffles={results.examSessionId ? () => handleRetakeWithFreshShuffles(results.examSessionId!) : undefined}
            onSmartRetake={results.examSessionId && documentHash ? () => handleSmartRetake(results.examSessionId!) : undefined}
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