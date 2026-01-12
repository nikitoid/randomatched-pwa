import React from 'react';
import { Trophy, History, Settings } from 'lucide-react';

interface AppNavigationProps {
    onOpenStats: () => void;
    onOpenHistory: () => void;
    onOpenSettings: () => void;
    hasResult: boolean;
}

export const AppNavigation: React.FC<AppNavigationProps> = ({
    onOpenStats,
    onOpenHistory,
    onOpenSettings,
    hasResult,
}) => {
    return (
        <nav className="pb-safe-area-bottom bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-3 h-16 w-full max-w-lg mx-auto">
                <button onClick={onOpenStats} className="flex flex-col items-center justify-center gap-1 h-full text-slate-400 md:hover:text-primary-600 dark:md:hover:text-primary-400 active:text-primary-600 transition-colors">
                    <Trophy size={20} strokeWidth={2} /> <span className="text-[10px] font-bold">Статистика</span>
                </button>
                <div className="flex items-center justify-center relative">
                    <div className="absolute w-px h-8 bg-slate-100 dark:bg-slate-800 left-0"></div>
                    <button onClick={onOpenHistory} disabled={!hasResult} className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors ${hasResult ? 'text-primary-600 dark:text-primary-400' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`}>
                        <History size={24} strokeWidth={2} /> <span className="text-[10px] font-bold">История</span>
                    </button>
                    <div className="absolute w-px h-8 bg-slate-100 dark:bg-slate-800 right-0"></div>
                </div>
                <button onClick={onOpenSettings} className="flex flex-col items-center justify-center gap-1 h-full text-slate-400 md:hover:text-primary-600 dark:md:hover:text-primary-400 active:text-primary-600 transition-colors">
                    <Settings size={24} strokeWidth={2} /> <span className="text-[10px] font-bold">Настройки</span>
                </button>
            </div>
        </nav>
    );
};
