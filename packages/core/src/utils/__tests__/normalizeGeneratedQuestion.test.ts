import { describe, it, expect } from 'vitest';
import { normalizeGeneratedQuestion } from '../fileProcessor';

describe('normalizeGeneratedQuestion', () => {
  it('single: matches correctAnswer to an option (strips label prefix)', () => {
    const q = normalizeGeneratedQuestion(
      {
        question: 'Q?',
        type: 'single',
        options: ['Apple', 'Banana'],
        correctAnswer: 'B) Banana',
        explanation: 'e',
        sourceQuote: 's',
        topic: 't',
      },
      0,
    );
    expect(q).not.toBeNull();
    expect(q!.type).toBe('single');
    expect(q!.correctAnswer).toBe('Banana');
    expect(q!.id).toBe(1);
  });

  it('defaults missing type to single', () => {
    const q = normalizeGeneratedQuestion(
      { question: 'Q?', options: ['A', 'B'], correctAnswer: 'A', explanation: '', sourceQuote: '' },
      0,
    );
    expect(q!.type).toBe('single');
  });

  it('multiple: keeps the full correct set and backfills correctAnswer', () => {
    const q = normalizeGeneratedQuestion(
      {
        question: 'Choose two',
        type: 'multiple',
        options: ['A', 'B', 'C', 'D'],
        correctAnswers: ['A', 'D'],
        correctAnswer: 'A',
        explanation: '',
        sourceQuote: '',
      },
      0,
    );
    expect(q!.type).toBe('multiple');
    expect(q!.correctAnswers).toEqual(['A', 'D']);
    expect(q!.correctAnswer).toBe('A');
  });

  it('multiple: falls back to single when correctAnswers unusable', () => {
    const q = normalizeGeneratedQuestion(
      {
        question: 'Q',
        type: 'multiple',
        options: ['A', 'B'],
        correctAnswers: [],
        correctAnswer: 'B',
        explanation: '',
        sourceQuote: '',
      },
      0,
    );
    expect(q!.type).toBe('single');
    expect(q!.correctAnswer).toBe('B');
  });

  it('matching: builds pairs, ensures answers in options, backfills correctAnswer', () => {
    const q = normalizeGeneratedQuestion(
      {
        question: 'Match',
        type: 'matching',
        options: ['Fix'],
        pairs: [
          { prompt: 'Too many defects', answer: 'Fix' },
          { prompt: 'Delay', answer: 'Sync' },
        ],
        explanation: '',
        sourceQuote: '',
      },
      2,
    );
    expect(q!.type).toBe('matching');
    expect(q!.pairs).toHaveLength(2);
    expect(q!.options).toContain('Sync'); // added because it was missing
    expect(q!.correctAnswer).toBe('Too many defects → Fix');
    expect(q!.id).toBe(3);
  });

  it('matching: drops question with no valid pairs', () => {
    expect(
      normalizeGeneratedQuestion({ question: 'Match', type: 'matching', options: [], pairs: [], explanation: '', sourceQuote: '' }, 0),
    ).toBeNull();
  });

  it('dropdown: normalizes blanks and unions options', () => {
    const q = normalizeGeneratedQuestion(
      {
        question: 'Pick {{b1}}',
        type: 'dropdown',
        options: [],
        blanks: [
          { label: 'Gain', options: ['Strategic agility', 'Tactical planning'], correctAnswer: 'Strategic agility' },
        ],
        explanation: '',
        sourceQuote: '',
      },
      0,
    );
    expect(q!.type).toBe('dropdown');
    expect(q!.blanks).toHaveLength(1);
    expect(q!.options).toEqual(['Strategic agility', 'Tactical planning']);
    expect(q!.correctAnswer).toBe('Strategic agility');
  });

  it('dropdown: adds correctAnswer to blank options if missing', () => {
    const q = normalizeGeneratedQuestion(
      {
        question: 'Q',
        type: 'dropdown',
        blanks: [{ options: ['X'], correctAnswer: 'Y' }],
        explanation: '',
        sourceQuote: '',
      },
      0,
    );
    expect(q!.blanks![0].options).toContain('Y');
  });

  it('returns null for non-object / missing question', () => {
    expect(normalizeGeneratedQuestion(null, 0)).toBeNull();
    expect(normalizeGeneratedQuestion({ options: ['A'] }, 0)).toBeNull();
  });

  it('single: drops question with no options', () => {
    expect(
      normalizeGeneratedQuestion({ question: 'Q', type: 'single', options: [], correctAnswer: 'A', explanation: '', sourceQuote: '' }, 0),
    ).toBeNull();
  });
});
