import React from 'react';
import { createPortal } from 'react-dom';
import {
    Edit2, Trash2, Filter, Cloud, UploadCloud, Database,
    MoreVertical, FileJson, Copy, AlertTriangle
} from 'lucide-react';
import { HeroList } from '../../types';
import { Z_INDEX_BASE } from '../../constants/zIndex';

interface ListContextMenuProps {
    list: HeroList | undefined;
    menuPosition: { top?: number; bottom?: number; right: number; origin: 'top' | 'bottom' } | null;
    activeItemRect: DOMRect | null;
    isOnline: boolean;
    hasUpdate: boolean;
    onClose: () => void;
    onUpload: (id: string) => void;
    onRename: (list: HeroList) => void;
    onMergeDuplicates: (list: HeroList) => void;
    onTextExport: (list: HeroList) => void;
    onFileExport: (list: HeroList) => void;
    onDelete: (list: HeroList) => void;
}

const getListIcon = (list: HeroList) => {
    if (list.isTemporary) return <Filter size={22} className="text-primary-500" />;
    if (list.isCloud) return <Cloud size={22} className="text-sky-500" />;
    return <Database size={22} className="text-slate-400" />;
};

/**
 * Portal context menu highlighting a hero list card and exposing quick list actions.
 */
export const ListContextMenu: React.FC<ListContextMenuProps> = ({
    list,
    menuPosition,
    activeItemRect,
    isOnline,
    hasUpdate,
    onClose,
    onUpload,
    onRename,
    onMergeDuplicates,
    onTextExport,
    onFileExport,
    onDelete
}) => {
    if (!list || !menuPosition || !activeItemRect) return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px] animate-in fade-in duration-200"
                style={{ zIndex: Z_INDEX_BASE.OVERLAY_BACKDROP }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            />
            <div
                onClick={() => onClose()}
                className="fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl flex items-center shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                style={{
                    zIndex: Z_INDEX_BASE.OVERLAY_POPOVER,
                    top: activeItemRect.top,
                    left: activeItemRect.left,
                    width: activeItemRect.width,
                    height: activeItemRect.height,
                    transformOrigin: 'center center'
                }}
            >
                <div className="mr-3.5 flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-slate-700/60 relative">
                    {getListIcon(list)}
                    {hasUpdate && (<span className="absolute -top-1 -right-1 w-3 h-3 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900"></span>)}
                </div>
                <div className="flex-1 min-w-0 mr-3">
                    <h3 className={`font-bold text-base leading-snug truncate mb-0.5 ${list.isTemporary ? 'text-primary-900 dark:text-primary-300 italic' : 'text-slate-900 dark:text-slate-100'}`}> {list.name} </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>Героев: {list.heroes.length}</span>
                        {list.isTemporary && <span className="text-primary-500 dark:text-primary-400 font-bold">временный</span>}
                        {list.isCloud && !isOnline && <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">Offline</span>}
                    </p>
                </div>
                <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 flex items-center justify-center shrink-0">
                    <MoreVertical size={18} />
                </div>
            </div>
            <div
                className={`fixed w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 p-1.5 ${menuPosition.origin === 'bottom' ? 'animate-menu-in-up origin-bottom-right' : 'animate-menu-in origin-top-right'}`}
                style={{
                    zIndex: Z_INDEX_BASE.OVERLAY_POPOVER + 1,
                    top: menuPosition.top,
                    bottom: menuPosition.bottom,
                    right: menuPosition.right
                }}
            >
                {!list.isCloud && !list.isTemporary && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onUpload(list.id); }}
                        disabled={!isOnline}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors border-b border-slate-100 dark:border-slate-800/60 mb-1 ${!isOnline ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500' : 'hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-600 dark:text-sky-400'}`}
                    >
                        <UploadCloud size={16} /> Выгрузить в облако
                    </button>
                )}
                {!list.isTemporary && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRename(list); }}
                        disabled={!isOnline && list.isCloud}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors ${(!isOnline && list.isCloud) ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
                    >
                        <Edit2 size={16} className="text-slate-500" /> Переименовать
                    </button>
                )}
                {!list.isTemporary && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onMergeDuplicates(list);
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                    >
                        <AlertTriangle size={16} className="text-amber-500" />
                        <span>Слияние дубликатов</span>
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onTextExport(list); }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                    <Copy size={16} className="text-slate-500" /> Экспорт (Текст)
                </button>
                {!list.isTemporary && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onFileExport(list); }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                    >
                        <FileJson size={16} className="text-slate-500" /> Экспорт в файл
                    </button>
                )}
                <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" />
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(list); }}
                    disabled={list.isCloud && !isOnline}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors ${list.isCloud && !isOnline ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400'}`}
                >
                    <Trash2 size={16} /> {list.isCloud ? 'Удалить из облака' : 'Удалить'}
                </button>
            </div>
        </>,
        document.body
    );
};
