import React, { useState, useEffect } from 'react';
import { AI_MODELS, DEFAULT_MODEL } from '../constants/models';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// MiniMax (international) defaults. Kept here so the provider config stays fully
// separate from the Google/Gemini settings.
const MINIMAX_DEFAULT_URL = 'https://api.minimax.io/v1/chat/completions';
const MINIMAX_DEFAULT_MODEL = 'MiniMax-Text-01';

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<'google' | 'minimax'>('google');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [useProxy, setUseProxy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('/api/proxy-gemini');
  const [apiKey, setApiKey] = useState('');
  const [logLevel, setLogLevel] = useState('WARN');
  const [temperature, setTemperature] = useState(0.3);
  const [saveMessage, setSaveMessage] = useState('');
  // MiniMax provider config — separate keys, never touches the Google settings.
  const [minimaxModel, setMinimaxModel] = useState(MINIMAX_DEFAULT_MODEL);
  const [minimaxUrl, setMinimaxUrl] = useState(MINIMAX_DEFAULT_URL);
  const [minimaxApiKey, setMinimaxApiKey] = useState('');

  useEffect(() => {
    const savedProvider = localStorage.getItem('smart_exam_provider');
    const savedModel = localStorage.getItem('smart_exam_model');
    const savedUseProxy = localStorage.getItem('smart_exam_use_proxy');
    const savedProxyUrl = localStorage.getItem('smart_exam_proxy_url');
    const savedApiKey = localStorage.getItem('smart_exam_api_key');
    const savedLogLevel = localStorage.getItem('smart_exam_log_level');
    const savedTemp = localStorage.getItem('smart_exam_temperature');
    const savedMinimaxModel = localStorage.getItem('smart_exam_minimax_model');
    const savedMinimaxUrl = localStorage.getItem('smart_exam_minimax_url');
    const savedMinimaxApiKey = localStorage.getItem('smart_exam_minimax_api_key');

    if (savedProvider === 'minimax') setProvider('minimax');
    if (savedModel) setModel(savedModel);
    if (savedUseProxy === 'true') setUseProxy(true);
    if (savedProxyUrl) setProxyUrl(savedProxyUrl);
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedLogLevel) setLogLevel(savedLogLevel);
    if (savedTemp) {
      const t = parseFloat(savedTemp);
      if (Number.isFinite(t)) setTemperature(Math.min(1, Math.max(0, t)));
    }
    if (savedMinimaxModel) setMinimaxModel(savedMinimaxModel);
    if (savedMinimaxUrl) setMinimaxUrl(savedMinimaxUrl);
    if (savedMinimaxApiKey) setMinimaxApiKey(savedMinimaxApiKey);
  }, [isOpen]);

  const handleSaveSettings = () => {
    localStorage.setItem('smart_exam_provider', provider);
    localStorage.setItem('smart_exam_model', model);
    localStorage.setItem('smart_exam_use_proxy', String(useProxy));
    localStorage.setItem('smart_exam_proxy_url', proxyUrl);
    if (apiKey) {
      localStorage.setItem('smart_exam_api_key', apiKey);
    } else {
      localStorage.removeItem('smart_exam_api_key');
    }
    localStorage.setItem('smart_exam_log_level', logLevel);
    localStorage.setItem('smart_exam_temperature', String(temperature));

    // MiniMax config (independent of the Google keys above).
    localStorage.setItem('smart_exam_minimax_model', minimaxModel.trim() || MINIMAX_DEFAULT_MODEL);
    localStorage.setItem('smart_exam_minimax_url', minimaxUrl.trim() || MINIMAX_DEFAULT_URL);
    if (minimaxApiKey) {
      localStorage.setItem('smart_exam_minimax_api_key', minimaxApiKey);
    } else {
      localStorage.removeItem('smart_exam_minimax_api_key');
    }

    setSaveMessage('✓ Settings saved successfully');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to defaults?')) {
      setProvider('google');
      setModel(DEFAULT_MODEL);
      setUseProxy(false);
      setProxyUrl('/api/proxy-gemini');
      setApiKey('');
      setLogLevel('WARN');
      setTemperature(0.3);
      setMinimaxModel(MINIMAX_DEFAULT_MODEL);
      setMinimaxUrl(MINIMAX_DEFAULT_URL);
      setMinimaxApiKey('');
      localStorage.removeItem('smart_exam_provider');
      localStorage.removeItem('smart_exam_model');
      localStorage.removeItem('smart_exam_use_proxy');
      localStorage.removeItem('smart_exam_proxy_url');
      localStorage.removeItem('smart_exam_api_key');
      localStorage.removeItem('smart_exam_log_level');
      localStorage.removeItem('smart_exam_temperature');
      localStorage.removeItem('smart_exam_minimax_model');
      localStorage.removeItem('smart_exam_minimax_url');
      localStorage.removeItem('smart_exam_minimax_api_key');
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
          {/* AI Provider */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Provider</h3>
            </div>

            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'google' | 'minimax')}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="google">Google Gemini</option>
              <option value="minimax">MiniMax (International)</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {provider === 'minimax'
                ? 'MiniMax 模式使用下方獨立設定（不影響 Google 設定）。注意：MiniMax 暫不支援直接讀取 PDF／圖片，請用文字內容。'
                : '預設使用 Google Gemini。揀 MiniMax 可改用 MiniMax 國際版模型。'}
            </p>
          </div>

          {/* Model Selection (Google only) */}
          {provider === 'google' && (
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
              {AI_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.description})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Flash models are faster; Pro models are more accurate. If a model is busy, the app auto-falls back to <code>gemini-2.5-flash</code>.
            </p>
          </div>
          )}

          {/* MiniMax Configuration (MiniMax only) */}
          {provider === 'minimax' && (
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">MiniMax Configuration</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  AI Model
                </label>
                <input
                  type="text"
                  value={minimaxModel}
                  onChange={(e) => setMinimaxModel(e.target.value)}
                  placeholder={MINIMAX_DEFAULT_MODEL}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  例如：<code>MiniMax-Text-01</code>。請填入你帳戶可用的 MiniMax 模型名稱。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  AI Model URL
                </label>
                <input
                  type="text"
                  value={minimaxUrl}
                  onChange={(e) => setMinimaxUrl(e.target.value)}
                  placeholder={MINIMAX_DEFAULT_URL}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  OpenAI 相容的 chat completions 端點。預設 <code>{MINIMAX_DEFAULT_URL}</code>。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  API Key <span className="text-slate-400 font-normal">(stored in browser only)</span>
                </label>
                <input
                  type="password"
                  value={minimaxApiKey}
                  onChange={(e) => setMinimaxApiKey(e.target.value)}
                  placeholder="MiniMax API key"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  喺 <a href="https://platform.minimax.io/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">MiniMax 國際平台</a> 取得 API key。只存喺瀏覽器，直接傳去你設定嘅 URL。
                </p>
              </div>
            </div>
          </div>
          )}

          {/* API Key / Proxy Configuration (Google only) */}
          {provider === 'google' && (
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
          )}

          {/* AI Temperature */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Temperature</h3>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="w-12 text-right font-mono text-sm text-slate-900 dark:text-white">{temperature.toFixed(1)}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              <strong>Default 0.3</strong> — keeps the AI faithful to your uploaded exam wording (recommended).
              Higher values give the AI more freedom; this may rewrite or paraphrase your original questions and
              should ONLY be used when generating questions from study material (not pre-written exams).
            </p>
            {temperature > 0.3 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-bold">
                ⚠ Above 0.3 the AI may alter the wording of your uploaded questions.
              </p>
            )}
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
