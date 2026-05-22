import React, { useMemo, useState } from 'react';
import { CloudBackup, MatchRecord, MatchPlayer } from '../types';
import { createPortal } from 'react-dom';
import { X, Calendar, Trophy, Trash2, Search } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

interface BackupViewerProps {
    backup: CloudBackup;
    onClose: () => void;
    isOpen: boolean;
}

export const BackupViewer: React.FC<BackupViewerProps> = ({ backup, onClose, isOpen }) => {
    const [search, setSearch] = useState('');

    useBackHandler(isOpen, onClose, { id: 'backup-viewer', priority: 30 });

    const renderHeroWithKills = (player: MatchPlayer): string => {
        if (player.kills !== undefined && player.kills !== null) {
            return `${player.heroName} (${player.kills} 💀)`;
        }
        return player.heroName;
    };

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

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Просмотр бэкапа</h3>
                        <p className="text-xs text-slate-500">
                            от {new Date(backup.createdAt).toLocaleString('ru-RU')} • {backup.matchCount} матчей
                        </p>
                    </div>
                    <button onClick={onClose} data-testid="backup-viewer-close-btn" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center text-slate-400 py-10">Матчи не найдены</div>
                    ) : (
                        filteredHistory.map(match => {
                            const date = new Date(match.timestamp).toLocaleDateString();
                            const time = new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={match.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={10} /> {date} <span className="opacity-50">|</span> {time}
                                            {match.winner === null && <span className="ml-2 text-slate-400">Ничья</span>}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {/* Team 1 */}
                                        <div className={`flex items-center gap-2 ${match.winner === 'team1' ? 'opacity-100' : 'opacity-60'}`}>
                                            <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team1' ? 'bg-secondary-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                    {match.team1.map(p => p.name).join(', ')}
                                                    {match.winner === 'team1' && <Trophy size={10} className="text-yellow-500" />}
                                                </div>
                                                <div className="text-[10px] text-slate-500 flex gap-2">
                                                    {match.team1.map(p => renderHeroWithKills(p)).join(' & ')}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Team 2 */}
                                        <div className={`flex items-center gap-2 ${match.winner === 'team2' ? 'opacity-100' : 'opacity-60'}`}>
                                            <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team2' ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                    {match.team2.map(p => p.name).join(', ')}
                                                    {match.winner === 'team2' && <Trophy size={10} className="text-yellow-500" />}
                                                </div>
                                                <div className="text-[10px] text-slate-500 flex gap-2">
                                                    {match.team2.map(p => renderHeroWithKills(p)).join(' & ')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
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
