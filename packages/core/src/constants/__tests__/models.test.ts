import { describe, it, expect } from 'vitest';
import {
  isModelUnavailableError,
  isOverloadError,
  getFallbackModel,
  getMaxOutputTokens,
  AI_MODELS,
  DEFAULT_MODEL,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from '../models';

describe('models error classification', () => {
  describe('isModelUnavailableError', () => {
    it('detects 404 / not found responses', () => {
      expect(isModelUnavailableError(new Error('models/foo is not found for API version v1beta'))).toBe(true);
      expect(isModelUnavailableError(new Error('404 Not Found'))).toBe(true);
    });

    it('detects "not allowed" proxy rejections', () => {
      expect(isModelUnavailableError(new Error("Model 'gemini-x' not allowed. Allowed models: ..."))).toBe(true);
    });

    it('detects invalid / unsupported model errors', () => {
      expect(isModelUnavailableError(new Error('Invalid model name'))).toBe(true);
      expect(isModelUnavailableError(new Error('this model is not supported'))).toBe(true);
    });

    it('does NOT treat plain overload errors as unavailable', () => {
      expect(isModelUnavailableError(new Error('The model is overloaded, please try again'))).toBe(false);
      expect(isModelUnavailableError(new Error('429 rate limit'))).toBe(false);
    });

    it('handles non-Error inputs', () => {
      expect(isModelUnavailableError('does not exist')).toBe(true);
      expect(isModelUnavailableError(null)).toBe(false);
    });
  });

  describe('isOverloadError', () => {
    it('detects 429 / 503 / overloaded', () => {
      expect(isOverloadError(new Error('429 Too Many Requests'))).toBe(true);
      expect(isOverloadError(new Error('503 Service Unavailable'))).toBe(true);
      expect(isOverloadError(new Error('model is overloaded'))).toBe(true);
    });
  });

  describe('getFallbackModel', () => {
    it('falls back unknown/custom models to the default', () => {
      expect(getFallbackModel('some-made-up-model')).toBe(DEFAULT_MODEL);
    });

    it('returns a different model than the overloaded default', () => {
      expect(getFallbackModel(DEFAULT_MODEL)).not.toBe(DEFAULT_MODEL);
    });
  });

  describe('getMaxOutputTokens', () => {
    it('every catalog model declares a positive output-token ceiling', () => {
      for (const model of AI_MODELS) {
        expect(model.maxOutputTokens).toBeGreaterThan(0);
      }
    });

    it('known models return their catalog value', () => {
      expect(getMaxOutputTokens('gemini-2.5-flash')).toBe(65536);
      expect(getMaxOutputTokens('gemini-2.0-flash')).toBe(8192);
    });

    it('unknown model ids fall back to the conservative default', () => {
      expect(getMaxOutputTokens('someone-elses-model')).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
    });
  });
});
