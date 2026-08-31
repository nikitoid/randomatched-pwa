import React, { useState, useMemo, useEffect } from 'react';
import {
    Merge, Sparkles, Check, ChevronRight, ChevronLeft, AlertCircle, ArrowRight,
    Layers, Edit2, X, Type, SpellCheck, Link2, Search, ArrowDown, EyeOff, RotateCcw, ShieldCheck
} from 'lucide-react';
import { MatchRecord, HeroList } from '../../types';
import { BaseModal } from '../common/BaseModal';
import {
    findDuplicateOrSimilarHeroGroups,
    DuplicateGroup,
    formatPlural,
    getIgnoredMergeGroups,
    addIgnoredMergeGroup,
    removeIgnoredMergeGroup,
    clearAllIgnoredMergeGroups,
    IgnoredMergeGroup
} from '../../utils/heroNormalization';
import { Avatar } from '../common/Avatar';

interface MergeHeroesModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: MatchRecord[];
    lists?: HeroList[];
    onMergeHeroes: (targetName: string, sourceNames: string[]) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const MergeHeroesModal: React.FC<MergeHeroesModalProps> = ({
    isOpen,
    onClose,
    history,
    lists,
    onMergeHeroes,
    triggerHaptic
}) => {
    const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
    const [isExceptionsOpen, setIsExceptionsOpen] = useState(false);
    const [ignoredGroups, setIgnoredGroups] = useState<IgnoredMergeGroup[]>(() => getIgnoredMergeGroups());

    // Carousel & Swipe state
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);

    // Manual merge state
    const [manualTarget, setManualTarget] = useState<string>('');
    const [manualSource, setManualSource] = useState<string>('');
    const [sourceSearch, setSourceSearch] = useState('');
    const [targetSearch, setTargetSearch] = useState('');

    // Extract all unique hero names, match counts & list affiliations from history and hero lists
    const { heroMatchCounts, heroListNames, allHeroNames } = useMemo(() => {
        const counts = new Map<string, number>();
        const listMap = new Map<string, Set<string>>();

        history.forEach(m => {
            [...m.team1, ...m.team2].forEach(p => {
                const name = (p.heroName || '').trim();
                if (name) {
                    counts.set(name, (counts.get(name) || 0) + 1);
                }
            });
        });

        if (lists && lists.length > 0) {
            lists.forEach(l => {
                const listTitle = (l.name || '').trim() || 'Без названия';
                l.heroes.forEach(h => {
                    const name = (h.name || '').trim();
                    if (name) {
                        if (!counts.has(name)) {
                            counts.set(name, 0);
                        }
                        if (!listMap.has(name)) {
                            listMap.set(name, new Set());
                        }
                        listMap.get(name)!.add(listTitle);
                    }
                });
            });
        }

        const names = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
        const listNamesFinal = new Map<string, string[]>();
        listMap.forEach((set, name) => {
            listNamesFinal.set(name, Array.from(set));
        });

        return { heroMatchCounts: counts, heroListNames: listNamesFinal, allHeroNames: names };
    }, [history, lists]);

    // Automatically detect similar / duplicate groups excluding ignored ones
    const duplicateGroups = useMemo(() => {
        return findDuplicateOrSimilarHeroGroups(allHeroNames, ignoredGroups);
    }, [allHeroNames, ignoredGroups]);

    // Keep currentGroupIndex in valid range when duplicateGroups changes
    useEffect(() => {
        if (duplicateGroups.length > 0 && currentGroupIndex >= duplicateGroups.length) {
            setCurrentGroupIndex(Math.max(0, duplicateGroups.length - 1));
        }
    }, [duplicateGroups.length, currentGroupIndex]);

    const handlePrevGroup = () => {
        if (currentGroupIndex > 0) {
            triggerHaptic(8);
            setCurrentGroupIndex(prev => prev - 1);
            setCustomInputGroup(null);
        }
    };

    const handleNextGroup = () => {
        if (currentGroupIndex < duplicateGroups.length - 1) {
            triggerHaptic(8);
            setCurrentGroupIndex(prev => prev + 1);
            setCustomInputGroup(null);
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchEndX(null);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEndX(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (touchStartX === null || touchEndX === null) return;
        const diff = touchStartX - touchEndX;
        if (diff > 45) {
            handleNextGroup();
        } else if (diff < -45) {
            handlePrevGroup();
        }
        setTouchStartX(null);
        setTouchEndX(null);
    };

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

    const handleIgnoreGroup = (group: DuplicateGroup) => {
        triggerHaptic(25);
        const allInGroup = Array.from(new Set([group.primaryName, ...group.duplicateNames]));
        const updated = addIgnoredMergeGroup(allInGroup);
        setIgnoredGroups(updated);
        setCustomInputGroup(null);
    };

    const handleRestoreIgnored = (id: string) => {
        triggerHaptic(20);
        const updated = removeIgnoredMergeGroup(id);
        setIgnoredGroups(updated);
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
                    text: 'Регистр / Союзы',
                    classes: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                };
            case 'typo':
                return {
                    icon: <SpellCheck size={11} className="shrink-0" aria-hidden="true" />,
                    text: 'Опечатка',
                    classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                };
            case 'alias':
                return {
                    icon: <Link2 size={11} className="shrink-0" aria-hidden="true" />,
                    text: 'Синоним',
                    classes: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                };
            default:
                return {
                    icon: <Sparkles size={11} className="shrink-0" aria-hidden="true" />,
                    text: 'Дубликат',
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
        <>
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
                headerActions={
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic(10);
                            setIsExceptionsOpen(true);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer select-none ${ignoredGroups.length > 0
                                ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-700/70 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        title="Исключения из автопоиска"
                        aria-label="Исключения"
                    >
                        <EyeOff size={14} className={ignoredGroups.length > 0 ? "text-amber-500 dark:text-amber-400 shrink-0" : "shrink-0"} />
                        <span className="hidden xs:inline">Исключения</span>
                        {ignoredGroups.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold shadow-xs leading-none shrink-0">
                                {ignoredGroups.length}
                            </span>
                        )}
                    </button>
                }
                footer={(close) => (
                    <button
                        type="button"
                        onClick={close}
                        className="w-full py-3 px-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
                    >
                        Закрыть
                    </button>
                )}
            >
                <div className="space-y-3.5">
                    {/* Segmented Tabs (2 Tabs: Auto & Manual) */}
                    <div className="flex bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 gap-1">
                        <button
                            type="button"
                            onClick={() => { triggerHaptic(10); setActiveTab('auto'); }}
                            className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 min-w-0 cursor-pointer ${activeTab === 'auto'
                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/60 dark:border-slate-800/80'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent'
                                }`}
                        >
                            <Sparkles size={15} className="shrink-0 text-primary-500 dark:text-primary-400" />
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
                            className={`flex-1 py-2.5 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 min-w-0 cursor-pointer ${activeTab === 'manual'
                                ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/60 dark:border-slate-800/80'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent'
                                }`}
                        >
                            <Layers size={15} className="shrink-0 text-primary-500 dark:text-primary-400" />
                            <span className="truncate">Ручное слияние</span>
                        </button>
                    </div>

                    {/* Tab 1: Auto Detection (Carousel Mode) */}
                    {activeTab === 'auto' && (
                        <div className="space-y-3">
                            {duplicateGroups.length === 0 ? (
                                <div className="text-center py-9 px-4 bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                                        <Check size={24} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Дубликатов не обнаружено
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                                        Все имена персонажей в истории матчей уникальны или уже объединены.
                                    </p>
                                    {ignoredGroups.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                triggerHaptic(10);
                                                setIsExceptionsOpen(true);
                                            }}
                                            className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                                        >
                                            <EyeOff size={13} className="shrink-0" />
                                            <span>Скрыто исключений: {ignoredGroups.length}</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Carousel Navigation Header */}
                                    {duplicateGroups.length > 1 && (
                                        <div className="flex items-center justify-between gap-2 px-1 py-0.5 select-none">
                                            <button
                                                type="button"
                                                disabled={currentGroupIndex === 0}
                                                onClick={handlePrevGroup}
                                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all active:scale-90"
                                                aria-label="Предыдущая группа"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    Группа <strong className="text-primary-600 dark:text-primary-400 font-extrabold">{currentGroupIndex + 1}</strong> из {duplicateGroups.length}
                                                </span>
                                                <div className="flex items-center gap-1 ml-1">
                                                    {duplicateGroups.map((_, dotIdx) => (
                                                        <button
                                                            key={dotIdx}
                                                            type="button"
                                                            onClick={() => {
                                                                triggerHaptic(6);
                                                                setCurrentGroupIndex(dotIdx);
                                                                setCustomInputGroup(null);
                                                            }}
                                                            className={`transition-all rounded-full ${dotIdx === currentGroupIndex
                                                                ? 'w-4 h-1.5 bg-primary-500 shadow-xs'
                                                                : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                                                                }`}
                                                            aria-label={`Перейти к группе ${dotIdx + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={currentGroupIndex === duplicateGroups.length - 1}
                                                onClick={handleNextGroup}
                                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all active:scale-90"
                                                aria-label="Следующая группа"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Active Slide Card with Touch Gestures */}
                                    {(() => {
                                        const group = duplicateGroups[currentGroupIndex];
                                        if (!group) return null;

                                        const idx = currentGroupIndex;
                                        const currentTarget = selectedTargets[idx] || group.primaryName;
                                        const allNames = Array.from(new Set([group.primaryName, ...group.duplicateNames]));
                                        const reasonBadge = getReasonBadge(group.reason);
                                        const isCustomActive = customInputGroup === idx;

                                        return (
                                            <div
                                                key={group.primaryName + idx}
                                                onTouchStart={handleTouchStart}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={handleTouchEnd}
                                                className="p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150 h-[305px] flex flex-col justify-between select-none"
                                            >
                                                {/* Header - Strictly single line */}
                                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60 h-[32px] shrink-0">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${reasonBadge.classes} shrink-0`}>
                                                        {reasonBadge.icon}
                                                        <span>{reasonBadge.text}</span>
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0 shrink">
                                                        <span className="shrink-0">Итог:</span>
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-500/10 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 font-extrabold min-w-0">
                                                            <Avatar entityType="hero" entityId={currentTarget} name={currentTarget} size="xs" />
                                                            <span className="truncate max-w-[120px] sm:max-w-[170px]">{currentTarget}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Variants List with interactive selection & fixed height */}
                                                <div className="space-y-2 flex-1 py-1.5 overflow-y-auto no-scrollbar flex flex-col justify-center">
                                                    {allNames.map(variant => {
                                                        const matchCount = heroMatchCounts.get(variant) || 0;
                                                        const inLists = heroListNames.get(variant) || [];
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
                                                                className={`w-full h-[62px] text-left px-3 py-1.5 rounded-xl border flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer shrink-0 ${isPrimary
                                                                    ? 'bg-gradient-to-r from-primary-500/15 via-primary-500/10 to-transparent dark:from-primary-500/25 dark:via-primary-500/15 dark:to-transparent border-primary-500 ring-1 ring-primary-500/20 text-slate-900 dark:text-white font-bold shadow-xs'
                                                                    : 'bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isPrimary
                                                                        ? 'border-primary-600 bg-primary-600 text-white'
                                                                        : 'border-slate-400 dark:border-slate-600'
                                                                        }`}>
                                                                        {isPrimary && <Check size={11} strokeWidth={3} />}
                                                                    </div>
                                                                    <Avatar entityType="hero" entityId={variant} name={variant} size="xs" />
                                                                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                                                                        <div className="flex items-center gap-1.5 min-w-0 h-[18px]">
                                                                            <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{variant}</span>
                                                                            {isPrimary && (
                                                                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-primary-500 text-white uppercase tracking-wider shrink-0 shadow-xs leading-none">
                                                                                    Останется
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium line-clamp-2 leading-tight h-[26px] flex items-center">
                                                                            {inLists.length > 0
                                                                                ? `Список: ${inLists.join(', ')}`
                                                                                : 'Только в истории матчей'
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium whitespace-nowrap self-center">
                                                                    {formatPlural(matchCount, 'матч', 'матча', 'матчей')}
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
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    triggerHaptic(10);
                                                                    setCustomInputGroup(idx);
                                                                    setCustomInputValue(currentTarget);
                                                                }}
                                                                className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 transition-colors px-1.5 py-1 rounded-lg active:scale-95"
                                                            >
                                                                <Edit2 size={12} />
                                                                <span>Своё имя</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleIgnoreGroup(group)}
                                                                className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors px-1.5 py-1 rounded-lg hover:bg-amber-500/10 active:scale-95"
                                                                title="Не объединять и скрыть из автопоиска"
                                                            >
                                                                <EyeOff size={12} className="text-amber-500 shrink-0" />
                                                                <span>Пропустить</span>
                                                            </button>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleMergeGroup(group, idx)}
                                                            className="px-3.5 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                                                        >
                                                            <Merge size={13} />
                                                            <span>Объединить</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
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
                                                {formatPlural(heroMatchCounts.get(manualSource) || 0, 'матч', 'матча', 'матчей')}
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
                                                    {name} — {formatPlural(heroMatchCounts.get(name) || 0, 'матч', 'матча', 'матчей')}
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
                                                {formatPlural(heroMatchCounts.get(manualTarget) || 0, 'матч', 'матча', 'матчей')}
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
                                                    {name} — {formatPlural(heroMatchCounts.get(name) || 0, 'матч', 'матча', 'матчей')}
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
                                            {formatPlural((heroMatchCounts.get(manualSource) || 0) + (heroMatchCounts.get(manualTarget) || 0), 'матч', 'матча', 'матчей')}
                                        </strong>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={!manualTarget || !manualSource || manualTarget === manualSource}
                                onClick={handleManualMergeSubmit}
                                className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-40 disabled:pointer-events-none hover:from-primary-500 hover:to-primary-400 active:from-primary-700 active:to-primary-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-all shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Merge size={16} />
                                <span>Выполнить слияние</span>
                            </button>
                        </div>
                    )}
                </div>
            </BaseModal>

            {/* Modal for Ignored Exceptions */}
            <BaseModal
                isOpen={isExceptionsOpen}
                onClose={() => setIsExceptionsOpen(false)}
                icon={
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                        <EyeOff size={20} />
                    </div>
                }
                title="Исключения автопоиска"
                subtitle="Персонажи, исключённые из автоматического предложения объединения"
                maxWidth="md"
                variant="auto"
                modalId="merge-heroes-exceptions-modal"
                priority={70}
                showCloseButton={false}
                footer={(close) => (
                    <button
                        type="button"
                        onClick={close}
                        className="w-full py-3 px-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
                    >
                        Закрыть
                    </button>
                )}
            >
                <div className="space-y-3 py-1">
                    {ignoredGroups.length === 0 ? (
                        <div className="text-center py-8 px-4 bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                            <div className="w-12 h-12 rounded-2xl bg-slate-500/10 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                                <ShieldCheck size={22} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                Исключений пока нет
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                                Если в автопоиске попадутся персонажи, которых не нужно объединять, нажмите «Пропустить» на карточке, и они появятся здесь.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <EyeOff size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                                        Исключений: <strong className="font-extrabold text-slate-900 dark:text-white">{ignoredGroups.length}</strong>
                                    </span>
                                </div>
                                {ignoredGroups.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            triggerHaptic(30);
                                            clearAllIgnoredMergeGroups();
                                            setIgnoredGroups([]);
                                        }}
                                        className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0 cursor-pointer"
                                    >
                                        Сбросить все
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                                {ignoredGroups.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                            {item.names.map((name, nIdx) => (
                                                <React.Fragment key={name}>
                                                    {nIdx > 0 && <span className="text-[10px] text-slate-400 font-bold">≠</span>}
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                                                        <Avatar entityType="hero" entityId={name} name={name} size="xs" />
                                                        <span className="truncate max-w-[110px]">{name}</span>
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRestoreIgnored(item.id)}
                                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                                            title="Вернуть в автопоиск"
                                        >
                                            <RotateCcw size={12} className="text-primary-500" />
                                            <span>Вернуть</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </BaseModal>
        </>
    );
};

