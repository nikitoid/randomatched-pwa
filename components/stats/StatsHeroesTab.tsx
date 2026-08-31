import React, { useMemo } from 'react';
import { Shield, Star, Crown, Skull, Clock, Merge } from 'lucide-react';
import { HeroStat, MatchRecord } from '../../types';
import { Avatar } from '../common/Avatar';
import { findDuplicateOrSimilarHeroGroups, formatPlural } from '../../utils/heroNormalization';

interface StatsHeroesTabProps {
    processedHeroes: HeroStat[];
    filteredHistory: MatchRecord[];
    onRenameHero: (oldName: string, newName: string) => void;
    heroSort?: 'winrate' | 'matches' | 'az' | 'za' | 'pop';
    openHeroDetails: (hero: HeroStat) => void;
    topWinrateHero?: HeroStat | null;
    mostPopularHero?: HeroStat | null;
    mostDeadlyHero?: HeroStat | null;
    onOpenInactiveModal?: () => void;
    onOpenMergeModal?: () => void;
    duplicateCount?: number;
    // Опциональные пропсы для обратной совместимости
    selectedHero?: HeroStat | null;
    setSelectedHero?: React.Dispatch<React.SetStateAction<HeroStat | null>>;
    closeDetails?: () => void;
}

const getWinsText = (count: number) => {
    return formatPlural(count, 'победа', 'победы', 'побед');
};

const getHeroSortLabel = (sort?: 'winrate' | 'matches' | 'az' | 'za' | 'pop') => {
    switch (sort) {
        case 'winrate': return 'Сортировка по винрейту';
        case 'matches':
        case 'pop': return 'Сортировка по популярности';
        case 'az': return 'Сортировка по алфавиту (А-Я)';
        case 'za': return 'Сортировка по алфавиту (Я-А)';
        default: return 'Сортировка по винрейту';
    }
};

export const StatsHeroesTab: React.FC<StatsHeroesTabProps> = ({
    processedHeroes,
    filteredHistory,
    onRenameHero,
    heroSort,
    openHeroDetails,
    topWinrateHero,
    mostPopularHero,
    mostDeadlyHero,
    onOpenInactiveModal,
    onOpenMergeModal,
    duplicateCount: propDuplicateCount
}) => {
    const fallbackDuplicateCount = useMemo(() => {
        if (propDuplicateCount !== undefined) return propDuplicateCount;
        const names = new Set<string>();
        filteredHistory.forEach(m => {
            [...m.team1, ...m.team2].forEach(p => {
                const n = (p.heroName || '').trim();
                if (n) names.add(n);
            });
        });
        return findDuplicateOrSimilarHeroGroups(Array.from(names)).length;
    }, [filteredHistory, propDuplicateCount]);

    const duplicateCount = propDuplicateCount !== undefined ? propDuplicateCount : fallbackDuplicateCount;

    return (
        <div className="w-full">
            {/* Список героев */}
            <div className="px-4 pb-4 pt-3 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between px-1 pb-1 mb-1 text-xs text-slate-500 dark:text-slate-400 gap-2 flex-wrap">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 truncate">
                        {getHeroSortLabel(heroSort)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                        {onOpenMergeModal && (
                            <button
                                onClick={onOpenMergeModal}
                                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border active:scale-95 transition-all cursor-pointer ${
                                    duplicateCount > 0
                                        ? 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <Merge size={12} />
                                <span>Слияние</span>
                                {duplicateCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary-500 text-white font-black ml-0.5">
                                        {duplicateCount}
                                    </span>
                                )}
                            </button>
                        )}
                        {onOpenInactiveModal && (
                            <button
                                onClick={onOpenInactiveModal}
                                className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50 active:scale-95 transition-all cursor-pointer"
                            >
                                <Clock size={12} />
                                <span>Список забытых</span>
                            </button>
                        )}
                    </div>
                </div>
                {processedHeroes.map((hero, idx) => (
                    <div
                        key={hero.name}
                        onClick={() => {
                            openHeroDetails(hero);
                        }}
                        className="flex items-center justify-between py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient shadow-sm border border-slate-150 dark:border-slate-800/60 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer touch-manipulation active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                            <div className="relative shrink-0 flex items-center justify-center">
                                <Avatar entityType="hero" entityId={hero.name} name={hero.name} size="lg" />
                                <div className={`absolute -top-1 -left-1 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 ${idx === 0 ? 'bg-amber-400 text-amber-950 shadow-amber-400/20' :
                                        idx === 1 ? 'bg-slate-300 text-slate-900' :
                                            idx === 2 ? 'bg-amber-700 text-amber-100' :
                                                'bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                    {idx + 1}
                                </div>
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white shrink-0 max-w-[130px] xs:max-w-[170px] sm:max-w-none truncate">
                                        {hero.name}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                                        {topWinrateHero?.name === hero.name && (
                                            <div className="shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400 rounded-md flex items-center gap-0.5">
                                                <Star size={10} fill="currentColor" /> Мета
                                            </div>
                                        )}
                                        {mostPopularHero?.name === hero.name && (
                                            <div className="shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 rounded-md flex items-center gap-0.5">
                                                <Crown size={10} fill="currentColor" /> Топ выбор
                                            </div>
                                        )}
                                        {mostDeadlyHero?.name === hero.name && (
                                            <div className="shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-md flex items-center gap-0.5">
                                                <Skull size={10} fill="currentColor" /> Смертоносный
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                                    <span>{getWinsText(hero.wins)}</span>
                                    {(hero.totalKills !== undefined && hero.totalKills > 0) && (
                                        <>
                                            <span className="opacity-40">•</span>
                                            <span className="flex items-center gap-0.5 text-red-500 font-medium">
                                                <Skull size={11} /> {hero.totalKills}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            {heroSort === 'matches' || heroSort === 'pop' ? (
                                <>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {formatPlural(hero.matches, 'игра', 'игры', 'игр')}
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {Math.round((hero.wins / (hero.matches || 1)) * 100)}% побед
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={`text-sm font-bold ${hero.wins / (hero.matches || 1) >= 0.5 ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {Math.round((hero.wins / (hero.matches || 1)) * 100)}%
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {formatPlural(hero.matches, 'игра', 'игры', 'игр')}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                {processedHeroes.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных о героях</div>}
            </div>
        </div>
    );
};
