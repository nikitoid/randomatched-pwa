import React from 'react';
import { Trophy, Settings, Files } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';
import { Z_INDEX_BASE } from '../constants/zIndex';

interface AppNavigationProps {
    onOpenStats: () => void;
    onOpenLists: () => void;
    onOpenSettings: () => void;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({
    onOpenStats,
    onOpenLists,
    onOpenSettings,
}) => {
    const { trigger } = useHaptics();

    const baseNavButtonClass =
        'flex flex-col items-center justify-center min-w-[64px] min-h-[48px] h-14 rounded-xl transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 group';

    return (
        <nav 
            className="fixed left-1/2 flex items-center gap-1.5 p-1.5 bg-white/90 dark:bg-slate-900/90 main-nav-gradient rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.12)] dark:shadow-[0_0_30px_rgba(0,0,0,0.5)] border-none transition-all duration-300 touch-manipulation"
            style={{ 
                zIndex: Z_INDEX_BASE.NAVBAR,
                bottom: 'calc(1rem + env(safe-area-inset-bottom))',
                transform: 'translate3d(-50%, 0, 0)'
            }}
        >
            <button 
                type="button"
                onClick={(e) => { e.currentTarget.blur(); trigger('light'); onOpenStats(); }} 
                className={`${baseNavButtonClass} text-amber-600 dark:text-amber-400 [@media(hover:hover)]:hover:bg-amber-50/60 dark:[@media(hover:hover)]:hover:bg-amber-950/30 active:bg-amber-100/70 dark:active:bg-amber-900/40`}
            >
                <Trophy size={20} strokeWidth={2} className="mb-1 transition-transform group-active:scale-110 opacity-90 [@media(hover:hover)]:group-hover:opacity-100" /> 
                <span className="text-[10px] font-semibold tracking-tight">Статистика</span>
            </button>
            
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-800 opacity-80" />

            <button 
                type="button"
                onClick={(e) => { e.currentTarget.blur(); trigger('light'); onOpenLists(); }} 
                className={`${baseNavButtonClass} text-indigo-600 dark:text-indigo-400 [@media(hover:hover)]:hover:bg-indigo-50/60 dark:[@media(hover:hover)]:hover:bg-indigo-950/30 active:bg-indigo-100/70 dark:active:bg-indigo-900/40`}
            >
                <Files size={20} strokeWidth={2} className="mb-1 transition-transform group-active:scale-110 opacity-90 [@media(hover:hover)]:group-hover:opacity-100" /> 
                <span className="text-[10px] font-semibold tracking-tight">Списки</span>
            </button>
            
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-800 opacity-80" />
            
            <button 
                type="button"
                onClick={(e) => { e.currentTarget.blur(); trigger('light'); onOpenSettings(); }} 
                className={`${baseNavButtonClass} text-emerald-600 dark:text-emerald-400 [@media(hover:hover)]:hover:bg-emerald-50/60 dark:[@media(hover:hover)]:hover:bg-emerald-950/30 active:bg-emerald-100/70 dark:active:bg-emerald-900/40`}
            >
                <Settings size={20} strokeWidth={2} className="mb-1 transition-transform group-active:scale-110 opacity-90 [@media(hover:hover)]:group-hover:opacity-100" /> 
                <span className="text-[10px] font-semibold tracking-tight">Настройки</span>
            </button>
        </nav>
    );
};

