import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ResetConfirmModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    onResetAndSync?: () => void;
    isOnline?: boolean;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
    isOpen,
    onCancel,
    onConfirm,
    onResetAndSync,
    isOnline = true
}) => {
    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
            <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-transform duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4"><RotateCcw size={24} /></div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Сбросить сессию?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Текущее распределение команд, имена игроков и временные списки будут удалены.</p>
                </div>
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={onCancel} className="px-4 py-3.5 font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all">Отмена</button>
                        <button onClick={onConfirm} className="px-4 py-3.5 font-bold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-2xl active:scale-95 transition-all md:hover:bg-red-100 dark:md:hover:bg-red-900/30">Сбросить</button>
                    </div>
                    {onResetAndSync && (
                        <button
                            onClick={onResetAndSync}
                            disabled={!isOnline}
                            className={`w-full px-4 py-3.5 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20
                                ${!isOnline
                                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed shadow-none'
                                    : 'bg-red-500 text-white active:scale-95'
                                }
                            `}
                        >
                            Сбросить и синхронизировать
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
