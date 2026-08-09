import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  isModelUnavailableError,
  isOverloadError,
  getFallbackModel,
  getMaxOutputTokens,
  AI_MODELS,
  ALLOWED_MODEL_IDS,
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

    it('does NOT treat a bare 400 as a model problem', () => {
      // A malformed request fails identically on a fallback model, so matching
      // '400' only burned a second doomed call and buried the real error.
      expect(
        isModelUnavailableError(new Error('Gemini API Error: 400 Bad Request')),
      ).toBe(false);
      expect(
        isModelUnavailableError(new Error('Invalid JSON payload received. Unknown name "role"')),
      ).toBe(false);
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

  describe('proxy allow-list stays in sync', () => {
    it('api/proxy-gemini.ts allows exactly the catalog model ids', () => {
      // The list is duplicated by necessity (the serverless function cannot
      // import from packages/core). Nothing enforced the duplication, so adding
      // a model to the catalog silently broke it for every proxy-mode user.
      const here = dirname(fileURLToPath(import.meta.url));
      const proxySrc = readFileSync(resolve(here, '../../../../../api/proxy-gemini.ts'), 'utf8');

      const block = proxySrc.match(/const allowedModels = \[([\s\S]*?)\];/);
      expect(block, 'could not locate allowedModels in api/proxy-gemini.ts').not.toBeNull();

      const proxyIds = Array.from(block![1].matchAll(/'([^']+)'/g)).map(m => m[1]);

      expect([...proxyIds].sort()).toEqual([...ALLOWED_MODEL_IDS].sort());
    });
  });
});
