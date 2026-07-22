import React from 'react';
import { AlertTriangle, AlertCircle, Info, HelpCircle } from 'lucide-react';
import { BaseModal } from './BaseModal';

export interface ConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  icon?: React.ReactNode;
  extraAction?: React.ReactNode;
  modalId?: string;
  priority?: number;
  testId?: string;
  confirmTestId?: string;
  cancelTestId?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  description,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  confirmVariant = 'warning',
  icon,
  extraAction,
  modalId,
  priority = 30,
  testId,
  confirmTestId,
  cancelTestId,
}) => {
  const getIconContainerStyle = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'primary':
        return 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400';
      case 'warning':
      default:
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
    }
  };

  const getDefaultIcon = () => {
    switch (confirmVariant) {
      case 'danger':
        return <AlertCircle size={24} />;
      case 'primary':
        return <Info size={24} />;
      case 'warning':
      default:
        return <AlertTriangle size={24} />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-lg shadow-red-500/20';
      case 'primary':
        return 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-lg shadow-primary-500/20';
      case 'warning':
      default:
        return 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-lg shadow-orange-500/20';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onCancel}
      maxWidth="xs"
      variant="center"
      priority={priority}
      modalId={modalId}
      isAlert={true}
      showCloseButton={false}
    >
      <div className="flex flex-col items-center text-center p-1">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shrink-0 ${getIconContainerStyle()}`}>
          {icon || getDefaultIcon()}
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {title}
        </h3>

        {description && (
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {description}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onCancel}
              data-testid={cancelTestId || 'confirm-modal-cancel-btn'}
              className="py-3.5 px-4 font-bold text-sm text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-2xl active:scale-95 transition-all min-h-[48px]"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              data-testid={confirmTestId || testId}
              className={`py-3.5 px-4 font-bold text-sm rounded-2xl active:scale-95 transition-all min-h-[48px] ${getConfirmButtonStyle()}`}
            >
              {confirmText}
            </button>
          </div>

          {extraAction && (
            <div className="w-full">
              {extraAction}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
