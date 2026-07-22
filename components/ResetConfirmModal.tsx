import React from 'react';
import { RotateCcw } from 'lucide-react';
import { ConfirmModal } from './common/ConfirmModal';

interface ResetConfirmModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    onResetAndSync?: () => void;
    checkConnectivity?: () => Promise<boolean>;
    isOnline?: boolean;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
    isOpen,
    onCancel,
    onConfirm,
    onResetAndSync,
    isOnline = true,
}) => {
    const extraSyncAction = onResetAndSync ? (
        <button
            onClick={onResetAndSync}
            disabled={!isOnline}
            className={`w-full px-4 py-3.5 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 min-h-[48px] shadow-lg shadow-red-500/20
                ${!isOnline
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed shadow-none'
                    : 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white active:scale-95'
                }
            `}
        >
            Сбросить и синхронизировать
        </button>
    ) : undefined;

    return (
        <ConfirmModal
            isOpen={isOpen}
            onCancel={onCancel}
            onConfirm={onConfirm}
            title="Сбросить сессию?"
            description="Текущее распределение команд, имена игроков и временные списки будут удалены."
            confirmText="Сбросить"
            cancelText="Отмена"
            confirmVariant="danger"
            icon={<RotateCcw size={24} />}
            extraAction={extraSyncAction}
            modalId="reset-confirm-modal"
            priority={30}
            testId="confirm-reset-button"
        />
    );
};
