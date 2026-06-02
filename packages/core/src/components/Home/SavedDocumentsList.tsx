import React from 'react';
import { SavedDocument } from '../../utils/documentLibrary';

interface SavedDocumentsListProps {
  documents: SavedDocument[];
  onSelect: (doc: SavedDocument) => void;
  onDelete: (hash: string) => void;
}

const SavedDocumentsList: React.FC<SavedDocumentsListProps> = ({ documents, onSelect, onDelete }) => {
  if (!documents || documents.length === 0) return null;

  return (
    <div className="mb-12 animate-fade-in">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">已儲存文件 · Saved Documents</h2>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">免重複上傳 · Skip re-upload</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {documents.map(doc => (
          <div
            key={doc.hash}
            className="group flex items-center justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
          >
            <button
              type="button"
              onClick={() => onSelect(doc)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
              title="重新開啟此文件 · Reopen this document"
            >
              <span className={`flex-none w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${doc.kind === 'text' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                {doc.kind === 'text' ? 'TXT' : 'FILE'}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-sm text-slate-900 dark:text-white">{doc.name}</span>
                <span className="block text-[11px] text-slate-400 font-medium">
                  {new Date(doc.lastUsedAt).toLocaleDateString()}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(doc.hash)}
              className="flex-none text-slate-300 hover:text-red-500 transition-colors p-1"
              title="移除 · Remove"
              aria-label={`Remove ${doc.name}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedDocumentsList;
