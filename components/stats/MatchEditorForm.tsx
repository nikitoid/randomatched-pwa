import React, { useState } from 'react';
import { User, Shield, Swords } from 'lucide-react';
import { MatchPlayer, MatchRecord, Hero } from '../../types';
import { BaseModal } from '../common/BaseModal';

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
    closeMatchForm,
    allHeroesList,
    uniquePlayerNames,
    onAddMatch,
    onUpdateMatch,
    triggerHaptic
}) => {
    const [focusedField, setFocusedField] = useState<keyof MatchFormState | null>(null);

    const getSuggestionsForField = (field: keyof MatchFormState): string[] => {
        const isHeroField = field.endsWith('h');
        const rawValue = matchForm[field] as string || '';
        const currentValue = rawValue.trim().toLowerCase();

        // Показываем подсказки только при вводе от 2х символов
        if (currentValue.length < 2) {
            return [];
        }

        if (isHeroField) {
            const heroFields: (keyof MatchFormState)[] = ['t1p1h', 't1p2h', 't2p1h', 't2p2h'];
            const selectedHeroes = heroFields
                .filter(f => f !== field)
                .map(f => (matchForm[f] as string || '').trim().toLowerCase())
                .filter(Boolean);

            return allHeroesList
                .filter(h => {
                    const nameLower = h.name.trim().toLowerCase();
                    const matchesQuery = nameLower.includes(currentValue);
                    const isAlreadySelected = selectedHeroes.includes(nameLower);
                    return matchesQuery && !isAlreadySelected;
                })
                .map(h => h.name)
                .slice(0, 5);
        } else {
            const playerFields: (keyof MatchFormState)[] = ['t1p1', 't1p2', 't2p1', 't2p2'];
            const selectedPlayers = playerFields
                .filter(f => f !== field)
                .map(f => (matchForm[f] as string || '').trim().toLowerCase())
                .filter(Boolean);

            return uniquePlayerNames
                .filter(name => {
                    const nameLower = name.trim().toLowerCase();
                    const matchesQuery = nameLower.includes(currentValue);
                    const isAlreadySelected = selectedPlayers.includes(nameLower);
                    return matchesQuery && !isAlreadySelected;
                })
                .slice(0, 5);
        }
    };

    const applySuggestion = (field: keyof MatchFormState, val: string) => {
        setMatchForm({
            ...matchForm,
            [field]: val,
            errors: { ...matchForm.errors, [field]: false }
        });
        setFocusedField(null);
        triggerHaptic(10);
    };

    const validateHero = (name: string) => {
        if (!name.trim()) return true;
        return allHeroesList.some(h => h.name.toLowerCase() === name.trim().toLowerCase());
    };

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

    const renderInput = (label: string, valKey: keyof MatchFormState, icon?: React.ReactNode, placeholder: string = "") => {
        const value = matchForm[valKey] as string;
        const isError = matchForm.errors && matchForm.errors[valKey];
        const isFocused = focusedField === valKey;
        const isHeroField = valKey.endsWith('h');
        const activeSuggestions = isFocused ? getSuggestionsForField(valKey) : [];

        return (
            <div className="flex-1 relative group">
                {label && <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">{label}</label>}
                <div className="relative">
                    <input
                        type="text"
                        value={value}
                        onFocus={() => setFocusedField(valKey)}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => {
                            setMatchForm({
                                ...matchForm,
                                [valKey]: e.target.value,
                                errors: { ...matchForm.errors, [valKey]: false }
                            });
                        }}
                        placeholder={placeholder}
                        className={`w-full pl-8 pr-2 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border focus:bg-white dark:focus:bg-slate-900 outline-none transition-all ${isError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-primary-500'}`}
                    />
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isError ? 'text-red-500' : 'text-slate-400'}`}>
                        {icon}
                    </div>

                    {isFocused && activeSuggestions.length > 0 && (
                        <div className={`suggestions-dropdown absolute top-[100%] mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${
                            isHeroField
                                ? 'right-0 min-w-[180px] sm:min-w-[220px] max-w-[calc(100vw-48px)]'
                                : 'left-0 min-w-[180px] sm:min-w-[220px] max-w-[calc(100vw-48px)]'
                        }`}>
                            <div className="p-1 flex flex-col gap-0.5 max-h-44 overflow-y-auto overscroll-contain no-scrollbar">
                                {activeSuggestions.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            applySuggestion(valKey, item);
                                        }}
                                        className="w-full text-left px-2.5 py-2 min-h-[36px] text-xs font-bold text-slate-700 dark:text-slate-200 active:bg-primary-50 active:text-primary-600 dark:active:bg-primary-950/50 dark:active:text-primary-400 rounded-lg transition-all flex items-center gap-2 touch-manipulation select-none"
                                    >
                                        {isHeroField ? (
                                            <Shield size={12} className="text-primary-500 shrink-0" />
                                        ) : (
                                            <User size={12} className="text-slate-400 shrink-0" />
                                        )}
                                        <span className="truncate">{item}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
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
                            if (val === '' || /^\d+$/.test(val)) {
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

    return (
        <BaseModal
            isOpen={!!matchForm}
            onClose={closeMatchForm}
            title={matchForm.id ? 'Редактировать матч' : 'Новый матч'}
            subtitle="Заполните параметры и участников матча"
            icon={<Swords size={20} className="text-primary-600 dark:text-primary-400" />}
            maxWidth="md"
            variant="auto"
            modalId="match-editor-modal"
            priority={50}
            closeButtonTestId="close-match-editor-btn"
            showCloseButton={false}
            footer={(close) => (
                <div className="flex gap-3 w-full">
                    <button
                        type="button"
                        onClick={close}
                        className="flex-1 py-3.5 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm active:scale-95 transition-transform"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleMatchSubmit}
                        className="flex-1 py-3.5 font-bold text-white bg-primary-600 rounded-xl shadow-lg shadow-primary-600/20 text-sm active:scale-95 transition-transform"
                    >
                        Сохранить
                    </button>
                </div>
            )}
        >
            <div className="space-y-4">
                <div className="flex gap-4 mb-2">
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
                            type="button"
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
                            type="button"
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
        </BaseModal>
    );
};
