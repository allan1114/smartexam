import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { extractQuestionBank } from '../services/geminiService';
import { sampleQuestionsFromBank, questionDedupKey } from '../utils/questionBank';
import { DEFAULT_MODEL } from '../constants/models';
import { DocumentSource, Question, QuestionBank } from '../types';

/**
 * Manual verification against YOUR OWN exam PDF. Skipped by default — it makes
 * real, billable Gemini calls — and runs only when both env vars are set:
 *
 *   SMARTEXAM_PDF=/path/to/your-exam.pdf \
 *   GEMINI_API_KEY=your-key \
 *   npx vitest run verifyPdf --root packages/core
 *
 * Optional: SMARTEXAM_MODEL (defaults to the app default),
 *           SMARTEXAM_EXPECTED (the question count you believe the PDF holds).
 *
 * It answers the question the automated suite cannot: does THIS document yield
 * every one of its questions, and does the "use every question" path hand them
 * back unchanged and in document order?
 */

const pdfPath = process.env.SMARTEXAM_PDF;
const apiKey = process.env.GEMINI_API_KEY || process.env.SMARTEXAM_API_KEY;
const model = process.env.SMARTEXAM_MODEL || DEFAULT_MODEL;
const expected = process.env.SMARTEXAM_EXPECTED ? parseInt(process.env.SMARTEXAM_EXPECTED, 10) : undefined;
const enabled = Boolean(pdfPath && apiKey);

/** Minimal localStorage/sessionStorage so the service can run outside a browser. */
class MemoryStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}

const mimeFor = (p: string): string => {
  const ext = p.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
};

describe.skipIf(!enabled)('verify a real PDF end-to-end (manual)', () => {
  beforeAll(() => {
    if (!(globalThis as any).localStorage) (globalThis as any).localStorage = new MemoryStorage();
    if (!(globalThis as any).sessionStorage) (globalThis as any).sessionStorage = new MemoryStorage();
    localStorage.setItem('smart_exam_api_key', apiKey!);
    localStorage.setItem('smart_exam_use_proxy', 'false');
    localStorage.setItem('smart_exam_model', model);
  });

  it(
    'extracts every question and replays them unchanged, in document order',
    async () => {
      if (!existsSync(pdfPath!)) throw new Error(`SMARTEXAM_PDF not found: ${pdfPath}`);
      const bytes = readFileSync(pdfPath!);
      const source: DocumentSource = {
        name: basename(pdfPath!),
        fileData: { data: bytes.toString('base64'), mimeType: mimeFor(pdfPath!) },
      };

      const log = (m: string) => console.log(`  ${m}`);
      log(`file    : ${source.name} (${Math.round(bytes.length / 1024)}KB)`);
      log(`model   : ${model}`);

      const { questions, caseType, extractionComplete } = await extractQuestionBank(
        source, 30, model, 'AUTO', undefined, 0.3,
        ({ extracted, round, total }) =>
          log(`round ${round}: ${extracted}${total ? `/${total}` : ''} questions so far`)
      );

      log('');
      log(`caseType           : ${caseType} ${caseType === 'A' ? '(document already contains questions)' : '(study material — questions were generated)'}`);
      log(`questions extracted: ${questions.length}${expected ? ` (you expected ${expected})` : ''}`);
      log(`extractionComplete : ${extractionComplete}`);

      expect(questions.length).toBeGreaterThan(0);

      // No duplicates survived the multi-round merge.
      const keys = new Set(questions.map(questionDedupKey));
      log(`distinct questions : ${keys.size}`);
      expect(keys.size).toBe(questions.length);

      // Every question is well-formed and its answer is one of its own options.
      const malformed = questions.filter(
        q => !q.question?.trim() || !Array.isArray(q.options) || q.options.length === 0 ||
             !q.options.includes(q.correctAnswer)
      );
      log(`malformed          : ${malformed.length}`);
      if (malformed.length) log(`  first: ${JSON.stringify(malformed[0]).slice(0, 200)}`);
      expect(malformed).toHaveLength(0);

      // The "use every question" path: the whole bank, in document order, untouched.
      const bank: QuestionBank = {
        documentHash: 'manual-verify',
        questions: questions.map(q => ({ ...q, options: [...q.options], _locked: true as const })),
        caseType, poolSize: questions.length, createdAt: Date.now(), modelUsed: model,
        extractionComplete,
      };
      const all = sampleQuestionsFromBank(bank, bank.questions.length, { preserveOrder: true });

      expect(all).toHaveLength(questions.length);
      const sameText = (a: Question, b: Question) =>
        a.question === b.question &&
        JSON.stringify(a.options) === JSON.stringify(b.options) &&
        a.correctAnswer === b.correctAnswer;
      const drift = all.filter((q, i) => !sameText(q, questions[i]));
      log(`altered or reordered by the load path: ${drift.length}`);
      expect(drift).toHaveLength(0);

      if (expected !== undefined) {
        log('');
        log(expected === questions.length
          ? `✅ got all ${expected} questions you expected`
          : `⚠️ expected ${expected}, got ${questions.length}` +
            (extractionComplete ? ' — extraction reported COMPLETE, so the count in the PDF may differ'
                                : ' — extraction reported INCOMPLETE; re-run, or narrow with a Focus Range'));
      }
      log('');
      log(`first question: ${questions[0].question.slice(0, 90)}`);
      log(`last  question: ${questions[questions.length - 1].question.slice(0, 90)}`);
    },
    20 * 60 * 1000 // large PDFs legitimately take many minutes across continuation rounds
  );
});

describe.skipIf(enabled)('verify a real PDF end-to-end (manual)', () => {
  it('is skipped until SMARTEXAM_PDF and GEMINI_API_KEY are set', () => {
    expect(enabled).toBe(false);
  });
});
