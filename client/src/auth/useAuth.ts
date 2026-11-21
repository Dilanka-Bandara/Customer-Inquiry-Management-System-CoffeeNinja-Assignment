// Who is signed in? The server is the source of truth: we ask GET /api/auth/me.
// (The cookie is httpOnly, so JavaScript can't read it - and shouldn't need to.)
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import { meKey, setSessionUser } from '../api/queryClient'
import type { User } from '../types'

export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async ({ signal }) => {
      try {
        return (await api<{ user: User }>('/auth/me', { signal })).user
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null // not signed in (not an error)
        throw err
      }
    },
    staleTime: Infinity, // any later 401 clears it (see queryClient.ts)
    retry: false,
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api<{ user: User }>('/auth/login', { method: 'POST', body }),
    onSuccess: ({ user }) => setSessionUser(user),
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    // onSettled = success OR failure: even if the server can't be reached, sign out locally.
    onSettled: () => setSessionUser(null),
  })
}
