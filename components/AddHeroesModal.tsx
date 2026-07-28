import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Search, Check } from 'lucide-react';
import { HeroList, Hero } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';
import { useNavigation } from '../context/NavigationContext';
import { BaseModal } from './common/BaseModal';
import { useHaptics } from '../hooks/useHaptics';

interface AddHeroesModalProps {
    isOpen: boolean;
    onClose: () => void;
    lists: HeroList[];
    excludeListIds: Set<string>;
    onAddHeroes: (selectedHeroes: Hero[]) => void;
    triggerHaptic?: (type: number) => void;
}

export const AddHeroesModal: React.FC<AddHeroesModalProps> = ({
    isOpen,
    onClose,
    lists,
    excludeListIds,
    onAddHeroes,
    triggerHaptic: propTriggerHaptic
}) => {
    const { trigger } = useHaptics();

    const { close } = useNavigation();
    const [step, setStep] = useState<'select-list' | 'select-heroes'>('select-list');
    const [selectedList, setSelectedList] = useState<HeroList | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHeroesByList, setSelectedHeroesByList] = useState<Record<string, Set<string>>>({});

    const handleBack = () => {
        trigger('light');
        close('add-heroes-modal-step2');
    };

    useBackHandler(isOpen && step === 'select-heroes', () => {
        trigger('light');
        setStep('select-list');
        setSelectedList(null);
        setSearchQuery('');
    }, { id: 'add-heroes-modal-step2', priority: 30 });

    // Сбрасываем состояние после закрытия
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setStep('select-list');
                setSelectedList(null);
                setSelectedHeroesByList({});
                setSearchQuery('');
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Общее количество выбранных героев по всем спискам
    const totalSelectedCount = useMemo(() => {
        return Object.values(selectedHeroesByList).reduce((acc, set) => acc + set.size, 0);
    }, [selectedHeroesByList]);

    // Фильтруем другие списки (которые не выбраны и не пустые)
    const availableLists = useMemo(() => {
        return lists.filter(l => !excludeListIds.has(l.id) && l.heroes.length > 0);
    }, [lists, excludeListIds]);

    // Получаем героев выбранного списка
    const listHeroes = useMemo(() => {
        if (!selectedList) return [];
        return selectedList.heroes;
    }, [selectedList]);

    // Фильтруем героев по поисковому запросу
    const filteredHeroes = useMemo(() => {
        if (!searchQuery.trim()) return listHeroes;
        const query = searchQuery.toLowerCase().trim();
        return listHeroes.filter(h => h.name.toLowerCase().includes(query));
    }, [listHeroes, searchQuery]);

    const handleSelectList = (list: HeroList) => {
        trigger('light');
        setSelectedList(list);
        setStep('select-heroes');
        setSearchQuery('');
    };

    const handleToggleHero = (heroId: string) => {
        if (!selectedList) return;
        trigger('light');
        setSelectedHeroesByList(prev => {
            const next = { ...prev };
            const currentSet = new Set(next[selectedList.id] || []);
            if (currentSet.has(heroId)) {
                currentSet.delete(heroId);
            } else {
                currentSet.add(heroId);
            }
            if (currentSet.size === 0) {
                delete next[selectedList.id];
            } else {
                next[selectedList.id] = currentSet;
            }
            return next;
        });
    };

    const handleSelectAllInList = () => {
        if (!selectedList) return;
        trigger('light');
        setSelectedHeroesByList(prev => {
            const next = { ...prev };
            const currentSet = new Set(next[selectedList.id] || []);
            const allFilteredIds = filteredHeroes.map(h => h.id);
            const isAllSelected = allFilteredIds.every(id => currentSet.has(id));

            if (isAllSelected) {
                allFilteredIds.forEach(id => currentSet.delete(id));
            } else {
                allFilteredIds.forEach(id => currentSet.add(id));
            }

            if (currentSet.size === 0) {
                delete next[selectedList.id];
            } else {
                next[selectedList.id] = currentSet;
            }
            return next;
        });
    };

    const handleConfirmAdd = () => {
        if (totalSelectedCount === 0) return;
        trigger('medium');

        const heroesToAdd: Hero[] = [];
        Object.entries(selectedHeroesByList).forEach(([listId, heroIdSet]) => {
            const sourceList = lists.find(l => l.id === listId);
            if (sourceList) {
                sourceList.heroes.forEach(h => {
                    if (heroIdSet.has(h.id)) {
                        heroesToAdd.push(h);
                    }
                });
            }
        });

        onAddHeroes(heroesToAdd);
        onClose();
    };

    const modalTitle = (
        <div className="flex items-center gap-2">
            {step === 'select-heroes' && (
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Назад к спискам"
                >
                    <ChevronLeft size={20} />
                </button>
            )}
            <span>{step === 'select-list' ? 'Докинуть героев' : 'Выбрать героев'}</span>
        </div>
    );

    const modalFooter = totalSelectedCount > 0 ? (
        <button
            onClick={handleConfirmAdd}
            className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-sm sm:text-base rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 min-h-[48px]"
        >
            <Check size={18} />
            <span>Добавить выбранных ({totalSelectedCount})</span>
        </button>
    ) : undefined;

    const searchSubHeader = step === 'select-heroes' ? (
        <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Поиск героев..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900 dark:text-white text-sm min-h-[44px]"
                />
            </div>
            <button
                onClick={handleSelectAllInList}
                className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all min-h-[44px]"
            >
                Все
            </button>
        </div>
    ) : undefined;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            maxWidth="md"
            variant="auto"
            modalId="add-heroes-modal-step1"
            priority={20}
            subHeader={searchSubHeader}
            footer={modalFooter}
        >
            {step === 'select-list' ? (
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                        Выберите список, из которого вы хотите точечно добавить героев к текущему выбору.
                    </p>

                    {availableLists.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-sm">Нет других доступных списков с героями</p>
                        </div>
                    ) : (
                        availableLists.map(list => {
                            const selectedCount = selectedHeroesByList[list.id]?.size || 0;
                            return (
                                <button
                                    key={list.id}
                                    onClick={() => handleSelectList(list)}
                                    className={`
                                        w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between min-h-[56px]
                                        ${selectedCount > 0
                                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20'
                                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200/60 dark:bg-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shrink-0">
                                            {list.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                {list.name}
                                            </h4>
                                            <p className="text-xs text-slate-400 font-medium">
                                                Всего героев: {list.heroes.length}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedCount > 0 && (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-500 text-white shadow-sm">
                                            Выбрано: {selectedCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="space-y-1.5 pb-2">
                    {filteredHeroes.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            Герои не найдены
                        </div>
                    ) : (
                        filteredHeroes.map(hero => {
                            const isSelected = selectedHeroesByList[selectedList?.id || '']?.has(hero.id);
                            return (
                                <button
                                    key={hero.id}
                                    onClick={() => handleToggleHero(hero.id)}
                                    className={`
                                        w-full p-3 rounded-2xl transition-all text-left flex items-center justify-between min-h-[48px]
                                        ${isSelected
                                            ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-900 dark:text-primary-100 font-bold'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                            {hero.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm">{hero.name}</span>
                                    </div>
                                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {isSelected && <Check size={14} strokeWidth={3} />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </BaseModal>
    );
};
