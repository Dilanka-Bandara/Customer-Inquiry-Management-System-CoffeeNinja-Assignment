// Loading, error and empty states - designed as part of the workflow, not an afterthought.
import type { ReactNode } from 'react'

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  children,
}: {
  title?: string
  message: string
  onRetry?: () => void
  children?: ReactNode
}) {
  return (
    <div className="state state--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="state__actions">
        {onRetry && (
          <button type="button" className="btn" onClick={onRetry}>
            Try again
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      <p>{message}</p>
      {children && <div className="state__actions">{children}</div>}
    </div>
  )
}
