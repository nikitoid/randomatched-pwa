import React, { useId, useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useNavigation } from '../../context/NavigationContext';
import { getModalZIndex } from '../../constants/zIndex';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  
  /** Вариант отображения: 'auto' (bottom-sheet на мобильных, center на десктопе), 'center', 'bottom-sheet', 'full' */
  variant?: 'center' | 'bottom-sheet' | 'auto' | 'full';
  
  /** Максимальная ширина окна: xs (320px), sm (384px), md (448px), lg (512px), xl (576px), 2xl (672px), full */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  
  /** Приоритет кнопки "Назад" (стандартный = 20, подтверждение/алерт = 30+) */
  priority?: number;
  modalId?: string;
  isAlert?: boolean;
  
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  enableSwipeToClose?: boolean;
  
  children: React.ReactNode;
  footer?: React.ReactNode | ((close: () => void) => React.ReactNode);
  headerActions?: React.ReactNode;
  subHeader?: React.ReactNode;
  closeButtonTestId?: string;
  className?: string;
  contentClassName?: string;
  contentRef?: React.Ref<HTMLDivElement>;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  variant = 'auto',
  maxWidth = 'md',
  priority = 20,
  modalId,
  isAlert = false,
  showCloseButton = true,
  closeOnBackdropClick = true,
  enableSwipeToClose = true,
  children,
  footer,
  headerActions,
  subHeader,
  closeButtonTestId,
  className = '',
  contentClassName = '',
  contentRef,
}) => {
  const generatedId = useId();
  const resolvedId = modalId || generatedId;
  const { getStackIndex } = useNavigation();

  // Состояние монтирования и анимации появление / закрытие
  const [isRendered, setIsRendered] = useState(isOpen);
  const [animateState, setAnimateState] = useState<'entering' | 'entered' | 'exiting'>('entering');

  // Состояние для тач-свайпа
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentDragYRef = useRef(0);

  // Запуск плавной анимации закрытия уездом вниз
  const handleRequestClose = useCallback(() => {
    if (animateState === 'exiting') return;
    setAnimateState('exiting');
    setTimeout(() => {
      onClose();
    }, 300);
  }, [animateState, onClose]);

  // Интеграция с нативной кнопкой "Назад"
  useBackHandler(isOpen, handleRequestClose, { id: resolvedId, priority });

  // Управление циклом жизни монтирования
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setAnimateState('entering');
      setDragY(0);
      setIsDragging(false);

      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          setAnimateState('entered');
        });
      }, 25);

      return () => clearTimeout(timer);
    } else if (isRendered) {
      setAnimateState('exiting');
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Отслеживание физических размеров вьюпорта (для защиты от перекрытия виртуальной клавиатурой)
  const [viewportStyle, setViewportStyle] = useState<{ height?: number; top?: number; maxModalHeight?: number }>({});

  useEffect(() => {
    if (!isRendered || typeof window === 'undefined') return;

    const updateViewport = () => {
      if (window.visualViewport) {
        const height = window.visualViewport.height;
        const top = window.visualViewport.offsetTop;
        const maxModalHeight = Math.min(window.innerHeight * 0.85, height - 16);

        setViewportStyle({
          height,
          top,
          maxModalHeight: Math.max(200, maxModalHeight),
        });
      }
    };

    updateViewport();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewport);
      vv.addEventListener('scroll', updateViewport);
    }

    window.addEventListener('resize', updateViewport);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateViewport);
        vv.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
    };
  }, [isRendered]);

  // Сброс возможного паразитного скролла страницы при фокусе инпутов
  useEffect(() => {
    if (!isRendered) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isRendered]);

  // Расчет слоев z-index на основе позиции в стеке
  const stackIndex = isRendered ? getStackIndex(resolvedId) : 0;
  const { backdropZIndex, modalZIndex } = getModalZIndex(stackIndex, isAlert, priority);

  // Обработчики тач-свайпа
  const handleTouchStart = (e: React.TouchEvent | React.PointerEvent) => {
    if (!enableSwipeToClose) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    startYRef.current = clientY;
    currentDragYRef.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.PointerEvent) => {
    if (!isDragging || !enableSwipeToClose) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
    const deltaY = clientY - startYRef.current;

    if (deltaY > 0) {
      currentDragYRef.current = deltaY;
      setDragY(deltaY);
    } else {
      const damped = deltaY * 0.15;
      currentDragYRef.current = damped;
      setDragY(damped);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !enableSwipeToClose) return;
    setIsDragging(false);

    const threshold = 110;
    if (currentDragYRef.current > threshold) {
      setDragY(window.innerHeight);
      handleRequestClose();
    } else {
      setDragY(0);
    }
  };

  if (!isRendered) return null;

  const isBottomSheetScreen = variant === 'bottom-sheet' || (variant === 'auto' && (typeof window !== 'undefined' ? window.innerWidth < 640 : true));

  const getMaxWidthClass = () => {
    let widthClass = 'max-w-md';
    switch (maxWidth) {
      case 'xs': widthClass = 'max-w-xs'; break;
      case 'sm': widthClass = 'max-w-sm'; break;
      case 'md': widthClass = 'max-w-md'; break;
      case 'lg': widthClass = 'max-w-lg'; break;
      case 'xl': widthClass = 'max-w-xl'; break;
      case '2xl': widthClass = 'max-w-2xl'; break;
      case 'full': widthClass = 'max-w-full'; break;
      default: widthClass = 'max-w-md'; break;
    }

    if (isBottomSheetScreen) {
      return `max-w-full sm:${widthClass}`;
    }

    return widthClass;
  };

  const getContainerLayoutClass = () => {
    switch (variant) {
      case 'bottom-sheet':
        return 'items-end justify-center p-0';
      case 'center':
        return 'items-center justify-center p-4 sm:p-6';
      case 'full':
        return 'items-center justify-center p-0';
      case 'auto':
      default:
        return 'items-end sm:items-center justify-center p-0 sm:p-4 sm:p-6';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      handleRequestClose();
    }
  };

  const getCardTransformStyle = (): React.CSSProperties => {
    const transitionStyle = isDragging
      ? 'none'
      : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease-out';

    if (isBottomSheetScreen) {
      let translateY = '100%';
      if (animateState === 'entered') {
        translateY = `${Math.max(0, dragY)}px`;
      } else if (animateState === 'entering' || animateState === 'exiting') {
        translateY = '100%';
      }

      return {
        transform: `translateY(${translateY})`,
        transition: transitionStyle,
        willChange: 'transform',
      };
    } else {
      const isExitingOrEntering = animateState === 'entering' || animateState === 'exiting';
      return {
        transform: isExitingOrEntering ? 'scale(0.95) translateY(16px)' : 'scale(1) translateY(0)',
        opacity: isExitingOrEntering ? 0 : 1,
        transition: transitionStyle,
        willChange: 'transform, opacity',
      };
    }
  };

  const getBackdropOpacity = () => {
    if (animateState === 'entering' || animateState === 'exiting') return 'opacity-0';
    if (dragY > 0 && isBottomSheetScreen) {
      const progress = Math.min(1, dragY / 300);
      return `opacity-${Math.max(10, Math.round((1 - progress) * 100))}`;
    }
    return 'opacity-100';
  };

  return (
    <div
      className={`fixed inset-0 flex bg-slate-950/60 backdrop-blur-md transition-opacity duration-300 ${getContainerLayoutClass()} ${getBackdropOpacity()} ${animateState === 'exiting' ? 'pointer-events-none' : ''}`}
      style={{
        zIndex: backdropZIndex,
        ...(viewportStyle.height ? { height: `${viewportStyle.height}px` } : {}),
        ...(viewportStyle.top !== undefined ? { top: `${viewportStyle.top}px` } : {}),
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      data-testid={resolvedId}
    >
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 flex flex-col overflow-hidden w-full ${getMaxWidthClass()} ${
          isBottomSheetScreen
            ? 'rounded-t-3xl sm:rounded-3xl max-h-[85vh] sm:max-h-[85vh]'
            : 'rounded-3xl max-h-[85vh]'
        } ${className} ${animateState === 'exiting' ? 'pointer-events-none' : ''}`}
        style={{
          zIndex: modalZIndex,
          ...(viewportStyle.maxModalHeight ? { maxHeight: `${viewportStyle.maxModalHeight}px` } : {}),
          ...getCardTransformStyle(),
        }}
      >
        {/* Touch Drag handle for mobile bottom sheet */}
        {(variant === 'bottom-sheet' || variant === 'auto') && (
          <div
            className="w-full pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none shrink-0 sm:hidden flex justify-center bg-white dark:bg-slate-900"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onPointerDown={handleTouchStart}
            onPointerMove={handleTouchMove}
            onPointerUp={handleTouchEnd}
          >
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700/80 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || icon || showCloseButton || headerActions) && (
          <div
            className="relative px-6 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 select-none touch-none bg-white dark:bg-slate-900 z-10"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onPointerDown={handleTouchStart}
            onPointerMove={handleTouchMove}
            onPointerUp={handleTouchEnd}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {icon && (
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
              {headerActions}
              {showCloseButton && (
                <button
                  onClick={handleRequestClose}
                  data-testid={closeButtonTestId}
                  className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white active:bg-slate-200 dark:active:bg-slate-700 active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Fixed SubHeader (Search bar / filters) */}
        {subHeader && (
          <div className="px-4 sm:px-6 py-2.5 border-b border-slate-100 dark:border-slate-800/80 shrink-0 bg-white dark:bg-slate-900 z-10">
            {subHeader}
          </div>
        )}

        {/* Scrollable Content Body with min-h-0 flex-1 */}
        <div ref={contentRef} className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar ${contentClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900 shrink-0 z-10">
            {typeof footer === 'function' ? footer(handleRequestClose) : footer}
          </div>
        )}
      </div>
    </div>
  );
};
