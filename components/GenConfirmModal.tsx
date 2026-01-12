import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
            <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mb-4 animate-in zoom-in-95 duration-300">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Перегенерировать?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Текущий результат будет потерян. Вы уверены?</p>

                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button onClick={onCancel} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl active:scale-95 transition-transform">
                            Отмена
                        </button>
                        <button onClick={onConfirm} className="py-3 font-bold text-white bg-orange-500 rounded-xl shadow-lg shadow-orange-500/30 active:scale-95 transition-transform">
                            Да
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
