import React, { useMemo, useState, useEffect } from 'react';
import { HeroStat, MatchRecord } from '../types';
import { ChevronLeft, User, Calendar, TrendingUp, ChevronDown, ChevronUp, Edit2, Check, X, Skull, Shield, Swords, Trophy, Sparkles, Merge } from 'lucide-react';
import { calculateWilsonScore } from './stats/hooks/useStatsCalculations';
import { Avatar } from './common/Avatar';
import { AvatarCropperModal } from './common/AvatarCropperModal';
import { normalizeHeroKey, formatPlural } from '../utils/heroNormalization';
import { BaseModal } from './common/BaseModal';
import { useHaptics } from '../hooks/useHaptics';

export interface HeroDetailsProps {
    isOpen?: boolean;
    hero: HeroStat | null;
    history: MatchRecord[];
    onBack?: () => void;
    onClose?: () => void;
    onRename: (newName: string) => void;
    onOpenMerge?: (heroName: string) => void;
    onSelectHero?: (heroName: string) => void;
    onSelectPlayer?: (playerName: string) => void;
    triggerHaptic?: (pattern?: number | number[]) => void;
}

export const HeroDetails: React.FC<HeroDetailsProps> = ({
    isOpen = true,
    hero,
    history,
    onBack,
    onClose,
    onRename,
    onOpenMerge,
    onSelectHero,
    onSelectPlayer,
    triggerHaptic: propTriggerHaptic
}) => {
    const { trigger } = useHaptics();
    const triggerHaptic = propTriggerHaptic || trigger;

    // Resolve close handler (support both onBack and onClose)
    const handleClose = () => {
        triggerHaptic(10);
        if (onClose) onClose();
        else if (onBack) onBack();
    };

    // Avatar Cropper State
    const [isCropperOpen, setIsCropperOpen] = useState(false);

    // Rename State
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(hero?.name || '');

    useEffect(() => {
        if (hero) {
            setEditValue(hero.name);
            setIsEditing(false);
        }
    }, [hero?.name]);

    const handleSave = () => {
        if (!hero) return;
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== hero.name) {
            onRename(trimmed);
            triggerHaptic(10);
        }
        setIsEditing(false);
    };

    const [playersState, setPlayersState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');
    const [synergiesState, setSynergiesState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');
    const [matchesState, setMatchesState] = useState<'partial' | 'expanded' | 'collapsed'>('partial');

    const heroName = hero?.name || '';
    const { recentMatches, topPlayers, topSynergies } = useMemo(() => {
        if (!heroName) {
            return {
                recentMatches: [],
                topPlayers: [],
                topSynergies: []
            };
        }

        const targetHeroKey = normalizeHeroKey(heroName);

        // Filter matches involving this hero
        const heroMatches = history.filter(m =>
            m.team1.some(p => normalizeHeroKey(p.heroName) === targetHeroKey) ||
            m.team2.some(p => normalizeHeroKey(p.heroName) === targetHeroKey)
        ).sort((a, b) => b.timestamp - a.timestamp);

        // Top Players on this Hero
        const playersMap = new Map<string, { matches: number, wins: number }>();
        heroMatches.forEach(m => {
            const t1Idx = m.team1.findIndex(p => normalizeHeroKey(p.heroName) === targetHeroKey);
            const t2Idx = m.team2.findIndex(p => normalizeHeroKey(p.heroName) === targetHeroKey);

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
                const score = calculateWilsonScore(stats.wins, stats.matches);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches || b.wins - a.wins)
            .slice(0, 5);

        // Best Synergies (Heroes played WITH this hero on the same team)
        const synergyMap = new Map<string, { matches: number, wins: number }>();
        heroMatches.forEach(m => {
            if (m.team1.some(p => normalizeHeroKey(p.heroName) === targetHeroKey)) {
                const won = m.winner === 'team1';
                m.team1.forEach(p => {
                    if (normalizeHeroKey(p.heroName) !== targetHeroKey && p.heroName) {
                        const s = synergyMap.get(p.heroName) || { matches: 0, wins: 0 };
                        s.matches++;
                        if (won) s.wins++;
                        synergyMap.set(p.heroName, s);
                    }
                });
            }
            if (m.team2.some(p => normalizeHeroKey(p.heroName) === targetHeroKey)) {
                const won = m.winner === 'team2';
                m.team2.forEach(p => {
                    if (normalizeHeroKey(p.heroName) !== targetHeroKey && p.heroName) {
                        const s = synergyMap.get(p.heroName) || { matches: 0, wins: 0 };
                        s.matches++;
                        if (won) s.wins++;
                        synergyMap.set(p.heroName, s);
                    }
                });
            }
        });

        const topSynergies = Array.from(synergyMap.entries())
            .filter(([_, stats]) => stats.matches >= 1)
            .map(([name, stats]) => {
                const score = calculateWilsonScore(stats.wins, stats.matches);
                return { name, ...stats, score };
            })
            .sort((a, b) => b.score - a.score || b.matches - a.matches || b.wins - a.wins)
            .slice(0, 5);

        return {
            recentMatches: heroMatches.slice(0, 10),
            topPlayers,
            topSynergies
        };
    }, [heroName, history]);

    if (!hero) return null;

    const winRate = hero.matches > 0 ? (hero.wins / hero.matches) * 100 : 0;

    // Header title node with Avatar, name, inline editing, merge, and match counts
    const headerTitle = (
        <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar
                entityType="hero"
                entityId={hero.name}
                name={hero.name}
                size="md"
                showEditButton
                onEditClick={() => setIsCropperOpen(true)}
            />

            {isEditing ? (
                <form
                    className="flex-1 min-w-0 flex items-center gap-1.5"
                    onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                >
                    <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1 text-sm font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
                        placeholder="Имя героя"
                    />
                    <button
                        type="submit"
                        className="shrink-0 p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl active:scale-95 transition-transform cursor-pointer"
                        title="Сохранить"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="shrink-0 p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 rounded-xl active:scale-95 transition-transform cursor-pointer"
                        title="Отмена"
                    >
                        <X size={16} />
                    </button>
                </form>
            ) : (
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                            {hero.name}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="p-1 text-slate-400 hover:text-primary-500 active:scale-95 transition-colors cursor-pointer"
                            aria-label="Редактировать имя"
                            title="Редактировать имя"
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{formatPlural(hero.matches, 'игра', 'игры', 'игр')}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span>{hero.wins}W - {hero.matches - hero.wins}L</span>
                    </div>
                </div>
            )}
        </div>
    );

    // Header actions: Badge / Merge Button
    const headerActions = (
        <div className="flex items-center gap-1.5">
            {onOpenMerge && (
                <button
                    type="button"
                    onClick={() => {
                        triggerHaptic(10);
                        onOpenMerge(hero.name);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                    title="Объединить дубликаты героя"
                >
                    <Merge size={13} className="text-primary-500" />
                    <span className="hidden xs:inline">Слияние</span>
                </button>
            )}
            <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 shadow-2xs">
                ГЕРОЙ
            </div>
        </div>
    );

    return (
        <>
            <BaseModal
                isOpen={isOpen && !!hero}
                onClose={handleClose}
                title={headerTitle}
                headerActions={headerActions}
                variant="auto"
                maxWidth="lg"
                priority={25}
                modalId="hero-details-modal"
                showCloseButton={true}
                enableSwipeToClose={true}
                closeOnBackdropClick={true}
            >
                <div className="space-y-4 pb-2">
                    {/* Stats 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Matches / Popularity */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Популярность</span>
                                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                                    <Swords size={15} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{hero.matches}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                                    Всего матчей сыграно
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
                                    {hero.wins} побед / {hero.matches - hero.wins} поражений
                                </div>
                            </div>
                        </div>

                        {/* Top Performers Card */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Исполнители</span>
                                <div className="w-7 h-7 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <User size={15} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{topPlayers.length}</div>
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                                    Лучших игроков
                                </div>
                            </div>
                        </div>

                        {/* Synergies Card */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Связки</span>
                                <div className="w-7 h-7 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <Sparkles size={15} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">{topSynergies.length}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                                    Синергичных героев
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Players Section */}
                    <div className="bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs">
                        <div
                            className="flex items-center justify-between cursor-pointer select-none"
                            onClick={() => {
                                triggerHaptic(10);
                                setPlayersState(prev => {
                                    if (prev === 'collapsed') return 'partial';
                                    if (prev === 'partial') return 'expanded';
                                    return 'collapsed';
                                });
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                    <User size={16} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Лучшие исполнители</h3>
                                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {topPlayers.length}
                                </span>
                            </div>
                            <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                {playersState === 'collapsed' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </div>
                        </div>

                        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${playersState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                            <div className="overflow-hidden">
                                <div className="pt-3 px-1.5 space-y-2">
                                    {topPlayers.length > 0 ? (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {topPlayers.slice(0, 3).map((p, idx) => {
                                                const pWinrate = (p.wins / p.matches) * 100;
                                                return (
                                                    <div
                                                        key={p.name}
                                                        onClick={() => {
                                                            if (onSelectPlayer) {
                                                                triggerHaptic(10);
                                                                onSelectPlayer(p.name);
                                                            }
                                                        }}
                                                        className={`py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 ${onSelectPlayer ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 -mx-2 transition-all active:scale-[0.99]' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className="relative shrink-0">
                                                                <Avatar entityType="player" entityId={p.name} name={p.name} size="md" />
                                                                <div className={`absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 ${idx === 0 ? 'bg-amber-400 text-amber-950 shadow-amber-400/20' :
                                                                        idx === 1 ? 'bg-slate-300 text-slate-900' :
                                                                            idx === 2 ? 'bg-amber-700 text-amber-100' :
                                                                                'bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                    }`}>
                                                                    {idx + 1}
                                                                </div>
                                                            </div>
                                                            <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{p.name}</div>
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
                                                                <span className="text-slate-500 dark:text-slate-400">{formatPlural(p.matches, 'игра', 'игры', 'игр')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {topPlayers.length > 3 && (
                                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${playersState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                    <div className="overflow-hidden -mx-1.5 px-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                                                        {topPlayers.slice(3).map((p, idx) => {
                                                            const pWinrate = (p.wins / p.matches) * 100;
                                                            return (
                                                                <div
                                                                    key={p.name}
                                                                    onClick={() => {
                                                                        if (onSelectPlayer) {
                                                                            triggerHaptic(10);
                                                                            onSelectPlayer(p.name);
                                                                        }
                                                                    }}
                                                                    className={`py-2.5 flex items-center justify-between gap-3 ${onSelectPlayer ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 -mx-2 transition-all active:scale-[0.99]' : ''}`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                        <div className="relative shrink-0">
                                                                            <Avatar entityType="player" entityId={p.name} name={p.name} size="md" />
                                                                            <div className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                                                {idx + 4}
                                                                            </div>
                                                                        </div>
                                                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{p.name}</div>
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
                                                                            <span className="text-slate-500 dark:text-slate-400">{formatPlural(p.matches, 'игра', 'игры', 'игр')}</span>
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
                                        <div className="text-center text-slate-400 text-xs py-3">Нет данных по игрокам</div>
                                    )}

                                    {topPlayers.length > 3 && (
                                        <button
                                            onClick={() => {
                                                triggerHaptic(10);
                                                setPlayersState(prev => prev === 'partial' ? 'expanded' : 'partial');
                                            }}
                                            className="w-full pt-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            {playersState === 'partial' ? 'Показать всех' : 'Свернуть'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Synergies Section */}
                    <div className="bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs">
                        <div
                            className="flex items-center justify-between cursor-pointer select-none"
                            onClick={() => {
                                triggerHaptic(10);
                                setSynergiesState(prev => {
                                    if (prev === 'collapsed') return 'partial';
                                    if (prev === 'partial') return 'expanded';
                                    return 'collapsed';
                                });
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                    <TrendingUp size={16} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Лучшие связки</h3>
                                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {topSynergies.length}
                                </span>
                            </div>
                            <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                {synergiesState === 'collapsed' ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </div>
                        </div>

                        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${synergiesState === 'collapsed' ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                            <div className="overflow-hidden">
                                <div className="pt-3 px-1.5 space-y-2">
                                    {topSynergies.length > 0 ? (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {topSynergies.slice(0, 3).map((s, idx) => {
                                                const sWinrate = (s.wins / s.matches) * 100;
                                                return (
                                                    <div
                                                        key={s.name}
                                                        onClick={() => {
                                                            if (onSelectHero) {
                                                                triggerHaptic(10);
                                                                onSelectHero(s.name);
                                                            }
                                                        }}
                                                        className={`py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 ${onSelectHero ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 -mx-2 transition-all active:scale-[0.99]' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className="relative shrink-0">
                                                                <Avatar entityType="hero" entityId={s.name} name={s.name} size="md" />
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
                                                                    className={`h-full rounded-full ${sWinrate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                    style={{ width: `${Math.min(100, Math.max(5, sWinrate))}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 w-24 justify-end">
                                                                <span className={sWinrate >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-500 font-extrabold'}>
                                                                    {sWinrate.toFixed(1)}%
                                                                </span>
                                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                                <span className="text-slate-500 dark:text-slate-400">{formatPlural(s.matches, 'игра', 'игры', 'игр')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {topSynergies.length > 3 && (
                                                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${synergiesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                    <div className="overflow-hidden -mx-1.5 px-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                                                        {topSynergies.slice(3).map((s, idx) => {
                                                            const sWinrate = (s.wins / s.matches) * 100;
                                                            return (
                                                                <div
                                                                    key={s.name}
                                                                    onClick={() => {
                                                                        if (onSelectHero) {
                                                                            triggerHaptic(10);
                                                                            onSelectHero(s.name);
                                                                        }
                                                                    }}
                                                                    className={`py-2.5 flex items-center justify-between gap-3 ${onSelectHero ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 -mx-2 transition-all active:scale-[0.99]' : ''}`}
                                                                >
                                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                        <div className="relative shrink-0">
                                                                            <Avatar entityType="hero" entityId={s.name} name={s.name} size="md" />
                                                                            <div className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                                                {idx + 4}
                                                                            </div>
                                                                        </div>
                                                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{s.name}</div>
                                                                    </div>

                                                                    <div className="flex items-center gap-3 shrink-0">
                                                                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                                                            <div
                                                                                className={`h-full rounded-full ${sWinrate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                                style={{ width: `${Math.min(100, Math.max(5, sWinrate))}%` }}
                                                                            />
                                                                        </div>
                                                                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 w-24 justify-end">
                                                                            <span className={sWinrate >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-500 font-extrabold'}>
                                                                                {sWinrate.toFixed(1)}%
                                                                            </span>
                                                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                                                            <span className="text-slate-500 dark:text-slate-400">{formatPlural(s.matches, 'игра', 'игры', 'игр')}</span>
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
                                        <div className="text-center text-slate-400 text-xs py-3">Недостаточно данных для связок</div>
                                    )}

                                    {topSynergies.length > 3 && (
                                        <button
                                            onClick={() => {
                                                triggerHaptic(10);
                                                setSynergiesState(prev => prev === 'partial' ? 'expanded' : 'partial');
                                            }}
                                            className="w-full pt-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            {synergiesState === 'partial' ? 'Показать все' : 'Свернуть'}
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
                            onClick={() => {
                                triggerHaptic(10);
                                setMatchesState(prev => {
                                    if (prev === 'collapsed') return 'partial';
                                    if (prev === 'partial') return 'expanded';
                                    return 'collapsed';
                                });
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                    <Calendar size={16} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">История игр</h3>
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
                                            const t1HasHero = m.team1.some(p => normalizeHeroKey(p.heroName) === normalizeHeroKey(hero.name));
                                            const isTeam1 = t1HasHero;
                                            const myTeam = isTeam1 ? m.team1 : m.team2;
                                            const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                            const won = m.winner === (isTeam1 ? 'team1' : 'team2');
                                            const playerOnHero = myTeam.find(p => normalizeHeroKey(p.heroName) === normalizeHeroKey(hero.name));

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
                                                                <span
                                                                    key={i}
                                                                    onClick={(e) => {
                                                                        if (onSelectPlayer) {
                                                                            e.stopPropagation();
                                                                            triggerHaptic(10);
                                                                            onSelectPlayer(p.name);
                                                                        }
                                                                    }}
                                                                    className={normalizeHeroKey(p.heroName) === normalizeHeroKey(hero.name) ? 'text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/40 font-black' : onSelectPlayer ? 'hover:underline cursor-pointer' : ''}
                                                                >
                                                                    {p.name}{i < myTeam.length - 1 ? ', ' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] shrink-0">VS</span>
                                                        <div className="flex-1 text-left font-bold text-slate-600 dark:text-slate-400 truncate">
                                                            {enemyTeam.map((p, i) => (
                                                                <span
                                                                    key={i}
                                                                    onClick={(e) => {
                                                                        if (onSelectPlayer) {
                                                                            e.stopPropagation();
                                                                            triggerHaptic(10);
                                                                            onSelectPlayer(p.name);
                                                                        }
                                                                    }}
                                                                    className={onSelectPlayer ? 'hover:underline cursor-pointer' : ''}
                                                                >
                                                                    {p.name}{i < enemyTeam.length - 1 ? ', ' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {playerOnHero && (
                                                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                            <span
                                                                className={`flex items-center gap-1 ${onSelectPlayer ? 'cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors' : ''}`}
                                                                onClick={(e) => {
                                                                    if (onSelectPlayer) {
                                                                        e.stopPropagation();
                                                                        triggerHaptic(10);
                                                                        onSelectPlayer(playerOnHero.name);
                                                                    }
                                                                }}
                                                            >
                                                                <User size={12} className="text-slate-400" />
                                                                <span>Игрок: <span className="font-bold text-slate-800 dark:text-slate-200 underline decoration-slate-300 dark:decoration-slate-700">{playerOnHero.name}</span></span>
                                                            </span>
                                                            {playerOnHero.kills !== undefined && playerOnHero.kills !== null && (
                                                                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-extrabold text-[10px] flex items-center gap-1">
                                                                    <Skull size={11} /> {formatPlural(playerOnHero.kills, 'убийство', 'убийства', 'убийств')}
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
                                                        const t1HasHero = m.team1.some(p => normalizeHeroKey(p.heroName) === normalizeHeroKey(hero.name));
                                                        const isTeam1 = t1HasHero;
                                                        const myTeam = isTeam1 ? m.team1 : m.team2;
                                                        const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                                        const won = m.winner === (isTeam1 ? 'team1' : 'team2');
                                                        const playerOnHero = myTeam.find(p => normalizeHeroKey(p.heroName) === normalizeHeroKey(hero.name));

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
                                                                            <span
                                                                                key={i}
                                                                                onClick={(e) => {
                                                                                    if (onSelectPlayer) {
                                                                                        e.stopPropagation();
                                                                                        triggerHaptic(10);
                                                                                        onSelectPlayer(p.name);
                                                                                    }
                                                                                }}
                                                                                className={normalizeHeroKey(p.heroName) === normalizeHeroKey(hero.name) ? 'text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/40 font-black' : onSelectPlayer ? 'hover:underline cursor-pointer' : ''}
                                                                            >
                                                                                {p.name}{i < myTeam.length - 1 ? ', ' : ''}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] shrink-0">VS</span>
                                                                    <div className="flex-1 text-left font-bold text-slate-600 dark:text-slate-400 truncate">
                                                                        {enemyTeam.map((p, i) => (
                                                                            <span
                                                                                key={i}
                                                                                onClick={(e) => {
                                                                                    if (onSelectPlayer) {
                                                                                        e.stopPropagation();
                                                                                        triggerHaptic(10);
                                                                                        onSelectPlayer(p.name);
                                                                                    }
                                                                                }}
                                                                                className={onSelectPlayer ? 'hover:underline cursor-pointer' : ''}
                                                                            >
                                                                                {p.name}{i < enemyTeam.length - 1 ? ', ' : ''}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {playerOnHero && (
                                                                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                                        <span
                                                                            className={`flex items-center gap-1 ${onSelectPlayer ? 'cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors' : ''}`}
                                                                            onClick={(e) => {
                                                                                if (onSelectPlayer) {
                                                                                    e.stopPropagation();
                                                                                    triggerHaptic(10);
                                                                                    onSelectPlayer(playerOnHero.name);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <User size={12} className="text-slate-400" />
                                                                            <span>Игрок: <span className="font-bold text-slate-800 dark:text-slate-200 underline decoration-slate-300 dark:decoration-slate-700">{playerOnHero.name}</span></span>
                                                                        </span>
                                                                        {playerOnHero.kills !== undefined && playerOnHero.kills !== null && (
                                                                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-extrabold text-[10px] flex items-center gap-1">
                                                                                <Skull size={11} /> {formatPlural(playerOnHero.kills, 'убийство', 'убийства', 'убийств')}
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
                                                onClick={() => {
                                                    triggerHaptic(10);
                                                    setMatchesState(prev => prev === 'partial' ? 'expanded' : 'partial');
                                                }}
                                                className="w-full py-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
            </BaseModal>

            {/* Avatar Cropper Modal */}
            <AvatarCropperModal
                isOpen={isCropperOpen}
                onClose={() => setIsCropperOpen(false)}
                entityType="hero"
                entityId={hero.name}
                entityName={hero.name}
            />
        </>
    );
};

export const HeroDetailsModal = HeroDetails;
