import React from 'react';
import { Star, Flame, Skull, Percent, HelpCircle } from 'lucide-react';
import { PlayerStat, MatchRecord } from '../../types';
import { PlayerDetails } from '../PlayerDetails';

interface StatsPlayersTabProps {
    processedPlayers: PlayerStat[];
    selectedPlayer: PlayerStat | null;
    setSelectedPlayer: React.Dispatch<React.SetStateAction<PlayerStat | null>>;
    filteredHistory: MatchRecord[];
    onRenamePlayer: (oldName: string, newName: string) => void;
    streakStats: Record<string, { current: number }>;
    mvp: PlayerStat | null;
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
    playerSort,
    openPlayerDetails,
    closeDetails,
    handleTitleClick,
    onOpenEfficiencyBreakdown
}) => {
    return (
        <div className={`animate-in fade-in slide-in-from-right-4 duration-300 ${selectedPlayer ? 'p-0' : 'px-4 pb-4 pt-3'}`}>
            <div className="space-y-2">
                {selectedPlayer ? (
                    <PlayerDetails
                        key={selectedPlayer.name}
                        player={selectedPlayer}
                        history={filteredHistory}
                        onBack={closeDetails}
                        onRename={(newName) => {
                            onRenamePlayer(selectedPlayer.name, newName);
                            setSelectedPlayer(prev => prev ? { ...prev, name: newName } : null);
                        }}
                    />
                ) : (
                    <>
                        <div className="flex items-center justify-between px-1 pb-1 mb-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                                {getPlayerSortLabel(playerSort)}
                            </span>
                            {playerSort === 'efficiency' && onOpenEfficiencyBreakdown && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onOpenEfficiencyBreakdown(); }}
                                    className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-bold hover:underline active:opacity-80 transition-opacity"
                                >
                                    <HelpCircle size={13} />
                                    <span>Расшифровка расчёта</span>
                                </button>
                            )}
                        </div>
                        {processedPlayers.map((player, idx) => (
                            <div
                                key={player.name}
                                onClick={() => {
                                    openPlayerDetails(player);
                                }}
                                className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-150 dark:border-slate-800/60 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                            idx === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                                idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                                                    'bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0 flex-1" onClick={handleTitleClick}>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                            <span className="truncate">{player.name}</span>
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
                                            {player.isInactive && (
                                                <div className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 rounded-md flex items-center gap-0.5" title="Не играл(а) более 60 дней">
                                                    Неактивен
                                                </div>
                                            )}
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
                                                {player.matches} {player.matches === 1 ? 'игра' : player.matches < 5 ? 'игры' : 'игр'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {Math.round((player.wins / (player.matches || 1)) * 100)}% побед
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
                                                {player.matches} {player.matches === 1 ? 'игра' : player.matches < 5 ? 'игры' : 'игр'}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className={`text-sm font-bold ${player.wins / (player.matches || 1) >= 0.5 ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {Math.round((player.wins / (player.matches || 1)) * 100)}%
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {player.matches} {player.matches === 1 ? 'игра' : player.matches < 5 ? 'игры' : 'игр'}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {processedPlayers.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных об игроках</div>}
                    </>
                )}
            </div>
        </div>
    );
};
