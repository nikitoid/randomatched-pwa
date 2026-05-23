import React, { memo, useCallback } from 'react';
import { X } from 'lucide-react';
import { Hero } from '../types';
import { RankSelect } from './RankSelect';

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
            className={`flex items-center gap-2 mb-1.5 transition-all
                ${isFocused ? 'relative z-50 scale-[1.02]' : 'relative z-0'}
                ${isDimmed ? 'opacity-20 blur-[1px] grayscale pointer-events-none' : ''}
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
                    className={`w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border outline-none transition-all text-sm
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
