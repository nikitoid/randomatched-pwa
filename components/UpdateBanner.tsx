import React from 'react';
import { Download, X } from 'lucide-react';
import { Z_INDEX_BASE } from '../constants/zIndex';

interface UpdateBannerProps {
    isVisible: boolean;
    onUpdate: () => void;
    onClose: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
    isVisible,
    onUpdate,
    onClose,
}) => {
    if (!isVisible) return null;

    return (
        <div 
            className="fixed top-0 left-0 w-full p-4 animate-in slide-in-from-top duration-500 pointer-events-none"
            style={{ 
                paddingTop: 'calc(1rem + env(safe-area-inset-top))',
                zIndex: Z_INDEX_BASE.TOAST + 5
            }}
        >
            <div className="max-w-md mx-auto bg-primary-600 dark:bg-primary-600 rounded-2xl shadow-2xl shadow-primary-600/40 p-4 flex items-center gap-4 text-white pointer-events-auto border border-white/15 backdrop-blur-md">
                <div className="bg-white/20 p-2.5 rounded-xl shrink-0"><Download size={20} /></div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm leading-tight">Доступно обновление</h3>
                    <p className="text-xs text-primary-100 truncate mt-0.5">Новая версия готова к установке</p>
                </div>
                <button 
                    onClick={onUpdate} 
                    className="px-4 py-2 bg-white text-primary-600 hover:bg-primary-50 text-xs font-bold rounded-xl whitespace-nowrap shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                    Обновить
                </button>
                <button 
                    onClick={onClose} 
                    className="p-1 text-primary-200 hover:text-white transition-colors cursor-pointer rounded-lg"
                    aria-label="Закрыть уведомление"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

