"use client";

import { useState, useCallback } from "react";

interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApiCall<T = unknown>() {
  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (url: string, options?: RequestInit): Promise<T | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.message || json.error || `Request failed with status ${res.status}`);
      }

      const result = (json.data !== undefined ? json.data : json) as T;
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    setData: (data: T | null) => setState((prev) => ({ ...prev, data })),
  };
}
