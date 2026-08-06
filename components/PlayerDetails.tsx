import React, { useMemo, useState, useEffect } from 'react';
import { PlayerStat, MatchRecord } from '../types';
import { Trophy, ChevronLeft, Shield, Calendar, Skull, TrendingUp, ChevronDown, ChevronUp, User, Edit2, Check, X, Swords, Zap, Flame, Award, Sparkles, Crown, HelpCircle } from 'lucide-react';
import { calculateWilsonScore, getPlayerWeightedBreakdown } from './stats/hooks/useStatsCalculations';
import { Avatar } from './common/Avatar';
import { AvatarCropperModal } from './common/AvatarCropperModal';
import { calculatePlayerLevel } from '../utils/playerLevel';
import { RanksInfoModal } from './stats/RanksInfoModal';

interface PlayerDetailsProps {
    player: PlayerStat;
    history: MatchRecord[];
    onBack: () => void;
    onRename: (newName: string) => void;
}

export const PlayerDetails: React.FC<PlayerDetailsProps> = ({ player, history, onBack, onRename }) => {

    // Avatar Cropper State
    const [isCropperOpen, setIsCropperOpen] = useState(false);

    // Ranks Info Modal State
    const [isRanksInfoOpen, setIsRanksInfoOpen] = useState(false);

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
    const { recentMatches, topHeroes, partnerStats, bestStreak, totalKills, maxKills, matchesCount, winsCount, lossesCount, dynamicScore, levelInfo } = useMemo(() => {
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
                const score = calculateWilsonScore(stats.wins, stats.matches);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches || b.wins - a.wins)
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
                const score = calculateWilsonScore(stats.wins, stats.matches);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches || b.wins - a.wins)
            .slice(0, 5);

        const levelInfo = calculatePlayerLevel(winsCount, lossesCount, totalKills);

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
            dynamicScore,
            levelInfo
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
                        <Avatar
                            entityType="player"
                            entityId={player.name}
                            name={player.name}
                            size="lg"
                            showEditButton
                            onEditClick={() => setIsCropperOpen(true)}
                        />

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

                        <button
                            type="button"
                            onClick={() => setIsRanksInfoOpen(true)}
                            className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer ${levelInfo.tier.bgClass} ${levelInfo.tier.borderClass} ${levelInfo.tier.textClass}`}
                            title="Нажмите для справки о рангах"
                        >
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r ${levelInfo.tier.badgeBg}`}>
                                LVL {levelInfo.level}
                            </span>
                            <span className="text-[11px] font-bold tracking-wide">{levelInfo.tier.name}</span>
                        </button>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

                {/* Level & XP Progress Card */}
                <div className="bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${levelInfo.tier.badgeBg} flex items-center justify-center font-black text-sm shadow-sm shrink-0`}>
                                {levelInfo.level}
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{levelInfo.tier.name}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                        {levelInfo.totalXP} XP
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsRanksInfoOpen(true)}
                                        className="p-1 text-slate-400 hover:text-primary-500 active:scale-95 transition-colors"
                                        title="Справка по рангам"
                                    >
                                        <HelpCircle size={14} />
                                    </button>
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                    До LVL {levelInfo.level + 1}: <span className="font-bold text-slate-600 dark:text-slate-300">{levelInfo.xpForNextLevel - levelInfo.currentXP} XP</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-xs font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-1 rounded-lg border border-primary-200/50 dark:border-primary-800/50">
                                {levelInfo.progressPercent}%
                            </span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                        <div
                            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${levelInfo.tier.badgeBg}`}
                            style={{ width: `${levelInfo.progressPercent}%` }}
                        />
                    </div>

                    {/* XP Breakdown info */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
                        <div className="text-center p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="text-slate-400 dark:text-slate-500 font-semibold">Победы (+100)</div>
                            <div className="font-extrabold text-emerald-600 dark:text-emerald-400">+{levelInfo.xpFromWins} XP</div>
                        </div>
                        <div className="text-center p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="text-slate-400 dark:text-slate-500 font-semibold">Матчи (+40)</div>
                            <div className="font-extrabold text-blue-600 dark:text-blue-400">+{levelInfo.xpFromLosses} XP</div>
                        </div>
                        <div className="text-center p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="text-slate-400 dark:text-slate-500 font-semibold">Фраги 💀 (+15)</div>
                            <div className="font-extrabold text-rose-500 dark:text-rose-400">+{levelInfo.xpFromKills} XP</div>
                        </div>
                    </div>
                </div>

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
                            <div className="pt-3 px-1.5 space-y-2">
                                {topHeroes.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {topHeroes.slice(0, 3).map((h, idx) => {
                                            const hWinrate = (h.wins / h.matches) * 100;
                                            return (
                                                <div key={h.name} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className="relative shrink-0">
                                                            <Avatar entityType="hero" entityId={h.name} name={h.name} size="md" />
                                                            <div className={`absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 ${idx === 0 ? 'bg-amber-400 text-amber-950 shadow-amber-400/20' :
                                                                    idx === 1 ? 'bg-slate-300 text-slate-900' :
                                                                        idx === 2 ? 'bg-amber-700 text-amber-100' :
                                                                            'bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                }`}>
                                                                {idx + 1}
                                                            </div>
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
                                                <div className="overflow-hidden -mx-1.5 px-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                                                    {topHeroes.slice(3).map((h, idx) => {
                                                        const hWinrate = (h.wins / h.matches) * 100;
                                                        return (
                                                            <div key={h.name} className="py-2.5 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <div className="relative shrink-0">
                                                                        <Avatar entityType="hero" entityId={h.name} name={h.name} size="md" />
                                                                        <div className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                                            {idx + 4}
                                                                        </div>
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
                            <div className="pt-3 px-1.5 space-y-2">
                                {partnerStats.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {partnerStats.slice(0, 3).map((s, idx) => {
                                            const pWinrate = (s.wins / s.matches) * 100;
                                            return (
                                                <div key={s.name} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className="relative shrink-0">
                                                            <Avatar entityType="player" entityId={s.name} name={s.name} size="md" />
                                                            <div className={`absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 ${idx === 0 ? 'bg-amber-400 text-amber-950 shadow-amber-400/20' :
                                                                    idx === 1 ? 'bg-slate-300 text-slate-900' :
                                                                        idx === 2 ? 'bg-amber-700 text-amber-100' :
                                                                            'bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                }`}>
                                                                {idx + 1}
                                                            </div>
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
                                                <div className="overflow-hidden -mx-1.5 px-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                                                    {partnerStats.slice(3).map((s, idx) => {
                                                        const pWinrate = (s.wins / s.matches) * 100;
                                                        return (
                                                            <div key={s.name} className="py-2.5 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <div className="relative shrink-0">
                                                                        <Avatar entityType="player" entityId={s.name} name={s.name} size="md" />
                                                                        <div className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                                            {idx + 4}
                                                                        </div>
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

            {/* Avatar Cropper Modal */}
            <AvatarCropperModal
                isOpen={isCropperOpen}
                onClose={() => setIsCropperOpen(false)}
                entityType="player"
                entityId={player.name}
                entityName={player.name}
            />

            {/* Ranks Info Modal */}
            <RanksInfoModal
                isOpen={isRanksInfoOpen}
                onClose={() => setIsRanksInfoOpen(false)}
            />
        </div>
    );
};


