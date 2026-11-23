import React from 'react';
import { Move, LayoutGrid, Compass, Shuffle, CheckCircle2 } from 'lucide-react';
import { Z_INDEX_BASE } from '../../constants/zIndex';

interface ResultControlsBarProps {
    hasCustomNames: boolean;
    viewMode: 'facing' | 'cross';
    isDragMode: boolean;
    heroesRevealed: boolean;
    onToggleDragMode: () => void;
    onToggleViewMode: () => void;
    onShuffleTeams: () => void;
    onFinishMatch: () => void;
}

/**
 * Bottom dock controls for ResultOverlay (drag swap, view mode, shuffle teams, finish match).
 */
export const ResultControlsBar: React.FC<ResultControlsBarProps> = ({
    hasCustomNames,
    viewMode,
    isDragMode,
    heroesRevealed,
    onToggleDragMode,
    onToggleViewMode,
    onShuffleTeams,
    onFinishMatch
}) => {
    return (
        <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-800 transition-all duration-500"
            style={{ zIndex: Z_INDEX_BASE.OVERLAY }}
        >
            {hasCustomNames && (
                <>
                    <button
                        onClick={onToggleDragMode}
                        disabled={viewMode === 'facing'}
                        className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
                            viewMode === 'facing'
                                ? 'opacity-40 cursor-not-allowed text-slate-400'
                                : isDragMode
                                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 ring-2 ring-primary-500 dark:ring-primary-400 shadow-inner'
                                    : 'active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                        <Move size={20} className="mb-1" /> <span className="text-[10px] font-bold">Двигать</span>
                    </button>
                    <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
                </>
            )}

            <button
                data-testid="toggle-view-mode-btn"
                onClick={onToggleViewMode}
                disabled={isDragMode}
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDragMode ? 'opacity-40 cursor-not-allowed text-slate-400' : 'active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
                {viewMode === 'facing' ? <LayoutGrid size={20} className="mb-1 text-primary-500" /> : <Compass size={20} className="mb-1 text-slate-600 dark:text-slate-300" />}
                <span className="text-[10px] font-bold">{viewMode === 'facing' ? 'Лицом' : 'Крест'}</span>
            </button>
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />

            <button data-testid="shuffle-teams-btn" onClick={onShuffleTeams} disabled={isDragMode} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDragMode ? 'opacity-40 cursor-not-allowed text-slate-400' : 'active:bg-white dark:active:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                <Shuffle size={20} className="mb-1" /> <span className="text-[10px] font-bold">Команды</span>
            </button>
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-700" />
            <button data-testid="finish-match-btn" onClick={onFinishMatch} disabled={!heroesRevealed || isDragMode} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${!heroesRevealed || isDragMode ? 'opacity-40 cursor-not-allowed text-slate-400' : 'active:bg-red-50 dark:active:bg-red-900/20 text-red-500'}`}>
                <CheckCircle2 size={20} className="mb-1" /> <span className="text-[10px] font-bold">Завершить</span>
            </button>
        </div>
    );
};
