import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, type Location } from 'react-router'
import { isApiError } from '../api/client'
import { useLogin, useMe } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { FormField } from '../components/FormField'

export function LoginPage() {
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from
  const { data: user } = useMe()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  // Signed in (just now, or already) -> go to the page they originally asked for, e.g. a shared
  // inquiry link, otherwise the list. This one redirect handles both cases.
  if (user) return <Navigate to={from ? `${from.pathname}${from.search}` : '/inquiries'} replace />

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = {
      email: email.trim() ? undefined : 'Email is required',
      password: password ? undefined : 'Password is required',
    }
    setErrors(next)
    if (next.email || next.password) return

    // On success useLogin stores the user, this page re-renders, and the redirect above runs.
    login.mutate({ email, password })
  }

  const serverError = login.error
    ? isApiError(login.error, 'VALIDATION_ERROR')
      ? 'Please enter a valid email and password.'
      : login.error.message
    : null

  return (
    <main className="login">
      <form className="card login__card" onSubmit={handleSubmit} noValidate>
        <h1>Inquiry Desk</h1>
        <p className="muted">Sign in to manage customer inquiries.</p>

        {from && !serverError && <Alert tone="info">Please sign in to continue.</Alert>}
        {serverError && <Alert tone="error">{serverError}</Alert>}

        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <button type="submit" className="btn btn--primary btn--block" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
