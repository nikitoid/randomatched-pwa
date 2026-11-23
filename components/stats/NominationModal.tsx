import React from 'react';
import { Star, Skull, Flame, Swords, Crown } from 'lucide-react';
import { PlayerStat } from '../../types';
import { BaseModal } from '../common/BaseModal';

export type NominationType = 'mvp' | 'underdog' | 'streak' | 'seriesKills' | 'totalKills';

interface NominationModalProps {
    activeNomination: NominationType | null;
    onClose: () => void;
    mvp: PlayerStat | null;
    underdog: PlayerStat | null;
    bestStreakPlayer: { name: string; streak: number } | null;
    topKillsSeriesPlayer: { name: string; record: number } | null;
    topTotalKillers: Array<{ name: string; total: number }>;
    streakStats: Record<string, {
        current: number;
        max: number;
        lastStreakMatchIndex: number;
        loseStreak: number;
        lastLoseStreakMatchIndex: number;
    }>;
    mvpCandidates: PlayerStat[];
    underdogCandidates: PlayerStat[];
    streakCandidates: Array<{ name: string; streak: number }>;
    seriesKillsCandidates: Array<{ name: string; record: number }>;
    totalKillsCandidates: Array<{ name: string; total: number }>;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Modal displaying criteria and candidate rankings for overview player nominations.
 */
export const NominationModal: React.FC<NominationModalProps> = ({
    activeNomination,
    onClose,
    mvp,
    underdog,
    bestStreakPlayer,
    topKillsSeriesPlayer,
    topTotalKillers,
    streakStats,
    mvpCandidates,
    underdogCandidates,
    streakCandidates,
    seriesKillsCandidates,
    totalKillsCandidates,
    triggerHaptic
}) => {
    if (!activeNomination) return null;

    return (
        <BaseModal
            isOpen={!!activeNomination}
            onClose={onClose}
            title={
                activeNomination === 'mvp' ? 'Самый ценный игрок (MVP)' :
                activeNomination === 'underdog' ? 'Андердог (Underdog)' :
                activeNomination === 'streak' ? 'В огне (Серия побед)' :
                activeNomination === 'seriesKills' ? 'Рекорд за встречу' :
                'Король убийств'
            }
            icon={
                activeNomination === 'mvp' ? <Star size={20} fill="currentColor" className="text-yellow-500" /> :
                activeNomination === 'underdog' ? <Skull size={20} className="text-red-500" /> :
                activeNomination === 'streak' ? <Flame size={20} className="text-orange-500" /> :
                activeNomination === 'seriesKills' ? <Swords size={20} className="text-rose-500" /> :
                <Crown size={20} className="text-yellow-600 dark:text-yellow-500" />
            }
            maxWidth="md"
            variant="auto"
            modalId="nomination-modal"
            priority={80}
            showCloseButton={false}
            footer={(close) => (
                <button
                    onClick={() => { close(); triggerHaptic(10); }}
                    className={`w-full py-3.5 text-white font-bold text-sm sm:text-base rounded-2xl transition-all shadow-lg active:scale-95 min-h-[48px] ${
                        activeNomination === 'mvp' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' :
                        activeNomination === 'underdog' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' :
                        activeNomination === 'streak' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' :
                        activeNomination === 'seriesKills' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' :
                        'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    }`}
                >
                    Понятно
                </button>
            )}
        >
            <div className="space-y-4 text-sm">
                <p className="text-slate-650 dark:text-slate-400 leading-relaxed">
                    {activeNomination === 'mvp' &&
                        'MVP — это наиболее эффективный игрок, определяемый на основе метода Уилсона (Wilson Score Interval). Данный метод рассчитывает нижнюю границу рейтинга с 95% надежностью, учитывая винрейт, количество матчей и затухание по времени.'
                    }
                    {activeNomination === 'underdog' &&
                        'Underdog — номинация для игрока, который переживает полосу неудач или имеет наименьшую эффективность. В первую очередь номинируется игрок с наибольшей активной серией поражений (от 3-х матчей). Если таких серий нет, номинируется игрок с худшим винрейтом (требуется минимум 3 матча).'
                    }
                    {activeNomination === 'streak' &&
                        'В огне — это игрок с лучшей активной серией побед на данный момент (требуется минимум 3 победы подряд). При равенстве серий приоритет отдается тому, кто сыграл свой победный матч позже остальных.'
                    }
                    {activeNomination === 'seriesKills' &&
                        'Рекорд за встречу — это наибольшее количество убийств, совершенное игроком за одну игровую сессию. Сессией считается череда матчей с интервалом между ними не более 6 часов.'
                    }
                    {activeNomination === 'totalKills' &&
                        'Король убийств — это игрок, совершивший наибольшее суммарное количество убийств за все матчи в выбранном периоде времени.'
                    }
                </p>

                {/* Список кандидатов */}
                <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {activeNomination === 'underdog' ? 'Очередь кандидатов (Underdog внизу)' : 'Претенденты на номинацию'}
                    </h4>

                    {activeNomination === 'mvp' && (
                        <div className="space-y-2">
                            {mvpCandidates.map((player, idx) => {
                                const isHighlighted = mvp?.name === player.name;
                                return (
                                    <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-yellow-500/10 border-yellow-500/30 dark:border-yellow-500/20 text-yellow-950 dark:text-yellow-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-yellow-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{idx + 1}</span>
                                            <span className="truncate">{player.name}</span>
                                        </div>
                                        <div className="text-xs">
                                            <span>{Math.round((player.wins / player.matches) * 100)}% </span>
                                            <span className="text-[10px] opacity-60">({player.wins}/{player.matches} игр)</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {mvpCandidates.length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-2">Нет подходящих игроков</div>
                            )}
                        </div>
                    )}

                    {activeNomination === 'underdog' && (
                        <div className="space-y-2">
                            {(() => {
                                const reversedList = [...underdogCandidates].reverse();
                                return reversedList.map((player, idx) => {
                                    const originalIndex = underdogCandidates.findIndex(p => p.name === player.name);
                                    const place = originalIndex !== -1 ? originalIndex + 1 : underdogCandidates.length - idx;
                                    const isHighlighted = underdog?.name === player.name;
                                    const loseStreak = streakStats[player.name]?.loseStreak || 0;
                                    const subText = loseStreak >= 3
                                        ? `${loseStreak} поражений подряд`
                                        : `${Math.round((player.wins / player.matches) * 100)}% винрейт (${player.wins}/${player.matches} игр)`;

                                    return (
                                        <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-red-500/10 border-red-500/30 dark:border-red-500/20 text-red-955 dark:text-red-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{place}</span>
                                                <span className="truncate">{player.name}</span>
                                            </div>
                                            <span className="text-xs opacity-80">{subText}</span>
                                        </div>
                                    );
                                });
                            })()}
                            {underdogCandidates.length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-2">Нет подходящих игроков</div>
                            )}
                        </div>
                    )}

                    {activeNomination === 'streak' && (
                        <div className="space-y-2">
                            {streakCandidates.map((player, idx) => {
                                const isHighlighted = bestStreakPlayer?.name === player.name;
                                return (
                                    <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-orange-500/10 border-orange-500/30 dark:border-orange-500/20 text-orange-950 dark:text-orange-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{idx + 1}</span>
                                            <span className="truncate">{player.name}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{player.streak} побед подряд</span>
                                    </div>
                                );
                            })}
                            {streakCandidates.length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-2">Нет игроков с активной серией побед &gt;= 3</div>
                            )}
                        </div>
                    )}

                    {activeNomination === 'seriesKills' && (
                        <div className="space-y-2">
                            {seriesKillsCandidates.map((player, idx) => {
                                const isHighlighted = topKillsSeriesPlayer?.name === player.name;
                                return (
                                    <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-rose-500/10 border-rose-500/30 dark:border-rose-500/20 text-rose-955 dark:text-rose-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{idx + 1}</span>
                                            <span className="truncate">{player.name}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{player.record} 💀 за серию</span>
                                    </div>
                                );
                            })}
                            {seriesKillsCandidates.length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-2">Нет подходящих данных</div>
                            )}
                        </div>
                    )}

                    {activeNomination === 'totalKills' && (
                        <div className="space-y-2">
                            {totalKillsCandidates.map((player, idx) => {
                                const isHighlighted = topTotalKillers[0]?.name === player.name;
                                return (
                                    <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-red-500/10 border-red-500/30 dark:border-red-500/20 text-red-955 dark:text-red-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{idx + 1}</span>
                                            <span className="truncate">{player.name}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">Всего: {player.total} 💀</span>
                                    </div>
                                );
                            })}
                            {totalKillsCandidates.length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-2">Нет подходящих данных</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};
