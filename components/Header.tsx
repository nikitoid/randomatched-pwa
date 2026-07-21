import React from 'react';
import { Loader2, Download, Dice5 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
    isCheckingUpdate: boolean;
    isUpdateAvailable: boolean;
    handleOpenUpdateBanner: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    isCheckingUpdate,
    isUpdateAvailable,
    handleOpenUpdateBanner,
    theme,
    toggleTheme,
}) => {
    return (
        <header className="px-5 pt-safe-area-top pt-5 mt-1 pb-2 flex justify-between items-center z-10 touch-manipulation">
            <div className="flex items-center gap-3">
                <div className="bg-primary-600 p-2.5 rounded-xl shadow-lg shadow-primary-600/25 active:scale-95 transition-transform duration-150">
                    <Dice5 className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                        Random<span className="text-primary-600 dark:text-primary-400">atched</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-0.5">GENERATOR</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isCheckingUpdate && <div className="p-2.5 text-primary-500 animate-spin"><Loader2 size={20} /></div>}
                {!isCheckingUpdate && isUpdateAvailable && (
                    <button 
                        onClick={handleOpenUpdateBanner} 
                        className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 animate-pulse active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Доступно обновление"
                    >
                        <Download size={20} />
                    </button>
                )}
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
        </header>
    );
};
