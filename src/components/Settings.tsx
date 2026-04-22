import React, { useState, useEffect } from 'react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3-flash-preview');
  const [useProxy, setUseProxy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('/api/proxy-gemini');
  const [logLevel, setLogLevel] = useState('WARN');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Load settings from localStorage
    const savedApiKey = localStorage.getItem('smart_exam_api_key');
    const savedModel = localStorage.getItem('smart_exam_model');
    const savedUseProxy = localStorage.getItem('smart_exam_use_proxy');
    const savedProxyUrl = localStorage.getItem('smart_exam_proxy_url');
    const savedLogLevel = localStorage.getItem('smart_exam_log_level');

    if (savedApiKey) setApiKey(savedApiKey);
    if (savedModel) setModel(savedModel);
    if (savedUseProxy === 'true') setUseProxy(true);
    if (savedProxyUrl) setProxyUrl(savedProxyUrl);
    if (savedLogLevel) setLogLevel(savedLogLevel);
  }, [isOpen]);

  const handleSaveSettings = () => {
    localStorage.setItem('smart_exam_api_key', apiKey);
    localStorage.setItem('smart_exam_model', model);
    localStorage.setItem('smart_exam_use_proxy', String(useProxy));
    localStorage.setItem('smart_exam_proxy_url', proxyUrl);
    localStorage.setItem('smart_exam_log_level', logLevel);

    setSaveMessage('✓ Settings saved successfully');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleClearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('smart_exam_api_key');
    setSaveMessage('✓ API Key cleared');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to defaults?')) {
      setApiKey('');
      setModel('gemini-3-flash-preview');
      setUseProxy(false);
      setProxyUrl('/api/proxy-gemini');
      setLogLevel('WARN');
      localStorage.removeItem('smart_exam_api_key');
      localStorage.removeItem('smart_exam_model');
      localStorage.removeItem('smart_exam_use_proxy');
      localStorage.removeItem('smart_exam_proxy_url');
      localStorage.removeItem('smart_exam_log_level');
      setSaveMessage('✓ Settings reset to defaults');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Key Section */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.5 2.5a2.5 2.5 0 015 0 2.5 2.5 0 015 0 2.5 2.5 0 015 0v.006h.5a1.5 1.5 0 011.5 1.5v.5h1.5a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H2.5A1.5 1.5 0 011 12.5v-7a1.5 1.5 0 011.5-1.5H4v-.5A1.5 1.5 0 015.5 2.5h-2zm6 7a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">API Key</h3>
            </div>

            {!showApiKeyInput ? (
              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {apiKey ? '✓ API Key is set' : '⚠ No API Key configured'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {apiKey ? `Key starts with: ${apiKey.substring(0, 10)}...` : 'Configure your Gemini API key'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowApiKeyInput(true)}
                    className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                  >
                    Edit
                  </button>
                </div>
                {apiKey && (
                  <button
                    onClick={handleClearApiKey}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear API Key
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key (sk_...)"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="flex-1 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="flex-1 px-3 py-2 text-sm bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded transition"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">Google AI Studio</a>
                </p>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Model</h3>
            </div>

            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast & Efficient)</option>
              <option value="gemini-3-pro-preview">Gemini 3 Pro (Complex Reasoning)</option>
              <option value="gemma-4-31b-it">Gemma 4 31B (Cost-effective Backup)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro (Advanced)</option>
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Different models have different speeds and capabilities. Flash models are faster, Pro models are more accurate.
            </p>
          </div>

          {/* Proxy Configuration */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Proxy Configuration</h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => setUseProxy(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded dark:bg-slate-700 dark:border-slate-600"
                />
                <span className="text-slate-900 dark:text-white">
                  Use API Proxy (Recommended for Production)
                </span>
              </label>

              {useProxy && (
                <input
                  type="text"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="Proxy URL (e.g., /api/proxy-gemini)"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When enabled, API calls go through your backend proxy for better security. API key stays hidden from the browser.
              </p>
            </div>
          </div>

          {/* Log Level */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Log Level</h3>
            </div>

            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="DEBUG">DEBUG (All messages)</option>
              <option value="INFO">INFO (General information)</option>
              <option value="WARN">WARN (Warnings only)</option>
              <option value="ERROR">ERROR (Errors only)</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Controls verbosity of browser console logs. Check browser DevTools → Console to see logs.
            </p>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
              {saveMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSaveSettings}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
            >
              Save Settings
            </button>
            <button
              onClick={handleResetSettings}
              className="px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white font-medium rounded-lg transition"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
