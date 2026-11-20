import { Link, NavLink, Outlet } from 'react-router'
import { useCurrentUser, useLogout } from '../auth/useAuth'

export function AppLayout() {
  const user = useCurrentUser()
  const logout = useLogout()

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/inquiries" className="brand">
            Inquiry Desk
          </Link>
          <nav className="topbar__nav" aria-label="Main">
            <NavLink to="/inquiries" end>
              Inquiries
            </NavLink>
            <NavLink to="/inquiries/new" className="btn btn--primary btn--small">
              + New inquiry
            </NavLink>
          </nav>
          <div className="topbar__user">
            <span>
              {user.name} <span className="role">{user.role === 'ADMIN' ? 'Admin' : 'Staff'}</span>
            </span>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => logout.mutate()} disabled={logout.isPending}>
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
