
import React, { useState } from 'react';
import { ExamConfig, ExamMode, QuestionOrder, AnswerFormat } from '../types';

interface ExamSetupProps {
  onStart: (config: ExamConfig) => void;
}

const ExamSetup: React.FC<ExamSetupProps> = ({ onStart }) => {
  const [examName, setExamName] = useState('');
  const [mode, setMode] = useState<ExamMode>('MOCK');
  const [order, setOrder] = useState<QuestionOrder>('SEQUENTIAL');
  const [answerFormat, setAnswerFormat] = useState('AUTO');
  const [duration, setDuration] = useState(60);
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [contentRange, setContentRange] = useState('');

  const durations = [30, 60, 90, 120, 150, 180, 210, 240];

  const handleStart = () => {
    onStart({
      examName: examName.trim() || undefined,
      mode,
      durationMinutes: duration,
      totalQuestions: questionCount,
      model: selectedModel,
      questionOrder: order,
      answerFormat: answerFormat as AnswerFormat,
      contentRange: contentRange.trim() || undefined
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 animate-fade-in transition-colors">
      <h2 className="text-3xl font-bold mb-8 text-center text-slate-900 dark:text-white tracking-tight">Configure Your Session</h2>
      
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
              {questionCount > 30 && (
                <span className="ml-2 text-amber-500 font-black animate-pulse">! High Load</span>
              )}
            </label>
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-white"
            />
            {questionCount > 30 && (
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
              onClick={() => setSelectedModel('gemini-3-flash-preview')}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col text-left ${selectedModel === 'gemini-3-flash-preview' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-100 dark:border-slate-700 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <span className="font-bold text-xs">Gemini 3 Flash</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Recommended for speed.</span>
            </button>
            <button 
              type="button"
              onClick={() => setSelectedModel('gemini-3-pro-preview')}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col text-left ${selectedModel === 'gemini-3-pro-preview' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-100 dark:border-slate-700 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600'}`}
            >
              <span className="font-bold text-xs">Gemini 3 Pro</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Best for complex reasoning.</span>
            </button>
          </div>
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
              placeholder="e.g., 'Pages 10-20', 'Chapter 3'..."
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
