
import React, { useState, useEffect } from 'react';
import { ExamConfig, ExamMode, QuestionOrder, AnswerFormat } from '../types';
import { loadQuestionBank, questionBankKey } from '../utils/questionBank';
import { DEFAULT_MODEL } from '../constants/models';

interface ExamSetupProps {
  onStart: (config: ExamConfig) => void;
  docHash?: string | null;
  onRegenerateBank?: (docHash: string) => void;
}

const ExamSetup: React.FC<ExamSetupProps> = ({ onStart, docHash, onRegenerateBank }) => {
  const [examName, setExamName] = useState('');
  const [mode, setMode] = useState<ExamMode>('MOCK');
  const [order, setOrder] = useState<QuestionOrder>('SEQUENTIAL');
  const [answerFormat, setAnswerFormat] = useState('AUTO');
  const [duration, setDuration] = useState(60);
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('smart_exam_model') : null;
    return saved || DEFAULT_MODEL;
  });
  const [contentRange, setContentRange] = useState('');
  const [useAllQuestions, setUseAllQuestions] = useState(false);
  const [bankInfo, setBankInfo] = useState<
    { poolSize: number; caseType: 'A' | 'B'; extractionComplete?: boolean } | null
  >(null);

  // A Focus Range produces its own bank, so the "bank ready" panel and the
  // Regenerate button must both address the bank for the range currently typed
  // — otherwise they describe (and delete) the full-document bank instead.
  const bankKey = docHash ? questionBankKey(docHash, contentRange.trim() || undefined) : null;

  useEffect(() => {
    if (bankKey) {
      const bank = loadQuestionBank(bankKey);
      setBankInfo(
        bank
          ? { poolSize: bank.poolSize, caseType: bank.caseType, extractionComplete: bank.extractionComplete }
          : null
      );
    } else {
      setBankInfo(null);
    }
  }, [bankKey]);

  const handleRegenerate = () => {
    if (!bankKey || !onRegenerateBank) return;
    if (confirm('Regenerate question bank? The AI will re-analyze the document on the next exam. This deletes the cached pool.')) {
      onRegenerateBank(bankKey);
      setBankInfo(null);
    }
  };

  const durations = [30, 60, 90, 120, 150, 180, 210, 240];

  const handleStart = () => {
    const savedTemp = parseFloat(localStorage.getItem('smart_exam_temperature') || '0.3');
    const temperature = Number.isFinite(savedTemp) ? Math.min(1, Math.max(0, savedTemp)) : 0.3;
    onStart({
      examName: examName.trim() || undefined,
      mode,
      durationMinutes: duration,
      totalQuestions: questionCount,
      model: selectedModel,
      questionOrder: order,
      answerFormat: answerFormat as AnswerFormat,
      contentRange: contentRange.trim() || undefined,
      temperature,
      useAllQuestions
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 animate-fade-in transition-colors">
      <h2 className="text-3xl font-bold mb-8 text-center text-slate-900 dark:text-white tracking-tight">Configure Your Session</h2>

      {bankInfo && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-start justify-between gap-4">
          <div className="text-sm text-emerald-900 dark:text-emerald-200">
            <p className="font-bold">Question bank ready ({bankInfo.poolSize} questions, CASE {bankInfo.caseType})</p>
            {bankInfo.caseType === 'A' && (
              <p className="text-xs mt-1 font-bold">
                {bankInfo.extractionComplete === false
                  ? '⚠️ 抽取未完成 — 題庫可能未包含文件全部題目，建議按 Regenerate 重試。'
                  : '✅ 已抽取整份文件的題目，可用「Use every question」原封不動載入全部題目。'}
              </p>
            )}
            <p className="text-xs mt-1 opacity-80">Each new exam will sample a different subset locally — no extra AI calls. Click <em>Regenerate</em> to re-analyze the document.</p>
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-slate-600 transition"
          >
            Regenerate
          </button>
        </div>
      )}

      <div className="space-y-8">
        {/* Exam Name */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Exam Name</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="e.g., Biology Final, Math Quiz 1..."
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="w-full p-4 pl-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 focus:border-indigo-600 outline-none font-bold text-slate-900 dark:text-white transition-all"
            />
          </div>
        </div>

        {/* Question Count & Order */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
              Total Questions
              {!useAllQuestions && questionCount > 30 && (
                <span className="ml-2 text-amber-500 font-black animate-pulse">! High Load</span>
              )}
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={useAllQuestions ? (bankInfo?.poolSize ?? questionCount) : questionCount}
              disabled={useAllQuestions}
              onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label className="flex items-start gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAllQuestions}
                onChange={(e) => setUseAllQuestions(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-indigo-600 shrink-0"
              />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                Use every question
                <span className="block font-medium opacity-70">
                  載入文件全部題目，唔會抽樣。
                  {useAllQuestions && bankInfo && ` 目前題庫：${bankInfo.poolSize} 題。`}
                </span>
              </span>
            </label>
            {!useAllQuestions && questionCount > 30 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-bold leading-tight">
                Large requests (&gt;30) may time out. Consider breaking them into smaller sessions.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Question Order</label>
            <select 
              value={order}
              onChange={(e) => setOrder(e.target.value as QuestionOrder)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white"
            >
              <option value="SEQUENTIAL">Sequential</option>
              <option value="RANDOM">Randomized</option>
            </select>
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">AI Engine</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedModel('gemini-2.5-flash')}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col text-left ${selectedModel === 'gemini-2.5-flash' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-100 dark:border-slate-700 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <span className="font-bold text-xs">Gemini 2.5 Flash</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Stable GA · best uptime.</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedModel('gemini-2.5-pro')}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col text-left ${selectedModel === 'gemini-2.5-pro' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-100 dark:border-slate-700 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <span className="font-bold text-xs">Gemini 2.5 Pro</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Best for complex reasoning.</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
            Use <strong>Settings ⚙️</strong> to pick newer models (3 Flash, 3.5 Flash, 3.1 Pro …). Overloaded models auto-fall back to 2.5 Flash.
          </p>
        </div>

        {/* Mode Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Session Mode</label>
          <div className="grid grid-cols-3 gap-3">
            <button 
              type="button"
              onClick={() => setMode('MOCK')}
              className={`p-3 rounded-xl border-2 transition-all text-left ${mode === 'MOCK' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-slate-100 dark:border-slate-700 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <span className="font-bold text-sm">Mock</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Timed exam simulation.</p>
            </button>
            <button 
              type="button"
              onClick={() => setMode('PRACTICE')}
              className={`p-3 rounded-xl border-2 transition-all text-left ${mode === 'PRACTICE' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-slate-100 dark:border-slate-700 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <span className="font-bold text-sm">Practice</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Instant feedback.</p>
            </button>
            <button 
              type="button"
              onClick={() => setMode('STUDY_GUIDE')}
              className={`p-3 rounded-xl border-2 transition-all text-left ${mode === 'STUDY_GUIDE' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-slate-100 dark:border-slate-700 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <span className="font-bold text-sm">Study</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Focus on learning.</p>
            </button>
          </div>
        </div>

        {/* Answer Format Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Expected Answer Format</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'AUTO', label: 'Auto' },
              { id: 'MCQ_4', label: 'A-D' },
              { id: 'MCQ_5', label: 'A-E' },
              { id: 'TF', label: 'T / F' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAnswerFormat(f.id)}
                className={`p-2 rounded-lg border-2 text-center text-xs font-bold transition-all ${answerFormat === f.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Range */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
            Focus Range (Optional)
          </label>
          <div className="relative">
             <input 
              type="text" 
              placeholder="e.g., 'Question 179-250', 'Pages 10-20', 'Chapter 3'..."
              value={contentRange}
              onChange={(e) => setContentRange(e.target.value)}
              className="w-full p-3 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            {contentRange && (
              <div className="absolute right-3 top-3.5">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
            題號範圍（例如 <code>179-250</code>）會令 AI 只抽取該段題目，並為該範圍單獨建立題庫。
          </p>
        </div>

        {mode === 'MOCK' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Exam Duration (Mins)</label>
            <div className="flex flex-wrap gap-2">
              {durations.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${duration === d ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none active:scale-[0.98] mt-4"
        >
          {mode === 'STUDY_GUIDE' ? 'Create Study Guide' : 'Generate Exam Now'}
        </button>
      </div>
    </div>
  );
};

export default ExamSetup;
