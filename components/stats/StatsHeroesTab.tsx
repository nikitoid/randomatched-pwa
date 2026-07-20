import React from 'react';
import { Shield, Star, Crown, Skull } from 'lucide-react';
import { HeroStat, MatchRecord } from '../../types';
import { HeroDetails } from '../HeroDetails';

interface StatsHeroesTabProps {
    processedHeroes: HeroStat[];
    selectedHero: HeroStat | null;
    setSelectedHero: React.Dispatch<React.SetStateAction<HeroStat | null>>;
    filteredHistory: MatchRecord[];
    onRenameHero: (oldName: string, newName: string) => void;
    heroSort?: 'winrate' | 'matches' | 'az' | 'za' | 'pop';
    openHeroDetails: (hero: HeroStat) => void;
    closeDetails: () => void;
    topWinrateHero?: HeroStat | null;
    mostPopularHero?: HeroStat | null;
    mostDeadlyHero?: HeroStat | null;
}

const getWinsText = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} победа`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} победы`;
    return `${count} побед`;
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
    selectedHero,
    setSelectedHero,
    filteredHistory,
    onRenameHero,
    heroSort,
    openHeroDetails,
    closeDetails,
    topWinrateHero,
    mostPopularHero,
    mostDeadlyHero
}) => {
    return (
        <div className={`animate-in fade-in slide-in-from-right-4 duration-300 ${selectedHero ? 'p-0' : 'px-4 pb-4 pt-3'}`}>
            <div className="space-y-2">
                {selectedHero ? (
                    <HeroDetails
                        key={selectedHero.name}
                        hero={selectedHero}
                        history={filteredHistory}
                        onBack={closeDetails}
                        onRename={(newName) => {
                            onRenameHero(selectedHero.name, newName);
                            setSelectedHero(prev => prev ? { ...prev, name: newName } : null);
                        }}
                    />
                ) : (
                    <>
                        <div className="flex items-center justify-between px-1 pb-1 mb-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                                {getHeroSortLabel(heroSort)}
                            </span>
                        </div>
                        {processedHeroes.map((hero, idx) => (
                            <div
                                key={hero.name}
                                onClick={() => {
                                    openHeroDetails(hero);
                                }}
                                className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-150 dark:border-slate-800/60 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                            idx === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                                idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                                                    'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                            <span className="truncate">{hero.name}</span>
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
                                                {hero.matches} {hero.matches === 1 ? 'игра' : hero.matches < 5 ? 'игры' : 'игр'}
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
                                                {hero.matches} {hero.matches === 1 ? 'игра' : hero.matches < 5 ? 'игры' : 'игр'}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {processedHeroes.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных о героях</div>}
                    </>
                )}
            </div>
        </div>
    );
};

