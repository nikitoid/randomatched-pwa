import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowLeftRight, BarChart3, Check, ChevronDown, Info } from 'lucide-react';
import { Hero, HeroList } from '../../types';
import { RANKS } from '../../constants';
import { BaseModal } from '../common/BaseModal';
import { ConfirmModal } from '../common/ConfirmModal';

export type ListImportMode =
    | 'none'
    | 'text_import'
    | 'text_export'
    | 'rank_import'
    | 'file_import_confirm'
    | 'rank_import_confirm';

interface ListImportExportModalsProps {
    importMode: ListImportMode;
    setImportMode: (mode: ListImportMode) => void;
    importTextValue: string;
    setImportTextValue: (val: string) => void;
    onCopyText: () => void;
    onConfirmTextImport: () => void;
    // Rank import
    rankSourceType: 'list' | 'stats';
    setRankSourceType: (type: 'list' | 'stats') => void;
    rankSourceListId: string;
    setRankSourceListId: (id: string) => void;
    lists: HeroList[];
    editingListId: string | null;
    onConfirmRankImport: () => void;
    statsEligibleHelpers: { eligibleCount: number; total: number };
    // File import confirm
    editorHeroes: Hero[];
    pendingFileHeroes: Hero[] | null;
    onCancelFileImport: () => void;
    onConfirmFileImport: () => void;
    // Balance stats modal
    isStatsModalOpen: boolean;
    onCloseStatsModal: () => void;
}

const getRankBarColor = (rank: string) => {
    if (rank === 'S+') return 'bg-yellow-500 dark:bg-yellow-500';
    if (rank === 'S-') return 'bg-yellow-400 dark:bg-yellow-400';
    if (rank.startsWith('S')) return 'bg-yellow-500 dark:bg-yellow-500';
    if (rank === 'A+') return 'bg-violet-600 dark:bg-violet-600';
    if (rank === 'A-') return 'bg-violet-500 dark:bg-violet-500';
    if (rank.startsWith('A')) return 'bg-violet-600 dark:bg-violet-600';
    if (rank === 'B+') return 'bg-blue-600 dark:bg-blue-600';
    if (rank === 'B-') return 'bg-blue-500 dark:bg-blue-500';
    if (rank.startsWith('B')) return 'bg-blue-600 dark:bg-blue-600';
    if (rank === 'C+') return 'bg-green-600 dark:bg-green-600';
    if (rank === 'C-') return 'bg-green-500 dark:bg-green-500';
    if (rank.startsWith('C')) return 'bg-green-600 dark:bg-green-600';
    if (rank === 'D+') return 'bg-slate-300 dark:bg-slate-200';
    if (rank === 'D-') return 'bg-slate-200 dark:bg-slate-300';
    if (rank.startsWith('D')) return 'bg-slate-300 dark:bg-slate-200';
    if (rank === 'E+') return 'bg-gray-600 dark:bg-gray-500';
    if (rank === 'E-') return 'bg-gray-500 dark:bg-gray-600';
    if (rank.startsWith('E')) return 'bg-gray-600 dark:bg-gray-500';
    return 'bg-slate-200 dark:bg-slate-700';
};

/**
 * Collection of import, export, rank-import, and rank-balance modals for hero lists.
 */
