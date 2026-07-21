import React from 'react';
import { Download, X } from 'lucide-react';

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
            className="fixed top-0 left-0 w-full z-[70] p-4 animate-in slide-in-from-top duration-500"
            style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
        >
            <div className="max-w-md mx-auto bg-primary-600 rounded-2xl shadow-xl shadow-primary-600/30 p-4 flex items-center gap-4 text-white">
                <div className="bg-white/20 p-2 rounded-full shrink-0"><Download size={20} /></div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm">Доступно обновление</h3>
                    <p className="text-xs text-primary-100 truncate">Новая версия готова к установке</p>
                </div>
                <button onClick={onUpdate} className="px-4 py-2 bg-white text-primary-600 text-xs font-bold rounded-xl whitespace-nowrap shadow-sm active:scale-95 transition-transform">Обновить</button>
                <button onClick={onClose} className="text-primary-200"><X size={18} /></button>
            </div>
        </div>
    );
};
