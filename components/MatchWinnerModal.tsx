import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Swords, Minus, Plus, Skull, RotateCcw, X } from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { Avatar } from './common/Avatar';
import { useHaptics } from '../hooks/useHaptics';
import { AssignedPlayer } from '../types';

export interface MatchWinnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignments: AssignedPlayer[];
    playerNames: string[];
    canRecordStats: boolean;
    onRecordWin: (winner: 'team1' | 'team2', playerKills?: Record<string, number>) => void;
    onSkipRecord: () => void;
}

const POSITION_TO_INDEX: Record<string, number> = {
    bottom: 0,
    top: 1,
    left: 2,
    right: 3
};

export const MatchWinnerModal: React.FC<MatchWinnerModalProps> = ({
    isOpen,
    onClose,
    assignments,
    playerNames,
    canRecordStats,
    onRecordWin,
    onSkipRecord
}) => {
    const haptics = useHaptics();
    const [playerKills, setPlayerKills] = useState<Record<number, number>>({});

    // Reset kills state when modal opens
    useEffect(() => {
        if (isOpen) {
            setPlayerKills({});
        }
    }, [isOpen]);

    const getPlayerName = (player: AssignedPlayer): string => {
        const idx = POSITION_TO_INDEX[player.position];
        return playerNames[idx]?.trim() || `Игрок ${player.playerNumber}`;
    };

    const team1Players = useMemo(() => {
        return assignments.filter(a => a.team === 'Odd');
    }, [assignments]);

    const team2Players = useMemo(() => {
        return assignments.filter(a => a.team === 'Even');
    }, [assignments]);

    const getTeamNamesString = (teamPlayers: AssignedPlayer[]): string => {
        const names = teamPlayers.map(p => getPlayerName(p)).filter(Boolean);
        return names.length > 0 ? names.join(' и ') : 'Команда';
    };

    const team1TotalKills = useMemo(() => {
        return team1Players.reduce((sum, p) => sum + (playerKills[p.playerNumber] || 0), 0);
    }, [team1Players, playerKills]);

    const team2TotalKills = useMemo(() => {
        return team2Players.reduce((sum, p) => sum + (playerKills[p.playerNumber] || 0), 0);
    }, [team2Players, playerKills]);

    const handleKillsChange = (playerNumber: number, delta: number) => {
        haptics.trigger('light');
        setPlayerKills(prev => ({
            ...prev,
            [playerNumber]: Math.max(0, (prev[playerNumber] || 0) + delta)
        }));
    };

    const handleInputChange = (playerNumber: number, valueStr: string) => {
        const val = parseInt(valueStr, 10);
        setPlayerKills(prev => ({
            ...prev,
            [playerNumber]: isNaN(val) ? 0 : Math.max(0, val)
        }));
    };

    const handleConfirmWin = (winner: 'team1' | 'team2') => {
        haptics.trigger('success');
        const killsByPlayerName: Record<string, number> = {};
        assignments.forEach(a => {
            const name = getPlayerName(a);
            if (name) {
                killsByPlayerName[name] = playerKills[a.playerNumber] || 0;
            }
        });
        onRecordWin(winner, killsByPlayerName);
    };


    const renderPlayerRow = (player: AssignedPlayer, accentColor: 'primary' | 'secondary') => {
        const playerName = getPlayerName(player);
        const heroName = player.hero?.name || 'Без героя';
        const kills = playerKills[player.playerNumber] ?? 0;

        return (
            <div
                key={player.playerNumber}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 shadow-2xs gap-2"
            >
                {/* Left: Avatar + Player Name + Hero Name (FULL WIDTH, NO TRUNCATION ISSUES) */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar entityType="player" entityId={playerName} name={playerName} size="md" />
                    <div className="flex flex-col text-left min-w-0">

                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                                {playerName}
                            </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 truncate">
                            {heroName}
                        </span>
                    </div>
                </div>

                {/* Right: Stepper controls (- [ N ] +) */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        aria-label={`Уменьшить фраги ${playerName}`}
                        onClick={() => handleKillsChange(player.playerNumber, -1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 min-w-[32px] min-h-[32px] select-none"
                    >
                        <Minus size={14} />
                    </button>

                    <input
                        type="number"
                        min="0"
                        aria-label={`Количество убийств ${playerName}`}
                        value={kills}
                        onChange={e => handleInputChange(player.playerNumber, e.target.value)}
                        className={`w-9 py-1 text-center bg-white dark:bg-slate-950 border rounded-lg text-xs font-black text-slate-900 dark:text-white outline-none focus:ring-1 transition-all ${
                            accentColor === 'primary'
                                ? 'border-primary-200 dark:border-primary-800 focus:ring-primary-500/40'
                                : 'border-secondary-200 dark:border-secondary-800 focus:ring-secondary-500/40'
                        }`}
                    />

                    <button
                        type="button"
                        aria-label={`Увеличить фраги ${playerName}`}
                        onClick={() => handleKillsChange(player.playerNumber, 1)}
                        className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center active:scale-90 transition-all select-none min-w-[32px] min-h-[32px] ${
                            accentColor === 'primary'
                                ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/70'
                                : 'bg-secondary-100 dark:bg-secondary-900/50 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-900/70'
                        }`}
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Кто победил?"
            subtitle={canRecordStats ? undefined : 'Введите имена хотя бы 2 игроков'}
            icon={<Swords size={18} className="text-amber-500" />}
            maxWidth="md"
            variant="auto"
            modalId="winner-record-modal"
            priority={40}
            showCloseButton={false}
        >
            <div className="flex flex-col gap-3 w-full">
                {canRecordStats && (
                    <div className="flex flex-col gap-2.5 w-full">
                        {/* TEAM 1 BLOCK */}
                        <div className="flex flex-col bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent dark:from-primary-500/15 dark:via-primary-500/5 p-2 rounded-2xl border border-primary-500/20 shadow-2xs">
                            <div className="flex items-center justify-between mb-1.5 px-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                                    Команда 1
                                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 normal-case">
                                        ({getTeamNamesString(team1Players)})
                                    </span>
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 flex items-center gap-1">
                                    <Skull size={10} /> {team1TotalKills}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {team1Players.map(p => renderPlayerRow(p, 'primary'))}
                            </div>
                        </div>

                        {/* TEAM 2 BLOCK */}
                        <div className="flex flex-col bg-gradient-to-r from-secondary-500/10 via-secondary-500/5 to-transparent dark:from-secondary-500/15 dark:via-secondary-500/5 p-2 rounded-2xl border border-secondary-500/20 shadow-2xs">
                            <div className="flex items-center justify-between mb-1.5 px-1">
                                <span className="text-[11px] font-black uppercase tracking-wider text-secondary-600 dark:text-secondary-400 flex items-center gap-1.5">
                                    Команда 2
                                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 normal-case">
                                        ({getTeamNamesString(team2Players)})
                                    </span>
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-900/50 text-secondary-700 dark:text-secondary-300 flex items-center gap-1">
                                    <Skull size={10} /> {team2TotalKills}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {team2Players.map(p => renderPlayerRow(p, 'secondary'))}
                            </div>
                        </div>
                    </div>
                )}

                {/* WINNER ACTION CARDS */}
                <div className="flex flex-col gap-2 w-full pt-1">
                    {canRecordStats && (
                        <div className="flex flex-col gap-1.5 w-full">
                            {/* TEAM 1 WIN BUTTON */}
                            <button
                                data-testid="record-team1-win-btn"
                                onClick={() => handleConfirmWin('team1')}
                                className="w-full h-11 py-2 px-3 font-bold text-white bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 hover:brightness-105 rounded-xl active:scale-[0.98] transition-all flex items-center justify-between gap-2 text-xs shadow-md shadow-primary-500/20 border border-primary-400/30 cursor-pointer"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Trophy size={16} className="text-amber-300 drop-shadow shrink-0" />
                                    <span className="font-extrabold tracking-wide text-white truncate">
                                        Победа Команды 1
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold text-white/90 truncate max-w-[170px] bg-black/15 px-2 py-0.5 rounded-md">
                                    {getTeamNamesString(team1Players)}
                                </span>
                            </button>

                            {/* TEAM 2 WIN BUTTON */}
                            <button
                                data-testid="record-team2-win-btn"
                                onClick={() => handleConfirmWin('team2')}
                                className="w-full h-11 py-2 px-3 font-bold text-white bg-gradient-to-r from-secondary-600 via-secondary-500 to-secondary-600 hover:brightness-105 rounded-xl active:scale-[0.98] transition-all flex items-center justify-between gap-2 text-xs shadow-md shadow-secondary-500/20 border border-secondary-400/30 cursor-pointer"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Trophy size={16} className="text-amber-300 drop-shadow shrink-0" />
                                    <span className="font-extrabold tracking-wide text-white truncate">
                                        Победа Команды 2
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold text-white/90 truncate max-w-[170px] bg-black/15 px-2 py-0.5 rounded-md">
                                    {getTeamNamesString(team2Players)}
                                </span>
                            </button>
                        </div>
                    )}

                    {/* PROMINENT SECONDARY ACTION BUTTONS */}
                    <div className="flex flex-col gap-1.5 w-full pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                            onClick={onSkipRecord}
                            className="w-full h-10 py-2 px-3 font-extrabold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200/60 dark:border-red-900/60 rounded-xl transition-all active:scale-[0.98] text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            <RotateCcw size={14} />
                            <span>Сбросить без записи</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full h-9 py-1.5 px-3 font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 rounded-xl transition-all active:scale-[0.98] text-xs cursor-pointer flex items-center justify-center gap-1"
                        >
                            <X size={14} />
                            <span>Отмена</span>
                        </button>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};
