import React, { useState, useRef } from 'react';
import { X, Plus, ChevronLeft, MoreVertical, Edit2, Trash2, Save } from 'lucide-react';
import { HeroList } from '../types';

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lists: HeroList[];
  onAddList: (name: string) => string;
  onUpdateList: (id: string, updates: Partial<HeroList>) => void;
  onDeleteList: (id: string) => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  isOpen,
  onClose,
  lists,
  onAddList,
  onUpdateList,
  onDeleteList
}) => {
  // Navigation State
  const [editingListId, setEditingListId] = useState<string | null>(null);

  // Modal State for Rename/Create
  const [isNameModalOpen, setNameModalOpen] = useState(false);
  const [nameModalMode, setNameModalMode] = useState<'create' | 'rename'>('create');
  const [nameInputValue, setNameInputValue] = useState('');
  const [targetListId, setTargetListId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenuTargetId, setContextMenuTargetId] = useState<string | null>(null);

  // Editor State
  const [editorContent, setEditorContent] = useState('');

  // Scroll / FAB State
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollY = useRef(0);

  // --- Handlers ---

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    // Threshold to prevent jitter
    if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsFabVisible(false); // Scrolling down
      } else {
        setIsFabVisible(true); // Scrolling up
      }
      lastScrollY.current = currentScrollY;
    }
  };

  const handleOpenCreate = () => {
    setNameModalMode('create');
    setNameInputValue('');
    setNameModalOpen(true);
    setContextMenuTargetId(null);
  };

  const handleOpenRename = (list: HeroList) => {
    setNameModalMode('rename');
    setTargetListId(list.id);
    setNameInputValue(list.name);
    setNameModalOpen(true);
    setContextMenuTargetId(null);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nameInputValue.trim();
    if (!trimmedName) return;

    // Check for duplicates
    const isDuplicate = lists.some(l => 
      l.name.toLowerCase() === trimmedName.toLowerCase() && 
      l.id !== targetListId
    );

    if (isDuplicate) {
      alert('Список с таким названием уже существует.');
      return;
    }

    if (nameModalMode === 'create') {
      const newId = onAddList(trimmedName);
      // Clean editor content for new list to prevent data leak from previous edits
      setEditorContent(''); 
      setEditingListId(newId);
    } else if (nameModalMode === 'rename' && targetListId) {
      onUpdateList(targetListId, { name: trimmedName });
    }

    setNameModalOpen(false);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (confirm('Вы уверены, что хотите удалить этот список?')) {
      onDeleteList(id);
    }
    setContextMenuTargetId(null);
  };

  const handleOpenEditor = (list: HeroList) => {
    setEditingListId(list.id);
    setEditorContent(list.heroes.join('\n'));
    setContextMenuTargetId(null);
    setIsFabVisible(true); // Reset FAB state
  };

  const handleSaveEditor = () => {
    if (editingListId) {
      const heroes = editorContent
        .split('\n')
        .map(h => h.trim())
        .filter(h => h.length > 0);
      
      onUpdateList(editingListId, { heroes });
      setEditingListId(null);
    }
  };

  // --- Sub-components ---

  const ListItem = ({ list }: { list: HeroList }) => (
    <div 
      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start justify-between relative"
    >
      <div 
        className="flex-1 mr-4 cursor-pointer pt-1"
        onClick={() => handleOpenEditor(list)}
      >
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight break-words whitespace-normal">
            {list.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {list.heroes.length} {list.heroes.length === 1 ? 'герой' : (list.heroes.length >= 2 && list.heroes.length <= 4) ? 'героя' : 'героев'}
          {list.isLocal && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 align-middle" title="Локальный" />}
        </p>
      </div>
      
      <button 
        onClick={(e) => { 
            e.stopPropagation(); 
            setContextMenuTargetId(contextMenuTargetId === list.id ? null : list.id); 
        }}
        className="p-2 -mr-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0"
      >
        <MoreVertical size={20} />
      </button>

      {/* Context Menu Dropdown */}
      {contextMenuTargetId === list.id && (
        <>
          {/* Transparent Overlay to close menu on outside click */}
          <div 
            className="fixed inset-0 z-10 cursor-default" 
            onClick={(e) => { e.stopPropagation(); setContextMenuTargetId(null); }} 
          />
          
          <div className="absolute right-8 top-10 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-600 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <button 
              onClick={(e) => { e.stopPropagation(); handleOpenRename(list); }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              <Edit2 size={16} /> Переименовать
            </button>
            <button 
              onClick={(e) => handleDelete(list.id, e)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-slate-700"
            >
              <Trash2 size={16} /> Удалить
            </button>
          </div>
        </>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-900 flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="px-4 py-4 bg-white dark:bg-slate-800 shadow-sm flex items-center justify-between shrink-0 z-30">
        {editingListId ? (
          <div className="flex items-center gap-2 w-full">
            <button 
              onClick={() => setEditingListId(null)}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate flex-1">
              {lists.find(l => l.id === editingListId)?.name}
            </h2>
            <button 
              onClick={handleSaveEditor}
              className="p-2 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 font-bold text-sm flex items-center gap-2 px-4"
            >
              <Save size={18} /> <span className="hidden sm:inline">Сохранить</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Настройки списков</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
            >
              <X size={24} />
            </button>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div 
        className="flex-1 overflow-y-auto p-4 no-scrollbar"
        onScroll={!editingListId ? handleScroll : undefined}
      >
        {editingListId ? (
          <div className="h-full flex flex-col gap-2">
            <label className="text-sm text-slate-500 dark:text-slate-400 px-1">
              Введите имена героев, каждого с новой строки:
            </label>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="flex-1 w-full p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 resize-none outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 text-lg leading-relaxed shadow-inner font-medium"
              placeholder="Герой 1&#10;Герой 2&#10;Герой 3..."
              autoFocus
            />
            <div className="text-xs text-center text-slate-400 dark:text-slate-500 py-2">
              Строки: {editorContent.split('\n').filter(l => l.trim().length > 0).length}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-24">
             {lists.length === 0 && (
                <div className="text-center py-20 text-slate-400 dark:text-slate-600">
                   Нет доступных списков
                </div>
             )}
             {lists.map(list => (
               <ListItem key={list.id} list={list} />
             ))}
          </div>
        )}
      </div>

      {/* FAB - Add List (Only on main list view) */}
      {!editingListId && (
        <div className={`absolute bottom-6 right-6 transition-all duration-300 z-30 ${isFabVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
          <button
            onClick={handleOpenCreate}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            <Plus size={28} />
          </button>
        </div>
      )}

      {/* Name Modal (Create / Rename) */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {nameModalMode === 'create' ? 'Новый список' : 'Переименовать список'}
            </h3>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={nameInputValue}
                onChange={(e) => setNameInputValue(e.target.value)}
                placeholder="Название списка..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 mb-6"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNameModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!nameInputValue.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {nameModalMode === 'create' ? 'Создать' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};