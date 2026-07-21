import React from 'react';
import { Trophy, History, Settings, Files } from 'lucide-react';

interface AppNavigationProps {
    onOpenStats: () => void;
    onOpenHistory: () => void;
    onOpenLists: () => void;
    onOpenSettings: () => void;
    hasResult: boolean;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({
    onOpenStats,
    onOpenHistory,
    onOpenLists,
    onOpenSettings,
    hasResult,
}) => {
    return (
        <nav 
            className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 touch-manipulation"
            style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
            <button 
                onClick={onOpenStats} 
                className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] h-14 rounded-xl transition-all duration-150 active:scale-95 active:bg-slate-100 dark:active:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
                <Trophy size={20} strokeWidth={2} className="mb-1 transition-transform group-active:scale-110" /> 
                <span className="text-[10px] font-bold tracking-tight">Статистика</span>
            </button>
            
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-800 opacity-80" />
            
            <button 
                onClick={onOpenHistory} 
                disabled={!hasResult} 
                className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] h-14 rounded-xl transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                    hasResult 
                        ? 'text-primary-600 dark:text-primary-400 active:bg-primary-50 dark:active:bg-primary-950/30' 
                        : 'opacity-40 cursor-not-allowed text-slate-400'
                }`}
            >
                <History size={20} strokeWidth={2} className="mb-1" /> 
                <span className="text-[10px] font-bold tracking-tight">История</span>
            </button>
            
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-800 opacity-80" />

            <button 
                onClick={onOpenLists} 
                className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] h-14 rounded-xl transition-all duration-150 active:scale-95 active:bg-slate-100 dark:active:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
                <Files size={20} strokeWidth={2} className="mb-1" /> 
                <span className="text-[10px] font-bold tracking-tight">Списки</span>
            </button>
            
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-800 opacity-80" />
            
            <button 
                onClick={onOpenSettings} 
                className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] h-14 rounded-xl transition-all duration-150 active:scale-95 active:bg-slate-100 dark:active:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
                <Settings size={20} strokeWidth={2} className="mb-1" /> 
                <span className="text-[10px] font-bold tracking-tight">Настройки</span>
            </button>
        </nav>
    );
};
