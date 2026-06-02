import { ExamResult, Question, UserAnswer } from '../types';

/**
 * Self-contained HTML exam-report generator.
 *
 * Produces a single .html file (inline CSS, no external assets) that a user can
 * open offline. The report includes every question, the option the user picked,
 * whether it was right or wrong, the correct answer, the explanation, the
 * document evidence quote, and the overall score — i.e. everything stored on the
 * ExamResult. Pure client-side, zero API calls.
 */

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sameAnswer = (a: string | undefined, b: string | undefined): boolean =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

const renderQuestion = (q: Question, idx: number, userAns: UserAnswer | undefined): string => {
  const isCorrect = userAns?.isCorrect ?? false;
  const optionLetters = 'ABCDEFGH';

  const options = q.options
    .map((opt, oIdx) => {
      const isCorrectChoice = sameAnswer(opt, q.correctAnswer);
      const isUserChoice = opt === userAns?.selectedOption;
      const cls = isCorrectChoice ? 'opt correct' : isUserChoice ? 'opt wrong' : 'opt';
      const tags: string[] = [];
      if (isCorrectChoice) tags.push('<span class="tag tag-correct">正確答案 Correct</span>');
      if (isUserChoice && !isCorrectChoice) tags.push('<span class="tag tag-wrong">你的選擇 Your pick</span>');
      if (isUserChoice && isCorrectChoice) tags.push('<span class="tag tag-correct">你的選擇 Your pick</span>');
      return `<li class="${cls}"><span class="letter">${optionLetters[oIdx] || '·'})</span><span class="opt-text">${escapeHtml(opt)}</span>${tags.join('')}</li>`;
    })
    .join('');

  const evidence = q.sourceQuote
    ? `<div class="evidence"><div class="label">Document Evidence</div><blockquote>${escapeHtml(q.sourceQuote)}</blockquote></div>`
    : '';

  const explanation = q.explanation
    ? `<div class="explanation"><div class="label">Explanation</div><p>${escapeHtml(q.explanation)}</p></div>`
    : '';

  const userPicked = userAns?.selectedOption
    ? escapeHtml(userAns.selectedOption)
    : '<em>未作答 / Not answered</em>';

  return `
    <article class="q ${isCorrect ? 'q-correct' : 'q-wrong'}">
      <header class="q-head">
        <div>
          <div class="topic">${escapeHtml(q.topic || 'General')}</div>
          <h3>${idx + 1}. ${escapeHtml(q.question)}</h3>
        </div>
        <span class="badge ${isCorrect ? 'badge-correct' : 'badge-wrong'}">${isCorrect ? 'CORRECT' : 'INCORRECT'}</span>
      </header>
      <ul class="opts">${options}</ul>
      <div class="answers">
        <div><strong>你的答案 Your answer:</strong> ${userPicked}</div>
        <div><strong>正確答案 Correct answer:</strong> ${escapeHtml(q.correctAnswer)}</div>
      </div>
      ${evidence}
      ${explanation}
    </article>`;
};

export const generateReportHtml = (result: ExamResult): string => {
  const total = result.totalQuestions || result.questions.length || 0;
  const percentage = total > 0 ? Math.round((result.score / total) * 100) : 0;
  const title = result.customName || 'SmartExam Report';
  const dateStr = new Date(result.endTime || Date.now()).toLocaleString();

  const answersById = new Map(result.answers.map(a => [a.questionId, a]));
  const questionsHtml = result.questions
    .map((q, idx) => renderQuestion(q, idx, answersById.get(q.id)))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang TC', 'Microsoft JhengHei', sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; line-height: 1.6; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 64px; }
  .summary { background: #fff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; margin-bottom: 28px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
  .summary h1 { margin: 0 0 8px; font-size: 26px; }
  .summary .meta { color: #64748b; font-size: 13px; margin-bottom: 18px; }
  .score { font-size: 64px; font-weight: 800; line-height: 1; }
  .score small { display: block; font-size: 15px; font-weight: 600; color: #475569; margin-top: 8px; }
  .q { background: #fff; border: 2px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-bottom: 18px; }
  .q-correct { border-color: #bbf7d0; }
  .q-wrong { border-color: #fecaca; }
  .q-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .q-head h3 { margin: 4px 0 0; font-size: 18px; }
  .topic { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8; }
  .badge { flex: none; font-size: 10px; font-weight: 800; padding: 6px 12px; border-radius: 999px; white-space: nowrap; }
  .badge-correct { background: #dcfce7; color: #16a34a; }
  .badge-wrong { background: #fee2e2; color: #dc2626; }
  .opts { list-style: none; padding: 0; margin: 18px 0 0; }
  .opt { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 2px solid #f1f5f9; border-radius: 12px; margin-bottom: 8px; }
  .opt.correct { background: #f0fdf4; border-color: #bbf7d0; font-weight: 700; }
  .opt.wrong { background: #fef2f2; border-color: #fecaca; }
  .letter { font-weight: 800; width: 24px; flex: none; }
  .opt-text { flex: 1; }
  .tag { font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
  .tag-correct { background: #16a34a; color: #fff; }
  .tag-wrong { background: #dc2626; color: #fff; }
  .answers { margin-top: 16px; font-size: 14px; display: grid; gap: 4px; }
  .label { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #6366f1; margin-bottom: 6px; }
  .evidence, .explanation { margin-top: 16px; padding: 14px 16px; border-radius: 14px; }
  .evidence { background: #fffbeb; border: 1px solid #fde68a; }
  .evidence blockquote { margin: 0; font-style: italic; color: #334155; }
  .explanation { background: #f8fafc; border: 1px solid #e2e8f0; }
  .explanation p { margin: 0; color: #334155; font-size: 14px; }
  footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 32px; }
  @media print { body { background: #fff; } .q, .summary { box-shadow: none; } }
</style>
</head>
<body>
  <div class="wrap">
    <section class="summary">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">${escapeHtml(result.mode)} · ${escapeHtml(result.model)} · ${escapeHtml(dateStr)}</div>
      <div class="score">${percentage}%<small>${result.score} / ${total} Correct</small></div>
    </section>
    ${questionsHtml}
    <footer>Generated by SmartExam AI · ${escapeHtml(new Date().toLocaleString())}</footer>
  </div>
</body>
</html>`;
};

const sanitizeFilename = (name: string): string =>
  name.replace(/[^a-z0-9一-鿿\- ]/gi, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'report';

/** Trigger a browser download of the HTML report. */
export const downloadReportHtml = (result: ExamResult): void => {
  const html = generateReportHtml(result);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const datePart = new Date(result.endTime || Date.now()).toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SmartExam-Report-${sanitizeFilename(result.customName || result.mode)}-${datePart}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Release the object URL on the next tick so the download can start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
