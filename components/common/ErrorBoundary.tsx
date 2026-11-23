import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, X } from 'lucide-react';
import { Z_INDEX_BASE } from '../../constants/zIndex';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  variant?: 'fullscreen' | 'overlay';
  showDetails?: boolean;
  onReset?: () => void;
  onClose?: () => void;
  resetKey?: string | number | boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const isChunkLoadError = (error: Error | null): boolean => {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(
    error.message || ''
  );
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleClose = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onClose?.();
  };

  render(): React.ReactNode {
    const { hasError, error, errorInfo } = this.state;
    if (!hasError) {
      return this.props.children;
    }

    const {
      fallbackTitle = 'Что-то пошло не так',
      fallbackDescription,
      variant = 'fullscreen',
      showDetails = false,
      onClose,
    } = this.props;

    const chunkFailed = isChunkLoadError(error);
    const description =
      fallbackDescription ||
      (chunkFailed
        ? 'Не удалось загрузить модуль интерфейса. Возможно, вышло обновление приложения — перезагрузите страницу.'
        : 'Произошла непредвиденная ошибка при отображении экрана. Вы можете повторить попытку или перезагрузить приложение.');

    const shouldShowDetails = Boolean((showDetails || (import.meta.env as { DEV?: boolean }).DEV) && error);

    const containerClass =
      variant === 'overlay'
        ? 'fixed inset-0 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm'
        : 'min-h-screen w-full flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100';

    const containerStyle = variant === 'overlay' ? { zIndex: Z_INDEX_BASE.ALERT } : undefined;

    return (
      <div className={containerClass} style={containerStyle} role="alert">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-slate-100">
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {fallbackTitle}
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={this.handleClose}
                aria-label="Закрыть"
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {shouldShowDetails && error && (
            <details className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300 select-none">
                Детали ошибки
              </summary>
              <div className="mt-2 space-y-1.5 font-mono text-[11px] text-rose-600 dark:text-rose-400 break-words whitespace-pre-wrap max-h-40 overflow-auto">
                <div>
                  {error.name}: {error.message}
                </div>
                {(errorInfo?.componentStack || error.stack) && (
                  <div className="text-slate-500 dark:text-slate-400">
                    {errorInfo?.componentStack || error.stack}
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
            >
              <RotateCcw size={16} />
              Попробовать снова
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-colors"
            >
              <RefreshCw size={16} />
              Перезагрузить приложение
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={this.handleClose}
              className="mt-2 w-full py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Закрыть окно
            </button>
          )}
        </div>
      </div>
    );
  }
}

export interface LazyOverlayBoundaryProps {
  isOpen: boolean;
  onClose?: () => void;
  showDetails?: boolean;
  fallbackTitle?: string;
  children: React.ReactNode;
}

export const LazyOverlayBoundary: React.FC<LazyOverlayBoundaryProps> = ({
  isOpen,
  onClose,
  showDetails = false,
  fallbackTitle,
  children,
}) => {
  const [hasOpened, setHasOpened] = React.useState(isOpen);

  React.useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
    }
  }, [isOpen, hasOpened]);

  if (!isOpen && !hasOpened) {
    return null;
  }

  const suspenseFallback = isOpen ? (
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px]"
      style={{ zIndex: Z_INDEX_BASE.OVERLAY }}
      role="status"
      aria-label="Загрузка"
    >
      <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>
  ) : null;

  return (
    <ErrorBoundary
      variant="overlay"
      onClose={onClose}
      showDetails={showDetails}
      fallbackTitle={fallbackTitle}
      resetKey={isOpen}
    >
      <React.Suspense fallback={suspenseFallback}>{children}</React.Suspense>
    </ErrorBoundary>
  );
};
