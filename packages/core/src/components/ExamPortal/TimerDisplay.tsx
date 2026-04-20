import React from 'react';

interface TimerDisplayProps {
  timeLeft: number;
  isMock: boolean;
  isWarning: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ timeLeft, isMock, isWarning }) => {
  if (!isMock) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`px-6 py-2 rounded-2xl border-2 flex flex-col items-center ${
        isWarning
          ? 'border-red-500 bg-red-50 text-red-600 animate-pulse'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">Time Remaining</span>
      <span className="font-mono font-black text-2xl">{formatTime(timeLeft)}</span>
    </div>
  );
};

export default TimerDisplay;
