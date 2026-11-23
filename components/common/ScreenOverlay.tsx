import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { Z_INDEX_BASE } from '../../constants/zIndex';

export interface ScreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  subHeader?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  screenId: string;
  priority?: number;
  zIndex?: number;
  testId?: string;
  closeButtonTestId?: string;
  closeButtonAriaLabel?: string;
  onBackClick?: () => void;
  headerAlign?: 'center' | 'left';
  headerClassName?: string;
  bodyClassName?: string;
  bodyRef?: React.Ref<HTMLDivElement>;
  bodyScrollable?: boolean;
  overlayTopSlot?: React.ReactNode;
  onTouchStart?: React.TouchEventHandler<HTMLDivElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
}

const TRANSITION_DURATION_MS = 300;

export const ScreenOverlay: React.FC<ScreenOverlayProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerActions,
  subHeader,
  footer,
  children,
  screenId,
  priority = 20,
  zIndex,
  testId,
  closeButtonTestId,
  closeButtonAriaLabel = 'Закрыть',
  onBackClick,
  headerAlign = 'center',
  headerClassName = '',
  bodyClassName = '',
  bodyRef,
  bodyScrollable = true,
  overlayTopSlot,
  onTouchStart,
  onTouchEnd,
}) => {
  const [phase, setPhase] = useState<'closed' | 'entering' | 'entered' | 'exiting'>(
    isOpen ? 'entering' : 'closed'
  );
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf1Ref = useRef<number | null>(null);
  const raf2Ref = useRef<number | null>(null);

  useBackHandler(isOpen, onClose, { id: screenId, priority });

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (raf1Ref.current !== null) {
      cancelAnimationFrame(raf1Ref.current);
      raf1Ref.current = null;
    }
    if (raf2Ref.current !== null) {
      cancelAnimationFrame(raf2Ref.current);
      raf2Ref.current = null;
    }

    if (isOpen) {
      setPhase('entering');
      raf1Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => {
          setPhase('entered');
        });
      });
    } else {
      setPhase((prev) => {
        if (prev === 'closed') return 'closed';
        closeTimerRef.current = setTimeout(() => {
          setPhase('closed');
        }, TRANSITION_DURATION_MS);
        return 'exiting';
      });
    }

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (raf1Ref.current !== null) {
        cancelAnimationFrame(raf1Ref.current);
        raf1Ref.current = null;
      }
      if (raf2Ref.current !== null) {
        cancelAnimationFrame(raf2Ref.current);
        raf2Ref.current = null;
      }
    };
  }, [isOpen]);

  const visibilityClasses =
    phase === 'entered'
      ? 'translate-x-0 opacity-100 visible pointer-events-auto'
      : phase === 'entering' || phase === 'exiting'
        ? 'translate-x-full opacity-0 visible pointer-events-none'
        : 'translate-x-full opacity-0 invisible pointer-events-none';

  const handleBackPress = onBackClick ?? onClose;

  return (
    <div
      data-testid={testId}
      aria-hidden={!isOpen}
      className={`fixed inset-0 bg-slate-50 dark:bg-slate-950 bg-grid-pattern flex flex-col transform-gpu will-change-transform transition-[transform,opacity] duration-300 ${visibilityClasses}`}
      style={{
        zIndex: zIndex ?? Z_INDEX_BASE.OVERLAY,
        transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      {overlayTopSlot}

      <div
        className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0 border-b border-slate-200/60 dark:border-slate-800/60 shadow-2xs transition-opacity duration-200 ${headerClassName}`}
      >
        <div
          className="px-4 py-3 touch-manipulation"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          {headerAlign === 'left' ? (
            <div className="flex items-center justify-between gap-2 min-h-[44px]">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={handleBackPress}
                  aria-label={closeButtonAriaLabel}
                  data-testid={closeButtonTestId}
                  className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all shadow-xs shrink-0"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="flex-1 min-w-0 pr-1">
                  {title}
                  {subtitle && <div className="mt-0.5">{subtitle}</div>}
                </div>
              </div>
              {headerActions && (
                <div className="flex items-center gap-1.5 shrink-0">{headerActions}</div>
              )}
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-full min-h-[44px]">
              <button
                type="button"
                onClick={handleBackPress}
                aria-label={closeButtonAriaLabel}
                data-testid={closeButtonTestId}
                className="absolute left-0 z-10 w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all shadow-xs shrink-0"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="flex flex-col items-center justify-center min-w-0 px-12 text-center">
                {title}
                {subtitle && <div className="mt-0.5">{subtitle}</div>}
              </div>
              {headerActions && (
                <div className="absolute right-0 z-10 flex items-center gap-1.5 shrink-0">
                  {headerActions}
                </div>
              )}
            </div>
          )}
        </div>

        {subHeader}
      </div>

      {bodyScrollable ? (
        <div
          ref={bodyRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar ${bodyClassName}`}
        >
          {children}
        </div>
      ) : (
        <div
          ref={bodyRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className={`flex-1 min-h-0 relative overflow-hidden ${bodyClassName}`}
        >
          {children}
        </div>
      )}

      {footer && (
        <div
          className="shrink-0 p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
