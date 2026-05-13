export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  provider: 'google' | 'minimax' | 'anthropic' | 'openai';
  category: 'fast' | 'balanced' | 'advanced';
}

export const AI_MODELS: ModelConfig[] = [
  // Google Models
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Fast & Efficient',
    provider: 'google',
    category: 'fast'
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    description: 'Complex Reasoning',
    provider: 'google',
    category: 'advanced'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Latest Flash Model',
    provider: 'google',
    category: 'fast'
  },
  {
    id: 'gemini-2.0-pro-exp-02-05',
    name: 'Gemini 2.0 Pro',
    description: 'Advanced Reasoning',
    provider: 'google',
    category: 'advanced'
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash Exp',
    description: 'Experimental Flash',
    provider: 'google',
    category: 'balanced'
  },
  {
    id: 'gemma-4-31b-it',
    name: 'Gemma 4 31B',
    description: 'Cost-effective Backup',
    provider: 'google',
    category: 'balanced'
  },
  // Minimax Models — IDs must match Minimax's OpenAI-compatible API exactly
  {
    id: 'MiniMax-M2.7',
    name: 'Minimax M2.7',
    description: 'Latest, peak performance',
    provider: 'minimax',
    category: 'advanced'
  },
  {
    id: 'MiniMax-M2.7-highspeed',
    name: 'Minimax M2.7 Highspeed',
    description: 'Faster M2.7',
    provider: 'minimax',
    category: 'fast'
  },
  {
    id: 'MiniMax-M2.5',
    name: 'Minimax M2.5',
    description: 'Stable & reliable',
    provider: 'minimax',
    category: 'balanced'
  },
  {
    id: 'MiniMax-M2.1',
    name: 'Minimax M2.1',
    description: 'Lightweight reasoning',
    provider: 'minimax',
    category: 'balanced'
  },
  // Anthropic Models
  {
    id: 'claude-opus',
    name: 'Claude 3 Opus',
    description: 'Most Capable',
    provider: 'anthropic',
    category: 'advanced'
  },
  {
    id: 'claude-sonnet',
    name: 'Claude 3 Sonnet',
    description: 'Balanced Performance',
    provider: 'anthropic',
    category: 'balanced'
  },
  {
    id: 'claude-haiku',
    name: 'Claude 3 Haiku',
    description: 'Fast & Efficient',
    provider: 'anthropic',
    category: 'fast'
  },
  // OpenAI Models
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Powerful & Accurate',
    provider: 'openai',
    category: 'advanced'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Optimized for Performance',
    provider: 'openai',
    category: 'balanced'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast & Cost-effective',
    provider: 'openai',
    category: 'fast'
  }
];

export const getModelsByProvider = (provider: string): ModelConfig[] => {
  return AI_MODELS.filter(model => model.provider === provider);
};

export const getModelsByCategory = (category: string): ModelConfig[] => {
  return AI_MODELS.filter(model => model.category === category);
};

export const getModelConfig = (modelId: string): ModelConfig | undefined => {
  return AI_MODELS.find(model => model.id === modelId);
};

// Default models for UI components
export const DEFAULT_MODEL = 'gemini-3-flash-preview';
export const RECOMMENDED_MODELS = ['gemini-3-flash-preview', 'MiniMax-M2.7', 'claude-opus', 'gpt-4o'];

/**
 * Resolve the provider for a given model id. Falls back to 'google' for
 * unknown ids so existing Gemini code paths still work.
 */
export const getProviderForModel = (modelId: string): ModelConfig['provider'] => {
  const cfg = AI_MODELS.find(m => m.id === modelId);
  if (cfg) return cfg.provider;
  // Best-effort prefix detection for ids that aren't in the registry
  if (/^MiniMax-/i.test(modelId)) return 'minimax';
  if (/^claude-/i.test(modelId)) return 'anthropic';
  if (/^gpt-/i.test(modelId)) return 'openai';
  return 'google';
};
