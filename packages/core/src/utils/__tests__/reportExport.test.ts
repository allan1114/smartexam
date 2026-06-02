import { describe, it, expect } from 'vitest';
import { generateReportHtml } from '../reportExport';
import { ExamResult } from '../../types';

const makeResult = (): ExamResult => ({
  id: 'r1',
  score: 1,
  totalQuestions: 2,
  mode: 'MOCK',
  model: 'gemini-2.5-flash',
  startTime: 0,
  endTime: 1700000000000,
  customName: 'My Exam',
  questions: [
    {
      id: 1,
      question: 'What is 2 + 2?',
      options: ['3', '4', '5'],
      correctAnswer: '4',
      explanation: 'Basic arithmetic.',
      sourceQuote: 'two plus two equals four',
      topic: 'Math',
    },
    {
      id: 2,
      question: 'Capital of France?',
      options: ['Paris', 'Rome'],
      correctAnswer: 'Paris',
      explanation: 'Paris is the capital.',
      sourceQuote: 'Paris, the capital of France',
      topic: 'Geo',
    },
  ],
  answers: [
    { questionId: 1, selectedOption: '4', isCorrect: true, timeSpent: 5 },
    { questionId: 2, selectedOption: 'Rome', isCorrect: false, timeSpent: 8 },
  ],
});

describe('generateReportHtml', () => {
  const html = generateReportHtml(makeResult());

  it('produces a self-contained HTML document', () => {
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<style>');
    expect(html).not.toContain('<script'); // no scripts, safe to open
  });

  it('includes the score summary', () => {
    expect(html).toContain('50%'); // 1 / 2
    expect(html).toContain('1 / 2 Correct');
    expect(html).toContain('My Exam');
  });

  it('includes every question, the correct answer and explanation', () => {
    expect(html).toContain('What is 2 + 2?');
    expect(html).toContain('Capital of France?');
    expect(html).toContain('Basic arithmetic.');
    expect(html).toContain('two plus two equals four');
  });

  it('marks correct and incorrect questions', () => {
    expect(html).toContain('CORRECT');
    expect(html).toContain('INCORRECT');
  });

  it('escapes HTML to avoid breaking the document', () => {
    const result = makeResult();
    result.questions[0].question = 'Is a < b & c > d?';
    const out = generateReportHtml(result);
    expect(out).toContain('Is a &lt; b &amp; c &gt; d?');
    expect(out).not.toContain('a < b & c > d?');
  });
});
