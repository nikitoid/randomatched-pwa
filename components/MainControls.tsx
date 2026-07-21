import React from 'react';
import { Dice5, Shuffle, RotateCcw } from 'lucide-react';

interface MainControlsProps {
    handleGenerate: () => void;
    isAnimating: boolean;
    hasLists: boolean;
    canReset: boolean;
    handleResetSessionClick: () => void;
}

export const MainControls: React.FC<MainControlsProps> = ({
    handleGenerate,
    isAnimating,
    hasLists,
    canReset,
    handleResetSessionClick,
}) => {
    return (
        <>
            <div className="w-full relative z-0 rounded-3xl touch-manipulation">
                <button
                    onClick={handleGenerate}
                    disabled={isAnimating || !hasLists}
                    className={`w-full relative group overflow-hidden rounded-3xl p-1 shadow-xl shadow-primary-600/30 dark:shadow-primary-500/20 transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-primary-500/30
                    ${isAnimating || !hasLists ? 'opacity-70 cursor-not-allowed' : ''}
                `}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 transition-all duration-300 ${isAnimating ? 'opacity-80' : ''}`} />
                    <div className="relative bg-primary-600/10 backdrop-blur-[1px] rounded-2xl py-6 flex flex-col items-center justify-center border border-white/20 shadow-inner">
                        {isAnimating ? <Dice5 size={48} className="text-white/90 animate-spin mb-2" /> : <Shuffle size={48} className="text-white mb-2 drop-shadow-md group-active:scale-110 transition-transform duration-150" />}
                        <span className="font-heading text-2xl font-bold text-white tracking-wider drop-shadow-sm">{isAnimating ? 'ГЕНЕРАЦИЯ...' : 'ГЕНЕРИРОВАТЬ'}</span>
                        <span className="text-primary-100 text-xs font-medium tracking-wide mt-1">Случайные команды 2x2</span>
                    </div>
                </button>
            </div>

            <div className="h-10 mt-5 flex items-center justify-center relative z-0 touch-manipulation">
                {canReset && (
                    <button 
                        data-testid="reset-session-button"
                        onClick={handleResetSessionClick} 
                        className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider active:scale-95 active:bg-red-100 dark:active:bg-red-900/40 transition-all duration-150"
                    >
                        <RotateCcw size={14} /> Сбросить сессию
                    </button>
                )}
            </div>
        </>
    );
};
