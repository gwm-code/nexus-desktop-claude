import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.fallbackTitle ? ` - ${this.props.fallbackTitle}` : ''}]`,
      error,
      errorInfo.componentStack
    );
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle ?? 'Component';

      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 p-6">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center">
            <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                {title} crashed
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {this.state.error?.message ?? 'An unexpected error occurred'}
              </p>
            </div>

            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md
                         bg-zinc-800 border border-zinc-700 text-zinc-300
                         hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
