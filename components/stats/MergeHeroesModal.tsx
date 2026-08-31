import React, { useState, useMemo, useEffect } from 'react';
import { 
    Merge, Sparkles, Check, ChevronRight, AlertCircle, ArrowRight, 
    Layers, Edit2, X, Type, SpellCheck, Link2, Search, ArrowDown
} from 'lucide-react';
import { MatchRecord } from '../../types';
import { BaseModal } from '../common/BaseModal';
import { findDuplicateOrSimilarHeroGroups, DuplicateGroup } from '../../utils/heroNormalization';
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
    const [sourceSearch, setSourceSearch] = useState('');
    const [targetSearch, setTargetSearch] = useState('');

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

    const getReasonBadge = (reason: DuplicateGroup['reason']) => {
        switch (reason) {
            case 'exact_normalized':
                return {
                    icon: <Type size={11} className="shrink-0" aria-hidden="true" />,
                    text: 'Регистр / Ё / Пробелы',
                    classes: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                };
            case 'typo':
                return {
                    icon: <SpellCheck size={11} className="shrink-0" aria-hidden="true" />,
                    text: 'Похоже на опечатку',
                    classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                };
            case 'alias':
                return {
                    icon: <Link2 size={11} className="shrink-0" aria-hidden="true" />,
                    text: 'Известный синоним',
                    classes: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                };
            default:
                return {
                    icon: <Sparkles size={11} className="shrink-0" aria-hidden="true" />,
                    text: 'Похожие имена',
                    classes: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20'
                };
        }
    };

    // Filtered heroes for manual merge
    const filteredSourceHeroes = useMemo(() => {
        if (!sourceSearch.trim()) return allHeroNames;
        const q = sourceSearch.toLowerCase().trim();
        return allHeroNames.filter(n => n.toLowerCase().includes(q));
    }, [allHeroNames, sourceSearch]);

    const filteredTargetHeroes = useMemo(() => {
        const available = allHeroNames.filter(n => n !== manualSource);
        if (!targetSearch.trim()) return available;
        const q = targetSearch.toLowerCase().trim();
        return available.filter(n => n.toLowerCase().includes(q));
    }, [allHeroNames, manualSource, targetSearch]);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            icon={
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary-500/20 to-indigo-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/20 shadow-xs">
                    <Merge size={20} />
                </div>
            }
            title="Объединение героев"
            subtitle="Исправление дубликатов и сквозное слияние статистики матчей"
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
                        className="flex-1 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl text-sm active:scale-95 transition-all"
                    >
                        Закрыть
                    </button>
                    {activeTab === 'auto' && duplicateGroups.length > 1 && (
                        <button
                            type="button"
                            onClick={handleMergeAllGroups}
                            className="flex-1 py-3 px-4 font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 active:from-primary-700 active:to-primary-600 rounded-xl shadow-lg shadow-primary-600/25 text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles size={16} />
                            <span>Объединить все ({duplicateGroups.length})</span>
                        </button>
                    )}
                </div>
            )}
        >
            <div className="space-y-4">
                {/* Modern Segmented Tabs */}
                <div className="flex bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 gap-1">
                    <button
                        type="button"
                        onClick={() => { triggerHaptic(10); setActiveTab('auto'); }}
                        className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                            activeTab === 'auto'
                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/60 dark:border-slate-800/80'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent'
                        }`}
                    >
                        <Sparkles size={14} className="shrink-0 text-primary-500 dark:text-primary-400" />
                        <span className="truncate">Автопоиск</span>
                        {duplicateGroups.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-500 text-white font-extrabold shadow-xs shrink-0 leading-none">
                                {duplicateGroups.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => { triggerHaptic(10); setActiveTab('manual'); }}
                        className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                            activeTab === 'manual'
                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/60 dark:border-slate-800/80'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent'
                        }`}
                    >
                        <Layers size={14} className="shrink-0 text-primary-500 dark:text-primary-400" />
                        <span className="truncate">Ручное слияние</span>
                    </button>
                </div>

                {/* Tab 1: Auto Detection */}
                {activeTab === 'auto' && (
                    <div className="space-y-3">
                        {duplicateGroups.length === 0 ? (
                            <div className="text-center py-10 px-4 bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                                    <Check size={24} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Дубликатов не обнаружено
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                                    Все имена персонажей в истории матчей уникальны или уже объединены.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Info Banner */}
                                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
                                        <Sparkles size={14} />
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                                        Найдено групп похожих героев: <strong className="text-slate-900 dark:text-white font-extrabold">{duplicateGroups.length}</strong>.
                                        {' '}При слиянии матчи и записи во всех списках будут объединены в выбранное имя.
                                    </p>
                                </div>

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                                    {duplicateGroups.map((group, idx) => {
                                        const currentTarget = selectedTargets[idx] || group.primaryName;
                                        const allNames = Array.from(new Set([group.primaryName, ...group.duplicateNames]));
                                        const reasonBadge = getReasonBadge(group.reason);
                                        const isCustomActive = customInputGroup === idx;

                                        return (
                                            <div
                                                key={group.primaryName + idx}
                                                className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3 transition-all"
                                            >
                                                {/* Header */}
                                                <div className="flex items-center justify-between gap-2 flex-wrap pb-0.5 border-b border-slate-100 dark:border-slate-800/60">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${reasonBadge.classes}`}>
                                                        {reasonBadge.icon}
                                                        <span>{reasonBadge.text}</span>
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                        <span>Итог:</span>
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-500/10 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 font-extrabold">
                                                            <Avatar entityType="hero" entityId={currentTarget} name={currentTarget} size="xs" />
                                                            <span className="truncate max-w-[120px]">{currentTarget}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Variants List with interactive selection */}
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
                                                                className={`w-full min-h-[44px] text-left px-3 py-2 rounded-xl border flex items-center justify-between gap-2.5 transition-all active:scale-[0.99] ${
                                                                    isPrimary
                                                                        ? 'bg-gradient-to-r from-primary-500/15 via-primary-500/10 to-transparent dark:from-primary-500/25 dark:via-primary-500/15 dark:to-transparent border-primary-500 ring-1 ring-primary-500/20 text-slate-900 dark:text-white font-bold shadow-xs'
                                                                        : 'bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                                        isPrimary
                                                                            ? 'border-primary-600 bg-primary-600 text-white'
                                                                            : 'border-slate-400 dark:border-slate-600'
                                                                    }`}>
                                                                        {isPrimary && <Check size={11} strokeWidth={3} />}
                                                                    </div>
                                                                    <Avatar entityType="hero" entityId={variant} name={variant} size="xs" />
                                                                    <span className="truncate text-xs font-semibold">{variant}</span>
                                                                    {isPrimary && (
                                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-primary-500 text-white uppercase tracking-wider shrink-0 shadow-xs">
                                                                            Останется
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                                                                    {matchCount} {matchCount === 1 ? 'матч' : matchCount < 5 ? 'матча' : 'матчей'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Custom Name Editor or Action Row */}
                                                {isCustomActive ? (
                                                    <div className="flex items-center gap-2 pt-1 animate-in fade-in zoom-in-95 duration-150">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={customInputValue}
                                                            onChange={(e) => setCustomInputValue(e.target.value)}
                                                            placeholder="Введите правильное имя героя..."
                                                            className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none text-slate-900 dark:text-white transition-all"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (customInputValue.trim()) {
                                                                        triggerHaptic(20);
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
                                                                    triggerHaptic(20);
                                                                    setSelectedTargets(prev => ({ ...prev, [idx]: customInputValue.trim() }));
                                                                }
                                                                setCustomInputGroup(null);
                                                            }}
                                                            className="px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs"
                                                        >
                                                            Применить
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomInputGroup(null)}
                                                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                triggerHaptic(10);
                                                                setCustomInputGroup(idx);
                                                                setCustomInputValue(currentTarget);
                                                            }}
                                                            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1.5 transition-colors px-1 py-0.5 rounded-lg active:scale-95"
                                                        >
                                                            <Edit2 size={12} />
                                                            <span>Ввести кастомное имя</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleMergeGroup(group, idx)}
                                                            className="px-3.5 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                                                        >
                                                            <Merge size={13} />
                                                            <span>Объединить в «{currentTarget}»</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Tab 2: Manual Merge */}
                {activeTab === 'manual' && (
                    <div className="space-y-4 py-1">
                        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
                                <Layers size={14} />
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                                Выберите исходного героя (чьи матчи перенесутся) и целевого персонажа (в которого они войдут).
                            </p>
                        </div>

                        {/* Selectors */}
                        <div className="space-y-3">
                            {/* Source Selection */}
                            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                        <span>1. Кого объединить (удаляемое имя):</span>
                                    </label>
                                    {manualSource && (
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {heroMatchCounts.get(manualSource) || 0} матчей
                                        </span>
                                    )}
                                </div>

                                <div className="relative">
                                    <select
                                        value={manualSource}
                                        onChange={e => {
                                            triggerHaptic(10);
                                            setManualSource(e.target.value);
                                        }}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-900 dark:text-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Выберите исходного героя...</option>
                                        {allHeroNames.map(name => (
                                            <option key={'src_' + name} value={name}>
                                                {name} — {heroMatchCounts.get(name) || 0} {heroMatchCounts.get(name) === 1 ? 'матч' : 'матчей'}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ArrowDown size={14} />
                                    </div>
                                </div>
                            </div>

                            {/* Arrow Divider */}
                            <div className="flex justify-center -my-1">
                                <div className="p-2 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 shadow-xs">
                                    <ArrowDown size={16} />
                                </div>
                            </div>

                            {/* Target Selection */}
                            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                        <span>2. В кого объединить (останется в истории):</span>
                                    </label>
                                    {manualTarget && (
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {heroMatchCounts.get(manualTarget) || 0} матчей
                                        </span>
                                    )}
                                </div>

                                <div className="relative">
                                    <select
                                        value={manualTarget}
                                        onChange={e => {
                                            triggerHaptic(10);
                                            setManualTarget(e.target.value);
                                        }}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-900 dark:text-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Выберите целевого героя...</option>
                                        {allHeroNames.filter(n => n !== manualSource).map(name => (
                                            <option key={'tgt_' + name} value={name}>
                                                {name} — {heroMatchCounts.get(name) || 0} {heroMatchCounts.get(name) === 1 ? 'матч' : 'матчей'}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ArrowDown size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Merge Preview Card */}
                        {manualSource && manualTarget && manualSource !== manualTarget && (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-primary-500/10 via-slate-50 to-emerald-500/10 dark:from-primary-950/30 dark:via-slate-900/60 dark:to-emerald-950/30 border border-primary-500/30 shadow-xs space-y-2 animate-in fade-in duration-200">
                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                    Предпросмотр результата:
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Avatar entityType="hero" entityId={manualSource} name={manualSource} size="xs" />
                                        <span className="text-xs text-slate-500 dark:text-slate-400 line-through truncate max-w-[90px]">
                                            {manualSource}
                                        </span>
                                    </div>
                                    <ArrowRight size={14} className="text-primary-500 shrink-0" />
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Avatar entityType="hero" entityId={manualTarget} name={manualTarget} size="xs" />
                                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[90px]">
                                            {manualTarget}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between font-medium">
                                    <span>Итого матчей:</span>
                                    <strong className="text-primary-600 dark:text-primary-400 font-extrabold">
                                        {(heroMatchCounts.get(manualSource) || 0) + (heroMatchCounts.get(manualTarget) || 0)} матчей
                                    </strong>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            disabled={!manualTarget || !manualSource || manualTarget === manualSource}
                            onClick={handleManualMergeSubmit}
                            className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-40 disabled:pointer-events-none hover:from-primary-500 hover:to-primary-400 active:from-primary-700 active:to-primary-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-all shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2"
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

