import { describe, it, expect } from 'vitest';
import {
  isModelUnavailableError,
  isOverloadError,
  getFallbackModel,
  DEFAULT_MODEL,
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
});
