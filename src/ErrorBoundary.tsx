import { Component, type ErrorInfo, type ReactNode } from 'react'
import { trackEvent } from './lib/analytics'

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackEvent('app_error_boundary', {
      message: error.message,
      componentStack: info.componentStack?.slice(0, 240) ?? null,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-state">
          <section className="panel">
            <p className="section-label">Cookr hit a snag</p>
            <h1>Your plan is still safe</h1>
            <p>Refresh the app and Cookr will reload your saved profile, plan, and shopping list from this device.</p>
            <button type="button" className="primary-action" onClick={() => window.location.reload()}>
              Reload Cookr
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
