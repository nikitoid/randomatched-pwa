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
            <div className="w-full relative z-0">
                <button
                    onClick={handleGenerate}
                    disabled={isAnimating || !hasLists}
                    className={`w-full relative group overflow-hidden rounded-3xl p-1 transition-all duration-200 active:scale-[0.98]
                    ${isAnimating || !hasLists ? 'opacity-70 cursor-not-allowed' : 'md:hover:shadow-2xl md:hover:shadow-primary-500/30'}
                `}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 transition-all duration-300 ${isAnimating ? 'opacity-80' : 'md:group-hover:scale-105'}`} />
                    <div className="relative bg-primary-600/10 backdrop-blur-[1px] rounded-[20px] py-6 flex flex-col items-center justify-center border border-white/10">
                        {isAnimating ? <Dice5 size={48} className="text-white/90 animate-spin mb-2" /> : <Shuffle size={48} className="text-white mb-2 drop-shadow-md" />}
                        <span className="text-2xl font-black text-white tracking-wide drop-shadow-sm">{isAnimating ? 'ГЕНЕРАЦИЯ...' : 'ГЕНЕРИРОВАТЬ'}</span>
                        <span className="text-primary-200 text-sm font-medium mt-1">Случайные команды 2x2</span>
                    </div>
                </button>
            </div>

            <div className="h-8 mt-6 flex items-center justify-center relative z-0">
                {canReset && (
                    <button 
                        data-testid="reset-session-button"
                        onClick={handleResetSessionClick} 
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 text-xs font-bold uppercase tracking-wider md:hover:bg-red-100 dark:md:hover:bg-red-900/20 active:bg-red-100 transition-colors"
                    >
                        <RotateCcw size={14} /> Сбросить сессию
                    </button>
                )}
            </div>
        </>
    );
};
