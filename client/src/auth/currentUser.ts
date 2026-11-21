// The signed-in user, provided by <RequireAuth>. Pages below it never see "no user":
// when the user signs out, the guard redirects and those pages simply unmount.
import { createContext, useContext } from 'react'
import type { User } from '../types'

export const CurrentUserContext = createContext<User | null>(null)

/** For components inside the protected area: the signed-in user, never null. */
export function useCurrentUser(): User {
  const user = useContext(CurrentUserContext)
  if (!user) throw new Error('useCurrentUser must be used inside <RequireAuth>')
  return user
}
