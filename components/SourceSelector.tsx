import React from 'react';
import { ChevronDown, X, SquareStack, Layers, BarChart3, Database, Filter, Cloud, Check, Plus } from 'lucide-react';
import { HeroList } from '../types';

interface SourceSelectorProps {
    lists: HeroList[];
    activeList?: HeroList;
    selectedListId: string;
    isGroupMode: boolean;
    setIsGroupMode: (val: boolean) => void;
    selectedGroupIds: Set<string>;
    handleToggleGroupItem: (id: string) => void;
    handleSelectList: (id: string) => void;
    isListSelectorOpen: boolean;
    setIsListSelectorOpen: (val: boolean) => void;
    setIsGroupStatsOpen: (val: boolean) => void;
    isOnline: boolean;
    groupTotalHeroes: number;
    selectedGroupCount: number;
    onOpenAddHeroes: () => void;
}

export const SourceSelector: React.FC<SourceSelectorProps> = ({
    lists,
    activeList,
    selectedListId,
    isGroupMode,
    setIsGroupMode,
    selectedGroupIds,
    handleToggleGroupItem,
    handleSelectList,
    isListSelectorOpen,
    setIsListSelectorOpen,
    setIsGroupStatsOpen,
    isOnline,
    groupTotalHeroes,
    selectedGroupCount,
    onOpenAddHeroes
}) => {
    // For UI display in main selector
    const groupableLists = lists.filter(l => l.isGroupable);

    return (
        <div
            className="w-full mb-6 relative"
            style={{
                zIndex: isListSelectorOpen ? 50 : 20,
                transition: isListSelectorOpen ? 'z-index 0s' : 'z-index 0s linear 0.3s'
            }}
        >
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block pl-1">
                Источник героев
            </label>
            <div className="relative">
                <button
                    onClick={() => setIsListSelectorOpen(!isListSelectorOpen)}
                    disabled={lists.length === 0}
                    className={`w-full relative bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center p-5 gap-4 text-left transition-all duration-300 
                    ${isListSelectorOpen ? 'rounded-t-3xl rounded-b-none border-b-transparent' : 'rounded-3xl active:scale-[0.99]'}`}
                >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors
                    ${isGroupMode
                            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300'
                            : activeList?.isTemporary
                                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                        {isGroupMode ? <SquareStack size={28} /> : (activeList ? <Layers size={28} /> : <X size={28} />)}
                    </div>
                    <div className="flex-1 min-w-0">
                        {lists.length > 0 ? (
                            <>
                                <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate pr-4">
                                    {isGroupMode
                                        ? (selectedGroupCount > 0 ? `Группа (${selectedGroupCount})` : 'Пустая группа')
                                        : (activeList?.name || 'Выберите список')
                                    }
                                    {!isGroupMode && activeList?.isTemporary && <span className="text-sm font-normal text-slate-500 ml-2">(врем.)</span>}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                    {isGroupMode
                                        ? `${groupTotalHeroes} Героев доступно`
                                        : (activeList ? `Героев: ${activeList.heroes.length}` : 'Список пуст')
                                    }
                                </p>
                            </>
                        ) : (
                            <span className="text-slate-400">Создайте список в настройках</span>
                        )}
                    </div>
                    <div className={`text-slate-300 dark:text-slate-600 transition-transform duration-300 ${isListSelectorOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown size={24} />
                    </div>
                </button>

                <div className={`absolute top-full left-0 w-full bg-white dark:bg-slate-900 border border-t-0 border-slate-100 dark:border-slate-800 rounded-b-3xl shadow-xl overflow-hidden transition-all duration-300 origin-top flex flex-col max-h-[360px] ${isListSelectorOpen ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-0 pointer-events-none'}`}>

                    {/* Tabs Switcher */}
                    <div className="px-5 pt-4 pb-2">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
                                <button
                                    onClick={() => setIsGroupMode(false)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${!isGroupMode ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 md:hover:text-slate-700 dark:md:hover:text-slate-300 active:text-slate-700'}`}
                                >
                                    <Layers size={16} /> Один
                                </button>
                                <button
                                    onClick={() => setIsGroupMode(true)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${isGroupMode ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400 md:hover:text-slate-700 dark:md:hover:text-slate-300 active:text-slate-700'}`}
                                >
                                    <SquareStack size={16} /> Группа
                                </button>
                            </div>
                            <button
                                onClick={() => { setIsGroupStatsOpen(true); setIsListSelectorOpen(false); }}
                                disabled={isGroupMode ? groupTotalHeroes === 0 : !activeList || activeList.heroes.length === 0}
                                className={`w-10 h-10 my-auto rounded-xl flex items-center justify-center transition-colors border active:scale-95 ${isGroupMode
                                    ? 'bg-primary-50 text-primary-600 border-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800 disabled:opacity-50'
                                    : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 disabled:opacity-50'
                                    }`}
                            >
                                <BarChart3 size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto no-scrollbar py-2 flex-1">
                        {/* Render lists based on mode */}
                        {!isGroupMode ? (
                            // SINGLE MODE
                            lists.map(list => {
                                const isSelected = list.id === selectedListId;
                                const isOfflineCloud = list.isCloud && !isOnline;

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
                                    if (isOfflineCloud) {
                                        iconColor = 'text-slate-400';
                                        iconBg = 'bg-slate-100 dark:bg-slate-800';
                                    }
                                }

                                return (
                                    <button
                                        key={list.id}
                                        onClick={() => handleSelectList(list.id)}
                                        className={`w-full px-5 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-slate-50 dark:bg-slate-800/50' : 'md:hover:bg-slate-50 dark:md:hover:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-800'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'} ${list.isTemporary ? 'italic' : ''}`}>
                                                {list.name}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Героев: {list.heroes.length}</span>
                                                {isOfflineCloud && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 rounded">Offline</span>}
                                            </div>
                                        </div>
                                        {isSelected && <div className="text-primary-600 dark:text-primary-400"><Check size={20} /></div>}
                                    </button>
                                );
                            })
                        ) : (
                            // GROUP MODE
                            <>
                                <div className="px-5 pb-2 text-xs text-slate-400 text-center">
                                    Выберите списки для объединения.
                                    {groupableLists.length === 0 && <div className="mt-4 text-orange-500">Нет списков, доступных для групп. <br /> Разрешите группировку в настройках списка.</div>}
                                </div>

                                {groupableLists.map(list => {
                                    const isSelected = selectedGroupIds.has(list.id);
                                    const isOfflineCloud = list.isCloud && !isOnline;

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
                                        if (isOfflineCloud) {
                                            iconColor = 'text-slate-400';
                                            iconBg = 'bg-slate-100 dark:bg-slate-800';
                                        }
                                    }

                                    return (
                                        <button
                                            key={list.id}
                                            onClick={() => handleToggleGroupItem(list.id)}
                                            className={`w-full px-5 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : 'md:hover:bg-slate-50 dark:md:hover:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-800'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-primary-500 text-white' : `${iconBg} ${iconColor}`}`}>
                                                {isSelected ? <Check size={18} /> : <Icon size={18} />}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'} ${list.isTemporary ? 'italic' : ''}`}>
                                                    {list.name}
                                                    {list.isTemporary && <span className="text-[10px] font-normal text-slate-500 ml-1.5">(врем.)</span>}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">Героев: {list.heroes.length}</span>
                                                    {isOfflineCloud && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 rounded">Offline</span>}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </>
                        )}

                        {lists.length === 0 && (
                            <div className="p-6 text-center text-slate-400 text-sm">
                                Список пуст. <br /> Перейдите в настройки, чтобы создать первый список.
                            </div>
                        )}
                    </div>

                    {/* Sticky Footer with Append Button */}
                    {(isGroupMode ? selectedGroupCount > 0 : !!activeList) && (
                        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsListSelectorOpen(false);
                                    onOpenAddHeroes();
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/10 active:scale-[0.98] transition-all"
                            >
                                <Plus size={14} />
                                <span>Докинуть героев точечно</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
