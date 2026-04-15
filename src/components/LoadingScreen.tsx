import React, { useState, useEffect } from 'react';

const LoadingScreen: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    "Identifying existing questions in your document...",
    "Extracting options and answer keys...",
    "Formatting your exam structure...",
    "Verifying data consistency...",
    "Optimizing explanation references...",
    "Almost ready to start!"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="relative mb-12">
        <div className="w-24 h-24 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Smart AI is Processing</h2>
      <p className="text-indigo-600 dark:text-indigo-400 font-medium transition-all duration-500 text-center px-4">{messages[messageIndex]}</p>
      
      <div className="mt-12 max-w-sm w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
        <div className="bg-indigo-600 dark:bg-indigo-500 h-full animate-loading-bar"></div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 10s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;