export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: 'google';
  category: 'fast' | 'balanced' | 'advanced';
  /** Max output tokens a single generateContent response may carry. */
  maxOutputTokens: number;
}

/**
 * Gemini text-out models supported by Google's v1beta generateContent endpoint.
 * Mirrors the "Text-out models" list shown in Google AI Studio.
 */
export const AI_MODELS: ModelConfig[] = [
  { id: 'gemini-3.5-flash',      name: 'Gemini 3.5 Flash',      description: 'Newest fast model',           provider: 'google', category: 'fast',     maxOutputTokens: 65536 },
  { id: 'gemini-3.1-pro',        name: 'Gemini 3.1 Pro',        description: 'Latest advanced reasoning',   provider: 'google', category: 'advanced', maxOutputTokens: 65536 },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Lightweight & quick',         provider: 'google', category: 'fast',     maxOutputTokens: 65536 },
  { id: 'gemini-3-flash',        name: 'Gemini 3 Flash',        description: 'Popular flash model',         provider: 'google', category: 'fast',     maxOutputTokens: 65536 },
  { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',        description: 'GA, most capable 2.5',        provider: 'google', category: 'advanced', maxOutputTokens: 65536 },
  { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',      description: 'GA, stable & balanced',       provider: 'google', category: 'balanced', maxOutputTokens: 65536 },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Lightweight 2.5',             provider: 'google', category: 'fast',     maxOutputTokens: 65536 },
  { id: 'gemini-2.0-flash',      name: 'Gemini 2.0 Flash',      description: 'Reliable older flash',        provider: 'google', category: 'balanced', maxOutputTokens: 8192 },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Cheapest 2.0',                provider: 'google', category: 'fast',     maxOutputTokens: 8192 },
  { id: 'gemma-4-31b-it',        name: 'Gemma 4 31B',           description: 'Open-weight backup',          provider: 'google', category: 'balanced', maxOutputTokens: 8192 },
];

export const ALLOWED_MODEL_IDS: ReadonlyArray<string> = AI_MODELS.map(m => m.id);

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export const RECOMMENDED_MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash',
  'gemini-2.5-pro',
  'gemini-3.1-pro',
];

export const getModelConfig = (modelId: string): ModelConfig | undefined =>
  AI_MODELS.find(model => model.id === modelId);

/** Conservative ceiling for user-typed / unknown model ids. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

/**
 * Output-token ceiling to request for a model. Requesting the model's true max
 * lets a large CASE A extraction carry as many questions per response as the
 * model allows (the previous omission left Gemini's small default cap in
 * charge, silently truncating big question banks).
 */
export const getMaxOutputTokens = (modelId: string): number =>
  getModelConfig(modelId)?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;

/**
 * Map a model ID to a stable fallback when the primary returns 429 / overloaded
 * / UNAVAILABLE. Falls back from newest/premium models down to gemini-2.5-flash
 * (GA, generally available capacity).
 */
export const getFallbackModel = (modelId: string): string => {
  const m = modelId.toLowerCase();
  if (m === DEFAULT_MODEL) return 'gemini-2.0-flash';
  if (m === 'gemini-3.5-flash') return 'gemini-3-flash';
  if (m === 'gemini-3-flash' || m.startsWith('gemini-3.1') || m.startsWith('gemini-3-')) return DEFAULT_MODEL;
  if (m === 'gemini-2.5-pro' || m === 'gemini-3.1-pro') return DEFAULT_MODEL;
  if (m.startsWith('gemini-2.5-flash-lite')) return DEFAULT_MODEL;
  return DEFAULT_MODEL;
};

const OVERLOAD_PATTERNS = [
  '429',
  '503',
  'overloaded',
  'unavailable',
  'resource_exhausted',
  'resource exhausted',
  'rate limit',
  'quota',
  'high demand',
  'try again later',
];

export const isOverloadError = (error: unknown): boolean => {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return OVERLOAD_PATTERNS.some(p => msg.includes(p));
};

const MODEL_UNAVAILABLE_PATTERNS = [
  'not found',
  'is not supported',
  'not supported',
  'invalid model',
  'not allowed',
  'unknown model',
  'no such model',
  'does not exist',
  '404',
  '400',
  'permission_denied',
  'permission denied',
];

/**
 * True when the failure is because the chosen model id is invalid / unavailable
 * (e.g. a 400/404 "model not found"), as opposed to a transient overload. Such
 * errors are NOT fixed by retrying the same model, so the caller should fall
 * back to a known-good default model instead of surfacing a hard error.
 */
export const isModelUnavailableError = (error: unknown): boolean => {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return MODEL_UNAVAILABLE_PATTERNS.some(p => msg.includes(p));
};
