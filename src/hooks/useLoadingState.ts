import { useState, useCallback } from 'react';

interface UseLoadingState {
  loading: boolean;
  error: string | null;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  startLoading: () => void;
  stopLoading: () => void;
  clearError: () => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
}

export function useLoadingState(initialLoading = false): UseLoadingState {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const startLoading = useCallback(() => setLoading(true), []);
  const stopLoading = useCallback(() => setLoading(false), []);
  const clearError = useCallback(() => setError(null), []);

  const withLoading = useCallback(async <T>(promise: Promise<T>): Promise<T> => {
    try {
      startLoading();
      clearError();
      return await promise;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      stopLoading();
    }
  }, [startLoading, clearError]);

  return {
    loading,
    error,
    setLoading,
    setError,
    startLoading,
    stopLoading,
    clearError,
    withLoading
  };
}