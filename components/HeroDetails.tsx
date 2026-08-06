import React, { useMemo, useState, useEffect } from 'react';
import { HeroStat, MatchRecord } from '../types';
import { ChevronLeft, User, Calendar, TrendingUp, ChevronDown, ChevronUp, Edit2, Check, X, Skull, Shield, Swords, Trophy, Sparkles } from 'lucide-react';
import { Avatar } from './common/Avatar';
import { AvatarCropperModal } from './common/AvatarCropperModal';

interface HeroDetailsProps {
    hero: HeroStat;
    history: MatchRecord[];
    onBack: () => void;
    onRename: (newName: string) => void;
}

export const HeroDetails: React.FC<HeroDetailsProps> = ({ hero, history, onBack, onRename }) => {

    // Avatar Cropper State
    const [isCropperOpen, setIsCropperOpen] = useState(false);

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

        // Best Synergies (Heroes played WITH this hero on the same team)
        const synergyMap = new Map<string, { matches: number, wins: number }>();
        heroMatches.forEach(m => {
            if (m.team1.some(p => p.heroName === hero.name)) {
                const won = m.winner === 'team1';
                m.team1.forEach(p => {
                    if (p.heroName !== hero.name && p.heroName) {
                        const s = synergyMap.get(p.heroName) || { matches: 0, wins: 0 };
                        s.matches++;
                        if (won) s.wins++;
                        synergyMap.set(p.heroName, s);
                    }
                });
            }
            if (m.team2.some(p => p.heroName === hero.name)) {
                const won = m.winner === 'team2';
                m.team2.forEach(p => {
                    if (p.heroName !== hero.name && p.heroName) {
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

    const heroInitial = hero.name.trim().charAt(0).toUpperCase() || 'H';
    const winRate = hero.matches > 0 ? (hero.wins / hero.matches) * 100 : 0;

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
                            entityType="hero"
                            entityId={hero.name}
                            name={hero.name}
                            size="lg"
                            showEditButton
                            onEditClick={() => setIsCropperOpen(true)}
                        />

                        <div className="flex-1 min-w-0">

                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white truncate">{hero.name}</h2>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1 text-slate-400 hover:text-primary-500 active:scale-95 transition-colors"
                                    aria-label="Редактировать имя"
                                >
                                    <Edit2 size={15} />
                                </button>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>{hero.matches} {hero.matches === 1 ? 'игра' : [2, 3, 4].includes(hero.matches % 10) && ![12, 13, 14].includes(hero.matches % 100) ? 'игры' : 'игр'}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                <span>{hero.wins}W - {hero.matches - hero.wins}L</span>
                            </div>
                        </div>

                        <div className="px-2.5 py-1 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 shadow-2xs">
                            ГЕРОЙ
                        </div>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
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
                        onClick={() => setPlayersState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
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
                            <div className="pt-3 space-y-2">
                                {topPlayers.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {topPlayers.slice(0, 3).map((p, idx) => {
                                            const pWinrate = (p.wins / p.matches) * 100;
                                            return (
                                                <div key={p.name} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center shrink-0">
                                                            {idx + 1}
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
                                                            <span className="text-slate-500 dark:text-slate-400">{p.matches} {p.matches === 1 ? 'игра' : 'игр'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {topPlayers.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${playersState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                                                    {topPlayers.slice(3).map((p, idx) => {
                                                        const pWinrate = (p.wins / p.matches) * 100;
                                                        return (
                                                            <div key={p.name} className="py-2.5 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center shrink-0">
                                                                        {idx + 4}
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
                                                                        <span className="text-slate-500 dark:text-slate-400">{p.matches} {p.matches === 1 ? 'игра' : 'игр'}</span>
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
                                        onClick={() => setPlayersState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full pt-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline transition-colors flex items-center justify-center gap-1"
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
                        onClick={() => setSynergiesState(prev => {
                            if (prev === 'collapsed') return 'partial';
                            if (prev === 'partial') return 'expanded';
                            return 'collapsed';
                        })}
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
                            <div className="pt-3 space-y-2">
                                {topSynergies.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {topSynergies.slice(0, 3).map((s, idx) => {
                                            const sWinrate = (s.wins / s.matches) * 100;
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
                                                                className={`h-full rounded-full ${sWinrate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${Math.min(100, Math.max(5, sWinrate))}%` }}
                                                            />
                                                        </div>
                                                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 w-24 justify-end">
                                                            <span className={sWinrate >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-500 font-extrabold'}>
                                                                {sWinrate.toFixed(1)}%
                                                            </span>
                                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                                            <span className="text-slate-500 dark:text-slate-400">{s.matches} {s.matches === 1 ? 'игра' : 'игр'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {topSynergies.length > 3 && (
                                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${synergiesState === 'expanded' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                <div className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                                                    {topSynergies.slice(3).map((s, idx) => {
                                                        const sWinrate = (s.wins / s.matches) * 100;
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
                                                                            className={`h-full rounded-full ${sWinrate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                            style={{ width: `${Math.min(100, Math.max(5, sWinrate))}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 w-24 justify-end">
                                                                        <span className={sWinrate >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-amber-500 font-extrabold'}>
                                                                            {sWinrate.toFixed(1)}%
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
                                    <div className="text-center text-slate-400 text-xs py-3">Недостаточно данных для связок</div>
                                )}

                                {topSynergies.length > 3 && (
                                    <button
                                        onClick={() => setSynergiesState(prev => prev === 'partial' ? 'expanded' : 'partial')}
                                        className="w-full pt-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline transition-colors flex items-center justify-center gap-1"
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
                                        const t1HasHero = m.team1.some(p => p.heroName === hero.name);
                                        const isTeam1 = t1HasHero;
                                        const myTeam = isTeam1 ? m.team1 : m.team2;
                                        const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                        const won = m.winner === (isTeam1 ? 'team1' : 'team2');
                                        const playerOnHero = myTeam.find(p => p.heroName === hero.name);

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
                                                            <span key={i} className={p.heroName === hero.name ? 'text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/40' : ''}>
                                                                {p.name}{i < myTeam.length - 1 ? ', ' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] shrink-0">VS</span>
                                                    <div className="flex-1 text-left font-bold text-slate-600 dark:text-slate-400 truncate">
                                                        {enemyTeam.map(p => p.name).join(', ')}
                                                    </div>
                                                </div>

                                                {playerOnHero && (
                                                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                        <span className="flex items-center gap-1">
                                                            <User size={12} className="text-slate-400" />
                                                            <span>Игрок: <span className="font-bold text-slate-800 dark:text-slate-200">{playerOnHero.name}</span></span>
                                                        </span>
                                                        {playerOnHero.kills !== undefined && playerOnHero.kills !== null && (
                                                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-extrabold text-[10px] flex items-center gap-1">
                                                                <Skull size={11} /> {playerOnHero.kills} {playerOnHero.kills === 1 ? 'убийство' : [2, 3, 4].includes(playerOnHero.kills % 10) && ![12, 13, 14].includes(playerOnHero.kills % 100) ? 'убийства' : 'убийств'}
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
                                                    const t1HasHero = m.team1.some(p => p.heroName === hero.name);
                                                    const isTeam1 = t1HasHero;
                                                    const myTeam = isTeam1 ? m.team1 : m.team2;
                                                    const enemyTeam = isTeam1 ? m.team2 : m.team1;
                                                    const won = m.winner === (isTeam1 ? 'team1' : 'team2');
                                                    const playerOnHero = myTeam.find(p => p.heroName === hero.name);

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
                                                                        <span key={i} className={p.heroName === hero.name ? 'text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/40' : ''}>
                                                                            {p.name}{i < myTeam.length - 1 ? ', ' : ''}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-[9px] shrink-0">VS</span>
                                                                <div className="flex-1 text-left font-bold text-slate-600 dark:text-slate-400 truncate">
                                                                    {enemyTeam.map(p => p.name).join(', ')}
                                                                </div>
                                                            </div>

                                                            {playerOnHero && (
                                                                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                                    <span className="flex items-center gap-1">
                                                                        <User size={12} className="text-slate-400" />
                                                                        <span>Игрок: <span className="font-bold text-slate-800 dark:text-slate-200">{playerOnHero.name}</span></span>
                                                                    </span>
                                                                    {playerOnHero.kills !== undefined && playerOnHero.kills !== null && (
                                                                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-extrabold text-[10px] flex items-center gap-1">
                                                                            <Skull size={11} /> {playerOnHero.kills} {playerOnHero.kills === 1 ? 'убийство' : [2, 3, 4].includes(playerOnHero.kills % 10) && ![12, 13, 14].includes(playerOnHero.kills % 100) ? 'убийства' : 'убийств'}
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
                entityType="hero"
                entityId={hero.name}
                entityName={hero.name}
            />
        </div>
    );
};


