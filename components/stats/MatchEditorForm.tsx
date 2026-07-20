import React, { useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Shield, Swords } from 'lucide-react';
import { MatchPlayer, MatchRecord, Hero } from '../../types';

export interface MatchFormState {
    id?: string;
    date: string;
    time: string;
    t1p1: string; t1p1h: string; t1p1k: string;
    t1p2: string; t1p2h: string; t1p2k: string;
    t2p1: string; t2p1h: string; t2p1k: string;
    t2p2: string; t2p2h: string; t2p2k: string;
    winner: 'team1' | 'team2';
    errors: { [key: string]: boolean };
}

interface MatchEditorFormProps {
    matchForm: MatchFormState;
    setMatchForm: (form: MatchFormState | null) => void;
    matchFormClosing: boolean;
    closeMatchForm: () => void;
    allHeroesList: Hero[];
    uniquePlayerNames: string[];
    onAddMatch: (team1: MatchPlayer[], team2: MatchPlayer[], winner: 'team1' | 'team2', timestamp: number) => void;
    onUpdateMatch: (id: string, updates: Partial<MatchRecord>) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

export const MatchEditorForm: React.FC<MatchEditorFormProps> = ({
    matchForm,
    setMatchForm,
    matchFormClosing,
    closeMatchForm,
    allHeroesList,
    uniquePlayerNames,
    onAddMatch,
    onUpdateMatch,
    triggerHaptic
}) => {
    const [suggestions, setSuggestions] = useState<{ field: string, list: string[] } | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number, width: number } | null>(null);

    useLayoutEffect(() => {
        if (suggestions && anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        } else {
            setDropdownPosition(null);
        }
    }, [suggestions, anchorEl]);

    const validateHero = (name: string) => {
        if (!name.trim()) return true;
        return allHeroesList.some(h => h.name.toLowerCase() === name.trim().toLowerCase());
    }

    const handleMatchSubmit = () => {
        const errors: { [key: string]: boolean } = {};

        if (matchForm.t1p1h && !validateHero(matchForm.t1p1h)) errors.t1p1h = true;
        if (matchForm.t1p2h && !validateHero(matchForm.t1p2h)) errors.t1p2h = true;
        if (matchForm.t2p1h && !validateHero(matchForm.t2p1h)) errors.t2p1h = true;
        if (matchForm.t2p2h && !validateHero(matchForm.t2p2h)) errors.t2p2h = true;

        if (Object.keys(errors).length > 0) {
            triggerHaptic([20, 50, 20]);
            setMatchForm({ ...matchForm, errors });
            return;
        }

        const team1: MatchPlayer[] = [];
        if (matchForm.t1p1.trim()) {
            const hName = matchForm.t1p1h.trim();
            const killsVal = matchForm.t1p1k.trim();
            const kills = killsVal !== "" ? parseInt(killsVal, 10) : undefined;
            team1.push({
                name: matchForm.t1p1.trim(),
                heroName: hName,
                heroId: 'manual',
                ...(kills !== undefined && !isNaN(kills) ? { kills } : {})
            });
        }
        if (matchForm.t1p2.trim()) {
            const hName = matchForm.t1p2h.trim();
            const killsVal = matchForm.t1p2k.trim();
            const kills = killsVal !== "" ? parseInt(killsVal, 10) : undefined;
            team1.push({
                name: matchForm.t1p2.trim(),
                heroName: hName,
                heroId: 'manual',
                ...(kills !== undefined && !isNaN(kills) ? { kills } : {})
            });
        }

        const team2: MatchPlayer[] = [];
        if (matchForm.t2p1.trim()) {
            const hName = matchForm.t2p1h.trim();
            const killsVal = matchForm.t2p1k.trim();
            const kills = killsVal !== "" ? parseInt(killsVal, 10) : undefined;
            team2.push({
                name: matchForm.t2p1.trim(),
                heroName: hName,
                heroId: 'manual',
                ...(kills !== undefined && !isNaN(kills) ? { kills } : {})
            });
        }
        if (matchForm.t2p2.trim()) {
            const hName = matchForm.t2p2h.trim();
            const killsVal = matchForm.t2p2k.trim();
            const kills = killsVal !== "" ? parseInt(killsVal, 10) : undefined;
            team2.push({
                name: matchForm.t2p2.trim(),
                heroName: hName,
                heroId: 'manual',
                ...(kills !== undefined && !isNaN(kills) ? { kills } : {})
            });
        }

        if (team1.length === 0 || team2.length === 0) return;

        const timestamp = new Date(`${matchForm.date}T${matchForm.time}`).getTime();

        if (matchForm.id) {
            onUpdateMatch(matchForm.id, {
                team1, team2, winner: matchForm.winner, timestamp
            });
        } else {
            onAddMatch(team1, team2, matchForm.winner, timestamp);
        }
        triggerHaptic(50);
        closeMatchForm();
    };

