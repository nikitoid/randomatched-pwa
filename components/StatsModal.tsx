
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Trophy, Swords, Edit2, Trash2, Save, RefreshCw, Loader2, Plus, User, Shield, ChevronLeft, Calendar, Check, Search, TrendingUp, TrendingDown, Star, Skull, AlertCircle } from 'lucide-react';
import { MatchRecord, PlayerStat, MatchPlayer, HeroList, Hero, HeroStat } from '../types';

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: MatchRecord[];
    onDeleteMatch: (id: string) => void;
    onUpdateMatch: (id: string, data: Partial<MatchRecord>) => void;
    onAddMatch: (t1: MatchPlayer[], t2: MatchPlayer[], winner: 'team1' | 'team2', timestamp: number) => void;
    onRenamePlayer: (oldName: string, newName: string) => void;
    onRenameHero: (oldName: string, newName: string) => void;
    onSync: () => void;
    isSyncing: boolean;
    isOnline: boolean;
    lists: HeroList[]; // For autocomplete
}

export const StatsModal: React.FC<StatsModalProps> = ({
    isOpen,
    onClose,
    history,
    onDeleteMatch,
    onUpdateMatch,
    onAddMatch,
    onRenamePlayer,
    onRenameHero,
    onSync,
    isSyncing,
    isOnline,
    lists
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'heroes' | 'matches'>('overview');
    const [editMode, setEditMode] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    
    // Swipe Logic
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const touchStartY = useRef(0);
    const touchEndY = useRef(0);
    
    // Rename States
    const [editingItemName, setEditingItemName] = useState<{name: string, value: string, type: 'player' | 'hero'} | null>(null);

    // Match Form State
    const [matchForm, setMatchForm] = useState<{
        id?: string;
        date: string;
        time: string;
        t1p1: string; t1p1h: string;
        t1p2: string; t1p2h: string;
        t2p1: string; t2p1h: string;
        t2p2: string; t2p2h: string;
        winner: 'team1' | 'team2';
        errors: { [key: string]: boolean };
    } | null>(null);

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<{ field: string, list: string[] } | null>(null);

    // Reset states on close
    useEffect(() => {
        if (!isOpen) {
            setEditMode(false);
            setEditingItemName(null);
            setMatchForm(null);
            setDeleteConfirmId(null);
            // Don't reset activeTab immediately for exit animation smoothness
        }
    }, [isOpen]);

    // All Heroes for Validation
    const allHeroesList = useMemo(() => {
        const unique = new Map<string, Hero>();
        lists.forEach(l => l.heroes.forEach(h => {
            const name = h.name.trim();
            if (name && !unique.has(name.toLowerCase())) {
                unique.set(name.toLowerCase(), h);
            }
        }));
        return Array.from(unique.values());
    }, [lists]);

    // Unique Players for Autocomplete
    const uniquePlayerNames = useMemo(() => {
        const names = new Set<string>();
        history.forEach(m => {
            m.team1.forEach(p => names.add(p.name));
            m.team2.forEach(p => names.add(p.name));
        });
        return Array.from(names).sort();
    }, [history]);

    // Statistics Calculation
    const { totalMatches, sortedPlayers, sortedHeroes, mvp, underdog } = useMemo(() => {
        const playerStats: Record<string, PlayerStat> = {};
        const heroStats: Record<string, HeroStat> = {};
        let totalMatches = 0;

        history.forEach(match => {
            totalMatches++;
            const winner = match.winner;

            const processPlayer = (name: string, won: boolean, heroName: string) => {
                const cleanName = name.trim();
                const cleanHero = heroName.trim() || 'Unknown';
                if (!cleanName) return;
                
                if (!playerStats[cleanName]) {
                    playerStats[cleanName] = { name: cleanName, matches: 0, wins: 0, losses: 0, heroesPlayed: {}, score: 0 };
                }
                playerStats[cleanName].matches++;
                if (won) playerStats[cleanName].wins++;
                else playerStats[cleanName].losses++;

                playerStats[cleanName].heroesPlayed[cleanHero] = (playerStats[cleanName].heroesPlayed[cleanHero] || 0) + 1;

                // Hero Stats
                if (cleanHero !== 'Unknown') {
                    if (!heroStats[cleanHero]) {
                        heroStats[cleanHero] = { name: cleanHero, matches: 0, wins: 0, losses: 0 };
                    }
                    heroStats[cleanHero].matches++;
                    if (won) heroStats[cleanHero].wins++;
                    else heroStats[cleanHero].losses++;
                }
            };

            match.team1.forEach(p => processPlayer(p.name, winner === 'team1', p.heroName));
            match.team2.forEach(p => processPlayer(p.name, winner === 'team2', p.heroName));
        });

        // Calculate Weighted Score for Players (Bayesian-ish or simple weighted)
        Object.values(playerStats).forEach(p => {
            const winRate = p.matches > 0 ? p.wins / p.matches : 0;
            p.score = winRate * (1 - 1 / (p.matches + 1)); 
        });

        const sortedPlayers = Object.values(playerStats).sort((a, b) => b.score - a.score || b.wins - a.wins);
        const sortedHeroes = Object.values(heroStats).sort((a, b) => (b.wins/b.matches) - (a.wins/a.matches) || b.matches - a.matches);

        const qualifiedPlayers = sortedPlayers.filter(p => p.matches >= 2);
        const mvp = qualifiedPlayers.length > 0 ? qualifiedPlayers[0] : (sortedPlayers.length > 0 ? sortedPlayers[0] : null);
        const underdog = qualifiedPlayers.length > 0 ? qualifiedPlayers[qualifiedPlayers.length - 1] : (sortedPlayers.length > 0 ? sortedPlayers[sortedPlayers.length - 1] : null);

        return { totalMatches, sortedPlayers, sortedHeroes, mvp, underdog };
    }, [history]);

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItemName && editingItemName.value.trim() && editingItemName.value !== editingItemName.name) {
            if (editingItemName.type === 'player') {
                onRenamePlayer(editingItemName.name, editingItemName.value.trim());
            } else {
                onRenameHero(editingItemName.name, editingItemName.value.trim());
            }
        }
        setEditingItemName(null);
    };

    const openAddMatch = () => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);

        setMatchForm({
            date: dateStr,
            time: timeStr,
            t1p1: '', t1p1h: '',
            t1p2: '', t1p2h: '',
            t2p1: '', t2p1h: '',
            t2p2: '', t2p2h: '',
            winner: 'team1',
            errors: {}
        });
    };

    const openEditMatch = (match: MatchRecord) => {
        const d = new Date(match.timestamp);
        // Correct timezone offset adjustment for input value
        const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const timeStr = d.toTimeString().slice(0, 5);

        setMatchForm({
            id: match.id,
            date: dateStr,
            time: timeStr,
            t1p1: match.team1[0]?.name || '', t1p1h: match.team1[0]?.heroName || '',
            t1p2: match.team1[1]?.name || '', t1p2h: match.team1[1]?.heroName || '',
            t2p1: match.team2[0]?.name || '', t2p1h: match.team2[0]?.heroName || '',
            t2p2: match.team2[1]?.name || '', t2p2h: match.team2[1]?.heroName || '',
            winner: match.winner || 'team1',
            errors: {}
        });
    };

    const validateHero = (name: string) => {
        if (!name.trim()) return true; // allow empty if logical, but here we require heroes usually. Let's say empty is allowed but if filled must exist.
        return allHeroesList.some(h => h.name.toLowerCase() === name.trim().toLowerCase());
    }

    const handleMatchSubmit = () => {
        if (!matchForm) return;

        const errors: {[key: string]: boolean} = {};
        
        // Validate Heroes
        if (matchForm.t1p1h && !validateHero(matchForm.t1p1h)) errors.t1p1h = true;
        if (matchForm.t1p2h && !validateHero(matchForm.t1p2h)) errors.t1p2h = true;
        if (matchForm.t2p1h && !validateHero(matchForm.t2p1h)) errors.t2p1h = true;
        if (matchForm.t2p2h && !validateHero(matchForm.t2p2h)) errors.t2p2h = true;

        if (Object.keys(errors).length > 0) {
            setMatchForm({...matchForm, errors});
            return;
        }

        const team1: MatchPlayer[] = [];
        if (matchForm.t1p1.trim()) team1.push({ name: matchForm.t1p1.trim(), heroName: matchForm.t1p1h.trim(), heroId: 'manual' });
        if (matchForm.t1p2.trim()) team1.push({ name: matchForm.t1p2.trim(), heroName: matchForm.t1p2h.trim(), heroId: 'manual' });

        const team2: MatchPlayer[] = [];
        if (matchForm.t2p1.trim()) team2.push({ name: matchForm.t2p1.trim(), heroName: matchForm.t2p1h.trim(), heroId: 'manual' });
        if (matchForm.t2p2.trim()) team2.push({ name: matchForm.t2p2.trim(), heroName: matchForm.t2p2h.trim(), heroId: 'manual' });

        if (team1.length === 0 || team2.length === 0) return;

        const timestamp = new Date(`${matchForm.date}T${matchForm.time}`).getTime();

        if (matchForm.id) {
            onUpdateMatch(matchForm.id, {
                team1, team2, winner: matchForm.winner, timestamp
            });
        } else {
            onAddMatch(team1, team2, matchForm.winner, timestamp);
        }
        setMatchForm(null);
    };

    const handleAutocomplete = (field: string, value: string) => {
        if (!matchForm) return;
        setMatchForm({ 
            ...matchForm, 
            [field]: value,
            errors: { ...matchForm.errors, [field]: false } // clear error on type
        });

        if (value.length < 1) {
            setSuggestions(null);
            return;
        }

        const isHeroField = field.endsWith('h');
        let matches: string[] = [];

        if (isHeroField) {
             matches = allHeroesList
                .filter(h => h.name.toLowerCase().includes(value.toLowerCase()))
                .map(h => h.name)
                .slice(0, 5);
        } else {
             matches = uniquePlayerNames
                .filter(name => name.toLowerCase().includes(value.toLowerCase()))
                .slice(0, 5);
        }

        if (matches.length > 0) {
            setSuggestions({ field, list: matches });
        } else {
            setSuggestions(null);
        }
    };

    const applySuggestion = (val: string) => {
        if (suggestions && matchForm) {
            setMatchForm({ 
                ...matchForm, 
                [suggestions.field]: val,
                errors: { ...matchForm.errors, [suggestions.field]: false }
            });
            setSuggestions(null);
        }
    };

    const confirmDeleteMatch = () => {
        if (deleteConfirmId) {
            onDeleteMatch(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    }

    // Swipe Handling
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchStartY.current = e.targetTouches[0].clientY;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        touchEndX.current = e.changedTouches[0].clientX;
        touchEndY.current = e.changedTouches[0].clientY;
        const diffX = touchStartX.current - touchEndX.current;
        const diffY = touchStartY.current - touchEndY.current;
        const SWIPE_THRESHOLD = 50;
        
        // Ensure horizontal swipe is dominant to prevent accidental switching while scrolling
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
            const tabs = ['overview', 'players', 'heroes', 'matches'];
            const idx = tabs.indexOf(activeTab);
            if (diffX > 0 && idx < tabs.length - 1) setActiveTab(tabs[idx + 1] as any);
            if (diffX < 0 && idx > 0) setActiveTab(tabs[idx - 1] as any);
        }
    };

    const renderInput = (label: string, valKey: keyof typeof matchForm, icon?: React.ReactNode, placeholder: string = "") => {
        if (!matchForm) return null;
        const value = matchForm[valKey as keyof typeof matchForm] as string;
        const isError = matchForm.errors && matchForm.errors[valKey as string];
        
        return (
            <div className="flex-1 relative group">
                {label && <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">{label}</label>}
                <div className="relative">
                    <input 
                        type="text" 
                        value={value}
                        onChange={(e) => handleAutocomplete(valKey as string, e.target.value)}
                        placeholder={placeholder}
                        className={`w-full pl-8 pr-2 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border focus:bg-white dark:focus:bg-slate-900 outline-none transition-all ${isError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-primary-500'}`}
                    />
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isError ? 'text-red-500' : 'text-slate-400'}`}>
                        {icon}
                    </div>
                </div>
                {suggestions && suggestions.field === valKey && (
                    <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden mt-1 animate-in fade-in zoom-in-95 duration-100">
                        {suggestions.list.map(item => (
                            <button 
                                key={item}
                                onClick={() => applySuggestion(item)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors truncate border-b border-slate-50 dark:border-slate-700 last:border-0"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Match Form Overlay
    if (matchForm) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {matchForm.id ? 'Редактировать' : 'Новый матч'}
                        </h2>
                        <button onClick={() => setMatchForm(null)} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto custom-scrollbar">
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Дата</label>
                                <input type="date" required value={matchForm.date} onChange={e => setMatchForm({...matchForm, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500" />
                            </div>
                            <div className="w-1/3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Время</label>
                                <input type="time" required value={matchForm.time} onChange={e => setMatchForm({...matchForm, time: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500" />
                            </div>
                        </div>

                        {/* Team 1 */}
                        <div className="mb-2">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Команда 1</h3>
                                <button 
                                    onClick={() => setMatchForm({...matchForm, winner: 'team1'})}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${matchForm.winner === 'team1' ? 'bg-secondary-100 text-secondary-700 border-secondary-200 dark:bg-secondary-900/30 dark:text-secondary-400 dark:border-secondary-800' : 'bg-slate-100 text-slate-400 border-transparent dark:bg-slate-800'}`}
                                >
                                    {matchForm.winner === 'team1' ? 'Победитель' : 'Выбрать победителем'}
                                </button>
                            </div>
                            <div className={`p-3 rounded-2xl border-2 transition-colors ${matchForm.winner === 'team1' ? 'border-secondary-500/50 bg-secondary-50/50 dark:bg-secondary-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        {renderInput("", "t1p1", <User size={14}/>, "Игрок 1")}
                                        {renderInput("", "t1p1h", <Shield size={14}/>, "Герой")}
                                    </div>
                                    <div className="flex gap-2">
                                        {renderInput("", "t1p2", <User size={14}/>, "Игрок 2")}
                                        {renderInput("", "t1p2h", <Shield size={14}/>, "Герой")}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center my-1 relative z-10 pointer-events-none">
                            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm text-slate-300">
                                <Swords size={16} />
                            </div>
                        </div>

                        {/* Team 2 */}
                        <div className="mt-2">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Команда 2</h3>
                                <button 
                                    onClick={() => setMatchForm({...matchForm, winner: 'team2'})}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${matchForm.winner === 'team2' ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800' : 'bg-slate-100 text-slate-400 border-transparent dark:bg-slate-800'}`}
                                >
                                    {matchForm.winner === 'team2' ? 'Победитель' : 'Выбрать победителем'}
                                </button>
                            </div>
                            <div className={`p-3 rounded-2xl border-2 transition-colors ${matchForm.winner === 'team2' ? 'border-primary-500/50 bg-primary-50/50 dark:bg-primary-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        {renderInput("", "t2p1", <User size={14}/>, "Игрок 3")}
                                        {renderInput("", "t2p1h", <Shield size={14}/>, "Герой")}
                                    </div>
                                    <div className="flex gap-2">
                                        {renderInput("", "t2p2", <User size={14}/>, "Игрок 4")}
                                        {renderInput("", "t2p2h", <Shield size={14}/>, "Герой")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900 z-10 mt-auto">
                        <button onClick={() => setMatchForm(null)} className="flex-1 py-3.5 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">Отмена</button>
                        <button onClick={handleMatchSubmit} className="flex-1 py-3.5 font-bold text-white bg-primary-600 rounded-xl shadow-lg shadow-primary-600/20 text-sm active:scale-95 transition-transform">Сохранить</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} 
            onClick={onClose}
        >
            <div 
                className={`bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col h-[90dvh] border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 sticky top-0">
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

                <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
                    {['overview', 'players', 'heroes', 'matches'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)} 
                            className={`flex-1 min-w-[80px] py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                            {tab === 'overview' ? 'Обзор' : tab === 'players' ? 'Игроки' : tab === 'heroes' ? 'Герои' : 'Матчи'}
                        </button>
                    ))}
                </div>
                
                {/* Matches Tab Action Bar - Sticky under tabs */}
                {activeTab === 'matches' && (
                    <div className="flex justify-end gap-2 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-100 dark:border-slate-800">
                        <button
                            onClick={openAddMatch}
                            className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 active:scale-95 transition-transform"
                        >
                            <Plus size={16} /> Добавить
                        </button>
                        <button 
                            onClick={() => setEditMode(!editMode)} 
                            className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors flex items-center gap-1.5 ${editMode ? 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                        >
                            <Edit2 size={16} /> {editMode ? 'Готово' : 'Редактировать'}
                        </button>
                    </div>
                )}

                <div 
                    className={`overflow-y-auto flex-1 no-scrollbar touch-pan-y ${activeTab === 'matches' ? 'p-0 pb-20' : 'p-4'}`}
                    onTouchStart={handleTouchStart} 
                    onTouchEnd={handleTouchEnd}
                >
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">{totalMatches}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Всего матчей</div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* MVP Card */}
                                <div className="p-4 rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-100 dark:border-yellow-900/30 relative overflow-hidden">
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

                                {/* Underdog Card */}
                                <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
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

                            {/* Top Efficiency Chart */}
                            <div className="pt-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-primary-500" /> Топ эффективности
                                </h3>
                                <div className="space-y-3">
                                    {sortedPlayers.filter(p => p.matches > 1).slice(0, 5).map((player, i) => {
                                        const winRate = (player.wins / player.matches) * 100;
                                        return (
                                            <div key={player.name}>
                                                <div className="flex justify-between text-xs font-medium mb-1">
                                                    <span className="text-slate-700 dark:text-slate-300">{i+1}. {player.name}</span>
                                                    <span className="text-slate-500">{Math.round(winRate)}% <span className="text-[9px] opacity-60">({player.wins}/{player.matches})</span></span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${winRate}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {sortedPlayers.filter(p => p.matches > 1).length === 0 && (
                                        <div className="text-xs text-slate-400 italic text-center py-4">Недостаточно матчей для статистики</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'players' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                             {sortedPlayers.map((player, idx) => (
                                 <div key={player.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                     {editingItemName?.name === player.name && editingItemName.type === 'player' ? (
                                         <form onSubmit={handleRenameSubmit} className="flex-1 flex gap-2 mr-2">
                                             <input 
                                                 autoFocus
                                                 type="text" 
                                                 value={editingItemName.value}
                                                 onChange={e => setEditingItemName({...editingItemName, value: e.target.value})}
                                                 className="flex-1 px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
                                             />
                                             <button type="submit" className="p-2 bg-green-100 text-green-600 rounded-xl"><Check size={16} /></button>
                                             <button type="button" onClick={() => setEditingItemName(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl"><X size={16} /></button>
                                         </form>
                                     ) : (
                                         <>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        {player.name}
                                                        <button onClick={() => setEditingItemName({name: player.name, value: player.name, type: 'player'})} className="text-slate-300 hover:text-primary-500 transition-colors"><Edit2 size={12} /></button>
                                                    </div>
                                                    <div className="text-xs text-slate-500">Игр: {player.matches} • Побед: {player.wins}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                 <div className={`text-sm font-bold ${player.wins/player.matches >= 0.5 ? 'text-green-600' : 'text-slate-500'}`}>{Math.round((player.wins/player.matches)*100)}%</div>
                                            </div>
                                         </>
                                     )}
                                 </div>
                             ))}
                             {sortedPlayers.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных об игроках</div>}
                        </div>
                    )}

                    {activeTab === 'heroes' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                             {sortedHeroes.map((hero, idx) => (
                                 <div key={hero.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                     {editingItemName?.name === hero.name && editingItemName.type === 'hero' ? (
                                         <form onSubmit={handleRenameSubmit} className="flex-1 flex gap-2 mr-2">
                                             <input 
                                                 autoFocus
                                                 type="text" 
                                                 value={editingItemName.value}
                                                 onChange={e => setEditingItemName({...editingItemName, value: e.target.value})}
                                                 className="flex-1 px-3 py-1.5 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500"
                                             />
                                             <button type="submit" className="p-2 bg-green-100 text-green-600 rounded-xl"><Check size={16} /></button>
                                             <button type="button" onClick={() => setEditingItemName(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl"><X size={16} /></button>
                                         </form>
                                     ) : (
                                         <>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                    <Shield size={14} className="text-slate-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                                        {hero.name}
                                                        <button onClick={() => setEditingItemName({name: hero.name, value: hero.name, type: 'hero'})} className="text-slate-300 hover:text-primary-500 transition-colors"><Edit2 size={12} /></button>
                                                    </div>
                                                    <div className="text-xs text-slate-500">Игр: {hero.matches}</div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                 <div className={`text-sm font-bold ${hero.wins/hero.matches >= 0.5 ? 'text-green-600' : 'text-slate-500'}`}>{Math.round((hero.wins/hero.matches)*100)}%</div>
                                            </div>
                                         </>
                                     )}
                                 </div>
                             ))}
                             {sortedHeroes.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных о героях</div>}
                        </div>
                    )}

                    {activeTab === 'matches' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 px-4">
                            <div className="space-y-3">
                                {history.map(match => {
                                    const date = new Date(match.timestamp).toLocaleDateString();
                                    const time = new Date(match.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                    
                                    return (
                                        <div 
                                            key={match.id} 
                                            className={`relative overflow-hidden p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all ${editMode ? 'pr-12' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-3 border-b border-slate-50 dark:border-slate-700 pb-2">
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Calendar size={10} /> {date} <span className="opacity-50">|</span> {time}</span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {/* Team 1 */}
                                                <div className={`flex items-center gap-2 ${match.winner === 'team1' ? 'opacity-100' : 'opacity-60'}`}>
                                                    <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team1' ? 'bg-secondary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                            {match.team1.map(p => p.name).join(', ')}
                                                            {match.winner === 'team1' && <Trophy size={10} className="text-yellow-500" />}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 flex gap-2">
                                                            {match.team1.map(p => p.heroName).join(' & ')}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Team 2 */}
                                                <div className={`flex items-center gap-2 ${match.winner === 'team2' ? 'opacity-100' : 'opacity-60'}`}>
                                                    <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team2' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                            {match.team2.map(p => p.name).join(', ')}
                                                            {match.winner === 'team2' && <Trophy size={10} className="text-yellow-500" />}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 flex gap-2">
                                                            {match.team2.map(p => p.heroName).join(' & ')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {editMode && (
                                                <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/80 border-l border-slate-100 dark:border-slate-700 backdrop-blur-sm z-10">
                                                    <button onClick={() => openEditMatch(match)} className="p-2 text-blue-500 active:scale-90 transition-transform"><Edit2 size={16} /></button>
                                                    <button onClick={() => setDeleteConfirmId(match.id)} className="p-2 text-red-500 active:scale-90 transition-transform"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {history.length === 0 && <div className="text-center text-slate-400 py-10">История пуста</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <div 
                className={`fixed inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${deleteConfirmId ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                onClick={(e) => e.stopPropagation()} 
            >
                 <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${deleteConfirmId ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4"><Trash2 size={24} /></div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Удалить матч?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Это действие необратимо.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setDeleteConfirmId(null)} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                       <button onClick={confirmDeleteMatch} className="py-3 font-bold text-white bg-red-500 rounded-xl">Удалить</button>
                    </div>
                 </div>
            </div>

        </div>
    );
};
