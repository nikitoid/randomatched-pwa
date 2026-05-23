import React, { memo, useCallback } from 'react';
import { X } from 'lucide-react';
import { Hero } from '../types';
import { RankSelect } from './RankSelect';

// --- COMPONENT FOR EDITING HERO ---
interface HeroEditorRowProps {
    hero: Hero;
    index: number;
    isReadOnly: boolean;
    isFocused: boolean;
    isDimmed: boolean;
    isPlaceholderRow: boolean;
    hasRankUpdate: boolean;
    hasNameUpdate: boolean;
    hasLocalUpdate: boolean;
    onChange: (index: number, field: 'name' | 'rank', value: string) => void;
    onRemove: (index: number) => void;
    setFocusedRowIndex: (index: number | null) => void;
}

export const HeroEditorRow: React.FC<HeroEditorRowProps> = memo(({
    hero,
    index,
    isReadOnly,
    isFocused,
    isDimmed,
    isPlaceholderRow,
    hasRankUpdate,
    hasNameUpdate,
    hasLocalUpdate,
    onChange,
    onRemove,
    setFocusedRowIndex
}) => {
    const handleRankChange = useCallback((val: string) => {
        onChange(index, 'rank', val);
    }, [index, onChange]);

    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(index, 'name', e.target.value);
    }, [index, onChange]);

    const handleRemove = useCallback(() => {
        onRemove(index);
    }, [index, onRemove]);

    const handleOpenFocus = useCallback(() => {
        setFocusedRowIndex(index);
    }, [index, setFocusedRowIndex]);

    const handleCloseFocus = useCallback(() => {
        setFocusedRowIndex(null);
    }, [setFocusedRowIndex]);

    return (
        <div
            className={`flex items-center gap-2 mb-1.5 transition-opacity duration-200
                ${isFocused ? 'relative z-50 scale-[1.02]' : 'relative z-0'}
                ${isDimmed ? 'opacity-30 pointer-events-none' : ''}
            `}
        >
            {/* Rank Select */}
            <div className="w-14 h-9 shrink-0 relative">
                <RankSelect
                    value={hero.rank}
                    onChange={handleRankChange}
                    isOpen={isFocused}
                    onOpen={handleOpenFocus}
                    onClose={handleCloseFocus}
                    readOnly={isReadOnly}
                />
                {hasRankUpdate && (
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none z-10" />
                )}
            </div>

            {/* Name Input */}
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={hero.name}
                    onChange={handleNameChange}
                    placeholder={isPlaceholderRow ? "Добавить героя..." : "Имя героя"}
                    readOnly={isReadOnly || isFocused}
                    className={`w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border outline-none transition-colors duration-200 text-sm
                        ${hasLocalUpdate ? 'border-primary-300 dark:border-primary-700 shadow-[0_0_0_1px_rgba(var(--primary-500)/0.2)]' : 'border-slate-150 dark:border-slate-800 focus:border-primary-500'}
                        ${isPlaceholderRow ? 'border-dashed border-slate-300 dark:border-slate-700 placeholder:italic placeholder:text-slate-400' : ''}
                    `}
                />
                {hasNameUpdate && (
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none z-10" />
                )}
                {!isReadOnly && !isFocused && (hero.name || hero.rank) && (
                    <button
                        onClick={handleRemove}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 md:hover:text-red-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
});

HeroEditorRow.displayName = 'HeroEditorRow';


// --- HELPERS ---
const getRankStyle = (rank: string) => {
    const letter = rank ? rank[0] : '';
    if (!rank) {
        return 'text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-150 dark:border-slate-800/60';
    } else if (letter === 'S') {
        return 'text-yellow-800 bg-yellow-100 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-400/20 dark:border-yellow-500/30';
    } else if (letter === 'A') {
        return 'text-violet-800 bg-violet-100 border-violet-200 dark:text-violet-300 dark:bg-violet-500/20 dark:border-violet-500/30';
    } else if (letter === 'B') {
        return 'text-blue-800 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-500/20 dark:border-blue-500/30';
    } else if (letter === 'C') {
        return 'text-green-800 bg-green-100 border-green-200 dark:text-green-300 dark:bg-green-500/20 dark:border-green-500/30';
    } else if (letter === 'D') {
        return 'text-gray-700 bg-gray-200 border-gray-300 dark:text-gray-300 dark:bg-gray-700/50 dark:border-gray-600';
    } else if (letter === 'E') {
        return 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700';
    }
    return '';
};


// --- COMPONENT FOR VIEWING HERO (READ-ONLY) ---
interface HeroViewRowProps {
    hero: Hero;
    hasRankUpdate: boolean;
    hasNameUpdate: boolean;
    hasLocalUpdate: boolean;
}

export const HeroViewRow: React.FC<HeroViewRowProps> = memo(({
    hero,
    hasRankUpdate,
    hasNameUpdate,
    hasLocalUpdate
}) => {
    return (
        <div className="flex items-center gap-2 mb-1.5 w-full">
            {/* Rank badge */}
            <div className={`w-14 h-9 shrink-0 flex items-center justify-center px-2 py-1 text-sm rounded-xl border font-bold select-none relative ${getRankStyle(hero.rank)}`}>
                {hero.rank || <span className="text-xs font-normal opacity-70">Ранг</span>}
                {hasRankUpdate && (
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none z-10" />
                )}
            </div>

            {/* Name display */}
            <div className={`flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border text-sm text-slate-800 dark:text-slate-200 font-medium truncate relative
                ${hasLocalUpdate ? 'border-primary-300 dark:border-primary-700 shadow-[0_0_0_1px_rgba(var(--primary-500)/0.2)]' : 'border-slate-150 dark:border-slate-800'}
            `}>
                {hero.name || <span className="text-slate-400 italic">Без имени</span>}
                {hasNameUpdate && (
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none z-10" />
                )}
            </div>
        </div>
    );
});

HeroViewRow.displayName = 'HeroViewRow';
