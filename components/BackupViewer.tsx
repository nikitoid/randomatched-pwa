import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CloudBackup, MatchRecord, MatchPlayer } from '../types';
import { createPortal } from 'react-dom';
import { X, Calendar, Trophy, Trash2, Search, Shield, Loader2 } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

interface BackupViewerProps {
    backup: CloudBackup;
    onClose: () => void;
    isOpen: boolean;
}

export const BackupViewer: React.FC<BackupViewerProps> = ({ backup, onClose, isOpen }) => {
    const [search, setSearch] = useState('');
    const [visibleMatchesCount, setVisibleMatchesCount] = useState(15);
    const contentContainerRef = useRef<HTMLDivElement>(null);

    useBackHandler(isOpen, onClose, { id: 'backup-viewer', priority: 30 });

    const filteredHistory = useMemo(() => {
        if (!search.trim()) return backup.history;
        const lower = search.toLowerCase().trim();
        return backup.history.filter(m => {
            // Search in Player Names
            const pNames = [...m.team1, ...m.team2].map(p => p.name.toLowerCase());
            if (pNames.some(n => n.includes(lower))) return true;

            // Search in Hero Names
            const hNames = [...m.team1, ...m.team2].map(p => p.heroName.toLowerCase());
            if (hNames.some(n => n.includes(lower))) return true;

            // Search by Date
            const dateStr = new Date(m.timestamp).toLocaleDateString();
            if (dateStr.includes(lower)) return true;

            return false;
        });
    }, [backup.history, search]);

    // Reset pagination when search or isOpen changes
    useEffect(() => {
        setVisibleMatchesCount(15);
    }, [search, isOpen]);

    // Infinite Scroll Handler
    useEffect(() => {
        if (!isOpen) return;
        const container = contentContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (container.scrollHeight - container.scrollTop - container.clientHeight < 120) {
                setVisibleMatchesCount(prev => prev + 15);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [isOpen]);

    const matchesToShow = useMemo(() => {
        return filteredHistory.slice(0, visibleMatchesCount);
    }, [filteredHistory, visibleMatchesCount]);

    const hasMoreMatches = filteredHistory.length > visibleMatchesCount;

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 bg-grid-pattern w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Просмотр бэкапа</h3>
                        <p className="text-xs text-slate-500">
                            от {new Date(backup.createdAt).toLocaleString('ru-RU')} • {backup.matchCount} матчей
                        </p>
                    </div>
                    <button onClick={onClose} data-testid="backup-viewer-close-btn" className="p-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 pb-0">
                    <div className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск (игрок, герой, дата)..."
                            className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 active:text-slate-600 dark:active:text-slate-200 transition-colors"
                                aria-label="Очистить поиск"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div ref={contentContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center text-slate-400 py-10">Матчи не найдены</div>
                    ) : (
                        <>
                            {matchesToShow.map(match => {
                                const date = new Date(match.timestamp).toLocaleDateString();
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
                                        className="relative overflow-hidden p-3.5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-150/80 dark:border-slate-800/60 transition-all"
                                    >
                                        {/* Шапка карточки матча */}
                                        <div className="flex justify-between items-center mb-3 border-b border-slate-50 dark:border-slate-700/50 pb-2">
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                <Calendar size={10} /> {date} <span className="opacity-50">|</span> {time}
                                                {match.winner === null && <span className="ml-2 text-slate-400">Ничья</span>}
                                            </span>

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
                                                                                <span className="hidden min-[400px]:inline">Double Kill</span>
                                                                                <span className="hidden min-[350px]:inline min-[400px]:hidden">2 Kill</span>
                                                                                <span className="min-[350px]:hidden">2K</span> 🔥
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
                                                                                <span className="hidden min-[400px]:inline">Double Kill</span>
                                                                                <span className="hidden min-[350px]:inline min-[400px]:hidden">2 Kill</span>
                                                                                <span className="min-[350px]:hidden">2K</span> 🔥
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
                                    </div>
                                );
                            })}
                            {hasMoreMatches && (
                                <div className="text-center py-4 text-xs text-slate-450 dark:text-slate-500 flex items-center justify-center gap-2 animate-pulse">
                                    <Loader2 size={12} className="animate-spin" /> Загрузка матчей...
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer info about deleted items */}
                {backup.deletedHistory.length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 text-xs text-center text-slate-500 border-t border-slate-100 dark:border-slate-800">
                        В корзине бэкапа: {backup.deletedHistory.length} матчей
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
