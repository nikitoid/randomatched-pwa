import React, { useMemo, useState, useEffect } from 'react';
import { PlayerStat, MatchRecord } from '../types';
import { Trophy, ChevronLeft, Shield, Calendar, Skull, Star, TrendingUp, ChevronDown, ChevronUp, User, Edit2, Check, X } from 'lucide-react';

interface PlayerDetailsProps {
    player: PlayerStat;
    history: MatchRecord[];
    onBack: () => void;
    onRename: (newName: string) => void;
}

export const PlayerDetails: React.FC<PlayerDetailsProps> = ({ player, history, onBack, onRename }) => {

    // Rename State
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(player.name);

    useEffect(() => {
        setEditValue(player.name);
    }, [player.name]);

    const handleSave = () => {
        if (editValue.trim() && editValue.trim() !== player.name) {
            onRename(editValue.trim());
        }
        setIsEditing(false);
    };

    // Collapse States
    // 'partial' (3 items) | 'expanded' (all) | 'collapsed' (none)
    const [heroesState, setHeroesState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');
    const [partnersState, setPartnersState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');
    const [matchesState, setMatchesState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');

    // Calculate additional stats
    // ... (rest is same, but I need to make sure I don't cut off too much or too little)
    // Actually wait, I am replacing the top part up to props destructuring and state init.

    const { recentMatches, topHeroes, partnerStats, bestStreak, totalKills, maxKills, matchesWithKillsCount, avgKills } = useMemo(() => {
        // Filter matches involving this player
        const playerMatches = history.filter(m =>
            m.team1.some(p => p.name === player.name) ||
            m.team2.some(p => p.name === player.name)
        ).sort((a, b) => b.timestamp - a.timestamp); // Newest first

        // Top Heroes
        const heroesMap = new Map<string, { matches: number, wins: number }>();
        let totalKills = 0;
        let matchesWithKillsCount = 0;

        playerMatches.forEach(m => {
            const isTeam1 = m.team1.some(p => p.name === player.name);
            const pData = isTeam1 ? m.team1.find(p => p.name === player.name) : m.team2.find(p => p.name === player.name);
            const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');

            if (pData && pData.heroName) {
                const hStart = heroesMap.get(pData.heroName) || { matches: 0, wins: 0 };
                hStart.matches++;
                if (won) hStart.wins++;
                heroesMap.set(pData.heroName, hStart);
            }

            if (pData && pData.kills !== undefined && pData.kills !== null) {
                totalKills += pData.kills;
                matchesWithKillsCount++;
            }
        });

        // Calculate max kills in a series of games (gap <= 6 hours)
        const chronologicalMatches = [...playerMatches].sort((a, b) => a.timestamp - b.timestamp);
        let maxKills = 0;
        let currentSeriesKills = 0;
        let lastTimestamp = 0;

        chronologicalMatches.forEach(m => {
            const isTeam1 = m.team1.some(p => p.name === player.name);
            const pData = isTeam1 ? m.team1.find(p => p.name === player.name) : m.team2.find(p => p.name === player.name);
            const kills = (pData && pData.kills !== undefined && pData.kills !== null) ? pData.kills : 0;

            if (lastTimestamp === 0) {
                currentSeriesKills = kills;
                lastTimestamp = m.timestamp;
            } else if (m.timestamp - lastTimestamp <= 6 * 60 * 60 * 1000) {
                currentSeriesKills += kills;
                lastTimestamp = m.timestamp;
            } else {
                if (currentSeriesKills > maxKills) {
                    maxKills = currentSeriesKills;
                }
                currentSeriesKills = kills;
                lastTimestamp = m.timestamp;
            }
        });
        if (currentSeriesKills > maxKills) {
            maxKills = currentSeriesKills;
        }

        const topHeroes = Array.from(heroesMap.entries())
            .map(([name, stats]) => {
                const C = 3;
                const m = 0.5;
                const score = (stats.wins + C * m) / (stats.matches + C);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches)
            .slice(0, 5);

        // Win streak
        let currentStreak = 0;
        let bestStreak = 0;
        // Iterate backwards (oldest to newest) for streak
        [...playerMatches].reverse().forEach(m => {
            const isTeam1 = m.team1.some(p => p.name === player.name);
            const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
            if (won) {
                currentStreak++;
                if (currentStreak > bestStreak) bestStreak = currentStreak;
            } else {
                currentStreak = 0;
            }
        });

        // Partner Stats (Other players played WITH this player)
        const partnerMap = new Map<string, { matches: number, wins: number }>();
        playerMatches.forEach(m => {
            const isTeam1 = m.team1.some(p => p.name === player.name);
            const myTeam = isTeam1 ? m.team1 : m.team2;
            const won = m.winner === (isTeam1 ? 'team1' : 'team2');

            myTeam.forEach(p => {
                if (p.name !== player.name && p.name) {
                    const s = partnerMap.get(p.name) || { matches: 0, wins: 0 };
                    s.matches++;
                    if (won) s.wins++;
                    partnerMap.set(p.name, s);
                }
            });
        });

        const partnerStats = Array.from(partnerMap.entries())
            .filter(([_, stats]) => stats.matches >= 3)
            .map(([name, stats]) => {
                const C = 3;
                const m = 0.5;
                const score = (stats.wins + C * m) / (stats.matches + C);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches)
            .slice(0, 5);

        const avgKills = matchesWithKillsCount > 0 ? totalKills / matchesWithKillsCount : 0;

        return {
            recentMatches: playerMatches.slice(0, 10),
            topHeroes,
            partnerStats,
            bestStreak,
            totalKills,
            maxKills,
            matchesWithKillsCount,
            avgKills
        };
    }, [player, history]);

    const getMatchesWord = (count: number) => {
        return (count % 10 === 1 && count % 100 !== 11) ? 'матчу' : 'матчам';
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 bg-grid-pattern animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="py-3 px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-3 shrink-0 sticky top-0 z-10">
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
                        <h2 className="text-xl font-black text-slate-900 dark:text-white truncate flex-1">{player.name}</h2>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 text-slate-400 hover:text-primary-500 transition-colors"
                        >
                            <Edit2 size={18} />
                        </button>
                    </>
                )}
                {!isEditing && (
                    <div className="flex gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <span>Lvl {Math.floor(player.matches / 5) + 1}</span>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                {/* Main Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-150 dark:border-slate-700/60 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Матчи</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{player.matches}</div>
                        <div className="text-[10px] text-green-500 font-bold flex items-center gap-1 mt-1">
                            <TrendingUp size={12} /> Лучшая серия: {bestStreak}
                        </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-150 dark:border-slate-700/60 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Винрейт</div>
                        <div className={`text-2xl font-black ${player.wins / player.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>
                            {Math.round((player.wins / player.matches) * 100)}%
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mt-1">
                            {player.wins}W - {player.losses}L
                        </div>
                    </div>
                </div>

                {/* Kills Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-150 dark:border-slate-700/60 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <Skull size={12} className="text-red-500" /> Убийства
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{totalKills}</div>
                        <div className="text-[10px] text-red-500 font-bold mt-1" title="Максимальное количество убийств за серию игр с интервалом не более 6 часов">
                            Рекорд серии: {maxKills}
                        </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-150 dark:border-slate-700/60 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <TrendingUp size={12} className="text-primary-500" /> Ср. убийств
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {avgKills.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mt-1">
                            По {matchesWithKillsCount} {getMatchesWord(matchesWithKillsCount)}
                        </div>
                    </div>
                </div>

                {/* Top Heroes */}
                <div>
                    <div
                        className="flex items-center justify-between mb-2 cursor-pointer select-none"
                        onClick={() => setHeroesState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
                    >
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield size={16} className="text-primary-500" /> Лучшие герои
                        </h3>
                        <div className="text-slate-400">
                            {heroesState === 'collapsed' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${heroesState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-1">
                                {topHeroes.length > 0 ? (
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-150 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {topHeroes.slice(0, 3).map(h => (
                                            <div key={h.name} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                                <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{h.name}</div>
                                                <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <span className={`${h.wins / h.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((h.wins / h.matches) * 100)}%</span>
                                                    <span className="opacity-30">|</span>
                                                    <span>{h.matches} игр</span>
                                                </div>
                                            </div>
                                        ))}

                                        {topHeroes.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${heroesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {topHeroes.slice(3).map(h => (
                                                        <div key={h.name} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{h.name}</div>
                                                            <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                                <span className={`${h.wins / h.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((h.wins / h.matches) * 100)}%</span>
                                                                <span className="opacity-30">|</span>
                                                                <span>{h.matches} игр</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-xs py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-150 dark:border-slate-800/60 rounded-2xl shadow-sm">Нет данных</div>
                                )}

                                {topHeroes.length > 3 && (
                                    <button
                                        onClick={() => setHeroesState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full py-2 text-xs font-bold text-slate-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-1"
                                    >
                                        {heroesState === 'partial' ? 'Показать все' : 'Свернуть'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Partners */}
                <div>
                    <div
                        className="flex items-center justify-between mb-2 cursor-pointer select-none"
                        onClick={() => setPartnersState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
                    >
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <User size={16} className="text-primary-500" /> Лучшие напарники
                        </h3>
                        <div className="text-slate-400">
                            {partnersState === 'collapsed' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${partnersState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-1">
                                {partnerStats.length > 0 ? (
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-150 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {partnerStats.slice(0, 3).map(s => (
                                            <div key={s.name} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                                                <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{s.name}</div>
                                                <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <span className={`${s.wins / s.matches >= 0.5 ? 'text-green-500' : 'text-orange-500'}`}>{Math.round((s.wins / s.matches) * 100)}%</span>
                                                    <span className="opacity-30">|</span>
                                                    <span>{s.matches} игр</span>
                                                </div>
                                            </div>
                                        ))}

                                        {partnerStats.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${partnersState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {partnerStats.slice(3).map(s => (
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
                                    <div className="text-center text-slate-400 text-xs py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-150 dark:border-slate-800/60 rounded-2xl shadow-sm">Недостаточно данных</div>
                                )}

                                {partnerStats.length > 3 && (
                                    <button
                                        onClick={() => setPartnersState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full py-2 text-xs font-bold text-slate-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-1"
                                    >
                                        {partnersState === 'partial' ? 'Показать все' : 'Свернуть'}
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
                            <Calendar size={16} className="text-primary-500" /> Последние матчи
                        </h3>
                        <div className="text-slate-400">
                            {matchesState === 'collapsed' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${matchesState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-1">
                                {recentMatches.length > 0 ? (
                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-150 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {recentMatches.slice(0, 3).map(m => {
                                            const isTeam1 = m.team1.some(p => p.name === player.name);
                                            const myTeam = isTeam1 ? m.team1 : m.team2;
                                            const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                            const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
                                            const me = myTeam.find(p => p.name === player.name);

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
                                                    {me && (
                                                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                            <span>Герой: <span className="font-bold text-slate-700 dark:text-slate-300">{me.heroName}</span></span>
                                                            {me.kills !== undefined && me.kills !== null && (
                                                                <span className="font-bold text-red-500 flex items-center gap-0.5"><Skull size={10} /> {me.kills} {me.kills === 1 ? 'убийство' : [2, 3, 4].includes(me.kills % 10) && ![12, 13, 14].includes(me.kills % 100) ? 'убийства' : 'убийств'}</span>
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
                                                        const isTeam1 = m.team1.some(p => p.name === player.name);
                                                        const myTeam = isTeam1 ? m.team1 : m.team2;
                                                        const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                                        const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
                                                        const me = myTeam.find(p => p.name === player.name);

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
                                                                {me && (
                                                                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                                        <span>Герой: <span className="font-bold text-slate-700 dark:text-slate-300">{me.heroName}</span></span>
                                                                        {me.kills !== undefined && me.kills !== null && (
                                                                            <span className="font-bold text-red-500 flex items-center gap-0.5"><Skull size={10} /> {me.kills} {me.kills === 1 ? 'убийство' : [2, 3, 4].includes(me.kills % 10) && ![12, 13, 14].includes(me.kills % 100) ? 'убийства' : 'убийств'}</span>
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
                                    <div className="text-center text-slate-400 text-xs py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-150 dark:border-slate-800/60 rounded-2xl shadow-sm">Нет данных</div>
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
