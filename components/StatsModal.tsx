
import React, { useState, useMemo, useEffect } from 'react';
import { X, Trophy, Swords, Edit2, Trash2, Save, RefreshCw, Loader2, Plus, User, Shield, ChevronLeft, Calendar, Check } from 'lucide-react';
import { MatchRecord, PlayerStat, MatchPlayer } from '../types';

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: MatchRecord[];
    onDeleteMatch: (id: string) => void;
    onUpdateMatch: (id: string, data: Partial<MatchRecord>) => void;
    onAddMatch: (t1: MatchPlayer[], t2: MatchPlayer[], winner: 'team1' | 'team2' | 'draw') => void;
    onRenamePlayer: (oldName: string, newName: string) => void;
    onSync: () => void;
    isSyncing: boolean;
    isOnline: boolean;
}

export const StatsModal: React.FC<StatsModalProps> = ({
    isOpen,
    onClose,
    history,
    onDeleteMatch,
    onUpdateMatch,
    onAddMatch,
    onRenamePlayer,
    onSync,
    isSyncing,
    isOnline
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'players'>('overview');
    const [editMode, setEditMode] = useState(false);
    
    // Player Rename State
    const [editingPlayerName, setEditingPlayerName] = useState<{name: string, value: string} | null>(null);

    // Match Edit/Add State
    const [matchForm, setMatchForm] = useState<{
        id?: string;
        t1p1: string; t1p1h: string;
        t1p2: string; t1p2h: string;
        t2p1: string; t2p1h: string;
        t2p2: string; t2p2h: string;
        winner: 'team1' | 'team2' | 'draw';
    } | null>(null);

    // Reset states on close
    useEffect(() => {
        if (!isOpen) {
            setEditMode(false);
            setEditingPlayerName(null);
            setMatchForm(null);
            setActiveTab('overview');
        }
    }, [isOpen]);

    const stats = useMemo(() => {
        const playerStats: Record<string, PlayerStat> = {};
        let totalMatches = 0;
        let team1Wins = 0;
        let team2Wins = 0;
        let draws = 0;

        history.forEach(match => {
            totalMatches++;
            if (match.winner === 'team1') team1Wins++;
            else if (match.winner === 'team2') team2Wins++;
            else draws++;

            const processPlayer = (name: string, won: boolean, draw: boolean, heroName: string) => {
                const cleanName = name.trim();
                if (!cleanName) return;
                
                if (!playerStats[cleanName]) {
                    playerStats[cleanName] = { name: cleanName, matches: 0, wins: 0, losses: 0, draws: 0, heroesPlayed: {} };
                }
                playerStats[cleanName].matches++;
                if (won) playerStats[cleanName].wins++;
                else if (draw) playerStats[cleanName].draws++;
                else playerStats[cleanName].losses++;

                const cleanHero = heroName.trim() || 'Unknown';
                playerStats[cleanName].heroesPlayed[cleanHero] = (playerStats[cleanName].heroesPlayed[cleanHero] || 0) + 1;
            };

            match.team1.forEach(p => processPlayer(p.name, match.winner === 'team1', match.winner === 'draw', p.heroName));
            match.team2.forEach(p => processPlayer(p.name, match.winner === 'team2', match.winner === 'draw', p.heroName));
        });

        const sortedPlayers = Object.values(playerStats).sort((a, b) => b.wins - a.wins || b.matches - a.matches);

        return { totalMatches, team1Wins, team2Wins, draws, sortedPlayers };
    }, [history]);

    const handlePlayerRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPlayerName && editingPlayerName.value.trim() && editingPlayerName.value !== editingPlayerName.name) {
            onRenamePlayer(editingPlayerName.name, editingPlayerName.value.trim());
        }
        setEditingPlayerName(null);
    };

    const openAddMatch = () => {
        setMatchForm({
            t1p1: '', t1p1h: '',
            t1p2: '', t1p2h: '',
            t2p1: '', t2p1h: '',
            t2p2: '', t2p2h: '',
            winner: 'team1'
        });
    };

    const openEditMatch = (match: MatchRecord) => {
        setMatchForm({
            id: match.id,
            t1p1: match.team1[0]?.name || '', t1p1h: match.team1[0]?.heroName || '',
            t1p2: match.team1[1]?.name || '', t1p2h: match.team1[1]?.heroName || '',
            t2p1: match.team2[0]?.name || '', t2p1h: match.team2[0]?.heroName || '',
            t2p2: match.team2[1]?.name || '', t2p2h: match.team2[1]?.heroName || '',
            winner: match.winner || 'draw'
        });
    };

    const handleMatchSubmit = () => {
        if (!matchForm) return;

        const team1: MatchPlayer[] = [];
        if (matchForm.t1p1.trim()) team1.push({ name: matchForm.t1p1.trim(), heroName: matchForm.t1p1h.trim(), heroId: 'manual' });
        if (matchForm.t1p2.trim()) team1.push({ name: matchForm.t1p2.trim(), heroName: matchForm.t1p2h.trim(), heroId: 'manual' });

        const team2: MatchPlayer[] = [];
        if (matchForm.t2p1.trim()) team2.push({ name: matchForm.t2p1.trim(), heroName: matchForm.t2p1h.trim(), heroId: 'manual' });
        if (matchForm.t2p2.trim()) team2.push({ name: matchForm.t2p2.trim(), heroName: matchForm.t2p2h.trim(), heroId: 'manual' });

        if (team1.length === 0 || team2.length === 0) {
            // Basic validation
            return;
        }

        if (matchForm.id) {
            onUpdateMatch(matchForm.id, {
                team1, team2, winner: matchForm.winner
            });
        } else {
            onAddMatch(team1, team2, matchForm.winner);
        }
        setMatchForm(null);
    };

    const renderInput = (label: string, valKey: keyof typeof matchForm, icon?: React.ReactNode) => {
        if (!matchForm) return null;
        // Helper to safely access state since we know matchForm is not null here
        const value = matchForm[valKey as keyof typeof matchForm] as string;
        
        return (
            <div className="flex-1">
                <div className="relative">
                    <input 
                        type="text" 
                        value={value}
                        onChange={(e) => setMatchForm(prev => prev ? ({ ...prev, [valKey]: e.target.value }) : null)}
                        placeholder={label}
                        className="w-full pl-8 pr-2 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm border border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                        {icon}
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    // Match Editor View
    if (matchForm) {
        return (
            <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {matchForm.id ? 'Редактировать матч' : 'Добавить матч'}
                        </h2>
                        <button onClick={() => setMatchForm(null)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto">
                        <div className="space-y-6">
                            {/* Team 1 */}
                            <div className="p-4 rounded-2xl bg-secondary-50 dark:bg-secondary-900/10 border border-secondary-100 dark:border-secondary-900/20">
                                <h3 className="text-xs font-bold text-secondary-600 dark:text-secondary-400 uppercase mb-3">Команда 1 (Odd)</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        {renderInput("Игрок 1", "t1p1", <User size={14}/>)}
                                        {renderInput("Герой", "t1p1h", <Shield size={14}/>)}
                                    </div>
                                    <div className="flex gap-2">
                                        {renderInput("Игрок 2", "t1p2", <User size={14}/>)}
                                        {renderInput("Герой", "t1p2h", <Shield size={14}/>)}
                                    </div>
                                </div>
                            </div>

                            {/* VS */}
                            <div className="flex justify-center -my-3 relative z-10">
                                <div className="bg-white dark:bg-slate-900 p-2 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <Swords size={20} className="text-slate-400" />
                                </div>
                            </div>

                            {/* Team 2 */}
                            <div className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/20">
                                <h3 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase mb-3">Команда 2 (Even)</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        {renderInput("Игрок 3", "t2p1", <User size={14}/>)}
                                        {renderInput("Герой", "t2p1h", <Shield size={14}/>)}
                                    </div>
                                    <div className="flex gap-2">
                                        {renderInput("Игрок 4", "t2p2", <User size={14}/>)}
                                        {renderInput("Герой", "t2p2h", <Shield size={14}/>)}
                                    </div>
                                </div>
                            </div>

                            {/* Winner Selection */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 text-center">Победитель</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => setMatchForm(prev => prev ? ({ ...prev, winner: 'team1' }) : null)}
                                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${matchForm.winner === 'team1' ? 'border-secondary-500 bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                    >
                                        Team 1
                                    </button>
                                    <button 
                                        onClick={() => setMatchForm(prev => prev ? ({ ...prev, winner: 'draw' }) : null)}
                                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${matchForm.winner === 'draw' ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                    >
                                        Ничья
                                    </button>
                                    <button 
                                        onClick={() => setMatchForm(prev => prev ? ({ ...prev, winner: 'team2' }) : null)}
                                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${matchForm.winner === 'team2' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                    >
                                        Team 2
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                        <button onClick={() => setMatchForm(null)} className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                        <button onClick={handleMatchSubmit} className="flex-1 py-3 font-bold text-white bg-green-600 rounded-xl shadow-lg shadow-green-600/20">Сохранить</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy size={20} className="text-yellow-500" /> Статистика
                    </h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={onSync} 
                            disabled={!isOnline || isSyncing}
                            className={`p-2 rounded-full transition-colors ${!isOnline ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                            title="Синхронизация"
                        >
                             {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        Обзор
                    </button>
                    <button 
                        onClick={() => setActiveTab('players')} 
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'players' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        Игроки
                    </button>
                    <button 
                        onClick={() => setActiveTab('matches')} 
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'matches' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        Матчи
                    </button>
                </div>

                <div className="overflow-y-auto p-4 flex-1 no-scrollbar">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                                    <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalMatches}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Матчей</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 text-center">
                                    <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{stats.team1Wins + stats.team2Wins}</div>
                                    <div className="text-[10px] uppercase font-bold text-yellow-600/60 dark:text-yellow-400/60 tracking-wider">Побед</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                                    <div className="text-2xl font-black text-slate-500 dark:text-slate-400">{stats.draws}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ничьих</div>
                                </div>
                            </div>
                            
                            {stats.totalMatches > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Swords size={16} /> Распределение побед
                                    </h3>
                                    <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                                        {stats.team1Wins > 0 && (
                                            <div style={{ width: `${(stats.team1Wins / stats.totalMatches) * 100}%` }} className="h-full bg-secondary-500" />
                                        )}
                                        {stats.draws > 0 && (
                                            <div style={{ width: `${(stats.draws / stats.totalMatches) * 100}%` }} className="h-full bg-slate-400" />
                                        )}
                                        {stats.team2Wins > 0 && (
                                            <div style={{ width: `${(stats.team2Wins / stats.totalMatches) * 100}%` }} className="h-full bg-primary-500" />
                                        )}
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold mt-2 text-slate-500">
                                        <span className="text-secondary-600 dark:text-secondary-400">Team 1 (Odd)</span>
                                        <span className="text-primary-600 dark:text-primary-400">Team 2 (Even)</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Топ Игроков (по победам)</h3>
                                {stats.sortedPlayers.length === 0 ? (
                                    <div className="text-slate-400 text-xs italic">Нет данных</div>
                                ) : (
                                    stats.sortedPlayers.slice(0, 5).map((player, idx) => {
                                        const winRate = Math.round((player.wins / player.matches) * 100);
                                        return (
                                            <div key={player.name} className="flex items-center gap-3 mb-3 last:mb-0">
                                                <div className="w-6 text-center text-xs font-bold text-slate-400">{idx + 1}</div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                                                        <span>{player.name}</span>
                                                        <span>{player.wins} / {player.matches} ({winRate}%)</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div style={{ width: `${winRate}%` }} className="h-full bg-green-500 rounded-full" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'players' && (
                        <div className="space-y-2">
                             {stats.sortedPlayers.map(player => (
                                 <div key={player.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                     {editingPlayerName?.name === player.name ? (
                                         <form onSubmit={handlePlayerRenameSubmit} className="flex-1 flex gap-2 mr-2">
                                             <input 
                                                 autoFocus
                                                 type="text" 
                                                 value={editingPlayerName.value}
                                                 onChange={e => setEditingPlayerName({...editingPlayerName, value: e.target.value})}
                                                 className="flex-1 px-2 py-1 text-sm rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-1 focus:ring-primary-500"
                                             />
                                             <button type="submit" className="p-1 text-green-500"><Check size={18} /></button>
                                             <button type="button" onClick={() => setEditingPlayerName(null)} className="p-1 text-slate-400"><X size={18} /></button>
                                         </form>
                                     ) : (
                                         <>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    {player.name}
                                                    <button onClick={() => setEditingPlayerName({name: player.name, value: player.name})} className="text-slate-300 hover:text-primary-500 transition-colors"><Edit2 size={12} /></button>
                                                </div>
                                                <div className="text-xs text-slate-500">Матчей: {player.matches} | Побед: {player.wins}</div>
                                            </div>
                                            <div className="text-right">
                                                 <div className="text-xs font-bold text-green-600 dark:text-green-400">{Math.round((player.wins/player.matches)*100)}%</div>
                                                 <div className="text-[10px] text-slate-400">Винрейт</div>
                                            </div>
                                         </>
                                     )}
                                 </div>
                             ))}
                             {stats.sortedPlayers.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных об игроках</div>}
                        </div>
                    )}

                    {activeTab === 'matches' && (
                        <div>
                            <div className="flex justify-end gap-2 mb-4">
                                <button
                                    onClick={openAddMatch}
                                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 active:scale-95 transition-transform"
                                >
                                    <Plus size={14} /> Добавить
                                </button>
                                <button 
                                    onClick={() => setEditMode(!editMode)} 
                                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${editMode ? 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                                >
                                    <Edit2 size={12} /> {editMode ? 'Готово' : 'Редактировать'}
                                </button>
                            </div>
                            <div className="space-y-3">
                                {history.map(match => {
                                    const date = new Date(match.timestamp).toLocaleDateString();
                                    const time = new Date(match.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                    
                                    const team1Names = match.team1.map(p => p.name).join(', ');
                                    const team2Names = match.team2.map(p => p.name).join(', ');

                                    return (
                                        <div 
                                            key={match.id} 
                                            onClick={() => { if(editMode) openEditMatch(match); }}
                                            className={`relative p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all ${editMode ? 'cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 ring-2 ring-transparent hover:ring-primary-500/20' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Calendar size={10} /> {date} {time}</span>
                                                {editMode && (
                                                    <button onClick={(e) => { e.stopPropagation(); onDeleteMatch(match.id); }} className="text-red-400 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded relative z-10"><Trash2 size={14} /></button>
                                                )}
                                            </div>
                                            <div className={`flex items-center gap-2 mb-1 ${match.winner === 'team1' ? 'font-bold text-secondary-600 dark:text-secondary-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                                <div className={`w-2 h-2 rounded-full ${match.winner === 'team1' ? 'bg-secondary-500' : 'bg-slate-300'}`} />
                                                <span className="text-sm truncate">{team1Names}</span>
                                                {match.winner === 'team1' && <Trophy size={12} />}
                                            </div>
                                            <div className={`flex items-center gap-2 ${match.winner === 'team2' ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                                <div className={`w-2 h-2 rounded-full ${match.winner === 'team2' ? 'bg-primary-500' : 'bg-slate-300'}`} />
                                                <span className="text-sm truncate">{team2Names}</span>
                                                {match.winner === 'team2' && <Trophy size={12} />}
                                            </div>
                                            {match.winner === 'draw' && (
                                                <div className="absolute top-3 right-10 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 rounded">НИЧЬЯ</div>
                                            )}
                                            {editMode && <div className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-300 pointer-events-none"><Edit2 size={16} /></div>}
                                        </div>
                                    );
                                })}
                                {history.length === 0 && <div className="text-center text-slate-400 py-10">История пуста</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
