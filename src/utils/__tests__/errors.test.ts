import { describe, it, expect } from 'vitest';
import { ApiError, StorageError, isRetryableError, getErrorMessage } from '../errors';

describe('Error utilities', () => {
  describe('ApiError', () => {
    it('should create an ApiError with message', () => {
      const error = new ApiError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ApiError');
    });

    it('should store error code and status', () => {
      const error = new ApiError('Test error', 'ERR_CODE', 500, true);
      expect(error.code).toBe('ERR_CODE');
      expect(error.status).toBe(500);
      expect(error.retryable).toBe(true);
    });

    it('should be instanceof Error', () => {
      const error = new ApiError('Test');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('StorageError', () => {
    it('should create a StorageError with message', () => {
      const error = new StorageError('Storage failed');
      expect(error.message).toBe('Storage failed');
      expect(error.name).toBe('StorageError');
    });

    it('should be instanceof Error', () => {
      const error = new StorageError('Test');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for Rpc failed error', () => {
      const error = new Error('Rpc failed: timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for Code 6 error', () => {
      const error = new Error('Code 6: connection error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 500 status error', () => {
      const error = new Error('Error 500: Internal server error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 503 status error', () => {
      const error = new Error('503 Service unavailable');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for fetch error', () => {
      const error = new Error('fetch failed');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for NetworkError', () => {
      const error = new Error('NetworkError: connection lost');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for deadline exceeded', () => {
      const error = new Error('deadline exceeded');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ECONNREFUSED', () => {
      const error = new Error('ECONNREFUSED: connection refused');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ENOTFOUND', () => {
      const error = new Error('ENOTFOUND: DNS lookup failed');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable error', () => {
      const error = new Error('Invalid input');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should handle string errors', () => {
      expect(isRetryableError('Rpc failed')).toBe(true);
      expect(isRetryableError('Invalid input')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const error = new Error('RPC FAILED');
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from ApiError', () => {
      const error = new ApiError('API request failed');
      expect(getErrorMessage(error)).toBe('API request failed');
    });

    it('should extract message from standard Error', () => {
      const error = new Error('Standard error');
      expect(getErrorMessage(error)).toBe('Standard error');
    });

    it('should handle StorageError', () => {
      const error = new StorageError('Storage error');
      expect(getErrorMessage(error)).toBe('Storage error');
    });

    it('should return default message for non-Error objects', () => {
      expect(getErrorMessage('string error')).toBe('An unexpected error occurred');
      expect(getErrorMessage(123)).toBe('An unexpected error occurred');
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
    });
  });
});
