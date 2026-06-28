import { describe, it, expect } from 'vitest';
import { buildMinimaxMessages } from '../geminiService';

describe('buildMinimaxMessages', () => {
  it('prepends the system instruction as a system message', () => {
    const { messages } = buildMinimaxMessages(
      { parts: [{ text: 'hello' }] },
      'You are a tutor.'
    );
    expect(messages[0]).toEqual({ role: 'system', content: 'You are a tutor.' });
    expect(messages[1]).toEqual({ role: 'user', content: 'hello' });
  });

  it('omits the system message when no instruction is given', () => {
    const { messages } = buildMinimaxMessages({ parts: [{ text: 'hi' }] });
    expect(messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('joins multiple text parts of a single user turn', () => {
    const { messages } = buildMinimaxMessages({
      parts: [{ text: 'line1' }, { text: 'line2' }],
    });
    expect(messages[0]).toEqual({ role: 'user', content: 'line1\nline2' });
  });

  it('flags inline file parts so the caller can reject them', () => {
    const { hasFile } = buildMinimaxMessages({
      parts: [{ text: 'analyze' }, { inlineData: { data: 'abc', mimeType: 'application/pdf' } }],
    });
    expect(hasFile).toBe(true);
  });

  it('does not flag a text-only single turn', () => {
    const { hasFile } = buildMinimaxMessages({ parts: [{ text: 'just text' }] });
    expect(hasFile).toBe(false);
  });

  it('maps a role-tagged message list (array form), translating model -> assistant', () => {
    const { messages, hasFile } = buildMinimaxMessages([
      { role: 'user', parts: [{ text: 'q1' }] },
      { role: 'model', parts: [{ text: 'a1' }] },
    ]);
    expect(hasFile).toBe(false);
    expect(messages).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
    ]);
  });

  it('maps a chatbot-style { parts: [{role, parts}] } message list', () => {
    const { messages } = buildMinimaxMessages(
      {
        parts: [
          { role: 'user', parts: [{ text: 'q1' }] },
          { role: 'model', parts: [{ text: 'a1' }] },
          { role: 'user', parts: [{ text: 'q2' }] },
        ],
      },
      'system prompt'
    );
    expect(messages).toEqual([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
    ]);
  });
});
