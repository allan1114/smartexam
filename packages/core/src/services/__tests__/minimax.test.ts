import { describe, it, expect } from 'vitest';
import { buildMinimaxMessages } from '../geminiService';

const img = (mimeType = 'image/png', data = 'AAAA') => ({ inlineData: { data, mimeType } });

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

  it('does not flag a text-only single turn', () => {
    const { unsupportedFile } = buildMinimaxMessages({ parts: [{ text: 'just text' }] });
    expect(unsupportedFile).toBe(false);
  });

  it('maps a role-tagged message list (array form), translating model -> assistant', () => {
    const { messages, unsupportedFile } = buildMinimaxMessages([
      { role: 'user', parts: [{ text: 'q1' }] },
      { role: 'model', parts: [{ text: 'a1' }] },
    ]);
    expect(unsupportedFile).toBe(false);
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

  describe('images', () => {
    it('carries an image as an OpenAI image_url data URI alongside the text', () => {
      const { messages, unsupportedFile } = buildMinimaxMessages({
        parts: [{ text: 'analyze' }, img('image/png', 'PNGDATA')],
      });

      expect(unsupportedFile).toBe(false);
      expect(messages[0]).toEqual({
        role: 'user',
        content: [
          { type: 'text', text: 'analyze' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,PNGDATA' } },
        ],
      });
    });

    it('carries every page of a rasterized PDF, in order', () => {
      const { messages } = buildMinimaxMessages({
        parts: [
          { text: 'extract' },
          img('image/png', 'PAGE1'),
          img('image/png', 'PAGE2'),
          img('image/png', 'PAGE3'),
        ],
      });

      const content = messages[0].content as Array<Record<string, any>>;
      expect(content).toHaveLength(4);
      expect(content.slice(1).map(p => p.image_url.url)).toEqual([
        'data:image/png;base64,PAGE1',
        'data:image/png;base64,PAGE2',
        'data:image/png;base64,PAGE3',
      ]);
    });

    it('emits image-only content when the turn has no text', () => {
      const { messages } = buildMinimaxMessages({ parts: [img('image/jpeg', 'JPG')] });
      expect(messages[0].content).toEqual([
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,JPG' } },
      ]);
    });

    it('keeps a text-only turn as a plain string, not a content array', () => {
      // Guards the whole existing text-only surface: those request bodies must
      // go out exactly as they did before multimodal support landed.
      const { messages } = buildMinimaxMessages({ parts: [{ text: 'only text' }] });
      expect(typeof messages[0].content).toBe('string');
    });

    it('carries images in a chat-history turn instead of silently dropping them', () => {
      const { messages, unsupportedFile } = buildMinimaxMessages([
        { role: 'user', parts: [{ text: 'what is this' }, img('image/png', 'HIST')] },
      ]);

      expect(unsupportedFile).toBe(false);
      expect(messages[0].content).toEqual([
        { type: 'text', text: 'what is this' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,HIST' } },
      ]);
    });
  });

  describe('unsupported files', () => {
    it('flags a non-image inline blob', () => {
      const { unsupportedFile } = buildMinimaxMessages({
        parts: [{ text: 'analyze' }, { inlineData: { data: 'abc', mimeType: 'application/pdf' } }],
      });
      expect(unsupportedFile).toBe(true);
    });

    it('flags a Google Files API URI, which only Gemini can resolve', () => {
      const { unsupportedFile } = buildMinimaxMessages({
        parts: [{ text: 'analyze' }, { fileData: { fileUri: 'files/abc', mimeType: 'application/pdf' } }],
      });
      expect(unsupportedFile).toBe(true);
    });

    it('flags an unsupported file inside a chat-history turn', () => {
      // Previously hardcoded false for this shape, so the binary vanished and
      // the model answered about nothing.
      const { unsupportedFile } = buildMinimaxMessages([
        { role: 'user', parts: [{ text: 'read this' }, { inlineData: { data: 'x', mimeType: 'audio/mpeg' } }] },
      ]);
      expect(unsupportedFile).toBe(true);
    });

    it('flags an unsupported file inside a chatbot-style message list', () => {
      const { unsupportedFile } = buildMinimaxMessages({
        parts: [
          { role: 'user', parts: [{ text: 'q' }, { inlineData: { data: 'x', mimeType: 'video/mp4' } }] },
        ],
      });
      expect(unsupportedFile).toBe(true);
    });
  });
});
