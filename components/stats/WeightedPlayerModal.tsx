import React from 'react';
import { TrendingUp, BarChart3, HelpCircle } from 'lucide-react';
import { MatchRecord, PlayerStat } from '../../types';
import { getPlayerWeightedBreakdown } from './hooks/useStatsCalculations';
import { BaseModal } from '../common/BaseModal';

interface WeightedPlayerModalProps {
    selection: { player: PlayerStat; focusType: 'wins' | 'matches' } | null;
    onClose: () => void;
    filteredHistory: MatchRecord[];
}

/**
 * Modal showing time-decayed weighted matches and wins breakdown across age buckets.
 */
export const WeightedPlayerModal: React.FC<WeightedPlayerModalProps> = ({
    selection,
    onClose,
    filteredHistory
}) => {
    if (!selection) return null;

    const breakdown = getPlayerWeightedBreakdown(selection.player.name, filteredHistory);
    const rawWinrateNum = breakdown.totalMatches > 0 ? (breakdown.totalWins / breakdown.totalMatches) * 100 : 0;
    const rawWinrateFormatted = rawWinrateNum.toFixed(1);
    const weightedWinrateNum = breakdown.totalWeightedMatches > 0 ? (breakdown.totalWeightedWins / breakdown.totalWeightedMatches) * 100 : 0;
    const weightedWinrateFormatted = weightedWinrateNum.toFixed(1);
    const effScoreFormatted = (selection.player.score * 100).toFixed(1);

    return (
        <BaseModal
            isOpen={!!selection}
            onClose={onClose}
            title={selection.player.name}
            subtitle="Подробный расчёт статистики эффективности"
            icon={<TrendingUp size={20} className="text-emerald-500" />}
            maxWidth="lg"
            variant="auto"
            modalId="weighted-player-modal"
            priority={90}
        >
            <div className="space-y-4">
                {/* 3-Step Summary Banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                        Воронка расчёта рейтинга
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                            <div className="text-[9px] text-slate-400 font-medium">1. Фактический</div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{rawWinrateFormatted}%</div>
                            <div className="text-[9px] text-slate-400">{breakdown.totalWins}/{breakdown.totalMatches} игр</div>
                        </div>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50">
                            <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-medium">2. Взвешенный</div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{weightedWinrateFormatted}%</div>
                            <div className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80">{breakdown.totalWeightedWins}/{breakdown.totalWeightedMatches}</div>
                        </div>
                        <div className="p-2 bg-primary-50 dark:bg-primary-950/40 rounded-xl border border-primary-200/60 dark:border-primary-800/50">
                            <div className="text-[9px] text-primary-700 dark:text-primary-400 font-medium">3. Рейтинг</div>
                            <div className="text-xs font-black text-primary-600 dark:text-primary-400 mt-0.5">{effScoreFormatted}%</div>
                            <div className="text-[9px] text-primary-600/80 dark:text-primary-400/80">Уилсон (80%)</div>
                        </div>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                    <div className={`p-3 rounded-2xl border transition-colors ${selection.focusType === 'matches' ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700' : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50'}`}>
                        <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Матчи (Факт ➔ Взвешенные)</div>
                        <div className="text-base font-black text-slate-900 dark:text-white flex items-baseline gap-1 mt-0.5">
                            <span>{breakdown.totalMatches} игр</span>
                            <span className="text-xs font-normal text-slate-400">➔</span>
                            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{breakdown.totalWeightedMatches}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            Ср. вес игры: <span className="font-semibold text-slate-700 dark:text-slate-300">{breakdown.totalMatches > 0 ? Math.round((breakdown.totalWeightedMatches / breakdown.totalMatches) * 100) : 0}%</span>
                        </div>
                    </div>

                    <div className={`p-3 rounded-2xl border transition-colors ${selection.focusType === 'wins' ? 'bg-emerald-100/70 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600' : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30'}`}>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Победы (Факт ➔ Взвешенные)</div>
                        <div className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1 mt-0.5">
                            <span>{breakdown.totalWins} побед</span>
                            <span className="text-xs font-normal opacity-60">➔</span>
                            <span className="text-sm font-bold">{breakdown.totalWeightedWins}</span>
                        </div>
                        <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                            Винрейт: <span className="font-semibold">{rawWinrateFormatted}%</span> (Рейтинг: <span className="font-bold">{effScoreFormatted}%</span>)
                        </div>
                    </div>
                </div>

                {/* Period breakdown */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 px-0.5">
                        <BarChart3 size={14} className="text-primary-500" />
                        <span>Разбивка сыгранных матчей по периодам</span>
                    </div>

                    <div className="space-y-1.5">
                        {breakdown.periods.map(period => (
                            <div
                                key={period.key}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 flex items-center justify-between text-xs"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-base leading-none">{period.icon}</span>
                                    <div className="min-w-0">
                                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                            {period.label}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            Вес игры: <span className="font-medium text-slate-600 dark:text-slate-300">{period.weightRange}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="font-bold text-slate-900 dark:text-white">
                                        {period.wins} из {period.matches} побед
                                    </div>
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        + {period.weightedWins} побед / + {period.weightedMatches} игр
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Explanatory note */}
                <div className="p-3 bg-primary-50/70 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/30 rounded-2xl text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-primary-700 dark:text-primary-300">
                        <HelpCircle size={13} />
                        <span>Как это работает?</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        Чем свежее матч, тем больше баллов он даёт (от <strong>1.0</strong> за новые игры до <strong>0.5</strong> за игры 6-месячной давности). <strong>Взвешенные победы</strong> — это реальная суммарная ценность побед с учётом их даты.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};
