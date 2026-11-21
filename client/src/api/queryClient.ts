// TanStack Query setup: caching, retries and one global rule for "you are signed out".
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import type { User } from '../types'
import { ApiError } from './client'

export const meKey = ['auth', 'me'] as const

/**
 * Switch the signed-in user (null = signed out) and drop everything cached for the previous one.
 * We UPDATE the "me" entry rather than clearing the whole cache: components watching it
 * (like the route guard) are then notified and react - e.g. redirect to /login.
 */
export function setSessionUser(user: User | null) {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== meKey[0] })
  queryClient.setQueryData(meKey, user)
}

/** If ANY request answers 401, the session is over: forget the user, and the route guard sends them to /login. */
function handleError(err: unknown) {
  if (err instanceof ApiError && err.status === 401 && queryClient.getQueryData(meKey)) {
    setSessionUser(null)
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
