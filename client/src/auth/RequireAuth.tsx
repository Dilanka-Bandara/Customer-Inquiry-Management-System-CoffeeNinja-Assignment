// Route guard. This only decides what to SHOW - real protection is the API's 401.
// If someone bypasses this, every API call still fails without a valid cookie.
import { Navigate, Outlet, useLocation } from 'react-router'
import { ErrorState, LoadingBlock } from '../components/States'
import { CurrentUserContext } from './currentUser'
import { useMe } from './useAuth'

export function RequireAuth() {
  const location = useLocation()
  const { data: user, isPending, isError, error, refetch } = useMe()

  if (isPending) return <LoadingBlock label="Checking your session…" />
  if (isError) return <ErrorState title="Cannot connect" message={error.message} onRetry={() => refetch()} />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  return (
    <CurrentUserContext.Provider value={user}>
      <Outlet />
    </CurrentUserContext.Provider>
  )
}
