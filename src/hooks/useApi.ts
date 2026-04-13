import { useState } from "react";

import { ApiErrorShape } from "../types";
import { normalizeApiError } from "../services/api";

export const useApi = <TArgs extends unknown[], TResult>(
  apiCall: (...args: TArgs) => Promise<TResult>,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorShape | null>(null);

  const execute = async (...args: TArgs) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(...args);
      return result;
    } catch (caughtError) {
      const normalizedError = normalizeApiError(caughtError);
      setError(normalizedError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
  };

  return {
    execute,
    loading,
    error,
    reset,
  };
};

