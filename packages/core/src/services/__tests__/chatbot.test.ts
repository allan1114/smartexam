// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getChatbotResponse } from '../geminiService';

/**
 * The ChatBot used to send `{ parts: [{role, parts}, …] }`, which Gemini turned
 * into contents[0].parts = [{role, parts}] — `role` and `parts` are not valid
 * Part fields, so the API answered 400 on EVERY chat message. The catch inside
 * getChatbotResponse swallowed it and returned the "連線不穩定" fallback, so the
 * feature looked like a flaky network rather than a malformed request.
 */

const getRequestBody = (fetchMock: ReturnType<typeof vi.fn>, callIdx: number) =>
  JSON.parse((fetchMock.mock.calls[callIdx][1] as RequestInit).body as string);

const okResponse = (text: string) =>
  ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  }) as unknown as Response;

describe('getChatbotResponse request shape', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('smart_exam_api_key', 'test-key');
    localStorage.removeItem('smart_exam_use_proxy');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a flat array of role-tagged messages, never nested parts', async () => {
    fetchMock.mockResolvedValueOnce(okResponse('Here is the answer.'));

    const reply = await getChatbotResponse(
      [
        { role: 'user', content: 'first question' },
        { role: 'assistant', content: 'first answer' },
      ],
      'follow-up question',
      'study material'
    );

    expect(reply).toBe('Here is the answer.');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const { contents } = getRequestBody(fetchMock, 0);
    expect(Array.isArray(contents)).toBe(true);
    expect(contents).toHaveLength(3);

    // Every entry is a Content: a role plus parts that are real Parts.
    for (const c of contents) {
      expect(['user', 'model']).toContain(c.role);
      expect(Array.isArray(c.parts)).toBe(true);
      for (const p of c.parts) {
        expect(typeof p.text).toBe('string');
        // The old bug: message objects leaking into the parts array.
        expect(p).not.toHaveProperty('role');
        expect(p).not.toHaveProperty('parts');
      }
    }

    expect(contents[0]).toEqual({ role: 'user', parts: [{ text: 'first question' }] });
    expect(contents[1]).toEqual({ role: 'model', parts: [{ text: 'first answer' }] });
    expect(contents[2]).toEqual({ role: 'user', parts: [{ text: 'follow-up question' }] });
  });

  it('does not retry against a fallback model when the request itself is invalid', async () => {
    // A 400 is a malformed request, not an unavailable model — a second model
    // rejects it identically, so the retry only burned an extra billable call.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: { message: 'Invalid JSON payload received.' } }),
    } as unknown as Response);

    await getChatbotResponse([], 'hello', 'ctx');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
