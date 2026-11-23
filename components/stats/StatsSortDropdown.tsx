import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, BarChart3, ArrowDownAZ, ArrowUpAZ, Skull, Percent, Check } from 'lucide-react';
import { Z_INDEX_BASE } from '../../constants/zIndex';

export type HeroSortOption = 'winrate' | 'matches' | 'az' | 'za' | 'pop';
export type PlayerSortOption = 'efficiency' | 'winrate' | 'matches' | 'kills' | 'killPercent' | 'az' | 'za';

interface SortItem<T extends string> {
    value: T;
    label: string;
    icon: React.ReactNode;
    dividerBefore?: boolean;
}

const HERO_SORT_ITEMS: SortItem<HeroSortOption>[] = [
    { value: 'winrate', label: 'По винрейту', icon: <TrendingUp size={14} /> },
    { value: 'matches', label: 'По популярности', icon: <BarChart3 size={14} /> },
    { value: 'az', label: 'По алфавиту (А-Я)', icon: <ArrowDownAZ size={14} />, dividerBefore: true },
    { value: 'za', label: 'По алфавиту (Я-А)', icon: <ArrowUpAZ size={14} /> }
];

const PLAYER_SORT_ITEMS: SortItem<PlayerSortOption>[] = [
    { value: 'efficiency', label: 'По эффективности', icon: <TrendingUp size={14} /> },
    { value: 'winrate', label: 'По винрейту', icon: <TrendingUp size={14} /> },
    { value: 'matches', label: 'По популярности', icon: <BarChart3 size={14} /> },
    { value: 'kills', label: 'По убийствам', icon: <Skull size={14} /> },
    { value: 'killPercent', label: 'По % убийств', icon: <Percent size={14} /> },
    { value: 'az', label: 'По алфавиту (А-Я)', icon: <ArrowDownAZ size={14} />, dividerBefore: true },
    { value: 'za', label: 'По алфавиту (Я-А)', icon: <ArrowUpAZ size={14} /> }
];

type StatsSortDropdownProps =
    | {
        mode: 'heroes';
        value: HeroSortOption;
        onChange: (value: HeroSortOption) => void;
        triggerHaptic: (pattern?: number | number[]) => void;
    }
    | {
        mode: 'players';
        value: PlayerSortOption;
        onChange: (value: PlayerSortOption) => void;
        triggerHaptic: (pattern?: number | number[]) => void;
    };

/**
 * Portal-based sort dropdown button for Stats Heroes and Players tabs.
 */
export const StatsSortDropdown: React.FC<StatsSortDropdownProps> = (props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

    const renderTriggerIcon = () => {
        if (props.mode === 'heroes') {
            if (props.value === 'winrate') return <TrendingUp size={16} />;
            if (props.value === 'matches' || props.value === 'pop') return <BarChart3 size={16} />;
            if (props.value === 'az') return <ArrowDownAZ size={16} />;
            return <ArrowUpAZ size={16} />;
        }

        if (props.value === 'efficiency' || props.value === 'winrate') return <TrendingUp size={16} />;
        if (props.value === 'matches') return <BarChart3 size={16} />;
        if (props.value === 'kills') return <Skull size={16} />;
        if (props.value === 'killPercent') return <Percent size={16} />;
        if (props.value === 'az') return <ArrowDownAZ size={16} />;
        return <ArrowUpAZ size={16} />;
    };

    const items = props.mode === 'heroes' ? HERO_SORT_ITEMS : PLAYER_SORT_ITEMS;

    return (
        <div className="relative shrink-0">
            <button
                type="button"
                ref={(el) => {
                    if (el && isOpen && !dropdownPosition) {
                        const rect = el.getBoundingClientRect();
                        setDropdownPosition({
                            top: rect.bottom + 8,
                            left: rect.right - 192,
                            width: 192
                        });
                    }
                }}
                onClick={(e) => {
                    if (!isOpen) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropdownPosition({
                            top: rect.bottom + 8,
                            left: rect.right - 192,
                            width: 192
                        });
                    }
                    setIsOpen(!isOpen);
                    props.triggerHaptic(10);
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${isOpen ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                aria-label="Сортировка"
            >
                {renderTriggerIcon()}
            </button>

            {isOpen && dropdownPosition && createPortal(
                <>
                    <div className="fixed inset-0" style={{ zIndex: Z_INDEX_BASE.OVERLAY_BACKDROP }} onClick={() => setIsOpen(false)} />
                    <div
                        className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            zIndex: Z_INDEX_BASE.OVERLAY_POPOVER,
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width
                        }}
                    >
                        {items.map((item) => {
                            const isSelected = props.value === item.value;
                            return (
                                <React.Fragment key={item.value}>
                                    {item.dividerBefore && <div className="h-px bg-slate-100 dark:bg-slate-700 my-0" />}
                                    <button
                                        onClick={() => {
                                            if (props.mode === 'heroes') {
                                                props.onChange(item.value as HeroSortOption);
                                            } else {
                                                props.onChange(item.value as PlayerSortOption);
                                            }
                                            setIsOpen(false);
                                            props.triggerHaptic(10);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${isSelected ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}
                                    >
                                        <span className="flex items-center gap-2">{item.icon} {item.label}</span>
                                        {isSelected && <Check size={14} />}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
