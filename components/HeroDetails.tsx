import React, { useMemo, useState, useEffect } from 'react';
import { HeroStat, MatchRecord } from '../types';
import { ChevronLeft, User, Calendar, TrendingUp, ChevronDown, ChevronUp, Edit2, Check, X, Skull } from 'lucide-react';

interface HeroDetailsProps {
    hero: HeroStat;
    history: MatchRecord[];
    onBack: () => void;
    onRename: (newName: string) => void;
}

export const HeroDetails: React.FC<HeroDetailsProps> = ({ hero, history, onBack, onRename }) => {

    // Rename State
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(hero.name);

    useEffect(() => {
        setEditValue(hero.name);
    }, [hero.name]);

    const handleSave = () => {
        if (editValue.trim() && editValue.trim() !== hero.name) {
            onRename(editValue.trim());
        }
        setIsEditing(false);
    };

    const [playersState, setPlayersState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');
    const [synergiesState, setSynergiesState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');
    const [matchesState, setMatchesState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');

    const { recentMatches, topPlayers, topSynergies } = useMemo(() => {
        // Filter matches involving this hero
        const heroMatches = history.filter(m =>
            m.team1.some(p => p.heroName === hero.name) ||
            m.team2.some(p => p.heroName === hero.name)
        ).sort((a, b) => b.timestamp - a.timestamp);

        // Top Players on this Hero
        const playersMap = new Map<string, { matches: number, wins: number }>();
        heroMatches.forEach(m => {
            const t1Idx = m.team1.findIndex(p => p.heroName === hero.name);
            const t2Idx = m.team2.findIndex(p => p.heroName === hero.name);

            if (t1Idx !== -1) {
                const pName = m.team1[t1Idx].name;
                const won = m.winner === 'team1';
                const pStart = playersMap.get(pName) || { matches: 0, wins: 0 };
                pStart.matches++;
                if (won) pStart.wins++;
                playersMap.set(pName, pStart);
            }
            if (t2Idx !== -1) {
                const pName = m.team2[t2Idx].name;
                const won = m.winner === 'team2';
                const pStart = playersMap.get(pName) || { matches: 0, wins: 0 };
                pStart.matches++;
                if (won) pStart.wins++;
                playersMap.set(pName, pStart);
            }
        });

        const topPlayers = Array.from(playersMap.entries())
            .map(([name, stats]) => {
                const C = 3;
                const m = 0.5;
                const score = (stats.wins + C * m) / (stats.matches + C);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches)
            .slice(0, 5);

        // Best Synergies (Heroes played WITH this hero)
        const synergyMap = new Map<string, { matches: number, wins: number }>();
        heroMatches.forEach(m => {
            const isTeam1 = m.team1.some(p => p.heroName === hero.name);
            const myTeam = isTeam1 ? m.team1 : m.team2;
            const won = m.winner === (isTeam1 ? 'team1' : 'team2');

            myTeam.forEach(p => {
                if (p.heroName !== hero.name && p.heroName) {
                    const s = synergyMap.get(p.heroName) || { matches: 0, wins: 0 };
                    s.matches++;
                    if (won) s.wins++;
                    synergyMap.set(p.heroName, s);
                }
            });
        });

        const topSynergies = Array.from(synergyMap.entries())
            .filter(([_, stats]) => stats.matches >= 3)
            .map(([name, stats]) => {
                const C = 3;
                const m = 0.5;
                const score = (stats.wins + C * m) / (stats.matches + C);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches)
            .slice(0, 5);

        return {
            recentMatches: heroMatches.slice(0, 10),
            topPlayers,
            topSynergies
        };
    }, [hero, history]);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="py-3 px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0 sticky top-0 z-10">
                {!isEditing && (
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <ChevronLeft size={24} className="text-slate-600 dark:text-slate-300" />
                    </button>
                )}
                {isEditing ? (
                    <form
                        className="flex-1 min-w-0 flex gap-2"
                        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                    >
                        <input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-1.5 text-lg font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button type="submit" className="shrink-0 p-2 bg-green-100 text-green-600 rounded-xl"><Check size={20} /></button>
                        <button type="button" onClick={() => setIsEditing(false)} className="shrink-0 p-2 bg-red-100 text-red-400 dark:bg-red-900/30 dark:text-red-400 rounded-xl"><X size={20} /></button>
                    </form>
                ) : (
                    <>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white truncate flex-1">{hero.name}</h2>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-slate-400 hover:text-primary-500 transition-colors"
                        >
                            <Edit2 size={18} />
                        </button>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Популярность</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{hero.matches} <span className="text-sm text-slate-400 font-normal">игр</span></div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Общий Винрейт</div>
                        <div className={`text-2xl font-black ${hero.wins / hero.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>
                            {Math.round((hero.wins / hero.matches) * 100)}%
                        </div>
                    </div>
                </div>

                {/* Top Players */}
                <div>
                    <div
                        className="flex items-center justify-between mb-2 cursor-pointer select-none"
                        onClick={() => setPlayersState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
                    >
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <User size={16} className="text-primary-500" /> Лучшие исполнители
                        </h3>
                        <div className="text-slate-400">
                            {playersState === 'collapsed' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${playersState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-1">
                                {topPlayers.length > 0 ? (
                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {topPlayers.slice(0, 3).map(p => (
                                            <div key={p.name} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                                <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{p.name}</div>
                                                <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <span className={`${p.wins / p.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((p.wins / p.matches) * 100)}%</span>
                                                    <span className="opacity-30">|</span>
                                                    <span>{p.matches} игр</span>
                                                </div>
                                            </div>
                                        ))}

                                        {topPlayers.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${playersState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {topPlayers.slice(3).map(p => (
                                                        <div key={p.name} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{p.name}</div>
                                                            <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                                <span className={`${p.wins / p.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((p.wins / p.matches) * 100)}%</span>
                                                                <span className="opacity-30">|</span>
                                                                <span>{p.matches} игр</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-xs py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl shadow-sm">Нет данных</div>
                                )}

                                {topPlayers.length > 3 && (
                                    <button
                                        onClick={() => setPlayersState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full py-2 text-xs font-bold text-slate-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-1"
                                    >
                                        {playersState === 'partial' ? 'Показать все' : 'Свернуть'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Synergies */}
                <div>
                    <div
                        className="flex items-center justify-between mb-2 cursor-pointer select-none"
                        onClick={() => setSynergiesState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
                    >
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingUp size={16} className="text-primary-500" /> Лучшие связки
                        </h3>
                        <div className="text-slate-400">
                            {synergiesState === 'collapsed' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${synergiesState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-1">
                                {topSynergies.length > 0 ? (
                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {topSynergies.slice(0, 3).map(s => (
                                            <div key={s.name} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                                <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{s.name}</div>
                                                <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <span className={`${s.wins / s.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((s.wins / s.matches) * 100)}%</span>
                                                    <span className="opacity-30">|</span>
                                                    <span>{s.matches} игр</span>
                                                </div>
                                            </div>
                                        ))}

                                        {topSynergies.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${synergiesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {topSynergies.slice(3).map(s => (
                                                        <div key={s.name} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{s.name}</div>
                                                            <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                                <span className={`${s.wins / s.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((s.wins / s.matches) * 100)}%</span>
                                                                <span className="opacity-30">|</span>
                                                                <span>{s.matches} игр</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-xs py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl shadow-sm">Недостаточно данных</div>
                                )}

                                {topSynergies.length > 3 && (
                                    <button
                                        onClick={() => setSynergiesState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full py-2 text-xs font-bold text-slate-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-1"
                                    >
                                        {synergiesState === 'partial' ? 'Показать все' : 'Свернуть'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <div
                        className="flex items-center justify-between mb-2 cursor-pointer select-none"
                        onClick={() => setMatchesState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
                    >
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar size={16} className="text-primary-500" /> История игр
                        </h3>
                        <div className="text-slate-400">
                            {matchesState === 'collapsed' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${matchesState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-1">
                                {recentMatches.length > 0 ? (
                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {recentMatches.slice(0, 3).map(m => {
                                            const t1HasHero = m.team1.some(p => p.heroName === hero.name);
                                            const t2HasHero = m.team2.some(p => p.heroName === hero.name);
                                            const isTeam1 = t1HasHero;
                                            const myTeam = isTeam1 ? m.team1 : m.team2;
                                            const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                            const won = m.winner === (isTeam1 ? 'team1' : 'team2');
                                            const playerOnHero = myTeam.find(p => p.heroName === hero.name);

                                            return (
                                                <div key={m.id} className="relative pl-5 pr-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex flex-col">
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${won ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${won ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{won ? 'Победа' : 'Поражение'}</span>
                                                        <span className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <div className="flex-1 text-right font-bold text-slate-700 dark:text-slate-300 truncate">
                                                            {myTeam.map(p => p.name).join(', ')}
                                                        </div>
                                                        <span className="text-slate-400 font-bold text-[10px]">VS</span>
                                                        <div className="flex-1 text-left font-bold text-slate-700 dark:text-slate-300 truncate">
                                                            {enemyTeam.map(p => p.name).join(', ')}
                                                        </div>
                                                    </div>
                                                    {playerOnHero && (
                                                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                            <span>Игрок: <span className="font-bold text-slate-700 dark:text-slate-300">{playerOnHero.name}</span></span>
                                                            {playerOnHero.kills !== undefined && playerOnHero.kills !== null && (
                                                                <span className="font-bold text-red-500 flex items-center gap-0.5"><Skull size={10} /> {playerOnHero.kills} {playerOnHero.kills === 1 ? 'убийство' : [2, 3, 4].includes(playerOnHero.kills % 10) && ![12, 13, 14].includes(playerOnHero.kills % 100) ? 'убийства' : 'убийств'}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {recentMatches.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${matchesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {recentMatches.slice(3).map(m => {
                                                        const t1HasHero = m.team1.some(p => p.heroName === hero.name);
                                                        const t2HasHero = m.team2.some(p => p.heroName === hero.name);
                                                        const isTeam1 = t1HasHero;
                                                        const myTeam = isTeam1 ? m.team1 : m.team2;
                                                        const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                                        const won = m.winner === (isTeam1 ? 'team1' : 'team2');
                                                        const playerOnHero = myTeam.find(p => p.heroName === hero.name);

                                                        return (
                                                            <div key={m.id} className="relative pl-5 pr-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex flex-col">
                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${won ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                <div className="flex justify-between items-center mb-1.5">
                                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${won ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{won ? 'Победа' : 'Поражение'}</span>
                                                                    <span className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <div className="flex-1 text-right font-bold text-slate-700 dark:text-slate-300 truncate">
                                                                        {myTeam.map(p => p.name).join(', ')}
                                                                    </div>
                                                                    <span className="text-slate-400 font-bold text-[10px]">VS</span>
                                                                    <div className="flex-1 text-left font-bold text-slate-700 dark:text-slate-300 truncate">
                                                                        {enemyTeam.map(p => p.name).join(', ')}
                                                                    </div>
                                                                </div>
                                                                {playerOnHero && (
                                                                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                                        <span>Игрок: <span className="font-bold text-slate-700 dark:text-slate-300">{playerOnHero.name}</span></span>
                                                                        {playerOnHero.kills !== undefined && playerOnHero.kills !== null && (
                                                                            <span className="font-bold text-red-500 flex items-center gap-0.5"><Skull size={10} /> {playerOnHero.kills} {playerOnHero.kills === 1 ? 'убийство' : [2, 3, 4].includes(playerOnHero.kills % 10) && ![12, 13, 14].includes(playerOnHero.kills % 100) ? 'убийства' : 'убийств'}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-xs py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-2xl shadow-sm">Нет данных</div>
                                )}

                                {recentMatches.length > 3 && (
                                    <button
                                        onClick={() => setMatchesState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full py-2 text-xs font-bold text-slate-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-1"
                                    >
                                        {matchesState === 'partial' ? 'Показать все' : 'Свернуть'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