    const handleAutocomplete = (field: string, value: string, target: HTMLElement) => {
        setMatchForm({
            ...matchForm,
            [field]: value,
            errors: { ...matchForm.errors, [field]: false }
        });

        setAnchorEl(target);

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
        if (suggestions) {
            setMatchForm({
                ...matchForm,
                [suggestions.field]: val,
                errors: { ...matchForm.errors, [suggestions.field]: false }
            });
            setSuggestions(null);
            setAnchorEl(null);
        }
    };

    const renderInput = (label: string, valKey: keyof typeof matchForm, icon?: React.ReactNode, placeholder: string = "") => {
        const value = matchForm[valKey] as string;
        const isError = matchForm.errors && matchForm.errors[valKey];

        return (
            <div className="flex-1 relative group">
                {label && <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">{label}</label>}
                <div className="relative">
                    <input
                        type="text"
                        value={value}
                        onFocus={(e) => setAnchorEl(e.target)}
                        onBlur={() => {
                            setTimeout(() => {
                                setSuggestions(null);
                                setAnchorEl(null);
                            }, 150);
                        }}
                        onChange={(e) => handleAutocomplete(valKey, e.target.value, e.target)}
                        placeholder={placeholder}
                        className={`w-full pl-8 pr-2 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border focus:bg-white dark:focus:bg-slate-900 outline-none transition-all ${isError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-primary-500'}`}
                    />
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isError ? 'text-red-500' : 'text-slate-400'}`}>
                        {icon}
                    </div>
                </div>
            </div>
        );
    };

    const renderKillsInput = (valKey: 't1p1k' | 't1p2k' | 't2p1k' | 't2p2k') => {
        const value = matchForm[valKey];

        const adjustKills = (amount: number) => {
            const current = parseInt(value, 10) || 0;
            const next = Math.max(0, current + amount);
            setMatchForm({
                ...matchForm,
                [valKey]: String(next)
            });
            triggerHaptic(10);
        };

        return (
            <div className="w-[84px] shrink-0 relative group">
                <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-primary-500 focus-within:bg-white dark:focus-within:bg-slate-900 overflow-hidden transition-all h-[38px] px-1">
                    <button
                        type="button"
                        onClick={() => adjustKills(-1)}
                        className="h-full w-5 flex items-center justify-center text-slate-400 active:text-slate-600 dark:active:text-slate-200 text-sm font-bold active:scale-75 transition-transform select-none"
                    >
                        -
                    </button>
                    <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={value}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\\d+$/.test(val)) {
                                setMatchForm({
                                    ...matchForm,
                                    [valKey]: val
                                });
                            }
                        }}
                        placeholder="💀"
                        className="w-full text-center bg-transparent outline-none text-xs font-bold text-slate-800 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                        type="button"
                        onClick={() => adjustKills(1)}
                        className="h-full w-5 flex items-center justify-center text-slate-400 active:text-slate-600 dark:active:text-slate-200 text-sm font-bold active:scale-75 transition-transform select-none"
                    >
                        +
                    </button>
                </div>
            </div>
        );
    };

    const renderAutocompletePortal = () => {
        if (!suggestions || !dropdownPosition) return null;

        return createPortal(
            <div
                className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-[100] overflow-hidden mt-1 animate-in fade-in zoom-in-95 duration-100"
                style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}
            >
                {suggestions.list.map(item => (
                    <button
                        key={item}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applySuggestion(item)}
                        className="w-full text-left px-3 py-2.5 text-sm active:bg-slate-50 dark:active:bg-slate-700 transition-colors truncate border-b border-slate-50 dark:border-slate-700 last:border-0"
                    >
                        {item}
                    </button>
                ))}
            </div>,
            document.body
        );
    };

    return (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm ${matchFormClosing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200'} fill-mode-forwards`}>
            <div className={`bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] border border-slate-100 dark:border-slate-800 overflow-hidden ${matchFormClosing ? 'animate-out zoom-out-95 duration-200' : 'animate-in zoom-in-95 duration-200'} fill-mode-forwards`}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {matchForm.id ? 'Редактировать' : 'Новый матч'}
                    </h2>
                    <button onClick={closeMatchForm} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar">
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Дата</label>
                            <input type="date" required value={matchForm.date} onChange={e => setMatchForm({ ...matchForm, date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500 text-slate-900 dark:text-white dark:[color-scheme:dark]" />
                        </div>
                        <div className="w-1/3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Время</label>
                            <input type="time" required value={matchForm.time} onChange={e => setMatchForm({ ...matchForm, time: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500 text-slate-900 dark:text-white dark:[color-scheme:dark]" />
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Команда 1</h3>
                            <button
                                onClick={() => setMatchForm({ ...matchForm, winner: 'team1' })}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${matchForm.winner === 'team1' ? 'bg-secondary-100 text-secondary-700 border-secondary-200 dark:bg-secondary-900/30 dark:text-secondary-400 dark:border-secondary-800' : 'bg-slate-100 text-slate-400 border-transparent dark:bg-slate-800'}`}
                            >
                                {matchForm.winner === 'team1' ? 'Победитель' : 'Выбрать победителем'}
                            </button>
                        </div>
                        <div className={`p-3 rounded-2xl border-2 transition-colors ${matchForm.winner === 'team1' ? 'border-secondary-500/50 bg-secondary-50/50 dark:bg-secondary-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                            <div className="space-y-3">
                                <div className="flex gap-2 items-end">
                                    {renderInput("", "t1p1", <User size={14} />, "Игрок 1")}
                                    {renderInput("", "t1p1h", <Shield size={14} />, "Герой")}
                                    {renderKillsInput("t1p1k")}
                                </div>
                                <div className="flex gap-2 items-end">
                                    {renderInput("", "t1p2", <User size={14} />, "Игрок 2")}
                                    {renderInput("", "t1p2h", <Shield size={14} />, "Герой")}
                                    {renderKillsInput("t1p2k")}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center my-1 relative z-10 pointer-events-none">
                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm text-slate-300">
                            <Swords size={16} />
                        </div>
                    </div>

                    <div className="mt-2">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Команда 2</h3>
                            <button
                                onClick={() => setMatchForm({ ...matchForm, winner: 'team2' })}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${matchForm.winner === 'team2' ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800' : 'bg-slate-100 text-slate-400 border-transparent dark:bg-slate-800'}`}
                            >
                                {matchForm.winner === 'team2' ? 'Победитель' : 'Выбрать победителем'}
                            </button>
                        </div>
                        <div className={`p-3 rounded-2xl border-2 transition-colors ${matchForm.winner === 'team2' ? 'border-primary-500/50 bg-primary-50/50 dark:bg-primary-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                            <div className="space-y-3">
                                <div className="flex gap-2 items-end">
                                    {renderInput("", "t2p1", <User size={14} />, "Игрок 3")}
                                    {renderInput("", "t2p1h", <Shield size={14} />, "Герой")}
                                    {renderKillsInput("t2p1k")}
                                </div>
                                <div className="flex gap-2 items-end">
                                    {renderInput("", "t2p2", <User size={14} />, "Игрок 4")}
                                    {renderInput("", "t2p2h", <Shield size={14} />, "Герой")}
                                    {renderKillsInput("t2p2k")}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900 z-10 mt-auto">
                    <button onClick={closeMatchForm} className="flex-1 py-3.5 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">Отмена</button>
                    <button onClick={handleMatchSubmit} className="flex-1 py-3.5 font-bold text-white bg-primary-600 rounded-xl shadow-lg shadow-primary-600/20 text-sm active:scale-95 transition-transform">Сохранить</button>
                </div>
            </div>
            {renderAutocompletePortal()}
        </div>
    );
};
