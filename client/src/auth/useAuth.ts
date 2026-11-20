// Who is signed in? The server is the source of truth: we ask GET /api/auth/me.
// (The cookie is httpOnly, so JavaScript can't read it - and shouldn't need to.)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../api/client'
import { meKey } from '../api/queryClient'
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

/** For components inside the protected area: the signed-in user, never null. */
export function useCurrentUser(): User {
  const { data } = useMe()
  if (!data) throw new Error('useCurrentUser must be used inside <RequireAuth>')
  return data
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api<{ user: User }>('/auth/login', { method: 'POST', body }),
    onSuccess: ({ user }) => {
      qc.clear() // drop anything cached for a previous user
      qc.setQueryData(meKey, user)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      qc.clear()
      qc.setQueryData(meKey, null)
    },
  })
}
