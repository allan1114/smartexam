// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractQuestionBank } from '../geminiService';
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../../constants/models';

/**
 * Continuation-extraction tests. All calls run in DIRECT Google mode (api key in
 * localStorage, proxy off) against a stubbed global fetch, so every request body
 * is inspectable and no network is touched.
 */

interface FakeQuestionOpts {
  idStart: number;
  count: number;
}

const makeQuestions = ({ idStart, count }: FakeQuestionOpts) =>
  Array.from({ length: count }, (_, i) => ({
    id: idStart + i,
    question: `Question number ${idStart + i} — what is the answer?`,
    type: 'single',
    options: [`Opt A ${idStart + i}`, `Opt B ${idStart + i}`, `Opt C ${idStart + i}`],
    correctAnswer: `Opt A ${idStart + i}`,
    explanation: 'because',
    sourceQuote: 'quote',
    topic: 'T',
  }));

/** Build a Gemini REST response carrying a question bank, optionally cut off mid-array. */
const makeBankResponse = (
  questions: unknown[],
  { truncate = false, finishReason, total }: { truncate?: boolean; finishReason?: string; total?: number } = {}
) => {
  let json = JSON.stringify({ caseType: 'A', ...(total !== undefined && { totalQuestionCount: total }), questions });
  if (truncate) {
    // Cut inside the final array element so repairTruncatedJson must salvage.
    json = json.slice(0, json.length - 40);
  }
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: { parts: [{ text: json }] },
          ...(finishReason ? { finishReason } : {}),
        },
      ],
    }),
  } as unknown as Response;
};

const getRequestBody = (fetchMock: ReturnType<typeof vi.fn>, callIdx: number) =>
  JSON.parse((fetchMock.mock.calls[callIdx][1] as RequestInit).body as string);

