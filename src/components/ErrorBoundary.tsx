import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
  isQuotaError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
    isPermissionError: false,
    isQuotaError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    const raw = error.message || 'An unexpected error occurred.';
    let readable = raw;
    let isPermissionError = false;
    let isQuotaError = false;

    try {
      const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
      if (parsed && typeof parsed.error === 'string') {
        readable = `${parsed.error}${parsed.path ? ` (${parsed.operationType} on ${parsed.path})` : ''}`;
      }
    } catch {
      // Plain text error
    }

    if (readable.toLowerCase().includes('permission') || readable.toLowerCase().includes('insufficient')) {
      isPermissionError = true;
    }
    if (readable.toLowerCase().includes('quota')) {
      isQuotaError = true;
    }

    return {
      hasError: true,
      errorMessage: readable,
      isPermissionError,
      isQuotaError,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      isPermissionError: false,
      isQuotaError: false,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900">
                {this.state.isQuotaError
                  ? 'Daily database quota reached'
                  : this.state.isPermissionError
                    ? 'Database access error'
                    : 'Something went wrong'}
              </h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {this.state.isQuotaError
                ? 'Your Firestore free-tier daily quota has been reached. Quota resets tomorrow, or you can upgrade your project plan in the Firebase Console.'
                : 'Bachat Karo encountered an unexpected issue while syncing your budget data.'}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
              <p className="text-xs font-mono text-slate-700 break-words">
                {this.state.errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Bachat Karo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
