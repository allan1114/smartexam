
export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceQuote: string; // New field for grounding
  refinedInsight?: string;
  topic?: string;
}

export type ExamMode = 'PRACTICE' | 'MOCK' | 'STUDY_GUIDE';
export type QuestionOrder = 'SEQUENTIAL' | 'RANDOM';
export type AnswerFormat = 'MCQ_4' | 'MCQ_5' | 'TF' | 'AUTO';

export interface DocumentSource {
  text?: string;
  fileData?: {
    data: string; // base64
    mimeType: string;
  };
}

export interface ExamConfig {
  mode: ExamMode;
  durationMinutes: number;
  totalQuestions: number;
  model: string;
  questionOrder: QuestionOrder;
  answerFormat: AnswerFormat;
  contentRange?: string;
  examName?: string;
}

export interface UserAnswer {
  questionId: number;
  selectedOption: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface ExamResult {
  id: string;
  score: number;
  totalQuestions: number;
  answers: UserAnswer[];
  questions: Question[];
  startTime: number;
  endTime: number;
  mode: ExamMode;
  model: string;
  customName?: string;
}

export interface PerformanceAnalysis {
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  commonMistakes: string[];
}

export enum AppState {
  HOME = 'HOME',
  SETUP = 'SETUP',
  LOADING = 'LOADING',
  EXAM = 'EXAM',
  RESULTS = 'RESULTS'
}