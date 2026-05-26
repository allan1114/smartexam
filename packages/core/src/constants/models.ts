export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: 'google';
  category: 'fast' | 'balanced' | 'advanced';
}

/**
 * Gemini text-out models supported by Google's v1beta generateContent endpoint.
 * Mirrors the "Text-out models" list shown in Google AI Studio.
 */
export const AI_MODELS: ModelConfig[] = [
  { id: 'gemini-3.5-flash',      name: 'Gemini 3.5 Flash',      description: 'Newest fast model',           provider: 'google', category: 'fast' },
  { id: 'gemini-3.1-pro',        name: 'Gemini 3.1 Pro',        description: 'Latest advanced reasoning',   provider: 'google', category: 'advanced' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Lightweight & quick',         provider: 'google', category: 'fast' },
  { id: 'gemini-3-flash',        name: 'Gemini 3 Flash',        description: 'Popular flash model',         provider: 'google', category: 'fast' },
  { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',        description: 'GA, most capable 2.5',        provider: 'google', category: 'advanced' },
  { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',      description: 'GA, stable & balanced',       provider: 'google', category: 'balanced' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Lightweight 2.5',             provider: 'google', category: 'fast' },
  { id: 'gemini-2.0-flash',      name: 'Gemini 2.0 Flash',      description: 'Reliable older flash',        provider: 'google', category: 'balanced' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Cheapest 2.0',                provider: 'google', category: 'fast' },
  { id: 'gemma-4-31b-it',        name: 'Gemma 4 31B',           description: 'Open-weight backup',          provider: 'google', category: 'balanced' },
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
