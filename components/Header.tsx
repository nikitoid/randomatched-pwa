import React, { useRef } from 'react';
import { Loader2, Download, Dice5 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
    isCheckingUpdate: boolean;
    isUpdateAvailable: boolean;
    handleOpenUpdateBanner: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAdmin?: boolean;
    onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    isCheckingUpdate,
    isUpdateAvailable,
    handleOpenUpdateBanner,
    theme,
    toggleTheme,
    isAdmin = false,
    onOpenAdmin,
}) => {
    const lastTapRef = useRef<number>(0);

    const handleLogoClick = () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 350; // ms

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            lastTapRef.current = 0;
            if (isAdmin && onOpenAdmin) {
                onOpenAdmin();
            }
        } else {
            lastTapRef.current = now;
        }
    };

    return (
        <header className="px-5 pt-5 mt-1 pb-2 flex justify-between items-center z-10 touch-manipulation">
            <div className="flex items-center gap-3">
                <div 
                    className="relative flex items-center justify-center cursor-pointer select-none"
                    onClick={handleLogoClick}
                >
                    <div className="absolute -inset-1 rounded-xl bg-primary-500/50 dark:bg-primary-400/60 blur-sm animate-pulse pointer-events-none [transform:translateZ(0)] will-change-[opacity]" />
                    <div className="relative bg-primary-600 p-2.5 rounded-xl shadow-lg shadow-primary-600/30 active:scale-95 transition-transform duration-150 flex items-center justify-center">
                        <Dice5 className="text-white w-6 h-6" />
                    </div>
                </div>
                <div>
                    <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                        Random<span className="text-primary-600 dark:text-primary-400">atched</span>
                    </h1>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase mt-1">GENERATOR</p>
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
