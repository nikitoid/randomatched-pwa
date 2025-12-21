import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const DEFAULT_DURATION = 4000;
  const duration = toast.duration || DEFAULT_DURATION;
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Start progress bar animation
    const animationTimer = setTimeout(() => {
      setIsClosing(true);
    }, 10);

    // Auto close timer
    const closeTimer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(closeTimer);
    };
  // We use empty dependency array to ensure the timer is set exactly ONCE when mounted.
  // This prevents the timer from resetting if parent components re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const styles = {
    info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800',
    success: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800',
    error: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800',
    warning: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800'
  };

  const progressColors = {
    info: 'bg-blue-400/50 dark:bg-blue-400',
    success: 'bg-green-500/50 dark:bg-green-400',
    error: 'bg-red-500/50 dark:bg-red-400',
    warning: 'bg-orange-400/50 dark:bg-orange-400'
  };

  const icons = {
    info: <Info size={18} />,
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    warning: <AlertTriangle size={18} />
  };

  return (
    <div className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 duration-300 max-w-sm w-full ${styles[toast.type]}`}>
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => onClose(toast.id)} className="opacity-60 hover:opacity-100 z-10">
        <X size={16} />
      </button>
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 dark:bg-white/5">
        <div 
          className={`h-full ${progressColors[toast.type]}`}
          style={{ 
            width: isClosing ? '0%' : '100%',
            transition: `width ${duration}ms linear`
          }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;
  
  // Queue Implementation: Only render the first 3 toasts. 
  // Hidden toasts will be rendered (and their timers started) as visible ones are removed.
  const visibleToasts = toasts.slice(0, 3);

  return (
    <div className="fixed top-4 left-0 w-full flex flex-col items-center gap-2 z-[100] pointer-events-none px-4">
      {visibleToasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
           <Toast toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};