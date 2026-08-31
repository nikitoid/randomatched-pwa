import React, { useState, useEffect } from 'react';
import { Check, Edit2, X, Sparkles, Type, SpellCheck, Link2, ArrowRight, Layers } from 'lucide-react';
import { Hero } from '../types';
import { BaseModal } from './common/BaseModal';
import { DuplicateGroup, mergeDuplicateHeroList } from '../utils/heroNormalization';
import { Avatar } from './common/Avatar';

interface DuplicateResolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    duplicateGroups: DuplicateGroup[];
    originalHeroes: Hero[];
    onResolve: (resolvedHeroes: Hero[]) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const DuplicateResolutionModal: React.FC<DuplicateResolutionModalProps> = ({
    isOpen,
    onClose,
    duplicateGroups,
    originalHeroes,
    onResolve,
    triggerHaptic
}) => {
    // User-selected target canonical name for each duplicate group
    const [selectedTargets, setSelectedTargets] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        duplicateGroups.forEach((group, idx) => {
            initial[idx] = group.primaryName;
        });
        return initial;
    });

    // Editing a custom name for a specific group
    const [customInputGroup, setCustomInputGroup] = useState<number | null>(null);
    const [customInputValue, setCustomInputValue] = useState('');

    useEffect(() => {
        const next: Record<number, string> = {};
        duplicateGroups.forEach((group, idx) => {
            next[idx] = group.primaryName;
        });
        setSelectedTargets(next);
    }, [duplicateGroups]);

    const handleApplyMerge = () => {
        triggerHaptic(30);

        // Build a map of duplicate keys to chosen primary names
        const duplicateToPrimary: Record<string, string> = {};
        duplicateGroups.forEach((group, idx) => {
            const chosenPrimary = selectedTargets[idx] || group.primaryName;
            const allInGroup = [group.primaryName, ...group.duplicateNames];
            allInGroup.forEach(name => {
                duplicateToPrimary[name] = chosenPrimary;
            });
            duplicateToPrimary[chosenPrimary] = chosenPrimary;
        });

        const cleanList = mergeDuplicateHeroList(originalHeroes, duplicateToPrimary);
        // Append empty row for further editing
        cleanList.push({
            id: `new_${Date.now()}`,
            name: '',
            rank: ''
        });

        onResolve(cleanList);
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

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            icon={
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-primary-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                    <Layers size={20} />
                </div>
            }
            title="Слияние дубликатов"
            subtitle="Выберите основное имя для каждой группы похожих персонажей"
            maxWidth="md"
            variant="auto"
            modalId="duplicate-resolution-modal"
            priority={65}
            showCloseButton={false}
            footer={(close) => (
                <div className="flex gap-3 w-full">
                    <button
                        type="button"
                        onClick={close}
                        className="flex-1 py-3 px-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl text-sm active:scale-95 transition-all"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleApplyMerge}
                        className="flex-1 py-3 px-4 font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 active:from-primary-700 active:to-primary-600 rounded-xl shadow-lg shadow-primary-600/25 text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Check size={16} strokeWidth={2.5} />
                        <span>Объединить</span>
                    </button>
                </div>
            )}
        >
            <div className="space-y-3.5">
                {/* Information Callout Banner */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
                        <Sparkles size={14} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                        Найдено групп: <strong className="text-slate-900 dark:text-white font-extrabold">{duplicateGroups.length}</strong>.
                        {' '}Выберите каноническое написание, чтобы исключить повторения в списке.
                    </p>
                </div>

                {/* Group Cards Container */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                    {duplicateGroups.map((group, idx) => {
                        const currentTarget = selectedTargets[idx] || group.primaryName;
                        const allNames = Array.from(new Set([group.primaryName, ...group.duplicateNames]));
                        const reasonBadge = getReasonBadge(group.reason);
                        const isCustomActive = customInputGroup === idx;

                        return (
                            <div
                                key={group.primaryName + idx}
                                className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2.5 transition-all"
                            >
                                {/* Card Header */}
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

                                {/* Options Selection */}
                                <div className="space-y-1.5 pt-0.5">
                                    {allNames.map((name) => {
                                        const isSelected = name === currentTarget;
                                        return (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => {
                                                    triggerHaptic(15);
                                                    setSelectedTargets(prev => ({ ...prev, [idx]: name }));
                                                    if (customInputGroup === idx) setCustomInputGroup(null);
                                                }}
                                                className={`w-full min-h-[44px] text-left px-3 py-2 rounded-xl border flex items-center justify-between gap-2.5 transition-all active:scale-[0.99] ${
                                                    isSelected
                                                        ? 'bg-gradient-to-r from-primary-500/15 via-primary-500/10 to-transparent dark:from-primary-500/25 dark:via-primary-500/15 dark:to-transparent border-primary-500 ring-1 ring-primary-500/20 text-slate-900 dark:text-white font-bold shadow-xs'
                                                        : 'bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                        isSelected
                                                            ? 'border-primary-600 bg-primary-600 text-white'
                                                            : 'border-slate-400 dark:border-slate-600'
                                                    }`}>
                                                        {isSelected && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <Avatar entityType="hero" entityId={name} name={name} size="xs" />
                                                    <span className="truncate text-xs font-semibold">{name}</span>
                                                </div>

                                                {isSelected ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary-600 text-white shadow-xs shrink-0 uppercase tracking-wider">
                                                        <Check size={10} strokeWidth={3} />
                                                        <span>Останется</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                                                        <ArrowRight size={11} className="opacity-70" />
                                                        <span>Будет заменено</span>
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom Name Editor or Toggle Button */}
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
                                    <div className="pt-0.5 flex justify-end">
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
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </BaseModal>
    );
};

