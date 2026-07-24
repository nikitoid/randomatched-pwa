
import React, { useRef, memo } from 'react';
import { HeroList } from '../types';
import { GripVertical, Filter, Cloud, Database, MoreVertical, AlertTriangle, SquareStack, Eye } from 'lucide-react';

interface ListItemProps {
  list: HeroList;
  index: number;
  total: number;
  isOnline: boolean;
  contextMenuTargetId: string | null;
  onOpenMenu: (id: string, buttonRect: DOMRect, cardRect: DOMRect) => void;
  onEdit: (list: HeroList) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, index: number) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
  isDragging: boolean;
  hasUpdate: boolean;
  onMarkSeen?: (id: string) => void;
  isReorderMode?: boolean;
}

export const ListItem: React.FC<ListItemProps> = memo(({ 
  list, 
  index, 
  isOnline,
  contextMenuTargetId,
  onOpenMenu,
  onEdit,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
  hasUpdate,
  onMarkSeen,
  isReorderMode = false
}) => {
  const isTemp = list.isTemporary;
  const isCloud = list.isCloud;
  const isCloudOffline = isCloud && !isOnline;
  
  const isMenuOpen = contextMenuTargetId === list.id;
  const cardRef = useRef<HTMLDivElement>(null);
  
  const getIcon = () => {
    if (isTemp) return <Filter size={22} className="text-primary-500" />;
    if (isCloud) return <Cloud size={22} className="text-sky-500" />;
    return <Database size={22} className="text-slate-400" />;
  };

  const handleEditClick = () => {
    if (isMenuOpen) return;
    if (hasUpdate && onMarkSeen) onMarkSeen(list.id);
    onEdit(list);
  };
  
  const handleHandleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      if (cardRef.current) {
          e.dataTransfer.setDragImage(cardRef.current, 0, 0);
          e.dataTransfer.effectAllowed = 'move';
      }
      onDragStart(e, index);
  };

  const hasMissingRanks = list.heroes.some(h => !h.rank || !h.rank.trim());

  return (
    <div 
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      data-list-index={index}
      className={`relative group mb-3 transition-all duration-300
        ${isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'}
        ${isMenuOpen ? 'z-40 opacity-0' : 'z-auto'} 
      `}
    >
      <div 
         ref={cardRef}
          className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl flex items-center transition-all duration-200 shadow-xs border border-slate-200/80 dark:border-slate-800/80 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 ${isCloudOffline ? 'bg-slate-50/70 dark:bg-slate-900/40 opacity-80' : ''}`}
      >
        {isReorderMode && (
          <div 
              draggable={true}
              className={`mr-2 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-grab active:cursor-grabbing touch-none transition-colors animate-in fade-in slide-in-from-left-2`}
              onDragStart={handleHandleDragStart}
              onTouchStart={(e) => onDragStart(e, index)}
              onTouchEnd={onDragEnd}
          >
              <GripVertical size={20} />
          </div>
        )}

        <div className={`mr-3.5 flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 shrink-0 border border-slate-200/60 dark:border-slate-700/60 relative ${isCloudOffline ? 'grayscale opacity-75' : ''}`}>
             {getIcon()}
             {hasUpdate && (
               <span className="absolute -top-1 -right-1 w-3 h-3 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
             )}
        </div>

        <div 
            className="flex-1 min-w-0 mr-3 cursor-pointer"
            onClick={handleEditClick}
        >
            <h3 className={`font-bold text-base sm:text-lg leading-snug truncate mb-1 ${isTemp ? 'text-primary-900 dark:text-primary-300 italic' : isCloudOffline ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {list.name}
            </h3>
            <div className="text-xs font-medium flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                    Героев: {list.heroes.length}
                </span>
                
                {list.isGroupable && (
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold ${isCloudOffline ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-violet-500/10 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-500/20'}`}>
                        <SquareStack size={11} /> Группа
                    </span>
                )}

                {isTemp && (
                    <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md font-bold bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/20">
                        временный
                    </span>
                )}
                {isCloudOffline && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold" aria-label="Только чтение">
                        <Eye size={11} /> Чтение
                    </span>
                )}
                {hasMissingRanks && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20" aria-label="Не указаны ранги">
                        <AlertTriangle size={11} /> Нет рангов
                    </span>
                )}
            </div>
        </div>
        
        {!isReorderMode && (
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const cardRect = cardRef.current?.getBoundingClientRect();
                    if (cardRect) {
                        onOpenMenu(list.id, buttonRect, cardRect);
                    }
                }}
                aria-label="Опции списка"
                className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isMenuOpen 
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 ring-2 ring-primary-500/30' 
                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95'
                }`}
            >
                <MoreVertical size={18} />
            </button>
        )}
      </div>
    </div>
  );
});

ListItem.displayName = 'ListItem';
