import React from 'react';
import { AlertTriangle, RotateCw, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production, you would send this to an error reporting service
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleHardReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-4 py-12 transition-colors duration-150 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-8 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger-light)] text-[var(--danger)] mb-6 animate-scale-in">
                <AlertTriangle className="h-8 w-8" />
              </div>
              
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Something went wrong
              </h1>
              
              <p className="mt-3 text-sm text-[var(--text-secondary)] max-w-md">
                An unexpected application error occurred. We have logged this error and are looking into it.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {/* Primary Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-stretch">
                <button
                  onClick={this.handleReset}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[var(--brand-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                >
                  <RotateCw className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleHardReload}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition-colors duration-150 hover:bg-[var(--bg-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </button>
              </div>

              {/* Technical Details (Collapsible) */}
              {this.state.error && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
                  <button
                    onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                    className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors duration-150"
                  >
                    <span>Technical Details</span>
                    {this.state.showDetails ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {this.state.showDetails && (
                    <div className="border-t border-[var(--border)] p-4 font-mono text-[11px] leading-relaxed text-[var(--danger-text)] bg-[var(--danger-light)] max-h-60 overflow-y-auto whitespace-pre-wrap">
                      <p className="font-bold mb-1">{this.state.error.toString()}</p>
                      {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
