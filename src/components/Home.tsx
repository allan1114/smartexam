
import React, { useState } from 'react';
import { ExamResult, DocumentSource } from '../types';
import DocumentUploadSection from './Home/DocumentUploadSection';
import HistoryStats from './Home/HistoryStats';
import ExamHistoryList from './Home/ExamHistoryList';

interface HomeProps {
  onDocLoaded: (source: DocumentSource) => void;
  history: ExamResult[];
  onDeleteHistory: (id: string) => void;
  onRenameHistory: (id: string, newName: string) => void;
  onImportHistory: (data: ExamResult[]) => void;
  onClearAllHistory: () => void;
  onViewResult: (result: ExamResult) => void;
}

const Home: React.FC<HomeProps> = ({
  onDocLoaded,
  history,
  onDeleteHistory,
  onRenameHistory,
  onImportHistory,
  onClearAllHistory,
  onViewResult,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'gdoc' | 'paste'>('upload');
  const [error, setError] = useState<string | null>(null);

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

      <DocumentUploadSection
        onDocLoaded={onDocLoaded}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        error={error}
      />

      {history.length > 0 && (
        <>
          <HistoryStats history={history} onClearAll={onClearAllHistory} />
          <ExamHistoryList
            history={history}
            onViewResult={onViewResult}
            onDeleteHistory={onDeleteHistory}
            onRenameHistory={onRenameHistory}
          />
        </>
      )}
    </div>
  );
};

export default Home;
