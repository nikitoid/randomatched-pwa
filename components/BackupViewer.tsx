import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CloudBackup } from '../types';
import { Search, Trophy, Loader2 } from 'lucide-react';
import { BaseModal } from './common/BaseModal';

interface BackupViewerProps {
    backup: CloudBackup;
    onClose: () => void;
    isOpen: boolean;
}

export const BackupViewer: React.FC<BackupViewerProps> = ({ backup, onClose, isOpen }) => {
    const [search, setSearch] = useState('');
    const [visibleMatchesCount, setVisibleMatchesCount] = useState(15);
    const contentContainerRef = useRef<HTMLDivElement>(null);

    const filteredHistory = useMemo(() => {
        if (!search.trim()) return backup.history;
        const lower = search.toLowerCase().trim();
        return backup.history.filter(m => {
            const pNames = [...m.team1, ...m.team2].map(p => p.name.toLowerCase());
            if (pNames.some(n => n.includes(lower))) return true;

            const hNames = [...m.team1, ...m.team2].map(p => p.heroName.toLowerCase());
            if (hNames.some(n => n.includes(lower))) return true;

            const dateStr = new Date(m.timestamp).toLocaleDateString();
            if (dateStr.includes(lower)) return true;

            return false;
        });
    }, [backup.history, search]);

    useEffect(() => {
        setVisibleMatchesCount(15);
    }, [search, isOpen]);

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

    const searchSubHeader = (
        <div className="relative">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск (игрок, герой, дата)..."
                className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-sm border border-slate-200/80 dark:border-slate-700/80 outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 min-h-[48px]"
            />
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Просмотр бэкапа"
            subtitle={`от ${new Date(backup.createdAt).toLocaleString('ru-RU')} • ${backup.matchCount} матчей`}
            maxWidth="2xl"
            variant="auto"
            modalId="backup-viewer"
            priority={70}
            subHeader={searchSubHeader}
            contentRef={contentContainerRef}
            closeButtonTestId="backup-viewer-close-btn"
        >
            <div className="space-y-3 pb-2">
                {matchesToShow.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <p className="text-sm font-medium">Матчи не найдены</p>
                    </div>
                ) : (
                    matchesToShow.map(m => (
                        <div key={m.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                                <span>{new Date(m.timestamp).toLocaleString('ru-RU')}</span>
                                {m.winner && (
                                    <span className="text-amber-500 flex items-center gap-1">
                                        <Trophy size={14} /> Победа {m.winner === 'team1' ? 'Команды 1' : 'Команды 2'}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <div className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Команда 1</div>
                                    <div className="space-y-1">
                                        {m.team1.map((p, idx) => (
                                            <div key={p.heroId + p.name + idx} className="text-slate-600 dark:text-slate-400 truncate">
                                                <strong>{p.name}</strong> — {p.heroName}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Команда 2</div>
                                    <div className="space-y-1">
                                        {m.team2.map((p, idx) => (
                                            <div key={p.heroId + p.name + idx} className="text-slate-600 dark:text-slate-400 truncate">
                                                <strong>{p.name}</strong> — {p.heroName}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {hasMoreMatches && (
                    <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-xs font-medium">Загрузка ещё...</span>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};
