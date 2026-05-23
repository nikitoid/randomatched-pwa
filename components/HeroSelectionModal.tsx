import React, { useState, useMemo } from 'react';
import { Hero } from '../types';
import { Search, X, User } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

interface HeroSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (hero: Hero) => void;
    availableHeroes: Hero[];
    unavailableHeroIds: Set<string>;
    currentHeroId?: string;
}

export const HeroSelectionModal: React.FC<HeroSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    availableHeroes,
    unavailableHeroIds,
    currentHeroId
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    useBackHandler(isOpen, onClose, { id: 'hero-selection-modal', priority: 20 });

    const filteredHeroes = useMemo(() => {
        return availableHeroes
            .filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [availableHeroes, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div data-testid="hero-selection-modal" className="bg-white dark:bg-slate-900 bg-grid-pattern w-full max-w-md h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/10 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-900 dark:text-white">Выберите героя</h3>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Поиск героя..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                    {filteredHeroes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 opacity-60">
                            <Search size={48} strokeWidth={1.5} />
                            <p>Герои не найдены</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1">
                            {filteredHeroes.map(hero => {
                                const isUsed = unavailableHeroIds.has(hero.id);
                                const isCurrent = hero.id === currentHeroId;

                                return (
                                    <button
                                        key={hero.id}
                                        onClick={() => !isUsed && !isCurrent && onSelect(hero)}
                                        disabled={isUsed || isCurrent}
                                        className={`
                                            flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group
                                            ${isCurrent
                                                ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500/50 cursor-default'
                                                : isUsed
                                                    ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] active:bg-slate-100 dark:active:bg-slate-700'}
                                        `}
                                    >
                                        <div className={`
                                            w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg font-bold
                                            ${isCurrent
                                                ? 'bg-primary-500 text-white shadow-md'
                                                : isUsed
                                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                                    : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform'}
                                        `}>
                                            {hero.name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold truncate ${isUsed ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {hero.name}
                                            </div>
                                            {hero.rank && (
                                                <div className="text-[10px] sm:text-xs text-slate-400 font-medium">
                                                    Ранг: {hero.rank}
                                                </div>
                                            )}
                                        </div>

                                        {isCurrent && (
                                            <div className="text-[10px] font-bold text-primary-500 px-2 py-1 bg-primary-100 dark:bg-primary-900/40 rounded-md">
                                                ТЕКУЩИЙ
                                            </div>
                                        )}
                                        {isUsed && !isCurrent && (
                                            <div className="text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                                                ЗАНЯТ
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer status */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 shrink-0">
                    Доступно героев: {filteredHeroes.filter(h => !unavailableHeroIds.has(h.id)).length}
                </div>
            </div>
        </div>
    );
};
