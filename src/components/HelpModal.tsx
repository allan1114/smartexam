import React, { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, isDark }) => {
  const [activeTab, setActiveTab] = useState<'usage' | 'api' | 'errors'>('usage');

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
          <button
            onClick={() => setActiveTab('errors')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'errors'
                ? `${isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'} border-b-2`
                : `${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-700'}`
            }`}
          >
            API Key Errors & FAQ
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
          ) : activeTab === 'api' ? (
            <div className={`space-y-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <section>
                <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>🔑 Configure Your API Key</h3>
                <p className="mb-4">SmartExam uses Google Gemini AI. Choose the mode that fits your setup:</p>

                {/* Mode A: Direct */}
                <div className={`p-4 rounded-lg ${isDark ? 'bg-indigo-900/30 border border-indigo-700' : 'bg-indigo-50 border border-indigo-200'} mb-4`}>
                  <h4 className={`font-semibold mb-2 ${isDark ? 'text-indigo-200' : 'text-indigo-900'}`}>⚡ Mode A — Direct (GitHub Pages / no backend needed)</h4>
                  <p className={`text-sm mb-3 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>Your key is stored in your browser only and sent straight to Google. No server required.</p>
                  <ol className={`list-decimal list-inside space-y-1 ml-2 text-sm ${isDark ? 'text-indigo-100' : 'text-indigo-900'}`}>
                    <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a> → Sign in → "Create API Key" → Copy it</li>
                    <li>Click ⚙️ <strong>Settings</strong> on this page</li>
                    <li>Make sure <strong>"Use Backend Proxy"</strong> is <strong>unchecked</strong></li>
                    <li>Paste your key into the <strong>Gemini API Key</strong> field → <strong>Save Settings</strong></li>
                  </ol>
                </div>

                {/* Mode B: Proxy */}
                <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} mb-4`}>
                  <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>🔒 Mode B — Server Proxy (Vercel / self-hosted)</h4>
                  <p className={`text-sm mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>API key lives on your server — never in the browser. Enable <strong>"Use Backend Proxy"</strong> in Settings.</p>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className={`font-semibold mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Vercel deployment:</p>
                      <ul className="ml-3 space-y-1">
                        <li>• Vercel dashboard → Project → Settings → Environment Variables</li>
                        <li>• Add <code className={`${isDark ? 'bg-slate-600' : 'bg-slate-200'} px-1 rounded`}>GEMINI_API_KEY</code> = your key → Redeploy</li>
                      </ul>
                    </div>
                    <div>
                      <p className={`font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Custom backend / self-hosted:</p>
                      <ol className="ml-3 space-y-2 list-decimal list-inside">
                        <li>
                          Create your <code className={`${isDark ? 'bg-slate-600' : 'bg-slate-200'} px-1 rounded`}>.env</code> file in one command:
                          <div className={`mt-1 ml-4 px-3 py-2 rounded font-mono text-xs ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
                            echo "GEMINI_API_KEY=your_api_key_here" &gt; .env
                          </div>
                        </li>
                        <li>
                          Add to <code className={`${isDark ? 'bg-slate-600' : 'bg-slate-200'} px-1 rounded`}>.gitignore</code>:
                          <div className={`mt-1 ml-4 px-3 py-2 rounded font-mono text-xs ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
                            echo ".env" &gt;&gt; .gitignore
                          </div>
                        </li>
                        <li>
                          Verify it was created correctly:
                          <div className={`mt-1 ml-4 px-3 py-2 rounded font-mono text-xs ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
                            cat .env
                          </div>
                          <p className={`mt-1 ml-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>You should see: <code className={`${isDark ? 'bg-slate-600' : 'bg-slate-200'} px-1 rounded`}>GEMINI_API_KEY=your_actual_key_here</code></p>
                        </li>
                        <li>Start your backend server — key loads automatically</li>
                        <li>In SmartExam: ⚙️ Settings → enable "Use Backend Proxy" → enter your backend URL</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                    <strong>⚠️ Keep your key safe.</strong> If you suspect it has been exposed, revoke it in Google AI Studio and generate a new one.
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <div className={`space-y-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <section>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>❓ Common API Key Errors & Solutions</h3>

                <div className="space-y-4">
                  {/* Q&A 1: API Quota Exceeded */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} border-l-4 ${isDark ? 'border-red-500' : 'border-red-400'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>❌ Error: "Quota exceeded for quota metric 'Queries-per-minute'"</p>
                    <p className="mb-2"><strong>What does it mean?</strong></p>
                    <p className="mb-3">You've hit the rate limit for API calls. Google Gemini has a quota (free tier: 15 requests/minute, paid: depends on plan).</p>
                    <p className="mb-2"><strong>Solutions:</strong></p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Wait a few minutes and try again</li>
                      <li>Upgrade to a paid plan in Google AI Studio for higher limits</li>
                      <li>Reduce the number of questions generated at once</li>
                      <li>Don't create multiple exams simultaneously</li>
                    </ul>
                  </div>

                  {/* Q&A 2: API Quota Limit */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} border-l-4 ${isDark ? 'border-red-500' : 'border-red-400'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>❌ Error: "Resource has been exhausted"</p>
                    <p className="mb-2"><strong>What does it mean?</strong></p>
                    <p className="mb-3">Your API quota (total monthly limit) has been used up. This is different from rate limiting—you've reached the maximum allowed usage for your plan.</p>
                    <p className="mb-2"><strong>Solutions:</strong></p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Check your quota usage in <a href="https://console.cloud.google.com/apis/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Google Cloud Console</a></li>
                      <li>Upgrade your Google Cloud plan for higher quotas</li>
                      <li>Wait until the quota resets (usually monthly)</li>
                    </ul>
                  </div>

                  {/* Q&A 3: Invalid API Key */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} border-l-4 ${isDark ? 'border-red-500' : 'border-red-400'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>❌ Error: "Invalid API Key" or "API Key not found"</p>
                    <p className="mb-2"><strong>What does it mean?</strong></p>
                    <p className="mb-3">The API key you entered is incorrect, expired, or malformed.</p>
                    <p className="mb-2"><strong>Solutions:</strong></p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Double-check you copied the entire key correctly (no extra spaces)</li>
                      <li>Verify you're using a Gemini API key, not a Cloud API key</li>
                      <li>Generate a new key in <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a></li>
                      <li>Make sure the key is not expired (check Google AI Studio)</li>
                    </ul>
                  </div>

                  {/* Q&A 4: API Service Unavailable */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} border-l-4 ${isDark ? 'border-red-500' : 'border-red-400'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>❌ Error: "Service unavailable" or "500 Internal Server Error"</p>
                    <p className="mb-2"><strong>What does it mean?</strong></p>
                    <p className="mb-3">Google's API service is temporarily down or experiencing issues.</p>
                    <p className="mb-2"><strong>Solutions:</strong></p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Wait a few minutes and try again</li>
                      <li>Check <a href="https://status.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Google Cloud Status</a> for service incidents</li>
                      <li>Try generating a smaller exam (fewer questions)</li>
                    </ul>
                  </div>

                  {/* Q&A 5: Authentication Issues with Backend Proxy */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} border-l-4 ${isDark ? 'border-orange-500' : 'border-orange-400'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>⚠️ Error: "Failed to connect to backend" (Mode B only)</p>
                    <p className="mb-2"><strong>What does it mean?</strong></p>
                    <p className="mb-3">When using Backend Proxy mode, the connection to your server failed or the server isn't running.</p>
                    <p className="mb-2"><strong>Solutions:</strong></p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Verify your backend server is running and accessible</li>
                      <li>Check the backend URL in Settings is correct (e.g., https://your-domain.com)</li>
                      <li>Ensure <code className={`${isDark ? 'bg-slate-600' : 'bg-slate-200'} px-1 rounded text-xs`}>GEMINI_API_KEY</code> environment variable is set on your server</li>
                      <li>Verify CORS headers are properly configured on your backend</li>
                      <li>Check your server logs for detailed error messages</li>
                    </ul>
                  </div>

                  {/* Q&A 6: CORS Error */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'} border-l-4 ${isDark ? 'border-orange-500' : 'border-orange-400'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>⚠️ Error: "CORS policy blocked the request"</p>
                    <p className="mb-2"><strong>What does it mean?</strong></p>
                    <p className="mb-3">Your browser blocked the API request due to CORS (Cross-Origin Resource Sharing) restrictions.</p>
                    <p className="mb-2"><strong>Solutions:</strong></p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>If using Mode A (Direct): This shouldn't happen—contact support</li>
                      <li>If using Mode B (Proxy): Ensure your backend has CORS enabled for SmartExam's origin</li>
                      <li>Restart your browser and try again</li>
                    </ul>
                  </div>

                  {/* Q&A 7: Key Leaked */}
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>🚨 I think my API key was exposed/leaked</p>
                    <p className="mb-2"><strong>What should you do?</strong></p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li><strong>Immediately:</strong> Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a> and delete the exposed key</li>
                      <li>Generate a new API key</li>
                      <li>Update your key in SmartExam Settings (Mode A) or your backend (Mode B)</li>
                      <li>Review your recent API usage to check for suspicious activity</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className={`p-4 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>💡 Need More Help?</h3>
                <p className="mb-2">If your error isn't listed above:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Check the Settings panel—it shows the exact API error message</li>
                  <li>Try testing with the "API Key Setup" tab first</li>
                  <li>Visit <a href="https://github.com/allan1114/smartexam" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">SmartExam GitHub</a> for support or to report issues</li>
                </ul>
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
