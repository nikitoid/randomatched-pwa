import React, { useMemo, useState, useEffect } from 'react';
import { PlayerStat, MatchRecord } from '../types';
import { Trophy, ChevronLeft, Shield, Calendar, Skull, TrendingUp, ChevronDown, ChevronUp, User, Edit2, Check, X, Swords, Zap, Flame, Award } from 'lucide-react';
import { calculateWilsonScore, getPlayerWeightedBreakdown } from './stats/hooks/useStatsCalculations';

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

    // Dynamic stats calculated directly from the passed history slice
    const { recentMatches, topHeroes, partnerStats, bestStreak, totalKills, maxKills, matchesCount, winsCount, lossesCount, dynamicScore } = useMemo(() => {
        // Filter matches involving this player
        const playerMatches = history.filter(m =>
            m.team1.some(p => p.name === player.name) ||
            m.team2.some(p => p.name === player.name)
        ).sort((a, b) => b.timestamp - a.timestamp); // Newest first

        let winsCount = 0;
        let lossesCount = 0;
        let totalKills = 0;

        // Top Heroes
        const heroesMap = new Map<string, { matches: number, wins: number }>();

        playerMatches.forEach(m => {
            const isTeam1 = m.team1.some(p => p.name === player.name);
            const pData = isTeam1 ? m.team1.find(p => p.name === player.name) : m.team2.find(p => p.name === player.name);
            const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');

            if (won) winsCount++;
            else lossesCount++;

            if (pData && pData.heroName) {
                const hStart = heroesMap.get(pData.heroName) || { matches: 0, wins: 0 };
                hStart.matches++;
                if (won) hStart.wins++;
                heroesMap.set(pData.heroName, hStart);
            }

            if (pData && pData.kills !== undefined && pData.kills !== null) {
                totalKills += pData.kills;
            }
        });

        const matchesCount = playerMatches.length;

        // Calculate dynamic Wilson Score for this history selection
        const weightedBreakdown = getPlayerWeightedBreakdown(player.name, history);
        const dynamicScore = calculateWilsonScore(weightedBreakdown.totalWeightedWins, weightedBreakdown.totalWeightedMatches);

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
            if (m.team1.some(p => p.name === player.name)) {
                const won = m.winner === 'team1';
                m.team1.forEach(p => {
                    if (p.name !== player.name && p.name) {
                        const s = partnerMap.get(p.name) || { matches: 0, wins: 0 };
                        s.matches++;
                        if (won) s.wins++;
                        partnerMap.set(p.name, s);
                    }
                });
            }
            if (m.team2.some(p => p.name === player.name)) {
                const won = m.winner === 'team2';
                m.team2.forEach(p => {
                    if (p.name !== player.name && p.name) {
                        const s = partnerMap.get(p.name) || { matches: 0, wins: 0 };
                        s.matches++;
                        if (won) s.wins++;
                        partnerMap.set(p.name, s);
                    }
                });
            }
        });

        const partnerStats = Array.from(partnerMap.entries())
            .filter(([_, stats]) => stats.matches >= 1)
            .map(([name, stats]) => {
                const C = 3;
                const m = 0.5;
                const score = (stats.wins + C * m) / (stats.matches + C);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches)
            .slice(0, 5);

        return {
            recentMatches: playerMatches.slice(0, 10),
            topHeroes,
            partnerStats,
            bestStreak,
            totalKills,
            maxKills,
            matchesCount,
            winsCount,
            lossesCount,
            dynamicScore
        };
    }, [player.name, history]);

    const playerInitial = player.name.trim().charAt(0).toUpperCase() || 'P';
    const winRate = matchesCount > 0 ? (winsCount / matchesCount) * 100 : 0;

    return (
        <div className="h-full flex flex-col bg-transparent">
            {/* Sticky Header with Backdrop Blur */}
            <div 
                className="py-3 px-4 bg-white/70 dark:bg-slate-900/75 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3 shrink-0 sticky top-0 z-20 shadow-xs"
            >
                {!isEditing && (
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all text-slate-600 dark:text-slate-300"
                        aria-label="Назад"
                    >
                        <ChevronLeft size={22} />
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
                            className="flex-1 min-w-0 px-3 py-1.5 text-base font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
                        />
                        <button type="submit" className="shrink-0 p-2 bg-emerald-500 text-white rounded-xl active:scale-95 transition-transform"><Check size={18} /></button>
                        <button type="button" onClick={() => setIsEditing(false)} className="shrink-0 p-2 bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-xl active:scale-95 transition-transform"><X size={18} /></button>
                    </form>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-700 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md shadow-primary-500/20">
                            {playerInitial}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white truncate">{player.name}</h2>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1 text-slate-400 hover:text-primary-500 active:scale-95 transition-colors"
                                    aria-label="Редактировать имя"
                                >
                                    <Edit2 size={15} />
                                </button>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>{matchesCount} {matchesCount === 1 ? 'игра' : [2, 3, 4].includes(matchesCount % 10) && ![12, 13, 14].includes(matchesCount % 100) ? 'игры' : 'игр'}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                <span>{winsCount}W - {lossesCount}L</span>
                            </div>
                        </div>

                        <div className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 shadow-2xs">
                            LVL {Math.floor(matchesCount / 5) + 1}
                        </div>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">

                {/* Main Stats 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Matches Card */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Матчи</span>
                            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                                <Swords size={15} />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{matchesCount}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-1">
                                <TrendingUp size={11} /> Серия: {bestStreak}
                            </div>
                        </div>
                    </div>

                    {/* Winrate Card */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Винрейт</span>
                            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <Trophy size={15} />
                            </div>
                        </div>
                        <div>
                            <div className={`text-2xl font-black tracking-tight ${winRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
                                {winRate.toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                                {winsCount} побед / {lossesCount} поражений
                            </div>
                        </div>
                    </div>

                    {/* Kills Card */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Убийства</span>
                            <div className="w-7 h-7 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center">
                                <Skull size={15} />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{totalKills}</div>
                            <div className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-1">
                                <Flame size={11} /> Рекорд серии: {maxKills}
                            </div>
                        </div>
                    </div>

                    {/* Wilson Rating Card */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Эффективность</span>
                            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Zap size={15} />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                                {(dynamicScore * 100).toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                                Рейтинг Уилсона (80%)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Heroes Section */}
                <div className="bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs">
                    <div
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setHeroesState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400">
                                <Shield size={16} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Лучшие герои</h3>
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {topHeroes.length}
                            </span>
                        </div>
                        <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            {heroesState === 'collapsed' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${heroesState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-3 space-y-2">
                                {topHeroes.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {topHeroes.slice(0, 3).map((h, idx) => {
                                            const hWinrate = (h.wins / h.matches) * 100;
                                            return (
                                                <div key={h.name} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{h.name}</div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {/* Mini Winrate Progress Bar */}
                                                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                                            <div
                                                                className={`h-full rounded-full ${hWinrate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${Math.min(100, Math.max(5, hWinrate))}%` }}
                                                            />
                                                        </div>
                                                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 w-24 justify-end">
                                                            <span className={hWinrate >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-500 font-extrabold'}>
                                                                {hWinrate.toFixed(1)}%
                                                            </span>
                                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                                            <span className="text-slate-500 dark:text-slate-400">{h.matches} {h.matches === 1 ? 'игра' : 'игр'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {topHeroes.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${heroesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                                                    {topHeroes.slice(3).map((h, idx) => {
                                                        const hWinrate = (h.wins / h.matches) * 100;
                                                        return (
                                                            <div key={h.name} className="py-2.5 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center shrink-0">
                                                                        {idx + 4}
                                                                    </div>
                                                                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{h.name}</div>
                                                                </div>

                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                                                        <div
                                                                            className={`h-full rounded-full ${hWinrate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                            style={{ width: `${Math.min(100, Math.max(5, hWinrate))}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 w-24 justify-end">
                                                                        <span className={hWinrate >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-500 font-extrabold'}>
                                                                            {hWinrate.toFixed(1)}%
                                                                        </span>
                                                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                                                        <span className="text-slate-500 dark:text-slate-400">{h.matches} {h.matches === 1 ? 'игра' : 'игр'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-xs py-3">Нет данных по героям</div>
                                )}

                                {topHeroes.length > 3 && (
                                    <button
                                        onClick={() => setHeroesState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full pt-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline transition-colors flex items-center justify-center gap-1"
                                    >
                                        {heroesState === 'partial' ? 'Показать всех' : 'Свернуть'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Partners Section */}
                <div className="bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs">
                    <div
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setPartnersState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                <User size={16} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Лучшие напарники</h3>
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {partnerStats.length}
                            </span>
                        </div>
                        <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            {partnersState === 'collapsed' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${partnersState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-3 space-y-2">
                                {partnerStats.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {partnerStats.slice(0, 3).map((s, idx) => {
                                            const pWinrate = (s.wins / s.matches) * 100;
                                            return (
                                                <div key={s.name} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{s.name}</div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                                            <div
                                                                className={`h-full rounded-full ${pWinrate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${Math.min(100, Math.max(5, pWinrate))}%` }}
                                                            />
                                                        </div>
                                                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 w-24 justify-end">
                                                            <span className={pWinrate >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-500 font-extrabold'}>
                                                                {pWinrate.toFixed(1)}%
                                                            </span>
                                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                                            <span className="text-slate-500 dark:text-slate-400">{s.matches} {s.matches === 1 ? 'игра' : 'игр'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {partnerStats.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${partnersState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                                                    {partnerStats.slice(3).map((s, idx) => {
                                                        const pWinrate = (s.wins / s.matches) * 100;
                                                        return (
                                                            <div key={s.name} className="py-2.5 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center shrink-0">
                                                                        {idx + 4}
                                                                    </div>
                                                                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{s.name}</div>
                                                                </div>

                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                                                        <div
                                                                            className={`h-full rounded-full ${pWinrate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                            style={{ width: `${Math.min(100, Math.max(5, pWinrate))}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 w-24 justify-end">
                                                                        <span className={pWinrate >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-500 font-extrabold'}>
                                                                            {pWinrate.toFixed(1)}%
                                                                        </span>
                                                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                                                        <span className="text-slate-500 dark:text-slate-400">{s.matches} {s.matches === 1 ? 'игра' : 'игр'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-xs py-3">Недостаточно данных для напарников</div>
                                )}

                                {partnerStats.length > 3 && (
                                    <button
                                        onClick={() => setPartnersState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full pt-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline transition-colors flex items-center justify-center gap-1"
                                    >
                                        {partnersState === 'partial' ? 'Показать всех' : 'Свернуть'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Match History Section */}
                <div>
                    <div
                        className="flex items-center justify-between mb-3 cursor-pointer select-none"
                        onClick={() => setMatchesState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                <Calendar size={16} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Последние матчи</h3>
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {recentMatches.length}
                            </span>
                        </div>
                        <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            {matchesState === 'collapsed' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                    </div>

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${matchesState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                            {recentMatches.length > 0 ? (
                                <div className="space-y-2.5">
                                    {recentMatches.slice(0, 3).map(m => {
                                        const isTeam1 = m.team1.some(p => p.name === player.name);
                                        const myTeam = isTeam1 ? m.team1 : m.team2;
                                        const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                        const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
                                        const me = myTeam.find(p => p.name === player.name);

                                        return (
                                            <div
                                                key={m.id}
                                                className="bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs relative overflow-hidden active:scale-[0.99] transition-transform"
                                            >
                                                {/* Left Accent Strip */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${won ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${won ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {won ? 'Победа' : 'Поражение'}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {new Date(m.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs py-1">
                                                    <div className="flex-1 text-right font-extrabold text-slate-800 dark:text-slate-200 truncate">
                                                        {myTeam.map((p, i) => (
                                                            <span key={i} className={p.name === player.name ? 'text-primary-600 dark:text-primary-400 underline decoration-primary-500/40' : ''}>
                                                                {p.name}{i < myTeam.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] shrink-0">VS</span>
                                                    <div className="flex-1 text-left font-bold text-slate-600 dark:text-slate-400 truncate">
                                                        {enemyTeam.map(p => p.name).join(', ')}
                                                    </div>
                                                </div>

                                                {me && (
                                                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                        <span className="flex items-center gap-1">
                                                            <Shield size={12} className="text-slate-400" />
                                                            <span>Герой: <span className="font-bold text-slate-800 dark:text-slate-200">{me.heroName}</span></span>
                                                        </span>
                                                        {me.kills !== undefined && me.kills !== null && (
                                                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-extrabold text-[10px] flex items-center gap-1">
                                                                <Skull size={11} /> {me.kills} {me.kills === 1 ? 'убийство' : [2, 3, 4].includes(me.kills % 10) && ![12, 13, 14].includes(me.kills % 100) ? 'убийства' : 'убийств'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {recentMatches.length > 3 && (
                                        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${matchesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                            <div className="overflow-hidden space-y-2.5">
                                                {recentMatches.slice(3).map(m => {
                                                    const isTeam1 = m.team1.some(p => p.name === player.name);
                                                    const myTeam = isTeam1 ? m.team1 : m.team2;
                                                    const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                                    const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
                                                    const me = myTeam.find(p => p.name === player.name);

                                                    return (
                                                        <div
                                                            key={m.id}
                                                            className="bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs relative overflow-hidden active:scale-[0.99] transition-transform"
                                                        >
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${won ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${won ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                                                                    {won ? 'Победа' : 'Поражение'}
                                                                </span>
                                                                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                                                    <Calendar size={12} />
                                                                    {new Date(m.timestamp).toLocaleDateString()}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2 text-xs py-1">
                                                                <div className="flex-1 text-right font-extrabold text-slate-800 dark:text-slate-200 truncate">
                                                                    {myTeam.map((p, i) => (
                                                                        <span key={i} className={p.name === player.name ? 'text-primary-600 dark:text-primary-400 underline decoration-primary-500/40' : ''}>
                                                                            {p.name}{i < myTeam.length - 1 ? ', ' : ''}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] shrink-0">VS</span>
                                                                <div className="flex-1 text-left font-bold text-slate-600 dark:text-slate-400 truncate">
                                                                    {enemyTeam.map(p => p.name).join(', ')}
                                                                </div>
                                                            </div>

                                                            {me && (
                                                                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                                    <span className="flex items-center gap-1">
                                                                        <Shield size={12} className="text-slate-400" />
                                                                        <span>Герой: <span className="font-bold text-slate-800 dark:text-slate-200">{me.heroName}</span></span>
                                                                    </span>
                                                                    {me.kills !== undefined && me.kills !== null && (
                                                                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-extrabold text-[10px] flex items-center gap-1">
                                                                            <Skull size={11} /> {me.kills} {me.kills === 1 ? 'убийство' : [2, 3, 4].includes(me.kills % 10) && ![12, 13, 14].includes(me.kills % 100) ? 'убийства' : 'убийств'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {recentMatches.length > 3 && (
                                        <button
                                            onClick={() => setMatchesState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                            className="w-full py-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline transition-colors flex items-center justify-center gap-1"
                                        >
                                            {matchesState === 'partial' ? 'Показать всю историю' : 'Свернуть'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 text-center text-slate-400 text-xs">
                                    История игр отсутствует
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
