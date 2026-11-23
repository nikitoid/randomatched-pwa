import React from 'react';
import { createPortal } from 'react-dom';
import {
    Edit2, ArrowDownAZ, ArrowUpAZ, Save, BarChart3, Check, FileJson, FileText,
    ArrowLeftRight, Upload, Copy, AlertTriangle, SlidersHorizontal, SquareStack
} from 'lucide-react';
import { Hero, HeroList } from '../../types';
import { Z_INDEX_BASE } from '../../constants/zIndex';
import { CustomScrollbar } from '../CustomScrollbar';
import { HeroEditorRow, HeroViewRow } from '../HeroEditorRow';
import { DuplicateGroup } from '../../utils/heroNormalization';

interface HeroSuggestion {
    name: string;
    norm: string;
    lower: string;
    rank?: string;
}

interface ListEditorHeaderActionsProps {
    heroSortType: 'name' | 'rank';
    heroSortDirection: 'asc' | 'desc' | null;
    isSortMenuOpen: boolean;
    isEditorMenuOpen: boolean;
    isReadOnly: boolean;
    isPermanentlyReadOnly: boolean;
    sortButtonRef: React.RefObject<HTMLButtonElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onToggleSortMenu: (e: React.MouseEvent) => void;
    onToggleEditorMenu: (e: React.MouseEvent) => void;
    onSaveEditor: () => void;
    onEnableEditMode: () => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Header action controls (sort, options menu, save/edit button, hidden file input) for list editing mode.
 */
export const ListEditorHeaderActions: React.FC<ListEditorHeaderActionsProps> = ({
    heroSortType,
    heroSortDirection,
    isSortMenuOpen,
    isEditorMenuOpen,
    isReadOnly,
    isPermanentlyReadOnly,
    sortButtonRef,
    fileInputRef,
    onToggleSortMenu,
    onToggleEditorMenu,
    onSaveEditor,
    onEnableEditMode,
    onFileChange
}) => {
    return (
        <>
            <button
                type="button"
                ref={sortButtonRef}
                onClick={onToggleSortMenu}
                className={`w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 active:scale-95 transition-all ${isSortMenuOpen ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white ring-2 ring-primary-500/30' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'}`}
                aria-label="Сортировка списка"
                title="Сортировка"
            >
                {heroSortType === 'name' ? (
                    heroSortDirection === 'desc' ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />
                ) : (
                    <ArrowLeftRight size={18} className="rotate-90" />
                )}
            </button>
            <button
                type="button"
                onClick={onToggleEditorMenu}
                className={`w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 active:scale-95 transition-all ${isEditorMenuOpen ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white ring-2 ring-primary-500/30' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'}`}
                aria-label="Дополнительные функции списка"
                title="Опции списка"
            >
                <SlidersHorizontal size={18} />
            </button>
            {!isReadOnly ? (
                <button
                    type="button"
                    onClick={onSaveEditor}
                    className="h-10 min-h-[40px] w-10 sm:w-32 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-xs shadow-md shadow-primary-600/20 active:scale-95 transition-all shrink-0"
                    aria-label="Сохранить изменения"
                    title="Сохранить изменения"
                >
                    <Save size={17} />
                    <span className="hidden sm:inline">Сохранить</span>
                </button>
            ) : (
                !isPermanentlyReadOnly && (
                    <button
                        type="button"
                        onClick={onEnableEditMode}
                        className="h-10 min-h-[40px] w-10 sm:w-32 flex items-center justify-center gap-1.5 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 text-primary-600 dark:text-primary-300 font-bold text-xs active:scale-95 transition-all shrink-0"
                        aria-label="Редактировать список"
                        title="Редактировать список"
                    >
                        <Edit2 size={17} />
                        <span className="hidden sm:inline">Редактировать</span>
                    </button>
                )
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onFileChange} />
        </>
    );
};

interface ListEditorViewProps {
    isVisible: boolean;
    isReadOnly: boolean;
    currentList?: HeroList;
    editorHeroes: Hero[];
    editorIsGroupable: boolean;
    setEditorIsGroupable: (val: boolean) => void;
    currentEditorDuplicateGroups: DuplicateGroup[];
    focusedRowIndex: number | null;
    setFocusedRowIndex: (index: number | null) => void;
    localHeroUpdates: Set<string>;
    hasFieldUpdate: (heroId: string, field: 'name' | 'rank') => boolean;
    allHeroSuggestions: HeroSuggestion[];
    editorContainerRef: React.RefObject<HTMLDivElement | null>;
    onChangeHero: (index: number, field: 'name' | 'rank', value: string) => void;
    onRemoveHero: (index: number) => void;
    onOpenDuplicatesModal: () => void;
    // Sort Menu Portal
    isSortMenuOpen: boolean;
    setIsSortMenuOpen: (open: boolean) => void;
    sortButtonRef: React.RefObject<HTMLButtonElement | null>;
    heroSortType: 'name' | 'rank';
    heroSortDirection: 'asc' | 'desc' | null;
    onSort: (type: 'name' | 'rank', direction: 'asc' | 'desc') => void;
    // Editor Menu Portal
    isEditorMenuOpen: boolean;
    setIsEditorMenuOpen: (open: boolean) => void;
    editorMenuRect: DOMRect | null;
    onEditorMenuAction: (action: () => void) => void;
    onOpenBalanceStats: () => void;
    onTriggerMergeDuplicates: () => void;
    onFileExport: () => void;
    onTriggerFileUpload: () => void;
    onOpenTextExport: () => void;
    onOpenTextImport: () => void;
    onOpenRankImport: () => void;
    triggerHaptic: (pattern?: number | number[]) => void;
}

/**
 * List editor body along with its sort and editor-options portal dropdowns.
 */
export const ListEditorView: React.FC<ListEditorViewProps> = ({
    isVisible,
    isReadOnly,
    currentList,
    editorHeroes,
    editorIsGroupable,
    setEditorIsGroupable,
    currentEditorDuplicateGroups,
    focusedRowIndex,
    setFocusedRowIndex,
    localHeroUpdates,
    hasFieldUpdate,
    allHeroSuggestions,
    editorContainerRef,
    onChangeHero,
    onRemoveHero,
    onOpenDuplicatesModal,
    isSortMenuOpen,
    setIsSortMenuOpen,
    sortButtonRef,
    heroSortType,
    heroSortDirection,
    onSort,
    isEditorMenuOpen,
    setIsEditorMenuOpen,
    editorMenuRect,
    onEditorMenuAction,
    onOpenBalanceStats,
    onTriggerMergeDuplicates,
    onFileExport,
    onTriggerFileUpload,
    onOpenTextExport,
    onOpenTextImport,
    onOpenRankImport,
    triggerHaptic
}) => {
    return (
        <>
            <div
                className={`absolute inset-0 overflow-hidden bg-slate-50 dark:bg-slate-950 bg-grid-pattern ${isVisible ? 'block pointer-events-auto' : 'hidden pointer-events-none'}`}
            >
                <div ref={editorContainerRef} className="absolute inset-0 overflow-y-auto no-scrollbar">
                    <div className="pb-safe-area-bottom px-4 pt-4">
                        {!isReadOnly && (
                            <div className="mb-3.5 p-3 rounded-2xl bg-white/75 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between shadow-2xs">
                                <div className="flex items-center gap-3 min-w-0 mr-2">
                                    <div className={`w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                                        editorIsGroupable
                                            ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/60 dark:border-slate-700/60'
                                    }`}>
                                        <SquareStack size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                            Групповой режим
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {editorIsGroupable ? 'Список участвует в подборе' : 'Список скрыт из подбора'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditorIsGroupable(!editorIsGroupable);
                                        triggerHaptic(10);
                                    }}
                                    className={`h-10 min-h-[40px] px-3.5 flex items-center gap-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 ${
                                        editorIsGroupable
                                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-md shadow-violet-600/20'
                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80'
                                    }`}
                                    aria-label={editorIsGroupable ? 'Список в группе' : 'Список не в группе'}
                                    title="Переключить участие списка в групповом режиме"
                                >
                                    <span>{editorIsGroupable ? 'В группе' : 'Не в группе'}</span>
                                    <span className={`w-2 h-2 rounded-full ${editorIsGroupable ? 'bg-white shadow-xs' : 'bg-slate-400 dark:bg-slate-500'}`} />
                                </button>
                            </div>
                        )}

                        {!isReadOnly && currentEditorDuplicateGroups.length > 0 && (
                            <button
                                type="button"
                                onClick={onOpenDuplicatesModal}
                                className="w-full mb-3.5 p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300/80 dark:border-amber-700/80 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 active:scale-[0.99] transition-all shadow-2xs"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <div className="text-xs sm:text-sm font-bold truncate">
                                            Найдено дубликатов: {currentEditorDuplicateGroups.length}
                                        </div>
                                        <div className="text-[11px] text-amber-700 dark:text-amber-400/90 font-medium truncate">
                                            Нажмите для объединения похожих героев
                                        </div>
                                    </div>
                                </div>
                                <span className="px-3 py-1.5 text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shrink-0 shadow-xs flex items-center gap-1">
                                    <Check size={14} />
                                    <span>Объединить</span>
                                </span>
                            </button>
                        )}

                        {editorHeroes.map((hero, index) => {
                            if (isReadOnly && index === editorHeroes.length - 1 && hero.name.trim() === '' && hero.rank === '') {
                                return null;
                            }

                            const isFocused = focusedRowIndex === index;
                            const isDimmed = focusedRowIndex !== null && !isFocused;
                            const isPlaceholderRow = !isReadOnly && index === editorHeroes.length - 1;

                            if (isReadOnly) {
                                return (
                                    <HeroViewRow
                                        key={hero.id}
                                        hero={hero}
                                        hasRankUpdate={hasFieldUpdate(hero.id, 'rank')}
                                        hasNameUpdate={hasFieldUpdate(hero.id, 'name')}
                                        hasLocalUpdate={localHeroUpdates.has(`${hero.id}:name`) || localHeroUpdates.has(`${hero.id}:rank`)}
                                    />
                                );
                            }

                            return (
                                <HeroEditorRow
                                    key={hero.id}
                                    hero={hero}
                                    index={index}
                                    isReadOnly={isReadOnly}
                                    isFocused={isFocused}
                                    isDimmed={isDimmed}
                                    isPlaceholderRow={isPlaceholderRow}
                                    hasRankUpdate={hasFieldUpdate(hero.id, 'rank')}
                                    hasNameUpdate={hasFieldUpdate(hero.id, 'name')}
                                    hasLocalUpdate={localHeroUpdates.has(`${hero.id}:name`) || localHeroUpdates.has(`${hero.id}:rank`)}
                                    onChange={onChangeHero}
                                    onRemove={onRemoveHero}
                                    setFocusedRowIndex={setFocusedRowIndex}
                                    allHeroSuggestions={allHeroSuggestions}
                                />
                            );
                        })}
                        <div className="h-20" />
                    </div>
                </div>
                <CustomScrollbar containerRef={editorContainerRef} />
            </div>

            {/* Sort Menu Portal */}
            {isSortMenuOpen && sortButtonRef.current && createPortal(
                <>
                    <div className="fixed inset-0 bg-transparent" style={{ zIndex: Z_INDEX_BASE.OVERLAY_BACKDROP }} onClick={() => setIsSortMenuOpen(false)} />
                    <div
                        className="fixed w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-menu-in origin-top-right animate-in fade-in zoom-in-95 duration-200 p-1.5"
                        style={{
                            zIndex: Z_INDEX_BASE.OVERLAY_POPOVER,
                            top: sortButtonRef.current.getBoundingClientRect().bottom + 8,
                            right: window.innerWidth - sortButtonRef.current.getBoundingClientRect().right,
                        }}
                    >
                        <button
                            onClick={() => { onSort('name', 'asc'); setIsSortMenuOpen(false); }}
                            className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5">
                                <ArrowDownAZ size={16} className="text-slate-500" />
                                Имя: А-Я
                            </span>
                            {heroSortType === 'name' && heroSortDirection === 'asc' && <Check size={16} className="text-primary-600 dark:text-primary-400 font-bold" />}
                        </button>
                        <button
                            onClick={() => { onSort('name', 'desc'); setIsSortMenuOpen(false); }}
                            className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5">
                                <ArrowUpAZ size={16} className="text-slate-500" />
                                Имя: Я-А
                            </span>
                            {heroSortType === 'name' && heroSortDirection === 'desc' && <Check size={16} className="text-primary-600 dark:text-primary-400 font-bold" />}
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" />
                        <button
                            onClick={() => { onSort('rank', 'desc'); setIsSortMenuOpen(false); }}
                            className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5">
                                <ArrowLeftRight size={16} className="rotate-90 text-slate-500" />
                                Ранг: по убыванию
                            </span>
                            {heroSortType === 'rank' && heroSortDirection === 'desc' && <Check size={16} className="text-primary-600 dark:text-primary-400 font-bold" />}
                        </button>
                        <button
                            onClick={() => { onSort('rank', 'asc'); setIsSortMenuOpen(false); }}
                            className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5">
                                <ArrowLeftRight size={16} className="rotate-90 text-slate-500" />
                                Ранг: по возрастанию
                            </span>
                            {heroSortType === 'rank' && heroSortDirection === 'asc' && <Check size={16} className="text-primary-600 dark:text-primary-400 font-bold" />}
                        </button>
                    </div>
                </>,
                document.body
            )}

            {/* Editor Menu Portal */}
            {isEditorMenuOpen && editorMenuRect && createPortal(
                <>
                    <div className="fixed inset-0 bg-transparent" style={{ zIndex: Z_INDEX_BASE.OVERLAY_BACKDROP }} onClick={() => setIsEditorMenuOpen(false)} />
                    <div
                        className="fixed w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-menu-in origin-top-right animate-in fade-in zoom-in-95 duration-200 p-1.5"
                        style={{ zIndex: Z_INDEX_BASE.OVERLAY_POPOVER, top: editorMenuRect.bottom + 8, right: window.innerWidth - editorMenuRect.right }}
                    >
                        <button onClick={() => onEditorMenuAction(onOpenBalanceStats)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <BarChart3 size={16} className="text-violet-500" /> <span>Баланс героев</span> </button>
                        <button
                            onClick={() => onEditorMenuAction(onTriggerMergeDuplicates)}
                            className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                            <AlertTriangle size={16} className="text-amber-500" />
                            <div className="flex items-center justify-between flex-1">
                                <span>Слияние дубликатов</span>
                                {currentEditorDuplicateGroups.length > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
                                        {currentEditorDuplicateGroups.length}
                                    </span>
                                )}
                            </div>
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" />
                        <button onClick={() => onEditorMenuAction(onFileExport)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <FileJson size={16} className="text-slate-500" /> <span>Экспорт в файл</span> </button>
                        {!isReadOnly && !currentList?.isTemporary && (
                            <button onClick={() => onEditorMenuAction(onTriggerFileUpload)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <Upload size={16} className="text-slate-500" /> <span>Импорт из файла</span> </button>
                        )}
                        <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" />
                        <button onClick={() => onEditorMenuAction(onOpenTextExport)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <Copy size={16} className="text-slate-500" /> <span>Экспорт (Текст)</span> </button>
                        {!isReadOnly && !currentList?.isTemporary && (
                            <>
                                <button onClick={() => onEditorMenuAction(onOpenTextImport)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <FileText size={16} className="text-slate-500" /> <span>Импорт (Текст)</span> </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" />
                                <button onClick={() => onEditorMenuAction(onOpenRankImport)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-violet-50 dark:hover:bg-violet-900/30 active:bg-violet-100 dark:active:bg-violet-900/50 text-violet-600 dark:text-violet-300 text-xs font-semibold transition-colors"> <ArrowLeftRight size={16} /> <span>Импорт рангов</span> </button>
                            </>
                        )}
                    </div>
                </>,
                document.body
            )}
        </>
    );
};
