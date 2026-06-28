import React, { useState } from 'react';
import { DocumentSource } from '../../types';
import { fileToBase64 } from '../../utils/fileProcessor';

interface DocumentUploadSectionProps {
  onDocLoaded: (source: DocumentSource) => void;
  activeTab: 'upload' | 'gdoc' | 'paste';
  onTabChange: (tab: 'upload' | 'gdoc' | 'paste') => void;
  error: string | null;
}

// Largest file we accept. PDFs/images above the Gemini inline cap are uploaded
// via the Files API downstream, so 50MB is fully supported in direct API mode.
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;

const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  onDocLoaded,
  activeTab,
  onTabChange,
  error,
}) => {
  const [isFetching, setIsFetching] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [localError, setLocalError] = useState<string | null>(error);
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError(null);
    setFileInfo(null);

    if (file.size > MAX_FILE_SIZE) {
      setLocalError(
        `檔案太大 (${formatSize(file.size)})，上限為 ${formatSize(MAX_FILE_SIZE)}。請壓縮 PDF 或分拆檔案後再上傳。`
      );
      e.target.value = '';
      return;
    }

    try {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setFileInfo(`處理中：${file.name} (${formatSize(file.size)})…`);
        const base64 = await fileToBase64(file);
        onDocLoaded({
          fileData: { data: base64, mimeType: file.type },
          name: file.name,
        });
      } else {
        // Support all text files including .md, .txt, .doc content
        const reader = new FileReader();
        reader.onload = (event) => {
          onDocLoaded({ text: event.target?.result as string, name: file.name });
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setFileInfo(null);
      setLocalError("Failed to process file. Please try a different document.");
    }
  };

  const handleGoogleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const match = googleDocUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const docId = match ? match[1] : null;

    if (!docId) {
      setLocalError("Please enter a valid Google Docs URL.");
      return;
    }

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
      setLocalError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-12">
      <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        {(['upload', 'gdoc', 'paste'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {onTabChange(tab); setLocalError(null);}}
            className={`flex-1 py-5 font-bold text-sm transition-all ${activeTab === tab ? `bg-white dark:bg-slate-800 text-${tab === 'upload' ? 'indigo' : tab === 'gdoc' ? 'blue' : 'emerald'}-600 border-b-2 border-${tab === 'upload' ? 'indigo' : tab === 'gdoc' ? 'blue' : 'emerald'}-600` : 'text-slate-500'}`}
          >
            {tab === 'upload' && 'Upload File'}
            {tab === 'gdoc' && 'Google Docs'}
            {tab === 'paste' && 'Manual Paste'}
          </button>
        ))}
      </div>

      <div className="p-10">
        {activeTab === 'upload' && (
          <div className="text-center">
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx,.jpg,.png,.md"
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:text-sm file:font-black file:bg-slate-900 file:text-white border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 rounded-3xl"
            />
            <p className="mt-4 text-xs text-slate-400 font-medium">Supports PDF, Text, Markdown, and Images of exam papers — up to {formatSize(MAX_FILE_SIZE)}.</p>
            {fileInfo && (
              <p className="mt-2 text-xs text-indigo-500 font-medium">{fileInfo}</p>
            )}
            {localError && (
              <p className="mt-3 text-xs text-rose-600 dark:text-rose-400 font-semibold">{localError}</p>
            )}
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

            {localError && (
              <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-2">Import Issue Detected</h4>
                <p className="text-xs text-amber-700 dark:text-amber-500 mb-4">{localError}</p>
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
  );
};

export default DocumentUploadSection;
