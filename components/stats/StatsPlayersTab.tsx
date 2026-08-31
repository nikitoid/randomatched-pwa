import React, { useMemo, useState, useEffect } from 'react';
import { Star, Flame, Skull, Percent, HelpCircle, TrendingDown, Shield } from 'lucide-react';
import { PlayerStat, MatchRecord } from '../../types';
import { PlayerDetails } from '../PlayerDetails';
import { Avatar } from '../common/Avatar';
import { calculatePlayerLevel } from '../../utils/playerLevel';
import { formatPlural } from '../../utils/heroNormalization';
import { RanksInfoModal } from './RanksInfoModal';


interface StatsPlayersTabProps {
    processedPlayers: PlayerStat[];
    selectedPlayer: PlayerStat | null;
    setSelectedPlayer: React.Dispatch<React.SetStateAction<PlayerStat | null>>;
    filteredHistory: MatchRecord[];
    onRenamePlayer: (oldName: string, newName: string) => void;
    streakStats: Record<string, { current: number }>;
    mvp: PlayerStat | null;
    underdog?: PlayerStat | null;
    topTotalKillers?: { name: string; total: number }[];
    playerSort: 'efficiency' | 'winrate' | 'matches' | 'kills' | 'killPercent' | 'az' | 'za';
    openPlayerDetails: (player: PlayerStat) => void;
    closeDetails: () => void;
    handleTitleClick?: (e: React.MouseEvent) => void;
    onOpenEfficiencyBreakdown?: () => void;
}

const getWinsText = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} победа`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} победы`;
    return `${count} побед`;
};

const getLossesText = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} поражение`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} поражения`;
    return `${count} поражений`;
};

const getPlayerSortLabel = (sort: StatsPlayersTabProps['playerSort']) => {
    switch (sort) {
        case 'efficiency': return 'Сортировка по эффективности';
        case 'winrate': return 'Сортировка по винрейту';
        case 'matches': return 'Сортировка по популярности';
        case 'kills': return 'Сортировка по убийствам';
        case 'killPercent': return 'Сортировка по % убийств';
        case 'az': return 'Сортировка по алфавиту (А-Я)';
        case 'za': return 'Сортировка по алфавиту (Я-А)';
        default: return 'Сортировка игроков';
    }
};

