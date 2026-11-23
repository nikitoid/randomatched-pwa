import React from 'react';
import { Upload } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';

interface ListNameModalProps {
    isOpen: boolean;
    mode: 'create' | 'rename';
    nameInputValue: string;
    setNameInputValue: (val: string) => void;
    createListFileInputRef: React.RefObject<HTMLInputElement>;
    onTriggerCreateListFileUpload: () => void;
    onNewListImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}

/**
 * Modal for creating a new hero list (or importing from JSON) and renaming an existing list.
 */
export const ListNameModal: React.FC<ListNameModalProps> = ({
    isOpen,
    mode,
    nameInputValue,
    setNameInputValue,
    createListFileInputRef,
    onTriggerCreateListFileUpload,
    onNewListImport,
    onSubmit,
    onCancel
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onCancel}
            title={mode === 'create' ? 'Новый список' : 'Переименовать'}
            maxWidth="xs"
            variant="auto"
            modalId="list-name-modal"
            priority={40}
            showCloseButton={false}
        >
            <form onSubmit={onSubmit} className="space-y-4">
                <input
                    autoFocus={isOpen}
                    type="text"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white select-text"
                    placeholder="Название..."
                />
                {mode === 'create' && (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold">Или</span>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                        </div>
                        <button
                            type="button"
                            onClick={onTriggerCreateListFileUpload}
                            className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"
                        >
                            <Upload size={16} /> Загрузить из файла
                        </button>
                        <input type="file" ref={createListFileInputRef} className="hidden" accept=".json" onChange={onNewListImport} />
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button type="button" onClick={onCancel} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                    <button type="submit" disabled={!nameInputValue.trim()} className="py-3 font-bold text-white bg-primary-600 rounded-xl" data-testid="name-submit-btn">ОК</button>
                </div>
            </form>
        </BaseModal>
    );
};
