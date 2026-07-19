import React from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { MatchRecord } from '../../types';

interface StatsDateFilterProps {
    filterStartDate: string;
    setFilterStartDate: (date: string) => void;
    filterEndDate: string;
    setFilterEndDate: (date: string) => void;
    isDateFilterOpen: boolean;
    setIsDateFilterOpen: (isOpen: boolean) => void;
    todayStr: string;
    yesterdayStr: string;
    lastEveningDateStr: string;
    handlePresetToday: () => void;
    handlePresetYesterday: () => void;
    handlePresetLastEvening: () => void;
    handleResetDateFilter: () => void;
    formatPeriodLabel: () => string;
    historyLength: number;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const StatsDateFilter: React.FC<StatsDateFilterProps> = ({
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    isDateFilterOpen,
    setIsDateFilterOpen,
    todayStr,
    yesterdayStr,
    lastEveningDateStr,
    handlePresetToday,
    handlePresetYesterday,
    handlePresetLastEvening,
    handleResetDateFilter,
    formatPeriodLabel,
    historyLength,
    triggerHaptic
}) => {
    return (
        <div className="border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
            <button
                onClick={() => { setIsDateFilterOpen(!isDateFilterOpen); triggerHaptic(10); }}
                className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors transform-gpu will-change-transform"
            >
                <div className="flex items-center gap-2">
                    <Calendar size={14} className={filterStartDate || filterEndDate ? 'text-primary-500' : 'text-slate-400'} />
                    <span>Период: </span>
                    <span className={filterStartDate || filterEndDate ? 'text-primary-600 dark:text-primary-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'}>
                        {formatPeriodLabel()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {(filterStartDate || filterEndDate) && (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                handleResetDateFilter();
                            }}
                            data-testid="reset-date-filter-btn"
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Сбросить
                        </span>
                    )}
                    {isDateFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </button>

            <div
                className="grid transition-all duration-300 ease-in-out transform-gpu will-change-[grid-template-rows]"
                style={{
                    gridTemplateRows: isDateFilterOpen ? '1fr' : '0fr',
                    opacity: isDateFilterOpen ? 1 : 0,
                    pointerEvents: isDateFilterOpen ? 'auto' : 'none'
                }}
            >
                <div className="overflow-hidden">
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">С даты</label>
                                <input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={(e) => { setFilterStartDate(e.target.value); triggerHaptic(5); }}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white dark:[color-scheme:dark]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">По дату</label>
                                <input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={(e) => { setFilterEndDate(e.target.value); triggerHaptic(5); }}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white dark:[color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                onClick={handlePresetToday}
                                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${filterStartDate === todayStr && filterEndDate === todayStr
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-350'
                                    }`}
                            >
                                Сегодня
                            </button>
                            <button
                                onClick={handlePresetYesterday}
                                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${filterStartDate === yesterdayStr && filterEndDate === yesterdayStr
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-350'
                                    }`}
                            >
                                Вчера
                            </button>
                            {historyLength > 0 && (
                                <button
                                    onClick={handlePresetLastEvening}
                                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${filterStartDate === lastEveningDateStr && filterEndDate === lastEveningDateStr
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-350'
                                        }`}
                                >
                                    Посл. игровой вечер
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