describe('extractQuestionBank — continuation rounds', () => {
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

  it('clean CASE A round is verified by a probe the model confirms empty', async () => {
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 1, count: 5 })))
      // Verification probe: the model confirms nothing remains after the anchor.
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const probeText = getRequestBody(fetchMock, 1).systemInstruction.parts[0].text as string;
    expect(probeText).toContain('CONTINUATION');
    expect(probeText).toContain("return an EMPTY 'questions' array");
    expect(result.questions).toHaveLength(5);
    expect(result.caseType).toBe('A');
    expect(result.extractionComplete).toBe(true);
  });

  it('probes past a clean finish even when the reported total matches what was emitted (lowballed totals)', async () => {
    // The historical 500-question failure: the model stops after a fraction of
    // the document with a clean STOP and reports a total equal to what it
    // emitted, so neither truncation nor short-of-total fires.
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 1, count: 5 }), { total: 5 }))
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 6, count: 5 }), { total: 10 }))
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.questions).toHaveLength(10);
    expect(result.extractionComplete).toBe(true);
  });

  it('probes past a clean finish when the model omits the total entirely', async () => {
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 1, count: 5 })))
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 6, count: 3 })))
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.questions).toHaveLength(8);
    expect(result.extractionComplete).toBe(true);
  });

  it('sets maxOutputTokens in generationConfig', async () => {
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 1, count: 3 })))
      .mockResolvedValueOnce(makeBankResponse([]));

    await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    const body = getRequestBody(fetchMock, 0);
    expect(body.generationConfig.maxOutputTokens).toBe(65536);
  });

  it('truncated round triggers a continuation anchored on the last question', async () => {
    const round1 = makeQuestions({ idStart: 1, count: 4 });
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(round1, { truncate: true }))
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 4, count: 3 })))
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const contBody = getRequestBody(fetchMock, 1);
    const sysText = contBody.systemInstruction.parts[0].text as string;
    expect(sysText).toContain('CONTINUATION');
    // Truncation drops the cut-off 4th element, so the anchor is question 3.
    expect(sysText).toContain('Question number 3');
    // 3 salvaged + 3 continuation (question 4 overlaps? no — round2 starts at 4)
    expect(result.questions).toHaveLength(6);
    expect(result.extractionComplete).toBe(true);
    // ids are renumbered sequentially after merge
    expect(result.questions.map(q => q.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('finishReason MAX_TOKENS alone (clean JSON) also triggers continuation', async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeBankResponse(makeQuestions({ idStart: 1, count: 3 }), { finishReason: 'MAX_TOKENS' })
      )
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 4, count: 2 })))
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.questions).toHaveLength(5);
    expect(result.extractionComplete).toBe(true);
  });

  it('deduplicates questions re-emitted by a continuation round', async () => {
    const round1 = makeQuestions({ idStart: 1, count: 4 });
    // Round 2 re-emits question 3 and 4 plus one new.
    const round2 = makeQuestions({ idStart: 3, count: 3 });
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(round1, { finishReason: 'MAX_TOKENS' }))
      .mockResolvedValueOnce(makeBankResponse(round2))
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(result.questions).toHaveLength(5); // 1..4 + new 5
  });

  it('retries once with ordinal positioning, then stops incomplete when still nothing new', async () => {
    const same = makeQuestions({ idStart: 1, count: 3 });
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(same, { finishReason: 'MAX_TOKENS' }))
      .mockResolvedValueOnce(makeBankResponse(same, { finishReason: 'MAX_TOKENS' }))
      .mockResolvedValueOnce(makeBankResponse(same, { finishReason: 'MAX_TOKENS' }));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    // round1 + anchor continuation (0 new) + ordinal fallback (0 new) → stop
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const fallbackBody = getRequestBody(fetchMock, 2);
    expect(fallbackBody.systemInstruction.parts[0].text).toContain('SKIP the FIRST 3 questions');
    expect(result.questions).toHaveLength(3);
    expect(result.extractionComplete).toBe(false);
  });

  it('ordinal fallback recovers questions when the anchor is ignored', async () => {
    const round1 = makeQuestions({ idStart: 1, count: 3 });
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(round1, { finishReason: 'MAX_TOKENS' }))
      // Anchor-based continuation re-emits only known questions…
      .mockResolvedValueOnce(makeBankResponse(round1))
      // …but the ordinal retry finds the rest.
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 4, count: 2 })))
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.questions).toHaveLength(5);
    expect(result.extractionComplete).toBe(true);
  });

  it('caps continuation rounds at the safety limit', async () => {
    // Every round returns fresh questions but always claims MAX_TOKENS.
    let start = 1;
    fetchMock.mockImplementation(async () => {
      const resp = makeBankResponse(makeQuestions({ idStart: start, count: 2 }), {
        finishReason: 'MAX_TOKENS',
      });
      start += 2;
      return resp;
    });

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    // 1 initial + 11 continuation rounds
    expect(fetchMock).toHaveBeenCalledTimes(12);
    expect(result.questions).toHaveLength(24);
    expect(result.extractionComplete).toBe(false);
  });

  it('continues after a CLEAN finish while short of the model-reported total', async () => {
    // Model voluntarily stops early each round (finishReason STOP, valid JSON)
    // but honestly reports the document holds 12 questions.
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 1, count: 5 }), { total: 12 }))
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 6, count: 5 }), { total: 12 }))
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 11, count: 2 }), { total: 12 }))
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.questions).toHaveLength(12);
    expect(result.extractionComplete).toBe(true);
    // Continuation prompt should carry the remaining-count guidance.
    const contBody = getRequestBody(fetchMock, 1);
    expect(contBody.systemInstruction.parts[0].text).toContain('approximately 12 questions');
  });

  it('marks extraction incomplete when the round cap is hit short of the reported total', async () => {
    // Clean finishes, huge reported total, tiny yield per round.
    let start = 1;
    fetchMock.mockImplementation(async () => {
      const resp = makeBankResponse(makeQuestions({ idStart: start, count: 1 }), { total: 100 });
      start += 1;
      return resp;
    });

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(12); // 1 + 11 cap
    expect(result.questions).toHaveLength(12);
    expect(result.extractionComplete).toBe(false);
  });

  it('ignores absurd reported totals', async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeBankResponse(makeQuestions({ idStart: 1, count: 3 }), { total: 999999 })
      )
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    // Sanitized away → no short-of-total signal; only the verification probe runs.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.extractionComplete).toBe(true);
  });

  it('CASE B never continues even when truncated', async () => {
    const questions = makeQuestions({ idStart: 1, count: 3 });
    const json = JSON.stringify({ caseType: 'B', questions });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: json }] }, finishReason: 'MAX_TOKENS' }],
      }),
    } as unknown as Response);

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.caseType).toBe('B');
    expect(result.extractionComplete).toBe(true);
  });

  it('a failed continuation round keeps the questions already extracted', async () => {
    fetchMock
      .mockResolvedValueOnce(
        makeBankResponse(makeQuestions({ idStart: 1, count: 4 }), { finishReason: 'MAX_TOKENS' })
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({}),
      } as unknown as Response);

    const result = await extractQuestionBank({ text: 'doc' }, 30, 'gemini-2.5-flash');

    expect(result.questions).toHaveLength(4);
    expect(result.extractionComplete).toBe(false);
  });

  it('long text source keeps scanning windows even without truncation', async () => {
    // 250k chars of text — needs at least 3 windows of 100k.
    const bigText = 'A'.repeat(250000);
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 1, count: 2 })))
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 3, count: 2 })))
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 5, count: 2 })))
      .mockResolvedValueOnce(makeBankResponse([]));

    const result = await extractQuestionBank({ text: bigText }, 30, 'gemini-2.5-flash');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.questions).toHaveLength(6);
    expect(result.extractionComplete).toBe(true);
  });

  it('reports progress per round', async () => {
    const progress: Array<{ extracted: number; round: number }> = [];
    fetchMock
      .mockResolvedValueOnce(
        makeBankResponse(makeQuestions({ idStart: 1, count: 3 }), { finishReason: 'MAX_TOKENS' })
      )
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 4, count: 2 })))
      .mockResolvedValueOnce(makeBankResponse([]));

    await extractQuestionBank(
      { text: 'doc' },
      30,
      'gemini-2.5-flash',
      'AUTO',
      undefined,
      0.3,
      p => progress.push(p)
    );

    expect(progress).toEqual([
      { extracted: 3, round: 1 },
      { extracted: 5, round: 2 },
    ]);
  });

  it('unknown model id falls back to the conservative output-token default', async () => {
    fetchMock
      .mockResolvedValueOnce(makeBankResponse(makeQuestions({ idStart: 1, count: 2 })))
      .mockResolvedValueOnce(makeBankResponse([]));

    await extractQuestionBank({ text: 'doc' }, 30, 'my-custom-model');

    const body = getRequestBody(fetchMock, 0);
    expect(body.generationConfig.maxOutputTokens).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
  });
});
