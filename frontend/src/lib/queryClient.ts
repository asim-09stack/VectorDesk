import { QueryClient } from '@tanstack/react-query';

/**
 * Application-wide React Query client with sensible defaults:
 * - data is considered fresh for 30s to reduce redundant refetches
 * - failed queries retry once (network blips) but mutations do not
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
