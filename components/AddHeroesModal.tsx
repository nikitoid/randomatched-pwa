import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, Search, Check, Database, Filter, Cloud } from 'lucide-react';
import { HeroList, Hero } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';

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
    triggerHaptic
}) => {
    const [step, setStep] = useState<'select-list' | 'select-heroes'>('select-list');
    const [selectedList, setSelectedList] = useState<HeroList | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHeroesByList, setSelectedHeroesByList] = useState<Record<string, Set<string>>>({});

    const handleBack = () => {
        if (triggerHaptic) triggerHaptic(10);
        if (step === 'select-heroes') {
            setStep('select-list');
            setSelectedList(null);
            setSearchQuery('');
        } else {
            onClose();
        }
    };

    useBackHandler(isOpen, handleBack, { id: 'add-heroes-modal', priority: 20 });

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
        if (triggerHaptic) triggerHaptic(10);
        setSelectedList(list);
        setStep('select-heroes');
        setSearchQuery('');
    };

    const handleToggleHero = (heroId: string) => {
        if (!selectedList) return;
        if (triggerHaptic) triggerHaptic(10);
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

    const handleSelectAll = () => {
        if (!selectedList) return;
        if (triggerHaptic) triggerHaptic(10);
        const allIds = filteredHeroes.map(h => h.id);
        setSelectedHeroesByList(prev => {
            const next = { ...prev };
            const currentSet = new Set(next[selectedList.id] || []);
            allIds.forEach(id => currentSet.add(id));
            next[selectedList.id] = currentSet;
            return next;
        });
    };

    const handleDeselectAll = () => {
        if (!selectedList) return;
        if (triggerHaptic) triggerHaptic(10);
        const allIds = filteredHeroes.map(h => h.id);
        setSelectedHeroesByList(prev => {
            const next = { ...prev };
            const currentSet = new Set(next[selectedList.id] || []);
            allIds.forEach(id => currentSet.delete(id));
            if (currentSet.size === 0) {
                delete next[selectedList.id];
            } else {
                next[selectedList.id] = currentSet;
            }
            return next;
        });
    };

    const handleConfirm = () => {
        if (totalSelectedCount === 0) return;
        if (triggerHaptic) triggerHaptic(20);
        
        const heroesToAdd: Hero[] = [];
        lists.forEach(list => {
            const selectedIds = selectedHeroesByList[list.id];
            if (selectedIds && selectedIds.size > 0) {
                list.heroes.forEach(hero => {
                    if (selectedIds.has(hero.id)) {
                        if (!heroesToAdd.some(h => h.id === hero.id)) {
                            heroesToAdd.push(hero);
                        }
                    }
                });
            }
        });

        onAddHeroes(heroesToAdd);
        handleClose();
    };

    const handleClose = () => {
        onClose();
        // Сбрасываем состояние после анимации закрытия
        setTimeout(() => {
            setStep('select-list');
            setSelectedList(null);
            setSelectedHeroesByList({});
            setSearchQuery('');
        }, 300);
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        {step === 'select-heroes' && (
                            <button 
                                onClick={handleBack}
                                className="p-1.5 -ml-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {step === 'select-list' ? 'Докинуть героев' : 'Выбрать героев'}
                        </h3>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                    {step === 'select-list' ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                                Выберите список, из которого вы хотите точечно добавить героев к текущему выбору.
                            </p>
                            {availableLists.length > 0 ? (
                                availableLists.map(list => {
                                    let Icon = Database;
                                    let iconColor = 'text-slate-400';
                                    let iconBg = 'bg-slate-50 dark:bg-slate-800';

                                    if (list.isTemporary) {
                                        Icon = Filter;
                                        iconColor = 'text-primary-500';
                                        iconBg = 'bg-primary-50 dark:bg-primary-900/20';
                                    } else if (list.isCloud) {
                                        Icon = Cloud;
                                        iconColor = 'text-sky-500';
                                        iconBg = 'bg-sky-50 dark:bg-sky-900/20';
                                    }

                                    const selectedCount = selectedHeroesByList[list.id]?.size || 0;
                                    const hasSelected = selectedCount > 0;

                                    return (
                                        <button
                                            key={list.id}
                                            onClick={() => handleSelectList(list)}
                                            className={`w-full p-4 flex items-center gap-4 rounded-2xl border active:scale-[0.99] transition-all text-left ${
                                                hasSelected
                                                    ? 'border-primary-200 dark:border-primary-900/50 bg-primary-50/10 dark:bg-primary-950/5 hover:bg-primary-50/20 dark:hover:bg-primary-950/10 shadow-sm'
                                                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                                                    {list.name}
                                                </h4>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    Героев: {list.heroes.length}
                                                </span>
                                            </div>
                                            {hasSelected && (
                                                <div className="flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-primary-500 text-white text-[11px] font-extrabold shrink-0 shadow-sm shadow-primary-500/20">
                                                    +{selectedCount}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                                    Нет доступных других списков с героями.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-4">
                            {/* Search and Action buttons */}
                            <div className="flex flex-col gap-3 sticky top-0 bg-white dark:bg-slate-900 pb-2 z-10">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Поиск героя..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:border-primary-500 transition-colors"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleSelectAll}
                                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Выбрать всех
                                    </button>
                                    <button 
                                        onClick={handleDeselectAll}
                                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Снять все
                                    </button>
                                </div>
                            </div>

                            {/* Heroes List */}
                            <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                                {filteredHeroes.length > 0 ? (
                                    filteredHeroes.map(hero => {
                                        const isSelected = selectedList ? (selectedHeroesByList[selectedList.id]?.has(hero.id) || false) : false;
                                        return (
                                            <button
                                                key={hero.id}
                                                onClick={() => handleToggleHero(hero.id)}
                                                className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all active:scale-[0.98] ${
                                                    isSelected 
                                                        ? 'bg-primary-50 border-primary-200 dark:bg-primary-950/20 dark:border-primary-800/50 text-slate-800 dark:text-slate-200' 
                                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <div className="flex flex-col min-w-0 mr-2">
                                                    <span className="text-sm font-bold truncate">{hero.name}</span>
                                                    {hero.rank && (
                                                        <span className="text-[10px] text-slate-400 font-medium">Ранг: {hero.rank}</span>
                                                    )}
                                                </div>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                                                    isSelected 
                                                        ? 'bg-primary-500 border-primary-500 text-white' 
                                                        : 'border-slate-300 dark:border-slate-700 bg-transparent'
                                                }`}>
                                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-2 text-center py-6 text-slate-400 dark:text-slate-500">
                                        Герои не найдены.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'select-list' && totalSelectedCount > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                        <button 
                            onClick={handleConfirm}
                            className="flex-1 py-3 font-bold text-sm text-white rounded-xl shadow-lg active:scale-95 transition-all bg-primary-600 hover:bg-primary-700 shadow-primary-600/20"
                        >
                            Добавить ({totalSelectedCount})
                        </button>
                    </div>
                )}
                
                {step === 'select-heroes' && (
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                        <button 
                            onClick={handleBack}
                            className="flex-1 py-3 font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl active:scale-95 transition-transform"
                        >
                            Назад
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={totalSelectedCount === 0}
                            className={`flex-1 py-3 font-bold text-sm text-white rounded-xl shadow-lg active:scale-95 transition-all ${
                                totalSelectedCount === 0 
                                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none' 
                                    : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/20'
                            }`}
                        >
                            Добавить ({totalSelectedCount})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
