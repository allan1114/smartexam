/**
 * MiniMax (international) provider defaults.
 *
 * Kept in one place because both the settings UI and the service read them, and
 * they previously drifted as two independent literals. Deliberately separate
 * from the Google/Gemini catalog in `models.ts` — MiniMax config lives under its
 * own localStorage keys and never touches the Gemini settings.
 */

/** OpenAI-compatible chat-completions endpoint (international, `.io`). */
export const MINIMAX_DEFAULT_URL = 'https://api.minimax.io/v1/chat/completions';

/**
 * Vision-capable by default.
 *
 * The previous default, `MiniMax-Text-01`, is text-only: it cannot see an image
 * no matter how correctly one is attached. Since uploading a PDF or a photo of a
 * paper is the app's primary flow, the default has to be a model that can
 * actually read it.
 */
export const MINIMAX_DEFAULT_MODEL = 'MiniMax-VL-01';

/** The text-only model that used to be the default — referenced in UI help text. */
export const MINIMAX_TEXT_MODEL = 'MiniMax-Text-01';
