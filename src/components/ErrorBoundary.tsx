import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Label shown in the error panel so users know which section failed */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? ` · ${this.props.section}` : ''}]`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-secondary border border-theme rounded-xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              {this.props.section ?? 'Component'} Error
            </p>
            <p className="mt-2 text-sm font-semibold text-main">
              Something went wrong rendering this section.
            </p>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-4 rounded-md border border-theme bg-muted-surface px-3 py-1.5 text-sm font-medium text-main transition-colors hover:bg-secondary"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