export const ListImportExportModals: React.FC<ListImportExportModalsProps> = ({
    importMode,
    setImportMode,
    importTextValue,
    setImportTextValue,
    onCopyText,
    onConfirmTextImport,
    rankSourceType,
    setRankSourceType,
    rankSourceListId,
    setRankSourceListId,
    lists,
    editingListId,
    onConfirmRankImport,
    statsEligibleHelpers,
    editorHeroes,
    pendingFileHeroes,
    onCancelFileImport,
    onConfirmFileImport,
    isStatsModalOpen,
    onCloseStatsModal
}) => {
    const [isRankSourceDropdownOpen, setIsRankSourceDropdownOpen] = useState(false);
    const [isRankInfoOpen, setIsRankInfoOpen] = useState(false);

    useEffect(() => {
        if (importMode === 'rank_import') {
            setIsRankSourceDropdownOpen(false);
            setIsRankInfoOpen(false);
        }
    }, [importMode]);

    const computeRankStats = () => {
        const counts: Record<string, number> = {};
        let total = 0;
        editorHeroes.forEach(h => {
            if (h.name.trim() !== '' || h.rank !== '') {
                if (h.rank) counts[h.rank] = (counts[h.rank] || 0) + 1;
                total++;
            }
        });
        const max = Math.max(...Object.values(counts), 1);
        return { counts, max, total };
    };

    return (
        <>
            {/* Text Export Modal */}
            <BaseModal
                isOpen={importMode === 'text_export'}
                onClose={() => setImportMode('none')}
                title="Экспорт текста"
                subtitle="Формат: Имя|Ранг (одна строка - один герой)"
                maxWidth="md"
                variant="auto"
                modalId="list-export-modal"
                priority={40}
                showCloseButton={false}
                footer={() => (
                    <div className="flex gap-3 w-full">
                        <button onClick={onCopyText} className="flex-1 py-3 font-bold text-white bg-primary-600 rounded-xl">Копировать</button>
                        <button onClick={() => setImportMode('none')} className="px-6 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Закрыть</button>
                    </div>
                )}
            >
                <textarea value={importTextValue} readOnly className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 select-text" />
            </BaseModal>

            {/* Text Import Modal */}
            <BaseModal
                isOpen={importMode === 'text_import'}
                onClose={() => setImportMode('none')}
                title="Внимание!"
                subtitle="Текущий список героев будет полностью заменен данными из текстового поля."
                icon={<AlertCircle size={20} className="text-orange-500" />}
                maxWidth="md"
                variant="auto"
                modalId="list-import-modal"
                priority={40}
                showCloseButton={false}
                footer={() => (
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button onClick={() => setImportMode('none')} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                        <button onClick={onConfirmTextImport} className="py-3 font-bold text-white bg-orange-500 rounded-xl">Заменить</button>
                    </div>
                )}
            >
                <textarea value={importTextValue} onChange={(e) => setImportTextValue(e.target.value)} placeholder="Вставьте список героев (Имя|Ранг)" className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 select-text" />
            </BaseModal>

            {/* Rank Import Modal */}
            <BaseModal
                isOpen={importMode === 'rank_import'}
                onClose={() => setImportMode('none')}
                title="Импорт рангов"
                icon={<ArrowLeftRight size={20} className="text-violet-600 dark:text-violet-400" />}
                maxWidth="sm"
                variant="auto"
                modalId="rank-import-modal"
                priority={40}
                showCloseButton={false}
                footer={() => (
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button onClick={() => setImportMode('none')} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                        <button
                            onClick={onConfirmRankImport}
                            disabled={rankSourceType === 'list' && !rankSourceListId}
                            className="py-3 font-bold text-white bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                        >
                            Импорт
                        </button>
                    </div>
                )}
            >
                <div>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                        <button
                            onClick={() => setRankSourceType('list')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${rankSourceType === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Из списка
                        </button>
                        <button
                            onClick={() => setRankSourceType('stats')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${rankSourceType === 'stats' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Из статистики
                        </button>
                    </div>

                    {rankSourceType === 'list' ? (
                        <>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6"> Выберите список, из которого нужно скопировать ранги. Если имена совпадут, ранг текущего героя будет обновлен. </p>
                            <div className="mb-6 relative">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Источник</label>
                                <div className="relative">
                                    <button onClick={() => setIsRankSourceDropdownOpen(!isRankSourceDropdownOpen)} className={`w-full p-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl border transition-all outline-none font-medium text-sm ${isRankSourceDropdownOpen ? 'border-violet-500 ring-1 ring-violet-500/20' : 'border-transparent'}`}>
                                        <span className={rankSourceListId ? 'text-slate-900 dark:text-white' : 'text-slate-400'}> {lists.find(l => l.id === rankSourceListId)?.name || "Выберите список..."} </span>
                                        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isRankSourceDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isRankSourceDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsRankSourceDropdownOpen(false)} />
                                            <div className="absolute top-full left-0 mt-2 w-full max-h-48 overflow-y-auto no-scrollbar bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 animate-in fade-in zoom-in-95 duration-200">
                                                {lists.filter(l => l.id !== editingListId).length > 0 ? (
                                                    lists.filter(l => l.id !== editingListId).map(list => (
                                                        <button
                                                            key={list.id}
                                                            onClick={() => { setRankSourceListId(list.id); setIsRankSourceDropdownOpen(false); }}
                                                            className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${rankSourceListId === list.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 active:bg-slate-50 dark:active:bg-slate-700'}`}
                                                        >
                                                            <span className="truncate">{list.name}</span>
                                                            {rankSourceListId === list.id && <Check size={14} className="text-violet-500" />}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-6 text-center text-xs text-slate-400">Нет доступных списков</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    Ранги будут рассчитаны автоматически на основе <strong>винрейта</strong>. <br />
                                    <span className="text-xs text-slate-400 mt-2 block">Минимум 3 матча для получения ранга.</span>
                                </p>
                                <button
                                    onClick={() => setIsRankInfoOpen(!isRankInfoOpen)}
                                    className={`p-2 rounded-xl transition-colors ${isRankInfoOpen ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 active:text-slate-600 dark:active:text-slate-300'}`}
                                >
                                    <Info size={18} />
                                </button>
                            </div>

                            {isRankInfoOpen && (
                                <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                        <div className="flex justify-between px-2 py-1 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-bold"><span>S+</span><span>≥ 80%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-yellow-400/10 text-yellow-600 dark:text-yellow-300 font-bold"><span>S-</span><span>70-79%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-violet-600/10 text-violet-700 dark:text-violet-400 font-bold"><span>A+</span><span>65-69%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-violet-500/10 text-violet-600 dark:text-violet-300 font-bold"><span>A-</span><span>60-64%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-blue-600/10 text-blue-700 dark:text-blue-400 font-bold"><span>B+</span><span>55-59%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold"><span>B-</span><span>50-54%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-green-600/10 text-green-700 dark:text-green-400 font-bold"><span>C+</span><span>45-49%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-300 font-bold"><span>C-</span><span>40-44%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-slate-300/20 text-slate-700 dark:text-slate-300 font-bold"><span>D+</span><span>35-39%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-slate-200/20 text-slate-600 dark:text-slate-400 font-bold"><span>D-</span><span>30-34%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-gray-600/10 text-gray-700 dark:text-gray-400 font-bold"><span>E+</span><span>20-29%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-gray-500/10 text-gray-600 dark:text-gray-500 font-bold"><span>E-</span><span>&lt; 20%</span></div>
                                    </div>
                                </div>
                            )}

                            {!isRankInfoOpen && (
                                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500 dark:text-slate-400">Доступно статистики:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {statsEligibleHelpers.eligibleCount} <span className="text-slate-400 font-normal">/ {statsEligibleHelpers.total}</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                                        <div
                                            className="bg-violet-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${statsEligibleHelpers.total > 0 ? (statsEligibleHelpers.eligibleCount / statsEligibleHelpers.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </BaseModal>

            {/* Rank Import Confirm Modal */}
            <ConfirmModal
                isOpen={importMode === 'rank_import_confirm'}
                onCancel={() => setImportMode('rank_import')}
                onConfirm={onConfirmRankImport}
                title="Неполные данные"
                description={`Статистика доступна не для всех героев. Будут изменены ранги только у ${statsEligibleHelpers.eligibleCount} из ${statsEligibleHelpers.total} героев.`}
                confirmText="Продолжить"
                cancelText="Назад"
                confirmVariant="warning"
                modalId="rank-import-confirm-modal"
                priority={45}
            />

            {/* File Import Confirm Modal */}
            <ConfirmModal
                isOpen={importMode === 'file_import_confirm'}
                onCancel={onCancelFileImport}
                onConfirm={onConfirmFileImport}
                title="Заменить список?"
                description={`Текущие герои (${editorHeroes.length - (editorHeroes.some(h => !h.name) ? 1 : 0)}) будут заменены данными из файла (${pendingFileHeroes?.length}).`}
                confirmText="Заменить"
                cancelText="Отмена"
                confirmVariant="warning"
                modalId="file-import-confirm-modal"
                priority={45}
            />

            {/* Hero Stats Modal (Balance) */}
            <BaseModal
                isOpen={isStatsModalOpen}
                onClose={onCloseStatsModal}
                title="Баланс героев"
                icon={<BarChart3 size={20} className="text-violet-600 dark:text-violet-400" />}
                maxWidth="sm"
                variant="auto"
                modalId="list-stats-modal"
                priority={40}
            >
                <div className="overflow-y-auto no-scrollbar flex-1">
                    {(() => {
                        const { counts, max, total } = computeRankStats();
                        return (
                            <>
                                <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4 text-center"> Всего героев: <span className="text-slate-900 dark:text-white font-bold">{total}</span> </div>
                                {RANKS.map((rank, idx) => {
                                    const count = counts[rank] || 0;
                                    const percent = max > 0 ? (count / max) * 100 : 0;
                                    const colorClass = getRankBarColor(rank);
                                    return (
                                        <div key={rank} className="mb-3 last:mb-0">
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                <span>{rank}</span>
                                                <span>{count}</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass} ${percent === 0 ? 'opacity-0' : 'opacity-100'}`} style={{ width: isStatsModalOpen ? `${percent}%` : '0%', transitionDelay: `${idx * 50}ms` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        );
                    })()}
                </div>
            </BaseModal>
        </>
    );
};
