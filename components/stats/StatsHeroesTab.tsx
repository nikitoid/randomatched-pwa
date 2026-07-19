import React from 'react';
import { Shield } from 'lucide-react';
import { HeroStat, MatchRecord } from '../../types';
import { HeroDetails } from '../HeroDetails';

interface StatsHeroesTabProps {
    processedHeroes: HeroStat[];
    selectedHero: HeroStat | null;
    setSelectedHero: React.Dispatch<React.SetStateAction<HeroStat | null>>;
    filteredHistory: MatchRecord[];
    onRenameHero: (oldName: string, newName: string) => void;
    openHeroDetails: (hero: HeroStat) => void;
    closeDetails: () => void;
}

export const StatsHeroesTab: React.FC<StatsHeroesTabProps> = ({
    processedHeroes,
    selectedHero,
    setSelectedHero,
    filteredHistory,
    onRenameHero,
    openHeroDetails,
    closeDetails
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
                        {processedHeroes.map((hero, idx) => (
                            <div
                                key={hero.name}
                                onClick={() => {
                                    openHeroDetails(hero);
                                }}
                                className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-150 dark:border-slate-800/60 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                        <Shield size={14} className="text-slate-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                            {hero.name}
                                        </div>
                                        <div className="text-xs text-slate-500">Игр: {hero.matches}</div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <div className={`text-sm font-bold ${hero.wins / hero.matches >= 0.5 ? 'text-green-600' : 'text-slate-500'}`}>{Math.round((hero.wins / hero.matches) * 100)}%</div>
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
