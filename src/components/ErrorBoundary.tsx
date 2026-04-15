import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and display fallback UI
 * Prevents entire app from crashing due to single component errors
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-12 max-w-md text-center">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">
              Something went wrong
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-6">
              Error details have been logged. If the problem persists, please try refreshing the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
