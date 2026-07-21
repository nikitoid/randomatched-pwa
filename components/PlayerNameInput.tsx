import React, { useState } from 'react';
import { ChevronDown, Users, Clock, Trash2, X, User } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

interface PlayerNameInputProps {
    isNamesOpen: boolean;
    setIsNamesOpen: (val: boolean) => void;
    filledNamesCount: number;
    savedTeams: string[][];
    historyScrollRef: React.RefObject<HTMLDivElement>;
    handleHistoryMouseDown: (e: React.MouseEvent) => void;
    handleHistoryMouseLeave: () => void;
    handleHistoryMouseUp: () => void;
    handleHistoryMouseMove: (e: React.MouseEvent) => void;
    isHistoryDragging: boolean;
    isHistoryDragScroll: boolean;
    deleteHistoryConfirm: number | null;
    handleSelectSavedTeam: (team: string[]) => void;
    handleDeleteHistoryItem: (e: React.MouseEvent, index: number) => void;
    playerNames: string[];
    handleNameChange: (index: number, value: string) => void;
    uniquePlayerNames: string[];
}

export const PlayerNameInput: React.FC<PlayerNameInputProps> = ({
    isNamesOpen,
    setIsNamesOpen,
    filledNamesCount,
    savedTeams,
    historyScrollRef,
    handleHistoryMouseDown,
    handleHistoryMouseLeave,
    handleHistoryMouseUp,
    handleHistoryMouseMove,
    isHistoryDragging,
    isHistoryDragScroll,
    deleteHistoryConfirm,
    handleSelectSavedTeam,
    handleDeleteHistoryItem,
    playerNames,
    handleNameChange,
    uniquePlayerNames,
}) => {
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    useBackHandler(isNamesOpen, () => setIsNamesOpen(false), { id: 'player-names-input', priority: 10 });

    const activeSuggestions = focusedIndex !== null
        ? uniquePlayerNames
            .filter(name => {
                const query = (playerNames[focusedIndex] || '').trim().toLowerCase();
                if (!query) return false;

                const cleanName = name.trim();
                const matchesQuery = cleanName.toLowerCase().includes(query);

                // Исключаем имена, уже введенные в другие инпуты
                const isAlreadyEntered = playerNames.some((pName, idx) =>
                    idx !== focusedIndex && pName.trim().toLowerCase() === cleanName.toLowerCase()
                );

                return matchesQuery && !isAlreadyEntered;
            })
            .slice(0, 5)
        : [];

    const filledNames = playerNames.map(n => n.trim()).filter(Boolean);
    const hasFilledNames = filledNames.length > 0;
    const filledNamesText = hasFilledNames ? filledNames.join(', ') : 'Не заполнены';

    return (
        <div className={`w-full mb-4 relative transition-all duration-300 ${isNamesOpen ? 'z-50' : 'z-20'}`}>
            <button
                onClick={() => setIsNamesOpen(!isNamesOpen)}
                className={`w-full p-4 min-h-[64px] flex items-center justify-between text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all duration-300 touch-manipulation ${isNamesOpen ? 'rounded-t-3xl border-b-transparent shadow-lg' : 'rounded-3xl shadow-sm active:scale-[0.99]'}`}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${hasFilledNames ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                        <Users size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="block font-heading text-sm font-bold text-slate-900 dark:text-white leading-tight">Имена игроков</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate block">{filledNamesText}</span>
                    </div>
                </div>
                <div className={`shrink-0 text-slate-300 transition-transform duration-300 ${isNamesOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>

            <div className={`absolute top-[100%] left-0 w-full bg-white dark:bg-slate-900 border border-t-0 border-slate-100 dark:border-slate-800 rounded-b-3xl shadow-xl transition-all duration-300 origin-top ${isNamesOpen ? 'opacity-100 scale-y-100 pointer-events-auto overflow-visible' : 'opacity-0 scale-y-0 pointer-events-none overflow-hidden'}`}>
                <div className="p-4 pt-5">

                    {savedTeams.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                <Clock size={12} /> <span>История команд</span>
                            </div>
                            <div
                                ref={historyScrollRef}
                                onMouseDown={handleHistoryMouseDown}
                                onMouseLeave={handleHistoryMouseLeave}
                                onMouseUp={handleHistoryMouseUp}
                                onMouseMove={handleHistoryMouseMove}
                                onWheel={(e) => {
                                    if (historyScrollRef.current) {
                                        historyScrollRef.current.scrollLeft += e.deltaY;
                                    }
                                }}
                                className={`flex gap-2 overflow-x-auto overscroll-contain no-scrollbar pb-2 px-1 touch-pan-x ${isHistoryDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                            >
                                {savedTeams.map((team, idx) => {
                                    const filled = team.filter(n => n.trim());
                                    const label = filled.length > 0 ? filled.slice(0, 2).join(', ') + (filled.length > 2 ? '...' : '') : 'Пустая команда';
                                    const isConfirmingDelete = deleteHistoryConfirm === idx;

                                    return (
                                        <div key={idx} className="relative group shrink-0 flex items-center">
                                            <button
                                                onClick={() => {
                                                    if (isHistoryDragScroll || isConfirmingDelete) return;
                                                    handleSelectSavedTeam(team);
                                                }}
                                                className={`pl-3 pr-8 py-2 min-h-[38px] rounded-xl text-xs font-medium transition-all border select-none active:scale-95 touch-manipulation
                                                    ${isConfirmingDelete
                                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-200 dark:border-red-900/50'
                                                        : 'bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent active:border-primary-500'
                                                    }
                                                `}
                                                style={{ pointerEvents: 'auto' }}
                                            >
                                                {label}
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteHistoryItem(e, idx)}
                                                className={`absolute right-1 w-8 h-8 flex items-center justify-center rounded-lg transition-colors touch-manipulation
                                                    ${isConfirmingDelete
                                                        ? 'text-red-600 active:bg-red-100 dark:text-red-400'
                                                        : 'text-slate-400 active:text-red-500 active:bg-slate-200 dark:active:bg-slate-700'
                                                    }
                                                `}
                                                aria-label="Удалить команду из истории"
                                            >
                                                {isConfirmingDelete ? <Trash2 size={13} /> : <X size={13} />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="relative group">
                                <input
                                    type="text"
                                    value={playerNames[index]}
                                    onChange={(e) => handleNameChange(index, e.target.value)}
                                    onFocus={() => setFocusedIndex(index)}
                                    onBlur={() => setFocusedIndex(null)}
                                    placeholder={`Игрок ${index + 1}`}
                                    className="w-full pl-9 pr-4 py-3 min-h-[44px] bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 select-text touch-manipulation"
                                />
                                <div className="absolute left-3 top-1/2 -translate-x-0 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <User size={14} />
                                </div>
                                {focusedIndex === index && activeSuggestions.length > 0 && (
                                    <div className="suggestions-dropdown absolute top-[100%] left-0 right-0 mt-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto overscroll-contain">
                                            {activeSuggestions.map((name) => (
                                                <button
                                                    key={name}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleNameChange(index, name);
                                                        setFocusedIndex(null);
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 min-h-[40px] text-xs font-bold text-slate-700 dark:text-slate-200 active:bg-primary-50 active:text-primary-600 dark:active:bg-primary-950/40 dark:active:text-primary-400 rounded-xl transition-all active:scale-[0.98] touch-manipulation flex items-center gap-2"
                                                >
                                                    <User size={12} className="text-slate-400" />
                                                    <span>{name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
