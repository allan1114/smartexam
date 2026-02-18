
import React, { useState, useMemo, useRef } from 'react';
import { ExamResult, DocumentSource } from '../types';

interface HomeProps {
  onDocLoaded: (source: DocumentSource) => void;
  history: ExamResult[];
  onDeleteHistory: (id: string) => void;
  onRenameHistory: (id: string, newName: string) => void;
  onImportHistory: (data: ExamResult[]) => void;
  onClearAllHistory: () => void;
  onViewResult: (result: ExamResult) => void;
}

const Home: React.FC<HomeProps> = ({ onDocLoaded, history, onDeleteHistory, onRenameHistory, onImportHistory, onClearAllHistory, onViewResult }) => {
  const [isFetching, setIsFetching] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'gdoc' | 'paste'>('upload');
  const [pastedContent, setPastedContent] = useState('');
  const [gDocId, setGDocId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const validHistory = history.filter(h => h && h.totalQuestions > 0);
    if (validHistory.length === 0) return null;
    const totalExams = validHistory.length;
    const avgScore = validHistory.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / totalExams;
    const passRate = validHistory.filter(h => (h.score / h.totalQuestions) >= 0.75).length / totalExams;
    
    return {
      totalExams,
      avgScore: Math.round(avgScore * 100),
      passRate: Math.round(passRate * 100)
    };
  }, [history]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        onDocLoaded({
          fileData: { data: base64, mimeType: file.type }
        });
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          onDocLoaded({ text: event.target?.result as string });
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setError("Failed to process file. Please try a different document.");
    }
  };

  const extractDocId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleGoogleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const docId = extractDocId(googleDocUrl);
    
    if (!docId) {
      setError("Please enter a valid Google Docs URL.");
      return;
    }

    setGDocId(docId);
    setIsFetching(true);
    
    try {
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      const response = await fetch(exportUrl);
      
      if (!response.ok) {
        throw new Error("Unable to fetch document. Google Docs security might be blocking direct access. Please use the Manual Fallback method below.");
      }
      
      const text = await response.text();
      if (!text || text.trim().length < 20) throw new Error("Document content is too sparse or restricted.");
      
      onDocLoaded({ text });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="animate-fade-in py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          SmartExam <span className="text-indigo-600 dark:text-indigo-400">AI</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
          Professional Practice & Exam Simulation
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-12">
        <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button 
            onClick={() => {setActiveTab('upload'); setError(null);}}
            className={`flex-1 py-5 font-bold text-sm transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
          >
            Upload File
          </button>
          <button 
            onClick={() => {setActiveTab('gdoc'); setError(null);}}
            className={`flex-1 py-5 font-bold text-sm transition-all ${activeTab === 'gdoc' ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
          >
            Google Docs
          </button>
          <button 
            onClick={() => {setActiveTab('paste'); setError(null);}}
            className={`flex-1 py-5 font-bold text-sm transition-all ${activeTab === 'paste' ? 'bg-white dark:bg-slate-800 text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}
          >
            Manual Paste
          </button>
        </div>

        <div className="p-10">
          {activeTab === 'upload' && (
            <div className="text-center">
              <input 
                type="file" 
                accept=".txt,.pdf,.doc,.docx,.jpg,.png"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:text-sm file:font-black file:bg-slate-900 file:text-white border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 rounded-3xl"
              />
              <p className="mt-4 text-xs text-slate-400 font-medium">Supports PDF, Text, and Images of exam papers.</p>
            </div>
          )}

          {activeTab === 'gdoc' && (
            <div className="space-y-6">
              <form onSubmit={handleGoogleDocSubmit} className="space-y-4">
                <input 
                  type="url" 
                  placeholder="Paste shared Google Doc URL..."
                  value={googleDocUrl}
                  onChange={(e) => setGoogleDocUrl(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit"
                  disabled={isFetching}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 flex items-center justify-center"
                >
                  {isFetching ? "Accessing..." : "Import Document"}
                </button>
              </form>
              
              {error && (
                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                  <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-2">Import Issue Detected</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-500 mb-4">{error}</p>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-amber-600">How to fix:</p>
                    <ol className="text-xs text-amber-800 dark:text-amber-400 space-y-1 list-decimal list-inside">
                      <li>Ensure Doc is shared as "Anyone with link can view".</li>
                      <li>Or, click "Manual Paste" tab above.</li>
                      <li>Copy-paste your text directly from the Doc.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="Paste exam questions or study text here..."
                className="w-full min-h-[250px] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none"
              />
              <button 
                onClick={() => onDocLoaded({ text: pastedContent })}
                disabled={pastedContent.length < 50}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 disabled:opacity-50"
              >
                Process Questions
              </button>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && stats && (
        <div className="animate-slide-up">
          <div className="flex justify-between items-center mb-8 px-4">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Recent Progress</h2>
            <button onClick={onClearAllHistory} className="text-xs font-bold text-red-500 hover:underline">Clear All</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { label: 'Total Exams', val: stats.totalExams, color: 'indigo' },
              { label: 'Avg Accuracy', val: stats.avgScore + '%', color: 'emerald' },
              { label: 'Pass Rate', val: stats.passRate + '%', color: 'amber' }
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white">{s.val}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {history.map((result) => (
              <div key={result.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm group">
                <div className="flex items-center space-x-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${
                    (result.score / result.totalQuestions) >= 0.75 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {Math.round((result.score / result.totalQuestions) * 100)}%
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {result.customName || result.mode.replace('_', ' ')}
                    </h4>
                    <p className="text-slate-500 text-sm font-bold">
                      {new Date(result.endTime).toLocaleDateString()} • {result.score}/{result.totalQuestions} Correct
                    </p>
                  </div>
                </div>
                <button onClick={() => onViewResult(result)} className="px-6 py-3 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-colors">REVIEW</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
