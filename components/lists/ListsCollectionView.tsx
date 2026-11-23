import React from 'react';
import {
    Plus, Wifi, WifiOff, Loader2, Files, ArrowDownAZ, ArrowUpAZ,
    GripVertical, Clock
} from 'lucide-react';
import { HeroList } from '../../types';
import { ListItem } from '../ListItem';

interface ListsSubHeaderProps {
    isOnline: boolean;
    isSyncing: boolean;
    isReorderMode: boolean;
    sortOrder: 'asc' | 'desc' | 'custom';
    onOpenInactiveModal?: () => void;
    onToggleReorderMode: () => void;
    onToggleSort: () => void;
    onOpenCreate: () => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * Toolbar displayed under the ListsOverlay header when viewing the lists collection.
 */
export const ListsSubHeader: React.FC<ListsSubHeaderProps> = ({
    isOnline,
    isSyncing,
    isReorderMode,
    sortOrder,
    onOpenInactiveModal,
    onToggleReorderMode,
    onToggleSort,
    onOpenCreate,
    triggerHaptic
}) => {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-2xs ${isOnline ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-200/80 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                {isSyncing ? <><Loader2 size={11} className="animate-spin text-amber-500" /> Sync</> : isOnline ? <><Wifi size={11} className="text-emerald-500" /> Online</> : <><WifiOff size={11} className="text-slate-400" /> Offline</>}
            </div>
            <div className="flex items-center gap-1.5 xs:gap-2">
                {onOpenInactiveModal && (
                    <button
                        type="button"
                        onClick={() => { triggerHaptic(10); onOpenInactiveModal(); }}
                        className="h-9 px-3 flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full shadow-2xs active:scale-95 transition-all font-bold text-xs"
                        title="Сформировать список из давно не игравших героев"
                    >
                        <Clock size={15} />
                        <span className="hidden xs:inline">Забытые</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={onToggleReorderMode}
                    aria-label="Переупорядочить списки"
                    className={`w-9 h-9 flex items-center justify-center rounded-full border shadow-2xs transition-all ${isReorderMode ? 'bg-primary-500/15 text-primary-600 border-primary-500/40 dark:bg-primary-900/40 dark:text-primary-300' : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                    <GripVertical size={18} />
                </button>
                <button
                    type="button"
                    onClick={onToggleSort}
                    aria-label="Сортировать списки"
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                    {sortOrder === 'desc' ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
                </button>
                <button
                    type="button"
                    onClick={onOpenCreate}
                    className="h-9 px-3.5 sm:px-4 flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-full shadow-md shadow-primary-600/25 active:scale-95 transition-all font-bold text-xs"
                    data-testid="new-list-btn"
                >
                    <Plus size={17} /> <span>Новый</span>
                </button>
            </div>
        </div>
    );
};

interface ListsCollectionViewProps {
    isHidden: boolean;
    lists: HeroList[];
    isOnline: boolean;
    contextMenuTargetId: string | null;
    draggedIndex: number | null;
    updatedListIds?: Set<string>;
    isReorderMode: boolean;
    listContainerRef: React.RefObject<HTMLDivElement | null>;
    onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
    onOpenMenu: (id: string, buttonRect: DOMRect, cardRect: DOMRect) => void;
    onEdit: (list: HeroList) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, index: number) => void;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
    onMarkSeen?: (id: string) => void;
    onOpenCreate: () => void;
}

/**
 * Scrollable collection of hero lists with empty state and drag-and-drop reordering.
 */
export const ListsCollectionView: React.FC<ListsCollectionViewProps> = ({
    isHidden,
    lists,
    isOnline,
    contextMenuTargetId,
    draggedIndex,
    updatedListIds,
    isReorderMode,
    listContainerRef,
    onTouchMove,
    onOpenMenu,
    onEdit,
    onDragStart,
    onDragEnter,
    onDragEnd,
    onMarkSeen,
    onOpenCreate
}) => {
    return (
        <div
            ref={listContainerRef}
            onTouchMove={onTouchMove}
            className={`absolute inset-0 overflow-y-auto no-scrollbar ${isHidden ? 'hidden pointer-events-none' : 'block pointer-events-auto'}`}
        >
            <div className="pb-safe-area-bottom">
                <div className="px-4 pt-4 pb-4">
                    {lists.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-inner">
                                <Files size={32} />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Нет списков</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-5">Создайте свой первый список героев для генерации команд и отслеживания статистики</p>
                            <button onClick={onOpenCreate} className="h-10 px-5 flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl shadow-md shadow-primary-600/20 font-bold text-xs active:scale-95 transition-all">
                                <Plus size={16} /> Создать список
                            </button>
                        </div>
                    )}
                    {lists.map((list, idx) => (
                        <ListItem
                            key={list.id}
                            list={list}
                            index={idx}
                            total={lists.length}
                            isOnline={isOnline}
                            contextMenuTargetId={contextMenuTargetId}
                            onOpenMenu={onOpenMenu}
                            onEdit={onEdit}
                            onDragStart={onDragStart}
                            onDragEnter={onDragEnter}
                            onDragEnd={onDragEnd}
                            isDragging={draggedIndex === idx}
                            hasUpdate={updatedListIds ? updatedListIds.has(list.id) : false}
                            onMarkSeen={onMarkSeen}
                            isReorderMode={isReorderMode}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
