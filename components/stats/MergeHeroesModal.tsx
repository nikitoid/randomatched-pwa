import React, { useState, useMemo, useEffect } from 'react';
import { Merge, Sparkles, Check, ChevronRight, AlertCircle, ArrowRight, Shield, Layers, HelpCircle, Edit2, X } from 'lucide-react';
import { MatchRecord } from '../../types';
import { BaseModal } from '../common/BaseModal';
import { findDuplicateOrSimilarHeroGroups, DuplicateGroup, normalizeHeroKey } from '../../utils/heroNormalization';
import { Avatar } from '../common/Avatar';

interface MergeHeroesModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: MatchRecord[];
    onMergeHeroes: (targetName: string, sourceNames: string[]) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const MergeHeroesModal: React.FC<MergeHeroesModalProps> = ({
    isOpen,
    onClose,
    history,
    onMergeHeroes,
    triggerHaptic
}) => {
    const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');

    // Manual merge state
    const [manualTarget, setManualTarget] = useState<string>('');
    const [manualSource, setManualSource] = useState<string>('');

    // Extract all unique hero names & match counts from history
    const { heroMatchCounts, allHeroNames } = useMemo(() => {
        const counts = new Map<string, number>();
        history.forEach(m => {
            [...m.team1, ...m.team2].forEach(p => {
                const name = (p.heroName || '').trim();
                if (name) {
                    counts.set(name, (counts.get(name) || 0) + 1);
                }
            });
        });

        const names = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
        return { heroMatchCounts: counts, allHeroNames: names };
    }, [history]);

    // Automatically detect similar / duplicate groups
    const duplicateGroups = useMemo(() => {
        return findDuplicateOrSimilarHeroGroups(allHeroNames);
    }, [allHeroNames]);

    // User-selected target name for each group
    const [selectedTargets, setSelectedTargets] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        duplicateGroups.forEach((group, idx) => {
            initial[idx] = group.primaryName;
        });
        return initial;
    });

    // Custom name editing state
    const [customInputGroup, setCustomInputGroup] = useState<number | null>(null);
    const [customInputValue, setCustomInputValue] = useState('');

    useEffect(() => {
        const next: Record<number, string> = {};
        duplicateGroups.forEach((group, idx) => {
            next[idx] = group.primaryName;
        });
        setSelectedTargets(next);
    }, [duplicateGroups]);

    const handleMergeGroup = (group: DuplicateGroup, idx: number) => {
        triggerHaptic(30);
        const primary = selectedTargets[idx] || group.primaryName;
        const allInGroup = [group.primaryName, ...group.duplicateNames];
        const sources = allInGroup.filter(name => name !== primary);
        onMergeHeroes(primary, sources);
    };

    const handleMergeAllGroups = () => {
        triggerHaptic(50);
        duplicateGroups.forEach((group, idx) => {
            const primary = selectedTargets[idx] || group.primaryName;
            const allInGroup = [group.primaryName, ...group.duplicateNames];
            const sources = allInGroup.filter(name => name !== primary);
            onMergeHeroes(primary, sources);
        });
        onClose();
    };

    const handleManualMergeSubmit = () => {
        if (!manualTarget || !manualSource || manualTarget === manualSource) return;
        triggerHaptic(30);
        onMergeHeroes(manualTarget, [manualSource]);
        setManualSource('');
    };

    const getReasonLabel = (reason: DuplicateGroup['reason']) => {
        switch (reason) {
            case 'exact_normalized':
                return { text: 'Регистр / Ё / Пробелы', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
            case 'typo':
                return { text: 'Похоже на опечатку', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
            case 'alias':
                return { text: 'Известный синоним', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
            default:
                return { text: 'Дубликат', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            icon={
                <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
                    <Merge size={20} />
                </div>
            }
            title="Объединение героев"
            subtitle="Исправление опечаток и склейка дубликатов в истории матчей"
            maxWidth="lg"
            variant="auto"
            modalId="merge-heroes-modal"
            priority={60}
            showCloseButton={false}
            footer={(close) => (
                <div className="flex gap-3 w-full">
                    <button
                        type="button"
                        onClick={close}
                        className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm active:scale-95 transition-all"
                    >
                        Закрыть
                    </button>
                    {activeTab === 'auto' && duplicateGroups.length > 1 && (
                        <button
                            type="button"
                            onClick={handleMergeAllGroups}
                            className="flex-1 py-3 font-bold text-white bg-primary-600 hover:bg-primary-500 active:bg-primary-700 rounded-xl shadow-lg shadow-primary-600/20 text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles size={16} />
                            <span>Объединить все ({duplicateGroups.length})</span>
                        </button>
                    )}
                </div>
            )}
        >
            <div className="space-y-4">
                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => { triggerHaptic(10); setActiveTab('auto'); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'auto'
                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Sparkles size={14} />
                        <span>Автопоиск дубликатов</span>
                        {duplicateGroups.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-500 text-white font-extrabold ml-1">
                                {duplicateGroups.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => { triggerHaptic(10); setActiveTab('manual'); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'manual'
                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <Layers size={14} />
                        <span>Ручное слияние</span>
                    </button>
                </div>

                {/* Tab 1: Auto Detection */}
                {activeTab === 'auto' && (
                    <div className="space-y-3">
                        {duplicateGroups.length === 0 ? (
                            <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-150 dark:border-slate-800">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                                    <Check size={24} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Дубликатов не обнаружено
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                                    Все имена героев в истории матчей уникальны или уже нормализованы алгоритмом.
                                </p>
                            </div>
                        ) : (
                            duplicateGroups.map((group, idx) => {
                                const currentTarget = selectedTargets[idx] || group.primaryName;
                                const allNames = Array.from(new Set([group.primaryName, ...group.duplicateNames]));
                                const reasonBadge = getReasonLabel(group.reason);
                                const isCustomActive = customInputGroup === idx;

                                return (
                                    <div
                                        key={group.primaryName + idx}
                                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${reasonBadge.color}`}>
                                                {reasonBadge.text}
                                            </span>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Итоговое: <strong className="text-primary-600 dark:text-primary-400 font-extrabold">{currentTarget}</strong>
                                            </span>
                                        </div>

                                        {/* Variants list with interactive selection */}
                                        <div className="space-y-1.5">
                                            {allNames.map(variant => {
                                                const matchCount = heroMatchCounts.get(variant) || 0;
                                                const isPrimary = variant === currentTarget;

                                                return (
                                                    <button
                                                        key={variant}
                                                        type="button"
                                                        onClick={() => {
                                                            triggerHaptic(15);
                                                            setSelectedTargets(prev => ({ ...prev, [idx]: variant }));
                                                            if (customInputGroup === idx) setCustomInputGroup(null);
                                                        }}
                                                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all active:scale-[0.99] ${
                                                            isPrimary
                                                                ? 'bg-primary-50/90 dark:bg-primary-950/40 border-primary-500/80 dark:border-primary-500/80 font-bold text-primary-950 dark:text-primary-100 shadow-xs'
                                                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <Avatar entityType="hero" entityId={variant} name={variant} size="xs" />
                                                            <span className="truncate text-xs">{variant}</span>
                                                            {isPrimary && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary-500 text-white uppercase tracking-wider shrink-0">
                                                                    Останется
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-slate-400 shrink-0">
                                                            {matchCount} {matchCount === 1 ? 'матч' : matchCount < 5 ? 'матча' : 'матчей'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Custom name input */}
                                        {isCustomActive ? (
                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    value={customInputValue}
                                                    onChange={(e) => setCustomInputValue(e.target.value)}
                                                    placeholder="Введите правильное имя героя..."
                                                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-primary-500 outline-none text-slate-900 dark:text-white"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (customInputValue.trim()) {
                                                                setSelectedTargets(prev => ({ ...prev, [idx]: customInputValue.trim() }));
                                                                setCustomInputGroup(null);
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (customInputValue.trim()) {
                                                            setSelectedTargets(prev => ({ ...prev, [idx]: customInputValue.trim() }));
                                                        }
                                                        setCustomInputGroup(null);
                                                    }}
                                                    className="px-3 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                                                >
                                                    OK
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomInputGroup(null)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomInputGroup(idx);
                                                        setCustomInputValue(currentTarget);
                                                    }}
                                                    className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 transition-colors"
                                                >
                                                    <Edit2 size={12} />
                                                    <span>Ввести свое имя</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleMergeGroup(group, idx)}
                                                    className="px-3.5 py-2 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                                                >
                                                    <Merge size={13} />
                                                    <span>Объединить в «{currentTarget}»</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Tab 2: Manual Merge */}
                {activeTab === 'manual' && (
                    <div className="space-y-4 py-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Выберите исходного героя, чьи матчи нужно перенести, и целевое имя, в которое они объединятся.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">
                                    1. Кого объединить (удаляемое имя из истории):
                                </label>
                                <select
                                    value={manualSource}
                                    onChange={e => setManualSource(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500 text-slate-900 dark:text-white"
                                >
                                    <option value="">Выберите героя...</option>
                                    {allHeroNames.map(name => (
                                        <option key={'src_' + name} value={name}>
                                            {name} ({heroMatchCounts.get(name) || 0} матчей)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-center">
                                <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                                    <ArrowRight size={16} className="rotate-90 sm:rotate-0" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">
                                    2. В кого объединить (останется в истории):
                                </label>
                                <select
                                    value={manualTarget}
                                    onChange={e => setManualTarget(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500 text-slate-900 dark:text-white"
                                >
                                    <option value="">Выберите героя...</option>
                                    {allHeroNames.filter(n => n !== manualSource).map(name => (
                                        <option key={'tgt_' + name} value={name}>
                                            {name} ({heroMatchCounts.get(name) || 0} матчей)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={!manualTarget || !manualSource || manualTarget === manualSource}
                            onClick={handleManualMergeSubmit}
                            className="w-full py-3 bg-primary-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-primary-500 active:bg-primary-700 text-white font-bold rounded-xl text-sm active:scale-95 transition-all shadow-md shadow-primary-600/20 flex items-center justify-center gap-2"
                        >
                            <Merge size={16} />
                            <span>Выполнить слияние</span>
                        </button>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};
