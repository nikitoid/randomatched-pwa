import React from 'react';
import { Dice5, Shuffle, Eye, Trash2 } from 'lucide-react';

interface MainControlsProps {
    handleGenerate: () => void;
    isAnimating: boolean;
    hasLists: boolean;
    canReset: boolean;
    handleResetSessionClick: () => void;
    hasResult: boolean;
    handleOpenSession: () => void;
}

export const MainControls: React.FC<MainControlsProps> = ({
    handleGenerate,
    isAnimating,
    hasLists,
    canReset,
    handleResetSessionClick,
    hasResult,
    handleOpenSession,
}) => {
    return (
        <>
            <div className="w-full relative z-0 rounded-3xl touch-manipulation">
                <button
                    onClick={handleGenerate}
                    disabled={isAnimating || !hasLists}
                    className={`w-full relative group overflow-hidden rounded-3xl py-6 flex flex-col items-center justify-center 
                    bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 
                    shadow-[0_0_30px_rgb(var(--primary-500)/0.45)] dark:shadow-[0_0_35px_rgb(var(--primary-500)/0.55)] 
                    hover:shadow-[0_0_40px_rgb(var(--primary-500)/0.65)] 
                    transition-all duration-300 active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-primary-500/30
                    ${isAnimating || !hasLists ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                >
                    {/* Эллиптические неоновые блики сверху и снизу (центр под текстом остается сочным и контрастным) */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.22)_0%,transparent_60%)] pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgb(var(--primary-400)/0.25)_0%,transparent_65%)] pointer-events-none" />
                    <div className={`absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 pointer-events-none ${isAnimating ? 'opacity-80' : ''}`} />

                    {isAnimating ? <Dice5 size={48} className="relative z-10 text-white/90 animate-spin mb-2" /> : <Shuffle size={48} className="relative z-10 text-white mb-2 drop-shadow-md group-active:scale-110 transition-transform duration-150" />}
                    <span className="relative z-10 font-heading text-2xl font-bold text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">{isAnimating ? 'ГЕНЕРАЦИЯ...' : 'СГЕНЕРИРОВАТЬ'}</span>
                    <span className="relative z-10 text-primary-100 text-xs font-medium tracking-wide mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">Случайные команды 2x2</span>
                </button>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2.5 w-full max-w-xs mx-auto relative z-0 touch-manipulation min-h-[44px]">
                {hasResult && (
                    <button 
                        data-testid="open-session-button"
                        onClick={handleOpenSession} 
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full bg-primary-100/70 dark:bg-primary-950/60 glass-pill-gradient text-primary-700 dark:text-primary-300 shadow-sm text-xs font-bold uppercase tracking-wider active:scale-95 active:bg-primary-200/80 dark:active:bg-primary-900/70 transition-all duration-150 border-none outline-none"
                    >
                        <Eye size={14} className="shrink-0" /> <span className="truncate">Открыть сессию</span>
                    </button>
                )}

                {canReset && (
                    <button 
                        data-testid="reset-session-button"
                        onClick={handleResetSessionClick} 
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full bg-rose-100/70 dark:bg-rose-950/60 glass-pill-gradient text-rose-700 dark:text-rose-300 shadow-sm text-xs font-bold uppercase tracking-wider active:scale-95 active:bg-rose-200/80 dark:active:bg-rose-900/70 transition-all duration-150 border-none outline-none"
                    >
                        <Trash2 size={14} className="shrink-0" /> <span className="truncate">Сбросить сессию</span>
                    </button>
                )}
            </div>
        </>
    );
};
