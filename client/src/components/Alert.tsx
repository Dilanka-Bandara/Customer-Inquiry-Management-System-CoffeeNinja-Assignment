import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'warning' | 'error'

/** A message box. Errors/warnings are announced to screen readers immediately (role="alert"). */
export function Alert({ tone, title, children }: { tone: Tone; title?: string; children?: ReactNode }) {
  const urgent = tone === 'error' || tone === 'warning'
  return (
    <div className={`alert alert--${tone}`} role={urgent ? 'alert' : 'status'}>
      {title && <strong className="alert__title">{title}</strong>}
      {children && <div>{children}</div>}
    </div>
  )
}
