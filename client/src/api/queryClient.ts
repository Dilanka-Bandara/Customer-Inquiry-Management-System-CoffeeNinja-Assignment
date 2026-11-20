// TanStack Query setup: caching, retries and one global rule for "you are signed out".
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

export const meKey = ['auth', 'me'] as const

/** If ANY request answers 401, the session is over: forget the user, and the route guard sends them to /login. */
function handleError(err: unknown) {
  if (err instanceof ApiError && err.status === 401 && queryClient.getQueryData(meKey)) {
    queryClient.clear()
    queryClient.setQueryData(meKey, null)
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      // Don't retry "your request is wrong" errors (400/401/403/404/409) - only network/server hiccups.
      retry: (failureCount, err) =>
        !(err instanceof ApiError && err.status >= 400 && err.status < 500) && failureCount < 2,
      // Refetch when the user comes back to the tab - keeps a second tab from showing old data for long.
      refetchOnWindowFocus: true,
      staleTime: 5_000,
    },
    mutations: { retry: false },
  },
})
