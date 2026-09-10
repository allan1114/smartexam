// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ExamSetup from '../ExamSetup';
import { saveQuestionBank } from '../../utils/questionBank';
import { OriginalQuestion } from '../../types';

/**
 * The question-source contract. ExamSetup is where the user declares whether the
 * document IS the paper; everything downstream (prompt shape, temperature, count,
 * ordering) keys off the config this component emits.
 */

const startButton = () => screen.getByRole('button', { name: /Generate Exam Now|Create Study Guide/i });
const sourceButton = (name: RegExp) => screen.getByRole('button', { name });

const REFERENCE = /原文抽取/;
const GENERATE = /AI 生成/;

const makeBankQuestions = (count: number): OriginalQuestion[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    question: `Q${i + 1}`,
    type: 'single' as const,
    options: ['a', 'b'],
    correctAnswer: 'a',
    explanation: '',
    sourceQuote: '',
    topic: 'T',
    _locked: true as const,
  }));

describe('ExamSetup — question source', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to reference mode for an uploaded file', () => {
    const onStart = vi.fn();
    render(<ExamSetup onStart={onStart} isFileSource />);

    expect(sourceButton(REFERENCE)).toHaveAttribute('aria-pressed', 'true');
    expect(sourceButton(GENERATE)).toHaveAttribute('aria-pressed', 'false');
  });

  it('defaults to generate mode for pasted text', () => {
    const onStart = vi.fn();
    render(<ExamSetup onStart={onStart} isFileSource={false} />);

    expect(sourceButton(GENERATE)).toHaveAttribute('aria-pressed', 'true');
    expect(sourceButton(REFERENCE)).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits every-question, document-order config in reference mode', () => {
    const onStart = vi.fn();
    render(<ExamSetup onStart={onStart} isFileSource />);

    fireEvent.click(startButton());

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toMatchObject({
      referenceMode: true,
      useAllQuestions: true,
      questionOrder: 'SEQUENTIAL',
    });
  });

  it('hides the count and order controls in reference mode', () => {
    render(<ExamSetup onStart={vi.fn()} isFileSource />);

    expect(screen.queryByText(/Total Questions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Question Order/i)).not.toBeInTheDocument();
    expect(screen.getByText(/依文件原本次序/)).toBeInTheDocument();
  });

  it('restores the count and order controls when switched to generate mode', () => {
    const onStart = vi.fn();
    render(<ExamSetup onStart={onStart} isFileSource />);

    fireEvent.click(sourceButton(GENERATE));

    expect(screen.getByText(/Total Questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Question Order/i)).toBeInTheDocument();

    fireEvent.click(startButton());
    expect(onStart.mock.calls[0][0]).toMatchObject({
      referenceMode: false,
      useAllQuestions: false,
      questionOrder: 'SEQUENTIAL',
    });
  });

  it('reference mode overrides a Randomized order the user had selected', () => {
    const onStart = vi.fn();
    render(<ExamSetup onStart={onStart} isFileSource={false} />);

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'RANDOM' } });
    fireEvent.click(sourceButton(REFERENCE));
    fireEvent.click(startButton());

    expect(onStart.mock.calls[0][0]).toMatchObject({
      referenceMode: true,
      questionOrder: 'SEQUENTIAL',
    });
  });

  it('flags a cached AI-generated bank as unusable for reference mode', () => {
    const docHash = 'doc-abc';
    saveQuestionBank({
      documentHash: docHash,
      questions: makeBankQuestions(3),
      caseType: 'B',
      modelUsed: 'gemini-2.5-flash',
      extractionComplete: true,
    });

    render(<ExamSetup onStart={vi.fn()} docHash={docHash} isFileSource />);

    expect(screen.getByText(/AI 生成（CASE B）/)).toBeInTheDocument();
  });

  it('does not flag a transcribed bank', () => {
    const docHash = 'doc-def';
    saveQuestionBank({
      documentHash: docHash,
      questions: makeBankQuestions(3),
      caseType: 'A',
      modelUsed: 'gemini-2.5-flash',
      extractionComplete: true,
    });

    render(<ExamSetup onStart={vi.fn()} docHash={docHash} isFileSource />);

    expect(screen.queryByText(/AI 生成（CASE B）/)).not.toBeInTheDocument();
    expect(screen.getByText(/已抽取整份文件的題目/)).toBeInTheDocument();
  });
});
