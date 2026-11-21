// Safety net: if a component crashes while rendering, show a message instead of a blank page.
// (React still needs a class component for this.)
import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Unexpected UI error:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="state state--error" role="alert" style={{ margin: '2rem auto', maxWidth: 600 }}>
        <h2>Something went wrong on this page</h2>
        <p>Reloading usually fixes it. Your saved inquiries are safe.</p>
        <div className="state__actions">
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
