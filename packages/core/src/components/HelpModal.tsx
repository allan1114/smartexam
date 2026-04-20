import React, { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, isDark }) => {
  const [activeTab, setActiveTab] = useState<'usage' | 'api'>('usage');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`sticky top-0 ${isDark ? 'bg-slate-700' : 'bg-slate-100'} border-b ${isDark ? 'border-slate-600' : 'border-slate-200'} p-6 flex justify-between items-center`}>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Help & Tutorial</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:opacity-75 transition-opacity ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'usage'
                ? `${isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'} border-b-2`
                : `${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'}`
            }`}
          >
            How to Use
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'api'
                ? `${isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'} border-b-2`
                : `${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'}`
            }`}
          >
            API Key Setup
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'usage' ? (
            <div className={`space-y-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <section>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>📝 Create an Exam</h3>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Click "Create New Exam" on the home page</li>
                  <li>Choose your exam topic and provide study materials or paste text</li>
                  <li>Set the number of questions you want</li>
                  <li>Click "Generate Exam" to create your questions</li>
                </ol>
              </section>

              <section>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>🎯 Take an Exam</h3>
                <p className="mb-2">Choose between two modes:</p>
                <ul className="space-y-2 ml-4">
                  <li><strong>Mock Test:</strong> Answer questions without seeing answers - pure testing mode</li>
                  <li><strong>Study Mode:</strong> Answer each question and get immediate feedback with explanations</li>
                </ul>
              </section>

              <section>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>📊 View Results</h3>
                <p className="mb-2">After completing the exam, you'll see:</p>
                <ul className="space-y-2 ml-4">
                  <li>Your score and performance metrics</li>
                  <li><strong>AI Coach Feedback:</strong> Personalized learning suggestions based on your answers</li>
                  <li>Detailed review of each question with correct answers</li>
                  <li>Option to retake with smart focus on weak areas or fresh shuffle</li>
                </ul>
              </section>

              <section>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>🔄 Retake Options</h3>
                <ul className="space-y-2 ml-4">
                  <li><strong>Smart Retake (Focus Weak):</strong> Emphasizes questions you got wrong</li>
                  <li><strong>Retake (Fresh Shuffles):</strong> All questions with random new order</li>
                </ul>
              </section>
            </div>
          ) : (
            <div className={`space-y-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <section>
                <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>🔑 Configure Your API Key</h3>
                <p className="mb-4">SmartExam uses Google Gemini AI to generate and analyze exam questions. You need to provide an API key.</p>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} mb-4`}>
                  <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Step 1: Get Your API Key</h4>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a></li>
                    <li>Sign in with your Google account</li>
                    <li>Click "Get API Key" or "Create API Key"</li>
                    <li>Copy your API key</li>
                  </ol>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <h4 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Step 2: Configure API Access</h4>
                  <p className="text-sm mb-3 font-semibold">Choose one method:</p>
                  <div className="space-y-3 text-sm ml-2">
                    <div>
                      <p className="font-semibold text-indigo-600 dark:text-indigo-400">✓ Option A - Backend Proxy (Recommended):</p>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• Set <code className={`${isDark ? 'bg-slate-600' : 'bg-slate-200'} px-1 rounded`}>GEMINI_API_KEY</code> on your backend server</li>
                        <li>• Enable "Use API Proxy" in Settings (⚙️ icon)</li>
                        <li>• Your API key stays hidden from the browser</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Option B - Direct (Development Only):</p>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• Store API key in browser localStorage</li>
                        <li>• Only use for development/testing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                    <strong>⚠️ Production Security:</strong> Always use the proxy method for production. Never expose your API key in the browser.
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'} p-6 flex justify-end`}>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
