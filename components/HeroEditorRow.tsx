import React, { memo, useCallback, useState, useMemo } from 'react';
import { X, Shield } from 'lucide-react';
import { Hero } from '../types';
import { RankSelect } from './RankSelect';
import { Avatar } from './common/Avatar';
import { normalizeHeroKey } from '../utils/heroNormalization';


// --- COMPONENT FOR EDITING HERO ---
interface HeroSuggestionItem {
    name: string;
    norm?: string;
    lower?: string;
    rank?: string;
}

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
    allHeroSuggestions?: HeroSuggestionItem[];
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
    setFocusedRowIndex,
    allHeroSuggestions
}) => {
    const [isInputFocused, setIsInputFocused] = useState(false);

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

    const activeSuggestions = useMemo(() => {
        if (!isInputFocused || !allHeroSuggestions || allHeroSuggestions.length === 0) {
            return [];
        }
        const rawVal = (hero.name || '').trim();
        if (rawVal.length < 2) {
            return [];
        }
        const queryNorm = normalizeHeroKey(rawVal);
        if (!queryNorm) return [];
        const queryLower = rawVal.toLowerCase();

        const results: HeroSuggestionItem[] = [];
        for (let i = 0; i < allHeroSuggestions.length; i++) {
            const item = allHeroSuggestions[i];
            if (item.name === hero.name) continue;
            const norm = item.norm || normalizeHeroKey(item.name);
            const lower = item.lower || item.name.toLowerCase();
            if (norm.includes(queryNorm) || lower.includes(queryLower)) {
                results.push(item);
                if (results.length >= 4) break;
            }
        }
        return results;
    }, [isInputFocused, hero.name, allHeroSuggestions]);

    const handleSelectSuggestion = (item: { name: string; rank?: string }) => {
        onChange(index, 'name', item.name);
        if (item.rank && !hero.rank) {
            onChange(index, 'rank', item.rank);
        }
        setIsInputFocused(false);
    };

    return (
        <div
            className={`flex items-center gap-2 mb-1.5 transition-opacity duration-200
                ${isFocused || (isInputFocused && activeSuggestions.length > 0) ? 'relative z-50 scale-[1.01]' : 'relative z-0'}
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
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => {
                        // Small delay to allow click on suggestion
                        setTimeout(() => setIsInputFocused(false), 250);
                    }}
                    onChange={handleNameChange}
                    placeholder={isPlaceholderRow ? "Добавить героя..." : "Имя героя"}
                    readOnly={isReadOnly || isFocused}
                    className={`w-full px-3.5 py-2 rounded-xl bg-white/70 dark:bg-slate-900/75 glass-card-gradient border outline-none transition-all duration-200 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-2xs
                        ${hasLocalUpdate ? 'border-primary-400 dark:border-primary-600 ring-2 ring-primary-500/20' : 'border-slate-200/80 dark:border-slate-800/80 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'}
                        ${isPlaceholderRow ? 'border-dashed border-slate-300 dark:border-slate-700/80 placeholder:italic placeholder:text-slate-400 dark:placeholder:text-slate-500' : ''}
                    `}
                />
                {hasNameUpdate && (
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none z-10 animate-pulse" />
                )}
                {!isReadOnly && !isFocused && (hero.name || hero.rank) && (
                    <button
                        onClick={handleRemove}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        aria-label="Удалить героя"
                    >
                        <X size={15} />
                    </button>
                )}

                {/* Suggestions Dropdown */}
                {isInputFocused && activeSuggestions.length > 0 && (
                    <div className="suggestions-dropdown absolute top-[100%] left-0 right-0 mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="p-1 flex flex-col gap-0.5 max-h-none overflow-hidden">
                            {activeSuggestions.map((item) => (
                                <button
                                    key={item.name}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectSuggestion(item);
                                    }}
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        handleSelectSuggestion(item);
                                    }}
                                    onTouchStart={(e) => {
                                        e.preventDefault();
                                        handleSelectSuggestion(item);
                                    }}
                                    className="w-full text-left px-2.5 py-2 min-h-[36px] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-primary-50 hover:text-primary-600 active:bg-primary-100 dark:hover:bg-primary-950/50 dark:hover:text-primary-400 dark:active:bg-primary-900/60 rounded-lg transition-all flex items-center justify-between gap-2 touch-manipulation select-none"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Shield size={12} className="text-primary-500 shrink-0" />
                                        <span className="truncate">{item.name}</span>
                                    </div>
                                    {item.rank && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold shrink-0">
                                            {item.rank}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
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
        return 'text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80';
    } else if (letter === 'S') {
        return 'text-amber-900 dark:text-amber-300 bg-amber-500/15 border-amber-300/80 dark:border-amber-500/40 font-black';
    } else if (letter === 'A') {
        return 'text-violet-900 dark:text-violet-300 bg-violet-500/15 border-violet-300/80 dark:border-violet-500/40 font-black';
    } else if (letter === 'B') {
        return 'text-blue-900 dark:text-sky-300 bg-blue-500/15 border-blue-300/80 dark:border-sky-500/40 font-extrabold';
    } else if (letter === 'C') {
        return 'text-emerald-900 dark:text-emerald-300 bg-emerald-500/15 border-emerald-300/80 dark:border-emerald-500/40 font-bold';
    } else if (letter === 'D') {
        return 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-semibold';
    } else if (letter === 'E') {
        return 'text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 font-medium';
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
            <div className={`w-14 h-9 shrink-0 flex items-center justify-center px-2 py-1 text-sm rounded-xl border select-none relative shadow-2xs ${getRankStyle(hero.rank)}`}>
                {hero.rank || <span className="text-[11px] font-medium opacity-60">Ранг</span>}
                {hasRankUpdate && (
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none z-10 animate-pulse" />
                )}
            </div>

            {/* Name display */}
            <div className={`flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/75 glass-card-gradient border text-sm text-slate-800 dark:text-slate-200 font-medium truncate relative shadow-2xs flex items-center gap-2
                ${hasLocalUpdate ? 'border-primary-400 dark:border-primary-600 ring-2 ring-primary-500/20' : 'border-slate-200/80 dark:border-slate-800/80'}
            `}>
                <Avatar entityType="hero" entityId={hero.id || hero.name} name={hero.name} size="xs" />
                <span className="truncate">{hero.name || <span className="text-slate-400 italic">Без имени</span>}</span>
                {hasNameUpdate && (
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900 pointer-events-none z-10 animate-pulse" />
                )}
            </div>

        </div>
    );
});

HeroViewRow.displayName = 'HeroViewRow';
