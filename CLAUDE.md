# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

**SmartExam AI** is an AI-powered exam practice and study platform. A user
supplies study material (PDF / image / pasted text / Google Docs), and Google
Gemini generates practice questions with explanations, source grounding, and
performance analytics. It ships as both a **web app** and an **Electron desktop
app** from a shared core.

The product is entirely client-side: there is no application backend or
database. State lives in the browser's `localStorage`. The only server-side
piece is an optional serverless proxy that hides the Gemini API key
(`api/proxy-gemini.ts`).

## Repository layout

This is an **npm workspaces monorepo**. Three workspaces:

```
packages/
├── core/      # @smartexam/core — shared App, components, services, utils, types, constants
├── web/       # @smartexam/web — Vite + React web app (port 3000)
└── desktop/   # @smartexam/desktop — Electron wrapper (Vite dev port 5173)
api/
└── proxy-gemini.ts   # Vercel serverless function — Gemini API key proxy
scripts/      # deploy helpers
.github/workflows/deploy-github-pages.yml   # CI: build + deploy to GitHub Pages
```

### Source of truth: `packages/core/src/`

Make all changes there. The web app imports core directly
(`packages/web/src/index.tsx` → `import App from '../../core/src/App'`).

(The stale top-level `/src` copy that predated the monorepo migration has been
deleted — don't recreate it.)

### Where the real code lives (`packages/core/src/`)

```
App.tsx                # Top-level state machine (AppState: HOME→SETUP→LOADING→EXAM→RESULTS)
components/            # React UI (Home, ExamSetup, ExamPortal, Results, Settings, ChatBot, …)
services/
  geminiService.ts     # Gemini calls: prompt building, JSON parsing, timeout, model fallback
  geminiProxyClient.ts # Proxy-mode client
utils/
  questionBank.ts      # Generate/cache/dedupe/sample a question pool (localStorage)
  documentLibrary.ts   # "Saved documents" — reopen prior uploads without re-uploading
  examStorage.ts       # Exam sessions + history persistence
  difficultyTracking.ts# Level-3 smart retake: per-question difficulty + mastery
  optionShuffler.ts    # Display-order shuffling with index mapping (answers stay correct)
  fileProcessor.ts     # File→base64, JSON cleanup, truncated-JSON repair, id generation
  reportExport.ts      # Self-contained HTML result report download
  errors.ts            # ApiError + isRetryableError classification
  logger.ts            # Leveled logger (DEBUG/INFO/WARN/ERROR), source-tagged
constants/models.ts    # Gemini model catalog + fallback + error classification
types/index.ts         # All shared TypeScript types
__tests__/             # Integration tests + per-module tests live beside code in __tests__/
```

## Tech stack

- **React 19** + **TypeScript 5.8** (strict mode) + **Vite 6**
- **Vitest 2** + Testing Library (jsdom) for tests
- **Tailwind CSS** — loaded via CDN in `index.html` (no build step / no config file)
- **Electron 30** + electron-builder for desktop packaging
- **@google/genai** for Gemini; the web `index.html` also pulls React/genai via an
  ESM import map + CDN at runtime
- Deploy targets: **GitHub Pages** (default, base path `/smartexam/`) and **Vercel**

## Commands (run from repo root)

| Command | What it does |
|---|---|
| `npm install` | Install all workspace deps |
| `npm run dev:web` | Web dev server → http://localhost:3000 |
| `npm run dev:electron` | Vite (5173) + Electron with hot reload |
| `npm run build:web` | Production web build → `packages/web/dist/` |
| `npm run build:electron` | Build desktop installers (.dmg / .exe / AppImage) |
| `npm test` | Run the test suite in watch mode (all tests live in core) |
| `npm run test:run` | Single non-watch run (what CI uses) |
| `npm test -- <file>.test.ts` | Run one test file |
| `SMARTEXAM_PDF=… GEMINI_API_KEY=… npx vitest run verifyPdf --root packages/core` | Verify a real PDF end-to-end (skipped without those env vars; makes billable calls) |
| `npm run test:ui` | Vitest UI (web) |
| `npm run type-check` | `tsc --noEmit` for core + web + desktop |
| `npm run lint` | ESLint (web), `--max-warnings 0` |
| `npm run clean` | Remove build artifacts |

Always run `npm run type-check` and `npm test` after changes — `strict` is on and
CI type-checks.

## Gemini integration — read before touching AI code

Calls go through `geminiService.ts`, which supports **two modes** chosen at
runtime via `localStorage`:

1. **Direct mode** (default, dev): `smart_exam_api_key` holds the user's key; the
   browser calls Gemini directly.
2. **Proxy mode**: `smart_exam_use_proxy === 'true'` routes through
   `VITE_GEMINI_PROXY_URL` (default `/api/proxy-gemini`), so the key stays
   server-side. Production should use this.

Resilience features already built in — preserve them when editing:

- **90s request timeout** via `AbortController` (`REQUEST_TIMEOUT_MS`), surfaced
  as a retryable `NETWORK_TIMEOUT` error.
- **Automatic model fallback**: on overload (429/503) or invalid/unavailable
  model (400/404 "model not found"), `getFallbackModel()` swaps to a stable
  model (ultimately `gemini-2.5-flash`). Error classification lives in
  `constants/models.ts` (`isOverloadError`, `isModelUnavailableError`).
- **Truncated-JSON repair** and a **one-shot retry with a smaller pool** on parse
  failure.
- **Question-count guarantee**: the question bank is generated/deduped/sampled
  until the requested count is met, or a clear `NOT_ENOUGH_QUESTIONS` error is
  shown.

### Reference mode — transcribe only, never author

`ExamConfig.referenceMode` (the **原文抽取 / Question Source** choice in
`ExamSetup`) makes the uploaded document the only source. It is a hard
guarantee, not a hint, and each piece of it matters:

- `extractQuestionBank(..., { referenceMode: true })` swaps the prompt's
  STEP 1/STEP 2 block (`buildExtractionDirective()`) for a transcription-only
  directive. **The CASE B "generate N questions" branch is not in the prompt at
  all** — there is no fork for a misread document to fall into.
- Temperature is pinned to `0`, overriding the Settings slider. Transcription
  has one correct output; anything above 0 only buys wording drift.
- After round 1, a `caseType` other than `'A'` (or an empty bank) throws
  `NO_QUESTIONS_IN_DOCUMENT` instead of returning an AI-written bank. The gate
  sits *after* `runInitialRound()` so the sliding-window recovery still runs.
  The catch block maps a generic `NO_QUESTIONS` to the same error, and lets an
  already-typed `NO_QUESTIONS_IN_DOCUMENT` through unwrapped — note that the
  `NO_QUESTIONS_IN_RANGE` branch matches on `includes('NO_QUESTIONS')` and
  would otherwise swallow it.
- `App.startExam` discards a cached CASE B bank, skips the top-up loop
  (topping up means asking the AI to author the shortfall), forces
  `useAllQuestions`/`preserveOrder`, and disables option **and** question
  shuffling on all three paths (initial, fresh-shuffle retake, smart retake) —
  reference mode overrides `questionOrder: 'RANDOM'` rather than yielding to it.

Question text, options and the correct answer are verbatim. `explanation` is
still AI-written (grounded in `sourceQuote`) — it is additive, not a change to
the source.

### MiniMax provider — images and PDFs

MiniMax is selected via `smart_exam_provider` and short-circuits at the top of
`callGeminiViaProxy`; its endpoint/model/key live under their own localStorage
keys and never touch the Gemini settings.

Its chat endpoint is OpenAI-compatible, and **that schema has text and image
parts only — there is no PDF part**. So the file path differs from Google's:

- `resolveFileParts` sends an image straight through; a **PDF is rasterized to
  one PNG per page** (`utils/pdfRasterizer.ts`, `pdfjs-dist` behind a dynamic
  `import()` so it code-splits) and sent as image parts. Google's path is
  untouched — Gemini ingests PDF bytes directly, which is strictly better: no
  rasterization loss and no page cap.
- `buildMinimaxMessages` emits OpenAI multimodal parts
  (`{type:'image_url', image_url:{url:'data:…'}}`) when a turn carries images,
  and a **plain string when it doesn't** — text-only requests must keep going out
  byte-identical to before.
- `unsupportedFile` covers what genuinely cannot be carried (a non-image blob, a
  Gemini Files API URI) and raises `MINIMAX_UNSUPPORTED_FILE`. Do not let it
  regress into dropping the binary silently — every message shape must run the
  conversion, which the chat-history shapes previously skipped.
- The default model is **`MiniMax-VL-01`** (`constants/minimax.ts`), not
  `MiniMax-Text-01`: a text-only model cannot see an image however correctly it
  is attached.
- Page cap: `DEFAULT_MAX_PDF_PAGES` (20). Every page is re-sent on each
  continuation round, so request size grows fast — past the cap the user gets
  `MINIMAX_PDF_TOO_MANY_PAGES` naming the real page count. For a big paper,
  Google is the right answer.

### ⚠️ Keep the model list in sync (two places)

The allowed-model list is duplicated and **must stay identical**:

- `packages/core/src/constants/models.ts` → `AI_MODELS` / `ALLOWED_MODEL_IDS`
- `api/proxy-gemini.ts` → `allowedModels` array

If you add/remove/rename a model, update **both**, or proxy-mode requests for
that model will be rejected. `DEFAULT_MODEL` is `gemini-2.5-flash`. A test in
`constants/__tests__/models.test.ts` parses the proxy file and fails if the two
lists diverge, so a missed edit is caught in CI rather than in production.

## localStorage namespaces

Client state keys (all best-effort; write failures must never break the exam
flow):

| Key / prefix | Purpose | Cap |
|---|---|---|
| `smart_exam_doclib_index`, `smart_exam_doc_*` | Saved documents library | 20 docs |
| `smart_exam_bank_index`, `smart_exam_bank_*` | Question-bank cache (retake / top-up) | 5 banks |
| `smart_exam_history` | Exam result history | — |
| `smart_exam_api_key`, `smart_exam_use_proxy`, `smart_exam_proxy_url` | API key + proxy config | — |
| `theme` | Light/dark | — |

Bank keys come from `questionBankKey(docHash, contentRange)`: the plain document
hash when no Focus Range is set, `<docHash>~r<rangeHash>` when one is. A
range-limited bank holds a different pool from the whole paper, so it must never
be served in its place — pass the bank key (not the raw doc hash) to
`loadQuestionBank` / `saveQuestionBank` / `appendToQuestionBank` /
`deleteQuestionBank`. Exam sessions, the document library and difficulty
tracking stay keyed on the raw document hash.

Note: for PDF/image saved documents, localStorage holds only the metadata
(name/type) — the base64 bytes go to **IndexedDB** (`smartexam` DB,
`documentFiles` store, see `utils/fileStore.ts`), which has no ~5MB quota. That
is what lets an uploaded PDF be re-opened later without a re-upload. Files over
`MAX_STORED_FILE_LEN` (25MB base64 ≈ 18MB of file), and browsers without IndexedDB, fall back
to metadata-only and prompt for a re-upload.

## Conventions

- **Tests** sit in `__tests__/` directories next to the code they cover, named
  `*.test.ts(x)`. Add tests for new utils/services; the existing suites are the
  pattern to follow.
- **Logging**: use the `logger` from `utils/logger.ts` with a source tag
  (e.g. `logger.warn("...", "App.initialization")`), not bare `console.*`.
- **Errors**: throw via `ApiError` / typed messages; user-facing messages are
  often Traditional Chinese / Cantonese (this is a zh-Hant-first product — match
  the surrounding language in UI strings and docs).
- **Types**: all shared types belong in `packages/core/src/types/index.ts`.
- **Imports** within core are relative (`./utils/...`). The package `exports`
  barrel in `packages/core/package.json` is largely unused — apps import core
  source files directly by relative path.
- **Security**: never hardcode API keys; never log the key. Only `VITE_`-prefixed
  env vars are exposed to the client (enforced by `loadEnv(mode, '.', 'VITE_')`
  in the Vite configs). Server-side key is `GEMINI_API_KEY` (Vercel only).

## Build / deploy notes

- Web build base path is **overridable, not fixed**:
  `packages/web/vite.config.ts` uses `env.VITE_BASE_PATH || '/smartexam/'`. The
  default suits GitHub Pages project-site hosting; `vercel.json`'s build command
  sets `VITE_BASE_PATH=/` because Vercel serves the domain root. Getting this
  wrong fails silently — the build succeeds and every asset 404s in the browser —
  so `packages/core/src/__tests__/deployConfig.test.ts` guards both values.
  Keep the base path in mind for any hardcoded asset URL.
- **GitHub Pages** deploys automatically on push to `main`/`master` via
  `.github/workflows/deploy-github-pages.yml`: it builds web, writes `404.html`
  + `.nojekyll` (SPA routing), and deploys the Pages artifact
  (`actions/deploy-pages`). Pages source is "GitHub Actions" — do NOT add a
  `gh-pages` branch mirror; a second deployment path races the artifact deploy
  and fails with "in progress deployment". Live at
  https://allan1114.github.io/smartexam/.
- **Vercel** uses `vercel.json` and serves `api/proxy-gemini.ts` as the proxy.
  Four things there are load-bearing and easy to break:
  - `VITE_BASE_PATH=/` in `buildCommand` (see above).
  - `installCommand` scopes the install to core + web. `packages/desktop` is a
    workspace, so an unscoped install drags Electron into a static web build.
  - `functions["api/proxy-gemini.ts"].maxDuration` must exceed the client's
    `FILE_REQUEST_TIMEOUT_MS` (240s) or large-PDF extraction returns 504.
  - **No `env` block.** `GEMINI_API_KEY` belongs in Vercel Project Settings. The
    legacy `"@secret-name"` syntax fails the deployment at config validation —
    before install — and a Project Settings variable does *not* satisfy it.

## Environment variables

Copy `.env.example` → `.env.local`. See README "環境變數參考" for the full table.

| Var | Mode | Notes |
|---|---|---|
| `VITE_GEMINI_API_KEY` | dev | Direct mode; exposed to browser — dev only |
| `VITE_USE_GEMINI_PROXY` | both | `true`/`false`. The **default when the user has never chosen** in Settings (`shouldUseProxy()`); an explicit Settings choice always wins. Set `true` on Vercel or the server-side key is never used |
| `VITE_GEMINI_PROXY_URL` | both | default `/api/proxy-gemini` |
| `VITE_BASE_PATH` | build | Asset root. Unset → `/smartexam/` (GitHub Pages); `vercel.json` sets `/` for Vercel |
| `GEMINI_API_KEY` | prod | Server-side only (Vercel **Project Settings**, not a `vercel.json` `env` entry), never client |

MiniMax provider config is **not** env-driven — it lives in `localStorage`
(`smart_exam_provider`, `smart_exam_minimax_model|url|api_key`), with defaults in
`packages/core/src/constants/minimax.ts`. Note the MiniMax key is held and sent
client-side; there is no MiniMax proxy, so `SECURITY.md`'s key-protection story
covers Google only.

## Further reading

- `README.md` (zh-Hant) / `README.en.md` — full feature + usage docs
- `DEPLOYMENT.md` — deployment details
- `SECURITY.md` — security policy and API-key handling
