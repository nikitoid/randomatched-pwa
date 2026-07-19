import React from 'react';
import { Star, TrendingUp } from 'lucide-react';
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
    playerSort: 'efficiency' | 'winrate' | 'matches' | 'az' | 'za';
    openPlayerDetails: (player: PlayerStat) => void;
    closeDetails: () => void;
    handleTitleClick?: (e: React.MouseEvent) => void;
}

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
    handleTitleClick
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
                        {processedPlayers.map((player, idx) => (
                            <div
                                key={player.name}
                                onClick={() => {
                                    openPlayerDetails(player);
                                }}
                                className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-150 dark:border-slate-800/60 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex items-center gap-2" onClick={handleTitleClick}>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {player.name}
                                            {streakStats[player.name]?.current >= 3 && (
                                                <div className="text-[10px] font-black px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-md flex items-center gap-0.5">
                                                    <TrendingUp size={10} /> {streakStats[player.name].current}
                                                </div>
                                            )}
                                            {mvp?.name === player.name && (
                                                <div className="text-[10px] font-black px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded-md flex items-center gap-0.5">
                                                    <Star size={10} fill="currentColor" /> MVP
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500">Игр: {player.matches} • Побед: {player.wins}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {playerSort === 'matches' ? (
                                        <>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-355">
                                                {player.matches} {player.matches === 1 ? 'игра' : player.matches < 5 ? 'игры' : 'игр'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {Math.round((player.wins / player.matches) * 100)}% побед
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className={`text-sm font-bold ${player.wins / player.matches >= 0.5 ? 'text-green-600' : 'text-slate-500'}`}>
                                                {Math.round((player.wins / player.matches) * 100)}%
                                            </div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                                игры: {player.matches}
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
