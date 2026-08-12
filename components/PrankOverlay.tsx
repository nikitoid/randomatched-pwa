import React, { useEffect } from 'react';
import { Sparkles, MessageCircle, X } from 'lucide-react';
import { Z_INDEX_BASE } from '../constants/zIndex';

interface PrankOverlayProps {
  isUpsideDown: boolean;
  isMirror: boolean;
  secretMessage: string | null;
  remainingSeconds: number | null;
  onDismissMessage: () => void;
}

export const PrankOverlay: React.FC<PrankOverlayProps> = ({
  isUpsideDown,
  isMirror,
  secretMessage,
  remainingSeconds,
  onDismissMessage
}) => {
  // Применение CSS-трансформаций к корневому элементу приложения
  useEffect(() => {
    const rootEl = document.getElementById('root') || document.body;

    if (isUpsideDown) {
      rootEl.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
      rootEl.style.transform = 'rotate(180deg)';
    } else if (isMirror) {
      rootEl.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
      rootEl.style.transform = 'scaleX(-1)';
    } else {
      rootEl.style.transition = 'transform 0.6s ease-out';
      rootEl.style.transform = 'none';
    }

    return () => {
      rootEl.style.transform = 'none';
      rootEl.style.transition = '';
    };
  }, [isUpsideDown, isMirror]);

  return (
    <>
      {/* Секретное послание от Администратора */}
      {secretMessage && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn transition-all duration-300"
          style={{ zIndex: Z_INDEX_BASE.ALERT + 30 }}
        >
          <div className="w-full max-w-sm bg-white/95 dark:bg-slate-900/95 border border-primary-500/30 rounded-3xl p-6 shadow-2xl shadow-primary-500/20 backdrop-blur-xl relative overflow-hidden animate-scaleUp">
            {/* Декоративное фоновое свечение */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-secondary-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-white shadow-md shadow-primary-500/30">
                  <Sparkles size={20} className="animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white leading-tight">
                    Послание от Создателя
                  </h3>
                  <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 tracking-wider uppercase">
                    Admin Message
                  </p>
                </div>
              </div>

              <button
                onClick={onDismissMessage}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 mb-5 text-slate-800 dark:text-slate-100 text-sm font-medium leading-relaxed whitespace-pre-wrap relative z-10 shadow-inner">
              <div className="flex items-start gap-2.5">
                <MessageCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                <div className="flex-1">{secretMessage}</div>
              </div>
            </div>

            <button
              onClick={onDismissMessage}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-sm shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 relative z-10"
            >
              <span>Понял, принял!</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
