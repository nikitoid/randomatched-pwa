import React, { useMemo, useState, useEffect } from 'react';
import { HeroStat, MatchRecord } from '../types';
import { ChevronLeft, User, Calendar, TrendingUp, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';

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
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0 sticky top-0 z-10">
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
                    <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Популярность</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{hero.matches} <span className="text-sm text-slate-400 font-normal">игр</span></div>
                    </div>
                    <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Общий Винрейт</div>
                        <div className={`text-2xl font-black ${hero.wins / hero.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>
                            {Math.round((hero.wins / hero.matches) * 100)}%
                        </div>
                    </div>
                </div>

                {/* Top Players */}
                <div>
                    <div
                        className="flex items-center justify-between mb-3 cursor-pointer select-none"
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
                            <div className="space-y-2 pt-1">
                                {topPlayers.slice(0, 3).map(p => (
                                    <div key={p.name} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                        <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{p.name}</div>
                                        <div className="text-xs font-bold text-slate-500">
                                            <span className={`${p.wins / p.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((p.wins / p.matches) * 100)}%</span>
                                            <span className="mx-1 opacity-30">|</span>
                                            {p.matches} игр
                                        </div>
                                    </div>
                                ))}

                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${playersState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                    <div className="overflow-hidden">
                                        <div className="space-y-2 pb-1">
                                            {topPlayers.slice(3).map(p => (
                                                <div key={p.name} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                    <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{p.name}</div>
                                                    <div className="text-xs font-bold text-slate-500">
                                                        <span className={`${p.wins / p.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((p.wins / p.matches) * 100)}%</span>
                                                        <span className="mx-1 opacity-30">|</span>
                                                        {p.matches} игр
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {topPlayers.length === 0 && <div className="text-center text-slate-400 text-xs py-4">Нет данных</div>}

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
                        className="flex items-center justify-between mb-3 cursor-pointer select-none"
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
                            <div className="space-y-2 pt-1">
                                {topSynergies.slice(0, 3).map(s => (
                                    <div key={s.name} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                        <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{s.name}</div>
                                        <div className="text-xs font-bold text-slate-500">
                                            <span className={`${s.wins / s.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((s.wins / s.matches) * 100)}%</span>
                                            <span className="mx-1 opacity-30">|</span>
                                            {s.matches} игр
                                        </div>
                                    </div>
                                ))}

                                {topSynergies.length > 3 && (
                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${synergiesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                        <div className="overflow-hidden">
                                            <div className="space-y-2 pb-1">
                                                {topSynergies.slice(3).map(s => (
                                                    <div key={s.name} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                        <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{s.name}</div>
                                                        <div className="text-xs font-bold text-slate-500">
                                                            <span className={`${s.wins / s.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((s.wins / s.matches) * 100)}%</span>
                                                            <span className="mx-1 opacity-30">|</span>
                                                            {s.matches} игр
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {topSynergies.length === 0 && <div className="text-center text-slate-400 text-xs py-4">Недостаточно данных</div>}

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
                        className="flex items-center justify-between mb-3 cursor-pointer select-none"
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
                            <div className="space-y-2 pt-1">
                                {recentMatches.slice(0, 3).map(m => {
                                    // Determine if hero was on winning team
                                    const t1HasHero = m.team1.some(p => p.heroName === hero.name);
                                    const t2HasHero = m.team2.some(p => p.heroName === hero.name);

                                    let result = 'neutral';
                                    if (t1HasHero && m.winner === 'team1') result = 'win';
                                    else if (t2HasHero && m.winner === 'team2') result = 'win';
                                    else if ((t1HasHero && m.winner === 'team2') || (t2HasHero && m.winner === 'team1')) result = 'loss';

                                    return (
                                        <div key={m.id} className={`p-3 rounded-2xl border ${result === 'win' ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-[10px] font-black uppercase ${result === 'win' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {result === 'win' ? 'Победа' : 'Поражение'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    )
                                })}

                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${matchesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                    <div className="overflow-hidden">
                                        <div className="space-y-2 pb-1">
                                            {recentMatches.slice(3).map(m => {
                                                // Determine if hero was on winning team
                                                const t1HasHero = m.team1.some(p => p.heroName === hero.name);
                                                const t2HasHero = m.team2.some(p => p.heroName === hero.name);

                                                let result = 'neutral';
                                                if (t1HasHero && m.winner === 'team1') result = 'win';
                                                else if (t2HasHero && m.winner === 'team2') result = 'win';
                                                else if ((t1HasHero && m.winner === 'team2') || (t2HasHero && m.winner === 'team1')) result = 'loss';

                                                return (
                                                    <div key={m.id} className={`p-3 rounded-2xl border ${result === 'win' ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'}`}>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className={`text-[10px] font-black uppercase ${result === 'win' ? 'text-green-600' : 'text-red-500'}`}>
                                                                {result === 'win' ? 'Победа' : 'Поражение'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

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
