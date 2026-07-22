import React from 'react';
import { Calendar, ChevronDown, ChevronUp, Settings, AlertCircle } from 'lucide-react';
import { Season } from '../../types';

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
    isDefaultFilterState?: boolean;
    formatPeriodLabel: () => string;
    historyLength: number;
    triggerHaptic: (pattern?: number | number[]) => void;

    // Seasons props
    seasons?: Season[];
    selectedSeasonId?: string;
    onSelectSeason?: (seasonId: string) => void;
    onOpenSeasonsManager?: () => void;
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
    isDefaultFilterState = true,
    formatPeriodLabel,
    historyLength,
    triggerHaptic,

    seasons = [],
    selectedSeasonId = 'all',
    onSelectSeason,
    onOpenSeasonsManager
}) => {
    const isFiltered = !isDefaultFilterState;
    const isInvalidDateRange = Boolean(filterStartDate && filterEndDate && filterEndDate < filterStartDate);

    return (
        <div className="shrink-0 bg-white dark:bg-slate-900 select-none">
            <div
                className="grid transition-all duration-300 ease-in-out transform-gpu will-change-[grid-template-rows]"
                style={{
                    gridTemplateRows: isDateFilterOpen ? '1fr' : '0fr',
                    opacity: isDateFilterOpen ? 1 : 0,
                    pointerEvents: isDateFilterOpen ? 'auto' : 'none'
                }}
            >
                <div className="overflow-hidden">
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/60 space-y-3.5">
                        
                        {/* Seasons Selection Pill Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Сезоны</span>
                                {onOpenSeasonsManager && (
                                    <button
                                        type="button"
                                        onClick={() => { triggerHaptic(10); onOpenSeasonsManager(); }}
                                        className="min-h-[36px] px-3 py-1.5 rounded-xl border border-primary-500/30 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-extrabold text-[11px] flex items-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <Settings size={13} />
                                        <span>Настройка сезонов</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => onSelectSeason && onSelectSeason('all')}
                                    className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                                        selectedSeasonId === 'all'
                                            ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                                            : 'bg-white dark:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    Все время
                                </button>

                                {seasons.map(season => (
                                    <button
                                        key={season.id}
                                        type="button"
                                        data-testid={`season-chip-${season.id}`}
                                        data-season-name={season.name}
                                        onClick={() => onSelectSeason && onSelectSeason(season.id)}
                                        className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                                            selectedSeasonId === season.id
                                                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                                                : 'bg-white dark:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {season.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Manual Date Filter Fields */}
                        <div className="pt-1 space-y-1.5">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Произвольные даты
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">С даты</label>
                                    <input
                                        type="date"
                                        value={filterStartDate}
                                        onChange={(e) => { setFilterStartDate(e.target.value); triggerHaptic(5); }}
                                        className={`w-full min-h-[44px] px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium border outline-none transition-colors text-slate-900 dark:text-white dark:[color-scheme:dark] ${
                                            isInvalidDateRange
                                                ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500'
                                                : 'border-slate-200 dark:border-slate-700 focus:border-primary-500'
                                        }`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">По дату</label>
                                    <input
                                        type="date"
                                        value={filterEndDate}
                                        onChange={(e) => { setFilterEndDate(e.target.value); triggerHaptic(5); }}
                                        className={`w-full min-h-[44px] px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-medium border outline-none transition-colors text-slate-900 dark:text-white dark:[color-scheme:dark] ${
                                            isInvalidDateRange
                                                ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500'
                                                : 'border-slate-200 dark:border-slate-700 focus:border-primary-500'
                                        }`}
                                    />
                                </div>
                            </div>
                            {isInvalidDateRange && (
                                <div className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1.5 pt-0.5 animate-in fade-in duration-150">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>Дата окончания не может быть раньше даты начала</span>
                                </div>
                            )}
                        </div>

                        {/* Presets */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            <button
                                onClick={handlePresetToday}
                                className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center ${filterStartDate === todayStr && filterEndDate === todayStr
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                                    : 'bg-white dark:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700/80 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
                                    }`}
                            >
                                Сегодня
                            </button>
                            <button
                                onClick={handlePresetYesterday}
                                className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center ${filterStartDate === yesterdayStr && filterEndDate === yesterdayStr
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                                    : 'bg-white dark:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700/80 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
                                    }`}
                            >
                                Вчера
                            </button>
                            {historyLength > 0 && (
                                <button
                                    onClick={handlePresetLastEvening}
                                    className={`min-h-[40px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center ${filterStartDate === lastEveningDateStr && filterEndDate === lastEveningDateStr
                                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                                        : 'bg-white dark:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700/80 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
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
