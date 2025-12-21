
import React, { useRef } from 'react';
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

export const ListItem: React.FC<ListItemProps> = ({ 
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
         className={`bg-white dark:bg-slate-900 p-4 rounded-2xl flex items-center transition-shadow relative shadow-sm border border-slate-100 dark:border-slate-800 ${isCloudOffline ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}
      >
        {isReorderMode && (
          <div 
              draggable={true}
              className={`mr-1 text-slate-300 dark:text-slate-700 p-1 cursor-grab active:cursor-grabbing touch-none animate-in fade-in slide-in-from-left-2`}
              onDragStart={handleHandleDragStart}
              onTouchStart={(e) => onDragStart(e, index)}
              onTouchEnd={onDragEnd}
          >
              <GripVertical size={20} />
          </div>
        )}

        <div className={`mr-4 ml-1 flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-700/50 relative ${isCloudOffline ? 'grayscale' : ''}`}>
             {getIcon()}
             {hasUpdate && (
               <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
             )}
        </div>

        <div 
            className="flex-1 mr-4 cursor-pointer"
            onClick={handleEditClick}
        >
            <h3 className={`font-bold text-lg leading-tight mb-0.5 ${isTemp ? 'text-primary-900 dark:text-primary-300 italic' : isCloudOffline ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {list.name}
            </h3>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-500 flex flex-wrap items-center gap-2">
                <span>Героев: {list.heroes.length}</span>
                
                {list.isGroupable && (
                    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${isCloudOffline ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-600' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300'}`}>
                        <SquareStack size={10} /> Группа
                    </span>
                )}

                {isTemp && <span className="text-primary-500 dark:text-primary-400">временный</span>}
                {isCloudOffline && <span className="flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500" title="Только чтение"><Eye size={12} /></span>}
                {hasMissingRanks && <span className="text-amber-500 dark:text-amber-400 ml-1" title="Не указаны ранги"><AlertTriangle size={14} /></span>}
            </div>
        </div>
        
        <button 
            onClick={(e) => { 
                e.stopPropagation(); 
                const buttonRect = e.currentTarget.getBoundingClientRect();
                const cardRect = cardRef.current?.getBoundingClientRect();
                if (cardRect) {
                    onOpenMenu(list.id, buttonRect, cardRect);
                }
            }}
            className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                isMenuOpen 
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300' 
                : 'text-slate-400 md:hover:text-primary-500 md:hover:bg-slate-50 dark:md:hover:bg-slate-800 active:text-primary-500 active:bg-slate-50 dark:active:bg-slate-800'
            }`}
        >
            <MoreVertical size={20} />
        </button>
      </div>
    </div>
  );
};
