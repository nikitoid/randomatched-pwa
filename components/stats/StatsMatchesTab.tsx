import React from 'react';
import { Calendar, Trophy, Shield, Edit2, Trash2, RefreshCw, X, Loader2 } from 'lucide-react';
import { MatchRecord, PlayerStat, HeroStat } from '../../types';

interface GroupedMatches {
    dateStr: string;
    label: string;
    matches: MatchRecord[];
}

interface StatsMatchesTabProps {
    groupedMatches: GroupedMatches[];
    processedMatches: MatchRecord[];
    hasMoreMatches: boolean;
    editMode: boolean;
    showTrashOnly: boolean;
    deletedHistory: MatchRecord[];
    sortedPlayers: PlayerStat[];
    sortedHeroes: HeroStat[];
    openPlayerDetails: (player: PlayerStat) => void;
    openHeroDetails: (hero: HeroStat) => void;
    openEditMatch: (match: MatchRecord) => void;
    setDeleteConfirmId: (id: string | null) => void;
    setDeleteConfirmAction: (action: 'move-to-trash' | 'permanent' | 'clear-trash') => void;
    onRestoreMatch: (id: string) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const StatsMatchesTab: React.FC<StatsMatchesTabProps> = ({
    groupedMatches,
    processedMatches,
    hasMoreMatches,
    editMode,
    showTrashOnly,
    deletedHistory,
    sortedPlayers,
    sortedHeroes,
    openPlayerDetails,
    openHeroDetails,
    openEditMatch,
    setDeleteConfirmId,
    setDeleteConfirmAction,
    onRestoreMatch,
    triggerHaptic
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 px-4 pb-4 pt-3">
            <div className="space-y-4">
                {!showTrashOnly && (
                    <>
                        {groupedMatches.map(group => (
                            <div key={group.dateStr} className="space-y-2.5">
                                {/* Заголовок группы (Игровой вечер) */}
                                <div className="flex items-center gap-2 px-1 pt-3">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        {group.label}
                                    </span>
                                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/60"></div>
                                </div>

                                {group.matches.map(match => {
                                    const time = new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                    // Расчет счета и достижений
                                    const t1Kills = match.team1.reduce((sum, p) => sum + (p.kills || 0), 0);
                                    const t2Kills = match.team2.reduce((sum, p) => sum + (p.kills || 0), 0);
                                    const hasKills = match.team1.some(p => p.kills !== undefined) || match.team2.some(p => p.kills !== undefined);

                                    const winnerKills = match.winner === 'team1' ? t1Kills : t2Kills;
                                    const loserKills = match.winner === 'team1' ? t2Kills : t1Kills;

                                    const isFlawless = hasKills && winnerKills === 2 && loserKills === 0;
                                    const isTrade = hasKills && winnerKills === 2 && loserKills === 1;

                                    const t1Teamwork = match.winner === 'team1' && match.team1.length === 2 && match.team1.every(p => p.kills === 1);
                                    const t2Teamwork = match.winner === 'team2' && match.team2.length === 2 && match.team2.every(p => p.kills === 1);

                                    return (
                                        <div
                                            key={match.id}
                                            className={`relative overflow-hidden p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient shadow-sm border border-slate-150/80 dark:border-slate-800/60 transition-all ${editMode ? 'pr-12' : ''}`}
                                        >
                                            {/* Шапка карточки матча */}
                                            <div className="flex justify-between items-center mb-3 border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                    <Calendar size={10} /> {time}
                                                </span>

                                                {/* Вывод общего счета и бейджа */}
                                                {/* Вывод общего счета и бейджа */}
                                                {hasKills && (
                                                    <div className="flex items-center gap-2">
                                                        {isFlawless && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-900/30">
                                                                Всухую ⚡
                                                            </span>
                                                        )}
                                                        {isTrade && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-md border border-orange-100 dark:border-orange-900/30">
                                                                Размен ⚔️
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-0.5 rounded-lg shadow-2xs">
                                                            {t1Kills} : {t2Kills}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                {/* Team 1 */}
                                                <div className={`flex gap-3 ${match.winner === 'team1' ? 'opacity-100' : 'opacity-60'}`}>
                                                    <div className={`w-1 rounded-full shrink-0 ${match.winner === 'team1' ? 'bg-secondary-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                                                            <span className={match.winner === 'team1' ? 'text-secondary-600 dark:text-secondary-400 font-bold' : 'text-slate-400 dark:text-slate-500'}>Команда 1</span>
                                                            {match.winner === 'team1' && <Trophy size={9} className="text-yellow-500" />}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {match.team1.map(p => {
                                                                const isWinner = match.winner === 'team1';
                                                                return (
                                                                    <div key={p.name} className="flex items-center justify-between text-xs gap-1.5">
                                                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                            <span className={`truncate shrink-0 max-w-[45%] text-left ${isWinner ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-semibold text-slate-600 dark:text-slate-400'}`}>
                                                                                {p.name}
                                                                            </span>
                                                                            <span className="text-slate-400 text-[10px] shrink-0">на</span>
                                                                            <span className={`font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] min-w-0 max-w-full truncate ${isWinner ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700' : 'bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/60'}`}>
                                                                                <Shield size={9} className={`shrink-0 ${isWinner ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                                                                <span className="truncate">{p.heroName}</span>
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                                                            {isWinner && p.kills === 2 && (
                                                                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-md">
                                                                                    <span className="hidden min-[390px]:inline">Double Kill</span>
                                                                                    <span className="hidden min-[340px]:inline min-[390px]:hidden">2 Kill</span>
                                                                                    <span className="min-[340px]:hidden">2K</span> 🔥
                                                                                </span>
                                                                            )}
                                                                            {isWinner && t1Teamwork && (
                                                                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-md">
                                                                                    🤝
                                                                                </span>
                                                                            )}
                                                                            {p.kills !== undefined && (
                                                                                <span className="font-bold text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/80 text-[10px]">
                                                                                    {p.kills} 💀
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Team 2 */}
                                                <div className={`flex gap-3 ${match.winner === 'team2' ? 'opacity-100' : 'opacity-60'}`}>
                                                    <div className={`w-1 rounded-full shrink-0 ${match.winner === 'team2' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                                                            <span className={match.winner === 'team2' ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-400 dark:text-slate-500'}>Команда 2</span>
                                                            {match.winner === 'team2' && <Trophy size={9} className="text-yellow-500" />}
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            {match.team2.map(p => {
                                                                const isWinner = match.winner === 'team2';
                                                                return (
                                                                    <div key={p.name} className="flex items-center justify-between text-xs gap-1.5">
                                                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                            <span className={`truncate shrink-0 max-w-[45%] text-left ${isWinner ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-semibold text-slate-600 dark:text-slate-400'}`}>
                                                                                {p.name}
                                                                            </span>
                                                                            <span className="text-slate-400 text-[10px] shrink-0">на</span>
                                                                            <span className={`font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] min-w-0 max-w-full truncate ${isWinner ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700' : 'bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/60'}`}>
                                                                                <Shield size={9} className={`shrink-0 ${isWinner ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                                                                <span className="truncate">{p.heroName}</span>
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                                                            {isWinner && p.kills === 2 && (
                                                                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-md">
                                                                                    <span className="hidden min-[390px]:inline">Double Kill</span>
                                                                                    <span className="hidden min-[340px]:inline min-[390px]:hidden">2 Kill</span>
                                                                                    <span className="min-[340px]:hidden">2K</span> 🔥
                                                                                </span>
                                                                            )}
                                                                            {isWinner && t2Teamwork && (
                                                                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-md">
                                                                                    🤝
                                                                                </span>
                                                                            )}
                                                                            {p.kills !== undefined && (
                                                                                <span className="font-bold text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/80 text-[10px]">
                                                                                    {p.kills} 💀
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {editMode && (
                                                <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900 border-l border-slate-150 dark:border-slate-800/60 z-10">
                                                    <button onClick={() => openEditMatch(match)} className="p-2 text-blue-500 active:scale-90 transition-transform"><Edit2 size={16} /></button>
                                                    <button onClick={() => { setDeleteConfirmId(match.id); setDeleteConfirmAction('move-to-trash'); }} className="p-2 text-red-500 active:scale-90 transition-transform"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        {processedMatches.length === 0 && <div className="text-center text-slate-400 py-10">Матчи не найдены</div>}
                        {hasMoreMatches && (
                            <div className="text-center py-4 text-xs text-slate-450 dark:text-slate-500 flex items-center justify-center gap-2 animate-pulse">
                                <Loader2 size={12} className="animate-spin" /> Загрузка матчей...
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Deleted Matches Section */}
            {editMode && deletedHistory.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-white dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Корзина ({deletedHistory.length})
                    </div>
                    <div className="space-y-3 opacity-90 transition-opacity">
                        {deletedHistory.map(match => {
                            const date = new Date(match.timestamp).toLocaleDateString();
                            const time = new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div
                                    key={match.id}
                                    className="relative overflow-hidden p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 glass-card-gradient shadow-sm border border-red-200/60 dark:border-red-950/40 pr-20"
                                >
                                    <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-700/50 pb-2">
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Trash2 size={10} /> {date} <span className="opacity-50">|</span> {time}</span>
                                    </div>

                                    <div className="space-y-2 opacity-60 grayscale-[50%]">
                                        {/* Team 1 */}
                                        <div className={`flex items-center gap-2 ${match.winner === 'team1' ? 'opacity-100' : 'opacity-60'}`}>
                                            <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team1' ? 'bg-secondary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                    {match.team1.map(p => p.name).join(', ')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team 2 */}
                                        <div className={`flex items-center gap-2 ${match.winner === 'team2' ? 'opacity-100' : 'opacity-60'}`}>
                                            <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team2' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                    {match.team2.map(p => p.name).join(', ')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute right-0 top-0 bottom-0 w-20 flex flex-col items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 border-l border-red-100 dark:border-red-900/30 z-10">
                                        <button onClick={() => { onRestoreMatch(match.id); triggerHaptic(20); }} className="p-2 text-green-500 active:scale-90 transition-transform" aria-label="Восстановить">
                                            <RefreshCw size={16} />
                                        </button>
                                        <button onClick={() => { setDeleteConfirmId(match.id); setDeleteConfirmAction('permanent'); triggerHaptic(50); }} className="p-2 text-red-500 active:scale-90 transition-transform" aria-label="Удалить навсегда">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="text-center mt-6 mb-4">
                        <button
                            onClick={() => { setDeleteConfirmId('all'); setDeleteConfirmAction('clear-trash'); triggerHaptic(50); }}
                            className="text-xs font-bold text-red-400 active:text-red-500 py-2 px-4 rounded-full active:bg-red-50 dark:active:bg-red-900/20 transition-colors flex items-center gap-2 mx-auto"
                        >
                            <Trash2 size={14} /> Очистить корзину ({deletedHistory.length})
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
