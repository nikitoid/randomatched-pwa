import React, { useState, useMemo } from 'react';
import { Hero } from '../types';
import { Search, X } from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { useHaptics } from '../hooks/useHaptics';

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
    const { trigger } = useHaptics();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredHeroes = useMemo(() => {
        return availableHeroes
            .filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [availableHeroes, searchQuery]);

    const modalFooter = (
        <div className="text-center text-xs font-bold text-slate-500 dark:text-slate-400">
            Доступно героев: {filteredHeroes.filter(h => !unavailableHeroIds.has(h.id)).length}
        </div>
    );

    const searchSubHeader = (
        <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
                type="text"
                placeholder="Поиск героя..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 text-sm min-h-[48px]"
            />
            {searchQuery && (
                <button
                    onClick={() => {
                        trigger('light');
                        setSearchQuery('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Очистить поиск"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Выберите героя"
            maxWidth="md"
            variant="auto"
            modalId="hero-selection-modal"
            priority={20}
            subHeader={searchSubHeader}
            footer={modalFooter}
            className="data-testid-hero-selection"
        >
            <div className="space-y-1.5 pb-2">
                {filteredHeroes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 opacity-60">
                        <Search size={44} strokeWidth={1.5} />
                        <p className="text-sm">Герои не найдены</p>
                    </div>
                ) : (
                    filteredHeroes.map(hero => {
                        const isUsed = unavailableHeroIds.has(hero.id);
                        const isCurrent = hero.id === currentHeroId;

                        return (
                            <button
                                key={hero.id}
                                data-testid="hero-select-button"
                                onClick={() => {
                                    if (!isUsed && !isCurrent) {
                                        trigger('medium');
                                        onSelect(hero);
                                    }
                                }}
                                disabled={isUsed || isCurrent}
                                className={`
                                    w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left min-h-[52px]
                                    ${isCurrent
                                        ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500/50 cursor-default'
                                        : isUsed
                                            ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-[0.98]'}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold
                                    ${isCurrent
                                        ? 'bg-primary-500 text-white shadow-md'
                                        : isUsed
                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}
                                `}>
                                    {hero.name.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-sm truncate ${isUsed ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {hero.name}
                                    </div>
                                    {hero.rank && (
                                        <div className="text-[11px] text-slate-400 font-medium">
                                            Ранг: {hero.rank}
                                        </div>
                                    )}
                                </div>

                                {isCurrent && (
                                    <div className="text-[10px] font-bold text-primary-500 px-2.5 py-1 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
                                        ТЕКУЩИЙ
                                    </div>
                                )}
                                {isUsed && !isCurrent && (
                                    <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        ЗАНЯТ
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </BaseModal>
    );
};
