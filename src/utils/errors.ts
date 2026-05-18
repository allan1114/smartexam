/**
 * Custom error types and error handling utilities
 */

/**
 * Extended error type for API operations
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public retryable?: boolean
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Storage validation error
 */
export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Determines if an error is retryable based on error message and status code
 * @param error - Error object to check
 * @returns boolean - Whether the error should be retried
 */
export const isRetryableError = (error: unknown): boolean => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  const nonRetryablePatterns = [
    'UNAUTHENTICATED',
    'PERMISSION_DENIED',
    'INVALID_ARGUMENT',
    'expired',
    'invalid api key',
    'api key not found'
  ];

  if (nonRetryablePatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  )) {
    return false;
  }

  const retryablePatterns = [
    'Rpc failed',
    'Code 6',
    '500',
    '503',
    'fetch',
    'NetworkError',
    'deadline exceeded',
    'ECONNREFUSED',
    'ENOTFOUND'
  ];

  return retryablePatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
};

/**
 * Validates if an API key has the correct Gemini API format
 * Gemini API keys typically start with 'AIza' (from Google AI Studio)
 * Cloud API keys have a different format and won't work with Gemini API
 */
export const isValidGeminiApiKey = (apiKey: string): boolean => {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }
  // Gemini API keys from Google AI Studio typically start with AIza
  // But also accept other formats for flexibility
  const trimmedKey = apiKey.trim();
  return trimmedKey.length > 20; // Basic length check
};

/**
 * Extracts a user-friendly error message from various error types
 * with specific handling for authentication errors
 */
export const getErrorMessage = (error: unknown): string => {
  const errorStr = error instanceof Error ? error.message : String(error);

  // Handle authentication/authorization errors
  if (errorStr.toLowerCase().includes('unauthenticated') ||
      errorStr.toLowerCase().includes('permission denied') ||
      errorStr.toLowerCase().includes('expired') ||
      errorStr.toLowerCase().includes('invalid api key') ||
      errorStr.toLowerCase().includes('401') ||
      errorStr.toLowerCase().includes('403')) {
    return 'API Key Error: Your API key is invalid, expired, or doesn\'t have proper permissions. Please check:\n1. You\'re using a Gemini API key from Google AI Studio (not a Cloud API key)\n2. The key hasn\'t been deleted\n3. Your quota hasn\'t been exhausted';
  }

  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
