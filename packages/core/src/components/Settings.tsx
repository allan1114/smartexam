import React, { useState, useEffect } from 'react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [model, setModel] = useState('gemini-3-flash-preview');
  const [useProxy, setUseProxy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('/api/proxy-gemini');
  const [apiKey, setApiKey] = useState('');
  const [logLevel, setLogLevel] = useState('WARN');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const savedModel = localStorage.getItem('smart_exam_model');
    const savedUseProxy = localStorage.getItem('smart_exam_use_proxy');
    const savedProxyUrl = localStorage.getItem('smart_exam_proxy_url');
    const savedApiKey = localStorage.getItem('smart_exam_api_key');
    const savedLogLevel = localStorage.getItem('smart_exam_log_level');

    if (savedModel) setModel(savedModel);
    if (savedUseProxy === 'true') setUseProxy(true);
    if (savedProxyUrl) setProxyUrl(savedProxyUrl);
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedLogLevel) setLogLevel(savedLogLevel);
  }, [isOpen]);

  const handleSaveSettings = () => {
    localStorage.setItem('smart_exam_model', model);
    localStorage.setItem('smart_exam_use_proxy', String(useProxy));
    localStorage.setItem('smart_exam_proxy_url', proxyUrl);
    if (apiKey) {
      localStorage.setItem('smart_exam_api_key', apiKey);
    } else {
      localStorage.removeItem('smart_exam_api_key');
    }
    localStorage.setItem('smart_exam_log_level', logLevel);

    setSaveMessage('✓ Settings saved successfully');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to defaults?')) {
      setModel('gemini-3-flash-preview');
      setUseProxy(false);
      setProxyUrl('/api/proxy-gemini');
      setApiKey('');
      setLogLevel('WARN');
      localStorage.removeItem('smart_exam_model');
      localStorage.removeItem('smart_exam_use_proxy');
      localStorage.removeItem('smart_exam_proxy_url');
      localStorage.removeItem('smart_exam_api_key');
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
              <option value="gemini-2.5-pro-preview-05-06">Gemini 2.5 Pro (Most Capable)</option>
              <option value="gemini-2.5-flash-preview-04-17">Gemini 2.5 Flash</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental</option>
              <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro (Advanced)</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Different models have different speeds and capabilities. Flash models are faster, Pro models are more accurate.
            </p>
          </div>

          {/* API Key / Proxy Configuration */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">API Configuration</h3>
            </div>

            <div className="space-y-4">
              {/* Direct API key (no proxy) */}
              {!useProxy && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gemini API Key <span className="text-slate-400 font-normal">(stored in browser only)</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Get your free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a>. Saved to localStorage — never sent anywhere except directly to Google.
                  </p>
                </div>
              )}

              {/* Proxy toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => setUseProxy(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded dark:bg-slate-700 dark:border-slate-600"
                />
                <span className="text-slate-900 dark:text-white text-sm">
                  Use Backend Proxy instead <span className="text-slate-500 dark:text-slate-400">(Vercel / self-hosted)</span>
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
                {useProxy
                  ? 'Proxy mode: API key lives on your server, not in the browser. See Help → API Key Setup.'
                  : 'Direct mode: your API key is sent straight to Google from your browser. No backend needed.'}
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