export const StatsPlayersTab: React.FC<StatsPlayersTabProps> = ({
    processedPlayers,
    selectedPlayer,
    setSelectedPlayer,
    filteredHistory,
    onRenamePlayer,
    streakStats,
    mvp,
    underdog,
    topTotalKillers,
    playerSort,
    openPlayerDetails,
    closeDetails,
    handleTitleClick,
    onOpenEfficiencyBreakdown
}) => {
    const [displayPlayer, setDisplayPlayer] = useState<PlayerStat | null>(selectedPlayer);
    const [isRanksModalOpen, setIsRanksModalOpen] = useState(false);

    if (selectedPlayer && selectedPlayer !== displayPlayer) {
        setDisplayPlayer(selectedPlayer);
    }

    useEffect(() => {
        if (selectedPlayer) {
            setDisplayPlayer(selectedPlayer);
        }
    }, [selectedPlayer]);

    const topKillerName = useMemo(() => {
        if (topTotalKillers && topTotalKillers.length > 0 && topTotalKillers[0].total > 0) {
            return topTotalKillers[0].name;
        }
        let maxKills = 0;
        let topName: string | null = null;
        processedPlayers.forEach(p => {
            const k = p.totalKills || 0;
            if (k > maxKills) {
                maxKills = k;
                topName = p.name;
            }
        });
        return topName;
    }, [topTotalKillers, processedPlayers]);

    return (
        <div className="relative w-full h-full min-h-[400px]">
            {/* Список игроков (Всегда смонтирован в DOM для мгновенного плавного возврата) */}
            <div className="px-4 pb-4 pt-3 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between px-1 pb-1 mb-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 truncate mr-2">
                        {getPlayerSortLabel(playerSort)}
                    </span>
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsRanksModalOpen(true); }}
                            className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold hover:text-primary-600 dark:hover:text-primary-400 active:opacity-80 transition-colors"
                        >
                            <Shield size={13} />
                            <span>Ранги</span>
                        </button>
                        {playerSort === 'efficiency' && onOpenEfficiencyBreakdown && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenEfficiencyBreakdown(); }}
                                className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-bold hover:underline active:opacity-80 transition-opacity"
                            >
                                <HelpCircle size={13} />
                                <span>Расшифровка</span>
                            </button>
                        )}
                    </div>
                </div>
                {processedPlayers.map((player, idx) => {
                    const pLevel = calculatePlayerLevel(player.wins, player.losses, player.totalKills || 0);
                    return (
                        <div
                            key={player.name}
                            onClick={() => {
                                openPlayerDetails(player);
                            }}
                            className="flex items-center justify-between py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-900 glass-card-gradient shadow-sm border border-slate-150 dark:border-slate-800/60 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                                <div className="relative shrink-0 flex items-center justify-center">
                                    <Avatar entityType="player" entityId={player.name} name={player.name} size="lg" />
                                    <div className={`absolute -top-1 -left-1 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-xs z-10 ${idx === 0 ? 'bg-amber-400 text-amber-950 shadow-amber-400/20' :
                                            idx === 1 ? 'bg-slate-300 text-slate-900' :
                                                idx === 2 ? 'bg-amber-700 text-amber-100' :
                                                    'bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1" onClick={handleTitleClick}>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white shrink-0 max-w-[130px] xs:max-w-[170px] sm:max-w-none truncate">
                                            {player.name}
                                        </span>
                                        <div className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 ${pLevel.tier.bgClass} ${pLevel.tier.borderClass} ${pLevel.tier.textClass}`} title={`${pLevel.tier.name} (${pLevel.totalXP} XP)`}>
                                            <span>LVL {pLevel.level}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1 min-w-0">
                                            {streakStats[player.name]?.current >= 3 && (
                                                <div className="shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 rounded-md flex items-center gap-0.5" title={`Серия из ${streakStats[player.name].current} побед подряд`}>
                                                    <Flame size={10} fill="currentColor" /> В огне
                                                </div>
                                            )}
                                            {mvp?.name === player.name && (
                                                <div className="shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400 rounded-md flex items-center gap-0.5">
                                                    <Star size={10} fill="currentColor" /> MVP
                                                </div>
                                            )}
                                            {topKillerName === player.name && (
                                                <div className="shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 rounded-md flex items-center gap-0.5" title={`Больше всех убийств (${player.totalKills || 0} 💀)`}>
                                                    <Skull size={10} fill="currentColor" /> Ебака парень
                                                </div>
                                            )}
                                            {underdog?.name === player.name && (
                                                <div className="shrink-0 text-[10px] font-black px-1.5 py-0.5 bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 rounded-md flex items-center gap-0.5" title="Underdog — тяжёлые времена">
                                                    <TrendingDown size={10} /> Underdog
                                                </div>
                                            )}
                                            {player.isInactive && (
                                                <div className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 rounded-md flex items-center gap-0.5" title="Не играл(а) более 60 дней">
                                                    Неактивен
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                {(() => {
                                    const killPercent = player.matches > 0 ? Math.round((((player.totalKills || 0) * 100) / player.matches) / 2) : 0;
                                    return (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                                            <span>{getWinsText(player.wins)}</span>
                                            <span className="opacity-40">•</span>
                                            <span className="flex items-center gap-0.5 text-red-500 font-medium">
                                                <Skull size={11} /> {player.totalKills || 0} <span className="text-[11px] opacity-80">({killPercent}%)</span>
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            {playerSort === 'matches' ? (
                                <>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {formatPlural(player.matches, 'игра', 'игры', 'игр')}
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {((player.wins / (player.matches || 1)) * 100).toFixed(1)}% побед
                                    </div>
                                </>
                            ) : playerSort === 'kills' ? (
                                <>
                                    <div className="text-sm font-bold text-red-500 flex items-center justify-end gap-1">
                                        <Skull size={14} /> {player.totalKills || 0}
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {(player.avgKills || 0).toFixed(1)} / матч
                                    </div>
                                </>
                            ) : playerSort === 'killPercent' ? (
                                <>
                                    <div className="text-sm font-bold text-red-500 flex items-center justify-end gap-1">
                                        <Percent size={14} /> {player.matches > 0 ? Math.round((((player.totalKills || 0) * 100) / player.matches) / 2) : 0}%
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {formatPlural(player.matches, 'игра', 'игры', 'игр')}
                                    </div>
                                </>
                            ) : playerSort === 'efficiency' ? (
                                <>
                                    <div className={`text-sm font-bold ${player.score >= 0.5 ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {(player.score * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {formatPlural(player.matches, 'игра', 'игры', 'игр')}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={`text-sm font-bold ${player.wins / (player.matches || 1) >= 0.5 ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {((player.wins / (player.matches || 1)) * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {formatPlural(player.matches, 'игра', 'игры', 'игр')}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
                {processedPlayers.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных об игроках</div>}
            </div>

            {/* Выезжающий слайд-оверлей деталей игрока (GPU Hardware Accelerated 60 FPS) */}
            <div
                className={`absolute inset-0 z-30 bg-slate-50 dark:bg-slate-950 bg-grid-pattern overflow-y-auto transition-all duration-300 ease-out ${selectedPlayer
                        ? 'translate-x-0 opacity-100 pointer-events-auto'
                        : 'translate-x-full opacity-0 pointer-events-none'
                    }`}
                style={{ willChange: 'transform, opacity' }}
            >
                {displayPlayer && (
                    <PlayerDetails
                        key={displayPlayer.name}
                        player={displayPlayer}
                        history={filteredHistory}
                        onBack={closeDetails}
                        onRename={(newName) => {
                            onRenamePlayer(displayPlayer.name, newName);
                            setSelectedPlayer(prev => prev ? { ...prev, name: newName } : null);
                        }}
                    />
                )}
            </div>

            {/* Ranks Info Modal */}
            <RanksInfoModal
                isOpen={isRanksModalOpen}
                onClose={() => setIsRanksModalOpen(false)}
            />
        </div>
    );
};
