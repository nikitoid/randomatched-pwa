import React, { useState, useRef } from 'react';
import { Trophy, Star, Flame, Skull, TrendingUp, HelpCircle } from 'lucide-react';
import { PlayerStat } from '../../types';

interface StatsOverviewTabProps {
    totalMatches: number;
    mvp: PlayerStat | null;
    bestStreakPlayer: { name: string, streak: number } | null;
    underdog: PlayerStat | null;
    topKillsSeriesPlayer: { name: string, record: number } | null;
    topTotalKillers: { name: string, total: number }[];
    sortedPlayers: PlayerStat[];
    setActiveNominationModal: (modal: 'mvp' | 'underdog' | 'streak' | 'seriesKills' | 'totalKills') => void;
    triggerHaptic: (pattern?: number | number[]) => void;
    setShowEfficiencyInfo: (show: boolean) => void;
}

export const StatsOverviewTab: React.FC<StatsOverviewTabProps> = ({
    totalMatches,
    mvp,
    bestStreakPlayer,
    underdog,
    topKillsSeriesPlayer,
    topTotalKillers,
    sortedPlayers,
    setActiveNominationModal,
    triggerHaptic,
    setShowEfficiencyInfo
}) => {
    // Swipe state
    const [activeOverviewCard, setActiveOverviewCard] = useState(0); // 0 = Streak, 1 = Underdog
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const touchStartX = useRef(0);

    const handleCardTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        touchStartX.current = e.touches[0].clientX;
        setIsSwiping(true);
        setSwipeOffset(0);
    };

    const handleCardTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (!isSwiping) return;

        const currentX = e.touches[0].clientX;
        const diff = currentX - touchStartX.current;

        // Resistance/Limits
        if (activeOverviewCard === 0 && diff > 0) {
            setSwipeOffset(diff * 0.3);
        } else if (activeOverviewCard === 1 && diff < 0) {
            setSwipeOffset(diff * 0.3);
        } else {
            setSwipeOffset(diff);
        }
    };

    const handleCardTouchEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        setIsSwiping(false);

        const threshold = 50; // px

        if (activeOverviewCard === 0) {
            if (swipeOffset < -threshold) {
                setActiveOverviewCard(1);
            }
        } else {
            if (swipeOffset > threshold) {
                setActiveOverviewCard(0);
            }
        }
        setSwipeOffset(0);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 p-4">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-white to-primary-500/10 dark:from-slate-900 dark:to-primary-500/10 shadow-sm border border-slate-200/60 dark:border-slate-800/80 text-center relative overflow-hidden">
                <div className="relative z-10">
                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">{totalMatches}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Всего матчей</div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* MVP Card */}
                <div
                    onClick={() => { setActiveNominationModal('mvp'); triggerHaptic(10); }}
                    className="p-4 rounded-3xl bg-gradient-to-br from-white to-yellow-500/10 dark:from-slate-900 dark:to-yellow-500/10 border border-yellow-200/60 dark:border-yellow-900/30 relative overflow-hidden h-full cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none"
                >
                    <div className="flex items-center gap-2 mb-3 text-yellow-600 dark:text-yellow-500">
                        <Star size={18} fill="currentColor" />
                        <span className="text-xs font-black uppercase tracking-wider">MVP</span>
                    </div>
                    {mvp ? (
                        <>
                            <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{mvp.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Винрейт: <span className="font-bold text-green-600">{Math.round((mvp.wins / mvp.matches) * 100)}%</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{mvp.matches} игр</div>
                        </>
                    ) : (
                        <div className="text-sm text-slate-400 italic">Нет данных</div>
                    )}
                </div>

                {/* Scrollable Card Area */}
                {bestStreakPlayer ? (
                    <div
                        className="relative overflow-hidden h-full rounded-3xl"
                        onTouchStart={handleCardTouchStart}
                        onTouchMove={handleCardTouchMove}
                        onTouchEnd={handleCardTouchEnd}
                    >
                        <div
                            className={`flex h-full will-change-transform ${isSwiping ? '' : 'transition-transform duration-300 ease-out'}`}
                            style={{ transform: `translateX(calc(-${activeOverviewCard * 100}% + ${swipeOffset}px))` }}
                        >
                            {/* Slide 1: Hot Streak */}
                            <div className="w-full h-full flex-shrink-0">
                                <div
                                    onClick={() => { setActiveNominationModal('streak'); triggerHaptic(10); }}
                                    className="p-4 h-full rounded-3xl bg-gradient-to-br from-white to-orange-500/10 dark:from-slate-900 dark:to-orange-500/10 border border-orange-200/60 dark:border-orange-900/30 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none"
                                >
                                    <div className="flex items-center gap-2 mb-3 text-orange-500">
                                        <Flame size={18} className="animate-pulse text-orange-500" />
                                        <span data-testid="on-fire-badge" className="text-xs font-black uppercase tracking-wider">В огне</span>
                                    </div>
                                    <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{bestStreakPlayer.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Серия: <span className="font-bold text-orange-600">{bestStreakPlayer.streak} побед</span>
                                    </div>
                                    <div className="absolute opacity-10 bottom-1 right-1 text-orange-500">
                                        <TrendingUp size={48} />
                                    </div>
                                </div>
                            </div>

                            {/* Slide 2: Underdog */}
                            <div className="w-full h-full flex-shrink-0">
                                <div
                                    onClick={() => { setActiveNominationModal('underdog'); triggerHaptic(10); }}
                                    className="p-4 h-full rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none"
                                >
                                    <div className="flex items-center gap-2 mb-3 text-slate-400">
                                        <Skull size={18} />
                                        <span className="text-xs font-black uppercase tracking-wider">Underdog</span>
                                    </div>
                                    {underdog ? (
                                        <>
                                            <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{underdog.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                Винрейт: <span className="font-bold text-red-500">{Math.round((underdog.wins / underdog.matches) * 100)}%</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">{underdog.matches} игр</div>
                                        </>
                                    ) : (
                                        <div className="text-sm text-slate-400 italic">Нет данных</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Pagination Dots - Overlay at bottom */}
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                            <div className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${activeOverviewCard === 0 ? 'w-4 bg-primary-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`} />
                            <div className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${activeOverviewCard === 1 ? 'w-4 bg-primary-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`} />
                        </div>
                    </div>
                ) : (
                    /* No streak - just show Underdog */
                    <div
                        onClick={() => { setActiveNominationModal('underdog'); triggerHaptic(10); }}
                        className="p-4 h-full rounded-3xl bg-gradient-to-br from-white to-slate-500/10 dark:from-slate-900 dark:to-slate-500/10 shadow-sm border border-slate-200/60 dark:border-slate-800 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none"
                    >
                        <div className="flex items-center gap-2 mb-3 text-slate-400">
                            <Skull size={18} />
                            <span className="text-xs font-black uppercase tracking-wider">Underdog</span>
                        </div>
                        {underdog ? (
                            <>
                                <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{underdog.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Винрейт: <span className="font-bold text-red-500">{Math.round((underdog.wins / underdog.matches) * 100)}%</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{underdog.matches} игр</div>
                            </>
                        ) : (
                            <div className="text-sm text-slate-400 italic">Нет данных</div>
                        )}
                    </div>
                )}

                {/* Боевая статистика */}
                <div className="pt-2 col-span-2 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Skull size={16} className="text-red-500" /> Боевые рекорды
                    </h3>

                    {/* Сетка карточек рекордов */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {/* Рекорд за серию */}
                        <div
                            onClick={() => { setActiveNominationModal('seriesKills'); triggerHaptic(10); }}
                            className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-rose-500/10 dark:from-slate-900 dark:to-rose-500/10 border border-rose-200/60 dark:border-rose-900/30 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none"
                        >
                            <div className="text-[10px] font-bold text-red-500 uppercase mb-1">Рекорд за встречу</div>
                            {topKillsSeriesPlayer ? (
                                <>
                                    <div className="text-base font-bold text-slate-900 dark:text-white truncate">{topKillsSeriesPlayer.name}</div>
                                    <div className="text-xs font-black text-red-600 dark:text-red-400 mt-0.5">
                                        {topKillsSeriesPlayer.record} 💀 за серию
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-slate-400 italic">Нет данных</div>
                            )}
                        </div>

                        {/* Король убийств */}
                        <div
                            onClick={() => { setActiveNominationModal('totalKills'); triggerHaptic(10); }}
                            className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-red-500/10 dark:from-slate-900 dark:to-red-500/10 border border-slate-200/60 dark:border-slate-800 relative overflow-hidden shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all select-none"
                        >
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1">Король убийств</div>
                            {topTotalKillers && topTotalKillers.length > 0 ? (
                                <>
                                    <div className="text-base font-bold text-slate-900 dark:text-white truncate">{topTotalKillers[0].name}</div>
                                    <div className="text-xs font-black text-slate-700 dark:text-slate-300 mt-0.5">
                                        Всего: {topTotalKillers[0].total} 💀
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-slate-400 italic">Нет данных</div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Top Efficiency Chart */}
                <div className="pt-2 col-span-2 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                    <h3 data-testid="efficiency-top" className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 select-none px-1">
                        <TrendingUp size={16} className="text-primary-500" />
                        <span>Топ эффективности</span>
                        <button
                            onClick={() => { setShowEfficiencyInfo(true); triggerHaptic(10); }}
                            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
                            title="Как рассчитывается рейтинг?"
                        >
                            <HelpCircle size={14} />
                        </button>
                    </h3>

                    <div className="p-4 rounded-3xl bg-gradient-to-br from-white to-primary-500/5 dark:from-slate-900 dark:to-primary-500/5 border border-slate-200/60 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
                        <div className="space-y-3 relative z-10">
                            {sortedPlayers.filter(p => p.matches >= 3).slice(0, 5).map((player, i) => {
                                const winRate = (player.wins / player.matches) * 100;
                                return (
                                    <div key={player.name}>
                                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                                            <span className="text-slate-700 dark:text-slate-300">{i + 1}. {player.name}</span>
                                            <span className="text-slate-500 dark:text-slate-400">{Math.round(winRate)}% <span className="text-[9px] opacity-65 font-normal">({player.wins}/{player.matches})</span></span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-100/70 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500" style={{ width: `${winRate}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                            {sortedPlayers.filter(p => p.matches >= 3).length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-4">Недостаточно матчей для статистики</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
