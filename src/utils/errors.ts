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
 * Extracts a user-friendly error message from various error types
 * @param error - Error object
 * @returns string - User-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
