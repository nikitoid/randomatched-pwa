import React from 'react';
import { ConfirmModal } from './common/ConfirmModal';

interface GenConfirmModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export const GenConfirmModal: React.FC<GenConfirmModalProps> = ({
    isOpen,
    onCancel,
    onConfirm,
}) => {
    return (
        <ConfirmModal
            isOpen={isOpen}
            onCancel={onCancel}
            onConfirm={onConfirm}
            title="Перегенерировать?"
            description="Текущий результат будет потерян. Вы уверены?"
            confirmText="Да"
            cancelText="Отмена"
            confirmVariant="warning"
            modalId="gen-confirm-modal"
            priority={30}
        />
    );
};
