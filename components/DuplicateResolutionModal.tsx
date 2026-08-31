import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, Shield, Layers, X, Edit2 } from 'lucide-react';
import { Hero } from '../types';
import { BaseModal } from './common/BaseModal';
import { DuplicateGroup, normalizeHeroKey, mergeDuplicateHeroList } from '../utils/heroNormalization';
import { RANK_VALUES } from '../constants';

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

    const getReasonLabel = (reason: DuplicateGroup['reason']) => {
        switch (reason) {
            case 'exact_normalized':
                return { text: 'Разный регистр / Ё-Е / Пробелы', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
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
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={20} />
                </div>
            }
            title="Обнаружены дубликаты"
            subtitle="Выберите, какое написание имени сохранить для каждой группы героев"
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
                        className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm active:scale-95 transition-all"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleApplyMerge}
                        className="flex-1 py-3 font-bold text-white bg-primary-600 hover:bg-primary-500 active:bg-primary-700 rounded-xl shadow-lg shadow-primary-600/20 text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Check size={16} />
                        <span>Объединить и сохранить</span>
                    </button>
                </div>
            )}
        >
            <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Нажмите на имя, которое должно остаться в списке. Все остальные варианты будут объединены в него.
                </p>

                <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1 no-scrollbar">
                    {duplicateGroups.map((group, idx) => {
                        const currentTarget = selectedTargets[idx] || group.primaryName;
                        const allNames = Array.from(new Set([group.primaryName, ...group.duplicateNames]));
                        const reasonBadge = getReasonLabel(group.reason);
                        const isCustomActive = customInputGroup === idx;

                        return (
                            <div
                                key={group.primaryName + idx}
                                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2.5"
                            >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${reasonBadge.color}`}>
                                        {reasonBadge.text}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Итоговое: <strong className="text-primary-600 dark:text-primary-400 font-extrabold">{currentTarget}</strong>
                                    </span>
                                </div>

                                {/* Options selection */}
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
                                                className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all active:scale-[0.99] ${
                                                    isSelected
                                                        ? 'bg-primary-50/90 dark:bg-primary-950/40 border-primary-500/80 dark:border-primary-500/80 text-primary-950 dark:text-primary-100 shadow-xs font-bold'
                                                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                        isSelected
                                                            ? 'border-primary-600 bg-primary-600 text-white'
                                                            : 'border-slate-400 dark:border-slate-500'
                                                    }`}>
                                                        {isSelected && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="truncate text-xs">{name}</span>
                                                </div>
                                                {isSelected ? (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary-500 text-white uppercase tracking-wider shrink-0">
                                                        Останется
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                                                        Будет заменено
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom name input or toggle button */}
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
                                    <div className="pt-0.5 flex justify-end">
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
