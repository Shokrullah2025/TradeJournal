import React, { Component } from "react";

/**
 * App-level error boundary. Catches render errors anywhere in the wrapped tree
 * (e.g. a provider/hook error) and shows a graceful fallback with a reload
 * action instead of a blank white screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In production this is where an error tracker (Sentry) would be notified.
    console.error("[ErrorBoundary] render error:", error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          data-testid="app-error-boundary"
          className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-6 text-center"
        >
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            The app hit an unexpected error. Reloading usually fixes it. If it
            keeps happening, please contact support.
          </p>
          <button
            data-testid="app-error-reload-btn"
            onClick={this.handleReload}
            className="btn btn-primary"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
