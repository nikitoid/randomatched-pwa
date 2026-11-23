import React, { useState } from 'react';
import { TrendingUp, Sparkles, HelpCircle, ChevronRight, Calculator, ChevronDown } from 'lucide-react';
import { PlayerStat } from '../../types';
import { BaseModal } from '../common/BaseModal';

interface EfficiencyBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    sortedPlayers: PlayerStat[];
    onOpenInfo: () => void;
    onSelectWeightedPlayer: (selection: { player: PlayerStat; focusType: 'wins' | 'matches' }) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Modal displaying step-by-step efficiency calculation funnel for each player.
 */
export const EfficiencyBreakdownModal: React.FC<EfficiencyBreakdownModalProps> = ({
    isOpen,
    onClose,
    sortedPlayers,
    onOpenInfo,
    onSelectWeightedPlayer,
    triggerHaptic
}) => {
    const [expandedPlayerMath, setExpandedPlayerMath] = useState<Record<string, boolean>>({});

    if (!isOpen) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Расшифровка эффективности"
            subtitle="Подробный расчёт рейтинга игроков"
            icon={<TrendingUp size={20} className="text-primary-500" />}
            maxWidth="md"
            variant="auto"
            modalId="stats-efficiency-breakdown-modal"
            priority={80}
            showCloseButton={false}
            footer={(close) => (
                <button
                    onClick={() => { close(); triggerHaptic(10); }}
                    className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-primary-500/20 active:scale-95 min-h-[48px]"
                >
                    Понятно
                </button>
            )}
        >
            <div className="space-y-3">
                {/* Visual Summary Header */}
                <div className="p-3.5 bg-gradient-to-br from-primary-50/80 via-slate-50 to-emerald-50/60 dark:from-primary-950/30 dark:via-slate-800/80 dark:to-emerald-950/20 rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-2.5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-primary-500" />
                            <span>Как рассчитывается рейтинг?</span>
                        </div>
                        <button
                            type="button"
                            data-testid="stats-efficiency-info-btn"
                            onClick={() => {
                                onOpenInfo();
                                triggerHaptic(10);
                            }}
                            className="px-2.5 py-1 text-[11px] font-extrabold rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/20 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                        >
                            <HelpCircle size={12} />
                            <span>Инфо</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                        <div className="p-1.5 bg-white/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-center">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">1. Факты</span>
                            <span className="text-slate-400">Победы / игры</span>
                        </div>
                        <div className="p-1.5 bg-emerald-100/70 dark:bg-emerald-950/60 rounded-xl border-2 border-emerald-400/80 dark:border-emerald-500/70 shadow-sm flex flex-col justify-center">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-0.5">
                                2. Свежесть
                            </span>
                            <span className="text-emerald-700/90 dark:text-emerald-300/90 font-extrabold text-[9px]">Нажмите ниже 👇</span>
                        </div>
                        <div className="p-1.5 bg-primary-50/80 dark:bg-primary-950/40 rounded-xl border border-primary-200/50 dark:border-primary-800/40 flex flex-col justify-center">
                            <span className="font-bold text-primary-700 dark:text-primary-400 block">3. Рейтинг</span>
                            <span className="text-primary-600/80 dark:text-primary-400/80">Защита от случая</span>
                        </div>
                    </div>
                </div>

                {sortedPlayers.map((player, idx) => {
                    const rawWinrateNum = player.matches > 0 ? (player.wins / player.matches) * 100 : 0;
                    const rawWinrateFormatted = rawWinrateNum.toFixed(1);
                    const effScoreNum = player.score * 100;
                    const effScoreFormatted = effScoreNum.toFixed(1);

                    const wWins = player.weightedWins ?? player.wins;
                    const wMatches = player.weightedMatches ?? player.matches;
                    const weightedWinrateNum = wMatches > 0 ? (wWins / wMatches) * 100 : 0;
                    const weightedWinrateFormatted = weightedWinrateNum.toFixed(1);

                    const decayDiff = Number((weightedWinrateNum - rawWinrateNum).toFixed(1));
                    const wilsonDiff = Number((effScoreNum - weightedWinrateNum).toFixed(1));

                    const isMathExpanded = !!expandedPlayerMath[player.name];

                    return (
                        <div key={player.name} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 space-y-3 transition-all shadow-md dark:shadow-slate-950/50 shadow-slate-200/60 ring-1 ring-black/5 dark:ring-white/5">
                            {/* Player Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-bold text-slate-400 shrink-0">#{idx + 1}</span>
                                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{player.name}</span>
                                    {player.isInactive && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-md shrink-0">
                                            Неактивен
                                        </span>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-base font-black text-primary-600 dark:text-primary-400">{effScoreFormatted}%</span>
                                    <span className="text-[9px] text-slate-400 block leading-none font-semibold uppercase tracking-wider">Рейтинг</span>
                                </div>
                            </div>

                            {/* Visual 3-Step Chain */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-0.5">
                                    <span>Воронка расчёта</span>
                                    <span className="text-slate-400 font-normal normal-case">3 шага к рейтингу</span>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 text-center items-stretch">
                                    {/* Step 1: Raw */}
                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex flex-col items-center justify-between min-h-[60px]">
                                        <span className="text-[9px] text-slate-400 font-medium">1. Факты</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 my-0.5">{rawWinrateFormatted}%</span>
                                        <span className="text-[9px] text-slate-400">{player.wins}/{player.matches} игр</span>
                                    </div>

                                    {/* Step 2: Weighted */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSelectWeightedPlayer({ player, focusType: 'wins' });
                                            triggerHaptic(10);
                                        }}
                                        className="bg-gradient-to-b from-emerald-50 to-emerald-100/80 dark:from-emerald-950/70 dark:to-emerald-900/50 hover:from-emerald-100 hover:to-emerald-200/80 dark:hover:from-emerald-900/80 dark:hover:to-emerald-800/60 p-1.5 rounded-xl border-2 border-emerald-400/80 dark:border-emerald-500/70 shadow-sm shadow-emerald-500/10 flex flex-col items-center justify-between min-h-[60px] cursor-pointer active:scale-95 transition-all group relative overflow-hidden"
                                        title="Нажмите для подробного расчёта весов по периодам"
                                    >
                                        <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold">2. Свежесть</span>
                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 my-0.5">{weightedWinrateFormatted}%</span>
                                        <div className="w-full text-[8px] font-extrabold uppercase px-1 py-0.5 bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 rounded flex items-center justify-center gap-0.5 group-hover:bg-emerald-700 transition-colors">
                                            <span>Детали</span>
                                            <ChevronRight size={9} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </button>

                                    {/* Step 3: Wilson */}
                                    <div className="bg-primary-50 dark:bg-primary-950/40 p-2 rounded-xl border border-primary-200/60 dark:border-primary-800/50 flex flex-col items-center justify-between min-h-[60px]">
                                        <span className="text-[9px] text-primary-700 dark:text-primary-400 font-medium">3. Рейтинг</span>
                                        <span className="text-xs font-black text-primary-600 dark:text-primary-400 my-0.5">{effScoreFormatted}%</span>
                                        <span className="text-[9px] text-primary-600/80 dark:text-primary-400/80">Уилсон (80%)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Explanation items */}
                            <div className="space-y-1.5 text-[11px]">
                                <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 leading-snug">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                                        ⏱️ Влияние давности: <span className={decayDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>{decayDiff > 0 ? `+${decayDiff}%` : `${decayDiff}%`}</span>
                                    </span>
                                    {decayDiff < 0
                                        ? `В давних матчах винрейт был выше. С учетом полураспада весов за 6 месяцев недавний винрейт составляет ${weightedWinrateFormatted}%.`
                                        : decayDiff > 0
                                        ? `В недавних матчах игрок выигрывает чаще! Свежие победы поднимают взвешенный винрейт до ${weightedWinrateFormatted}%.`
                                        : `Свежие и старые матчи показывают одинаковую результативность (${weightedWinrateFormatted}%).`}
                                </div>

                                <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 leading-snug">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                                        🛡️ Поправка на объём выборки (Уилсон): <span className="text-slate-500 font-bold">{wilsonDiff > 0 ? `+${wilsonDiff}%` : `${wilsonDiff}%`}</span>
                                    </span>
                                    Защита от случайностей. Для дистанции в {wMatches} взвеш. игр алгоритм гарантирует 80% надежность с результатом не ниже <strong>{effScoreFormatted}%</strong>.
                                </div>
                            </div>

                            {/* Math toggle */}
                            <div className="pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExpandedPlayerMath(prev => ({ ...prev, [player.name]: !prev[player.name] }));
                                        triggerHaptic(10);
                                    }}
                                    className="text-[10px] font-semibold text-slate-400 hover:text-primary-500 flex items-center gap-1 transition-colors active:scale-95"
                                >
                                    <Calculator size={11} />
                                    <span>{isMathExpanded ? 'Скрыть параметры Уилсона' : 'Параметры Уилсона (для гиков)'}</span>
                                    <ChevronDown size={11} className={`transition-transform duration-200 ${isMathExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {isMathExpanded && (
                                    <div className="mt-2 p-2.5 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono space-y-1 overflow-x-auto">
                                        <div className="text-slate-400">// 1. Переменные для подстановки в формулу</div>
                                        <div>p (взвеш. винрейт в долях) = {wWins} / {wMatches} = {(weightedWinrateNum / 100).toFixed(4)}</div>
                                        <div>N (взвеш. объём игр) = {wMatches}</div>
                                        <div>z (константа 80% доверия) = 1.28</div>
                                        <div className="text-slate-400 pt-1">// 2. Формула нижней границы Уилсона</div>
                                        <div className="text-slate-300">Score = (p + z²/2N - z*√(p(1-p)/N + z²/4N²)) / (1 + z²/N)</div>
                                        <div className="text-emerald-400 font-bold pt-0.5">Score = {player.score.toFixed(4)} (в долях 0..1) ➔ {effScoreFormatted}%</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </BaseModal>
    );
};
