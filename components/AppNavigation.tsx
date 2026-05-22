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
            className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 transition-all duration-500"
            style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
            <button 
                onClick={onOpenStats} 
                className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors md:hover:bg-white dark:md:hover:bg-slate-800 active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300 active:text-primary-600"
            >
                <Trophy size={20} strokeWidth={2} className="mb-1" /> 
                <span className="text-[10px] font-bold">Статистика</span>
            </button>
            
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
            
            <button 
                onClick={onOpenHistory} 
                disabled={!hasResult} 
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${
                    hasResult 
                        ? 'text-primary-600 dark:text-primary-400 md:hover:bg-white dark:md:hover:bg-slate-800 active:bg-white dark:active:bg-slate-800' 
                        : 'opacity-40 cursor-not-allowed text-slate-400'
                }`}
            >
                <History size={20} strokeWidth={2} className="mb-1" /> 
                <span className="text-[10px] font-bold">История</span>
            </button>
            
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />

            <button 
                onClick={onOpenLists} 
                className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors md:hover:bg-white dark:md:hover:bg-slate-800 active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300 active:text-primary-600"
            >
                <Files size={20} strokeWidth={2} className="mb-1" /> 
                <span className="text-[10px] font-bold">Списки</span>
            </button>
            
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
            
            <button 
                onClick={onOpenSettings} 
                className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors md:hover:bg-white dark:md:hover:bg-slate-800 active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300 active:text-primary-600"
            >
                <Settings size={20} strokeWidth={2} className="mb-1" /> 
                <span className="text-[10px] font-bold">Настройки</span>
            </button>
        </nav>
    );
};
