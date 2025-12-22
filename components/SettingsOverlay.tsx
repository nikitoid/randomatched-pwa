
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, ChevronLeft, Edit2, Trash2, Filter, Cloud, UploadCloud, Database, Wifi, WifiOff, Loader2, Files, Smartphone, Palette, ArrowDownAZ, ArrowUpAZ, Save, AlertCircle, BarChart3, Dice5, Check, GripVertical, MoreVertical, Layers, FileJson, FileText, ArrowLeftRight, Download, Upload, Copy, AlertTriangle, ChevronDown, SquareStack, Eye, Terminal, RefreshCw, Power, Bug, Trash, Info } from 'lucide-react';
import { HeroList, Hero, ColorScheme } from '../types';
import { RANKS, COLOR_SCHEMES_DATA } from '../constants';
import { RankSelect } from './RankSelect';
import { ListItem } from './ListItem';

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  lists: HeroList[];
  onAddList: (name: string) => string;
  onUpdateList: (id: string, updates: Partial<HeroList>) => void;
  onDeleteList: (id: string) => void;
}

interface ExpandedSettingsProps extends SettingsOverlayProps {
    onUploadToCloud?: (id: string) => void;
    onSync?: () => void;
    reorderLists?: (lists: HeroList[]) => void;
    sortLists?: (direction: 'asc' | 'desc') => void;
    isOnline?: boolean;
    isSyncing?: boolean;
    checkConnectivity?: () => Promise<boolean>;
    addToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning', duration?: number) => void;
    updatedListIds?: Set<string>;
    onMarkSeen?: (id: string) => void;
    updatedHeroIds?: Map<string, Set<string>>;
    onDismissHeroUpdates?: (listId: string) => void;
    colorScheme?: ColorScheme;
    setColorScheme?: (scheme: ColorScheme) => void;
    logs?: {type: string, args: string[], time?: string}[];
    checkForUpdate?: () => void;
    isCheckingUpdate?: boolean;
    isUpdateAvailable?: boolean;
    onUpdateApp?: () => void;
    isDebugMode?: boolean;
    onToggleDebug?: (val: boolean) => void;
}

type TabType = 'lists' | 'app' | 'appearance' | 'debug';
type SortOrder = 'asc' | 'desc' | 'custom';
type ImportMode = 'none' | 'text_import' | 'text_export' | 'rank_import' | 'file_import_confirm';

export const SettingsOverlay: React.FC<ExpandedSettingsProps> = ({
  isOpen,
  onClose,
  lists,
  onAddList,
  onUpdateList,
  onDeleteList,
  onUploadToCloud,
  onSync,
  reorderLists,
  sortLists,
  isOnline = true,
  isSyncing = false,
  checkConnectivity,
  addToast,
  updatedListIds,
  onMarkSeen,
  updatedHeroIds,
  onDismissHeroUpdates,
  colorScheme = 'emerald',
  setColorScheme,
  logs = [],
  checkForUpdate,
  isCheckingUpdate = false,
  isUpdateAvailable = false,
  onUpdateApp,
  isDebugMode = false,
  onToggleDebug
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('lists');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('custom');
  const [isReorderMode, setIsReorderMode] = useState(false);
  
  // Debug Filter State
  const [debugFilter, setDebugFilter] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  
  // Hero sorting inside editor: null = unsorted/default, 'asc' = A-Z, 'desc' = Z-A
  const [heroSortDirection, setHeroSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  // Track which row is currently focused (rank menu open)
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

  // Modals - Pure overlays
  const [isNameModalOpen, setNameModalOpen] = useState(false);
  const [nameModalMode, setNameModalMode] = useState<'create' | 'rename'>('create');
  const [nameInputValue, setNameInputValue] = useState('');
  const [targetListId, setTargetListId] = useState<string | null>(null);
  const [listToDelete, setListToDelete] = useState<HeroList | null>(null);
  const [isDeleteCloud, setIsDeleteCloud] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isDebugExitModalOpen, setIsDebugExitModalOpen] = useState(false);
  
  // Import/Export States
  const [importMode, setImportMode] = useState<ImportMode>('none');
  const [importTextValue, setImportTextValue] = useState('');
  const [rankSourceListId, setRankSourceListId] = useState('');
  const [isRankSourceDropdownOpen, setIsRankSourceDropdownOpen] = useState(false);
  const [pendingFileHeroes, setPendingFileHeroes] = useState<Hero[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createListFileInputRef = useRef<HTMLInputElement>(null);
  
  // Local changes indicator (for Rank Import)
  const [localHeroUpdates, setLocalHeroUpdates] = useState<Set<string>>(new Set());

  // Exit Confirmation Modal (for Editor dirty check)
  const [isDiscardModalOpen, setDiscardModalOpen] = useState(false);
  const [originalHeroesJson, setOriginalHeroesJson] = useState('');
  
  // Menu State
  const [contextMenuTargetId, setContextMenuTargetId] = useState<string | null>(null);
  const [isEditorMenuOpen, setIsEditorMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top?: number, bottom?: number, right: number, origin: 'top' | 'bottom' } | null>(null);
  const [activeItemRect, setActiveItemRect] = useState<DOMRect | null>(null);
  
  // Editor Menu specific state
  const [editorMenuRect, setEditorMenuRect] = useState<DOMRect | null>(null);
  
  // Editor State
  const [editorHeroes, setEditorHeroes] = useState<Hero[]>([]);
  const [editorIsGroupable, setEditorIsGroupable] = useState(false);

  // Debug Mode Click Counter
  const [debugClicks, setDebugClicks] = useState(0);

  // Drag/Scroll refs
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDragScroll, setIsDragScroll] = useState(false);

  // Swipe State
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  // List DND refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isListDragging, setIsListDragging] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Determine if current editor session is read-only (offline cloud list)
  const currentList = lists.find(l => l.id === editingListId);
  const isReadOnly = !!(currentList?.isCloud && !isOnline);

  // --- DIRTY CHECK LOGIC ---
  const getCleanHeroes = (heroes: Hero[]) => {
      // Filter out empty rows and trim names for comparison
      return heroes
        .filter(h => h.name.trim() !== '' || h.rank !== '')
        .map(h => ({ id: h.id, name: h.name.trim(), rank: h.rank }));
  };

  const getCleanState = () => JSON.stringify({
      heroes: getCleanHeroes(editorHeroes),
      isGroupable: editorIsGroupable
  });

  const isDirty = editingListId && !isReadOnly ? getCleanState() !== originalHeroesJson : false;
  const isDirtyRef = useRef(false);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  useEffect(() => {
    if (isOpen && onSync) onSync();
  }, [isOpen]);
  
  // Reset focus when editor closes
  useEffect(() => {
      if (!editingListId) {
          setFocusedRowIndex(null);
          setLocalHeroUpdates(new Set());
          setIsEditorMenuOpen(false);
          setEditorMenuRect(null);
          setIsRankSourceDropdownOpen(false);
          setHeroSortDirection(null);
          setIsReorderMode(false);
      }
  }, [editingListId]);

  // Manage empty row based on connectivity status
  useEffect(() => {
    if (!editingListId) return;

    setEditorHeroes(prev => {
        // If list is completely empty
        if (prev.length === 0) {
            return isReadOnly ? [] : [{ id: crypto.randomUUID(), name: '', rank: '' }];
        }
        
        const lastIndex = prev.length - 1;
        const lastRow = prev[lastIndex];
        const isLastEmpty = lastRow.name.trim() === '' && lastRow.rank === '';

        if (isReadOnly) {
            // SCENARIO: Went Offline (or opened as offline)
            // If the last row is completely empty, remove it (can't edit).
            // If the last row HAS data (even partial), keep it so user doesn't lose data.
            if (isLastEmpty) {
                return prev.slice(0, -1);
            }
        } else {
            // SCENARIO: Went Online
            // If the last row is NOT empty, we must append a new empty row for input.
            if (!isLastEmpty) {
                return [...prev, { id: crypto.randomUUID(), name: '', rank: '' }];
            }
        }
        return prev;
    });
  }, [isReadOnly, editingListId]);

  // --- HISTORY & NAVIGATION HANDLER ---

  // 1. PUSH STATE ON OPEN ONLY
  useEffect(() => {
    if (isOpen) {
        const currentState = window.history.state;
        const isInSettingsContext = 
            currentState?.overlay === 'settings' || 
            currentState?.overlay === 'settings-editor';

        if (!isInSettingsContext) {
            window.history.pushState({ overlay: 'settings' }, '');
        }
    }
  }, [isOpen]);

  // 2. LISTENER FOR NAVIGATION (Hierarchy: App -> Settings -> Editor)
  useEffect(() => {
    if (isOpen) {
      const handlePopState = (event: PopStateEvent) => {
        const state = event.state;
        const overlay = state?.overlay;
        
        // Close focused rank menu if open via back button
        if (focusedRowIndex !== null) {
            setFocusedRowIndex(null);
             window.history.pushState({ overlay: 'settings-editor' }, '');
             return;
        }

        if (isNameModalOpen || listToDelete || isDiscardModalOpen || isStatsModalOpen || importMode !== 'none' || isDebugExitModalOpen) {
            // Restore appropriate state depending on where we are
            if (editingListId) {
                 window.history.pushState({ overlay: 'settings-editor' }, '');
            } else {
                 window.history.pushState({ overlay: 'settings' }, '');
            }
            // Close overlays
            setNameModalOpen(false);
            setListToDelete(null);
            setDiscardModalOpen(false);
            setIsStatsModalOpen(false);
            setImportMode('none');
            setIsDebugExitModalOpen(false);
            return;
        }

        // INTERCEPT BACK ACTION IF DIRTY
        if (overlay === 'settings' && editingListId) {
             if (isDirtyRef.current) {
                 // Push state back to prevent actual navigation, then show confirmation
                 window.history.pushState({ overlay: 'settings-editor' }, '');
                 setDiscardModalOpen(true);
                 return;
             }

             if (onDismissHeroUpdates) onDismissHeroUpdates(editingListId);
             setEditingListId(null);
             setEditorHeroes([]);
             return;
        }

        if (overlay === 'settings-editor') {
             return; 
        }

        if (overlay !== 'settings' && overlay !== 'settings-editor') {
             onClose();
             setEditingListId(null);
             
             setNameModalOpen(false);
             setListToDelete(null);
             setDiscardModalOpen(false);
             setIsStatsModalOpen(false);
             setImportMode('none');
             setIsDebugExitModalOpen(false);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isOpen, editingListId, isNameModalOpen, listToDelete, isDiscardModalOpen, isStatsModalOpen, onDismissHeroUpdates, focusedRowIndex, importMode, isDebugExitModalOpen]);

  const manualGoBack = () => window.history.back();

  useEffect(() => { if (!isOpen) handleCloseMenu(); }, [isOpen]);

  useEffect(() => {
    if (contextMenuTargetId) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; }
  }, [contextMenuTargetId]);

  useEffect(() => {
    if (tabsContainerRef.current) {
        const activeBtn = tabsContainerRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
        activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  // --- IMPORT / EXPORT HANDLERS ---

  const validateRanks = (heroes: any[]): boolean => {
      return heroes.every(h => {
          if (!h.rank) return true; // empty rank is allowed during raw input, but specific validation might be strict
          // Allow empty strings, but if rank is present it must be valid
          return h.rank.trim() === '' || RANKS.includes(h.rank.trim());
      });
  };

  const handleEditorMenuAction = (action: () => void) => {
      setIsEditorMenuOpen(false);
      // Small timeout to allow menu to close before modal opens (smoother transition)
      setTimeout(() => action(), 50);
  };

  const handleToggleEditorMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isEditorMenuOpen) {
          setIsEditorMenuOpen(false);
      } else {
          setEditorMenuRect(e.currentTarget.getBoundingClientRect());
          setIsEditorMenuOpen(true);
      }
  };

  // 1. JSON FILE
  const handleFileExport = () => {
      const list = lists.find(l => l.id === editingListId);
      if (!list) return;

      const dataStr = JSON.stringify({ ...list, heroes: getCleanHeroes(editorHeroes), isGroupable: editorIsGroupable }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Requirement 2: Strictly list name
      link.download = `${list.name.replace(/[\/\\:*?"<>|]/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleExternalFileExport = (list: HeroList) => {
      const dataStr = JSON.stringify(list, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${list.name.replace(/[\/\\:*?"<>|]/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      handleCloseMenu();
  };

  const triggerFileUpload = () => {
      if (fileInputRef.current) fileInputRef.current.click();
  };

  const triggerCreateListFileUpload = () => {
      if (createListFileInputRef.current) createListFileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json.heroes)) {
                   // Validate Ranks
                   if (!validateRanks(json.heroes)) {
                       if(addToast) addToast("Ошибка: Файл содержит недопустимые ранги", "error");
                       if (fileInputRef.current) fileInputRef.current.value = '';
                       return;
                   }

                   setPendingFileHeroes(json.heroes.map((h: any) => ({
                       id: h.id || crypto.randomUUID(),
                       name: h.name || '',
                       rank: h.rank || ''
                   })));
                   // Reset file input
                   if (fileInputRef.current) fileInputRef.current.value = '';
                   setImportMode('file_import_confirm');
              } else {
                   if(addToast) addToast("Неверный формат файла", "error");
              }
          } catch (err) {
              if(addToast) addToast("Ошибка чтения файла", "error");
          }
      };
      reader.readAsText(file);
  };

  const handleNewListImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json.heroes)) {
                   if (!validateRanks(json.heroes)) {
                       if(addToast) addToast("Ошибка: Файл содержит недопустимые ранги", "error");
                       if (createListFileInputRef.current) createListFileInputRef.current.value = '';
                       return;
                   }

                   const name = file.name.replace(/\.json$/i, '');
                   const cleanHeroes = json.heroes.map((h: any) => ({
                       id: h.id || crypto.randomUUID(),
                       name: h.name || '',
                       rank: h.rank || ''
                   }));

                   const newId = onAddList(name);
                   onUpdateList(newId, { 
                       heroes: cleanHeroes,
                       isGroupable: json.isGroupable ?? false
                   });
                   
                   setNameModalOpen(false);
                   if (createListFileInputRef.current) createListFileInputRef.current.value = '';
                   if(addToast) addToast(`Список "${name}" создан`, "success");
              } else {
                   if(addToast) addToast("Неверный формат файла", "error");
              }
          } catch (err) {
              if(addToast) addToast("Ошибка чтения файла", "error");
          }
      };
      reader.readAsText(file);
  };

  const confirmFileImport = () => {
      if (pendingFileHeroes) {
          // Ensure we have at least one empty row at the end if needed or cleanup
          const clean = getCleanHeroes(pendingFileHeroes);
          const withEmpty = [...clean, { id: crypto.randomUUID(), name: '', rank: '' }];
          setEditorHeroes(withEmpty);
          if (addToast) addToast("Список импортирован", "success");
      }
      setPendingFileHeroes(null);
      setImportMode('none');
  };

  // 2. TEXT STRING
  const openTextExport = (list?: HeroList) => {
      let heroesToExport = editorHeroes;
      
      if (list) {
          heroesToExport = list.heroes;
      }
      
      const text = getCleanHeroes(heroesToExport)
          .map(h => `${h.name}${h.rank ? `|${h.rank}` : ''}`)
          .join('\n');
      setImportTextValue(text);
      setImportMode('text_export');
      handleCloseMenu();
  };

  const openTextImport = () => {
      setImportTextValue('');
      setImportMode('text_import');
  };

  const confirmTextImport = () => {
      if (!importTextValue.trim()) {
          if (addToast) addToast("Введите текст для импорта", "warning");
          return;
      }

      const lines = importTextValue.split(/\r?\n/).filter(l => l.trim() !== '');
      const newHeroes: Hero[] = lines.map(line => {
          // Default delimiter | but fallback if not present
          const parts = line.split('|');
          const name = parts[0].trim();
          const rank = parts.length > 1 ? parts[1].trim() : '';
          return { id: crypto.randomUUID(), name, rank };
      });
      
      // Requirement 1: Validate ranks in text import
      if (!validateRanks(newHeroes)) {
          if (addToast) addToast("Ошибка: Найдены недопустимые ранги. Используйте формат S+, A-, и т.д.", "error");
          return; // Do not close modal
      }

      // Add empty row
      newHeroes.push({ id: crypto.randomUUID(), name: '', rank: '' });
      setEditorHeroes(newHeroes);
      setImportMode('none');
      if (addToast) addToast(`Импортировано ${lines.length} героев`, "success");
  };

  const handleCopyText = () => {
      navigator.clipboard.writeText(importTextValue);
      if (addToast) addToast("Скопировано в буфер", "info");
  };

  // 3. RANK IMPORT
  const openRankImport = () => {
      setRankSourceListId('');
      setIsRankSourceDropdownOpen(false);
      setImportMode('rank_import');
  };

  const confirmRankImport = () => {
      const sourceList = lists.find(l => l.id === rankSourceListId);
      if (!sourceList) return;

      const newHeroes = [...editorHeroes];
      const newLocalUpdates = new Set(localHeroUpdates);
      let changesCount = 0;

      const normalize = (str: string) => str.trim().toLowerCase().replace(/ё/g, 'е');

      // Create map for faster lookup
      const sourceMap = new Map<string, string>();
      sourceList.heroes.forEach(h => {
          if (h.name.trim()) sourceMap.set(normalize(h.name), h.rank);
      });

      newHeroes.forEach((hero, idx) => {
          const nameNorm = normalize(hero.name);
          if (nameNorm && sourceMap.has(nameNorm)) {
              const newRank = sourceMap.get(nameNorm) || '';
              const oldRank = hero.rank || '';
              
              if (newRank !== oldRank) {
                  // Requirement: indicator if value changed previously entered (not empty)
                  if (oldRank !== '') {
                      newLocalUpdates.add(`${hero.id}:rank`);
                  }
                  newHeroes[idx] = { ...hero, rank: newRank };
                  changesCount++;
              }
          }
      });

      setEditorHeroes(newHeroes);
      setLocalHeroUpdates(newLocalUpdates);
      setImportMode('none');
      // Toast duration reduced to 2000ms
      if (addToast) addToast(`Обновлено рангов: ${changesCount}`, "success", 2000);
  };

  // --- EXISTING HANDLERS ---

  const handleToggleSort = () => {
    if (!sortLists) return;
    let nextOrder: SortOrder = sortOrder === 'custom' ? 'asc' : sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(nextOrder);
    sortLists(nextOrder === 'desc' ? 'desc' : 'asc');
  };
  
  const handleToggleReorderMode = () => {
      setIsReorderMode(!isReorderMode);
  };

  const handleOpenMenu = (id: string, buttonRect: DOMRect, cardRect: DOMRect) => {
      if (contextMenuTargetId === id) {
          handleCloseMenu();
          return;
      }
      setContextMenuTargetId(id);
      setActiveItemRect(cardRect);

      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const minSpaceNeeded = 280; // Increased to prevent cutoff
      const isBottom = spaceBelow < minSpaceNeeded;

      if (isBottom) {
          setMenuPosition({
              bottom: window.innerHeight - buttonRect.top + 8,
              right: window.innerWidth - buttonRect.right,
              origin: 'bottom'
          });
      } else {
          setMenuPosition({
              top: buttonRect.bottom + 8, 
              right: window.innerWidth - buttonRect.right,
              origin: 'top'
          });
      }
  };

  const handleCloseMenu = () => {
      setContextMenuTargetId(null);
      setMenuPosition(null);
      setActiveItemRect(null);
  };

  const handleOpenCreate = () => {
    setNameModalMode('create');
    setNameInputValue('');
    setNameModalOpen(true);
    handleCloseMenu();
  };

  const handleOpenRename = (list: HeroList) => {
    setNameModalMode('rename');
    setTargetListId(list.id);
    setNameInputValue(list.name);
    setNameModalOpen(true);
    handleCloseMenu();
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nameInputValue.trim();
    if (!trimmedName) return;
    const isDuplicate = lists.some(l => l.name.toLowerCase() === trimmedName.toLowerCase() && l.id !== targetListId);
    if (isDuplicate) { if (addToast) addToast('Такое имя уже есть', 'warning'); return; }

    if (nameModalMode === 'create') {
      const newId = onAddList(trimmedName);
      setNameModalOpen(false);
      
      window.history.pushState({ overlay: 'settings-editor' }, '');
      const newHeroes = [{ id: crypto.randomUUID(), name: '', rank: '' }];
      setEditorHeroes(newHeroes);
      setEditorIsGroupable(false);
      
      setOriginalHeroesJson(JSON.stringify({ 
          heroes: getCleanHeroes(newHeroes), 
          isGroupable: false 
      }));
      setEditingListId(newId);
    } else if (nameModalMode === 'rename' && targetListId) {
      if (checkConnectivity && addToast) {
         if (!(await checkConnectivity()) && lists.find(l => l.id === targetListId)?.isCloud) {
             addToast("Нет интернета", "error"); return;
         }
      }
      onUpdateList(targetListId, { name: trimmedName });
      setNameModalOpen(false);
    }
  };

  const handleDeleteClick = (list: HeroList) => {
    setIsDeleteCloud(!!list.isCloud);
    setListToDelete(list);
    handleCloseMenu();
  };

  const confirmDelete = async () => {
    if (listToDelete) {
      if (listToDelete.isCloud && checkConnectivity && addToast) {
         if (!(await checkConnectivity())) { addToast("Нет интернета", "error"); return; }
      }
      
      onDeleteList(listToDelete.id);
      setListToDelete(null);
    }
  };

  const handleUpload = async (id: string) => {
      if (checkConnectivity && addToast && !(await checkConnectivity())) {
          addToast("Нет интернета", "error"); handleCloseMenu(); return;
      }
      if (onUploadToCloud) onUploadToCloud(id);
      handleCloseMenu();
  }

  const handleOpenEditor = (list: HeroList) => {
    window.history.pushState({ overlay: 'settings-editor' }, '');
    
    setEditingListId(list.id);
    const heroes = JSON.parse(JSON.stringify(list.heroes));
    const isGroupable = !!list.isGroupable;
    setEditorIsGroupable(isGroupable);

    setOriginalHeroesJson(JSON.stringify({ 
        heroes: getCleanHeroes(heroes),
        isGroupable: isGroupable
    }));
    
    // Add empty row only if not read-only
    const isReadOnlyLocal = !!(list.isCloud && !isOnline);
    if (!isReadOnlyLocal) {
        const last = heroes[heroes.length - 1];
        if (!last || last.name.trim() !== '' || last.rank !== '') {
            heroes.push({ id: crypto.randomUUID(), name: '', rank: '' });
        }
    }
    
    setEditorHeroes(heroes);
    handleCloseMenu();
  };

  const handleRemoveHero = (index: number) => {
    if (isReadOnly) return;
    setEditorHeroes(prev => {
        const newHeroes = prev.filter((_, i) => i !== index);
        const last = newHeroes[newHeroes.length - 1];
        if (!last || last.name.trim() !== '' || last.rank !== '') {
            newHeroes.push({ id: crypto.randomUUID(), name: '', rank: '' });
        }
        return newHeroes;
    });
  };

  const handleHeroChange = (index: number, field: 'name' | 'rank', value: string) => {
    if (isReadOnly) return;
    setEditorHeroes(prev => {
        const newHeroes = [...prev];
        newHeroes[index] = { ...newHeroes[index], [field]: value };
        const lastIndex = newHeroes.length - 1;
        if (index === lastIndex) {
            const current = newHeroes[index];
            if (current.name.trim() !== '' || current.rank !== '') {
                newHeroes.push({ id: crypto.randomUUID(), name: '', rank: '' });
            }
        }
        return newHeroes;
    });
  };

  const handleSortEditorHeroes = () => {
      const nextDirection = heroSortDirection === 'asc' ? 'desc' : 'asc';
      setHeroSortDirection(nextDirection);

      setEditorHeroes(prev => {
          const filled = prev.filter(h => h.name.trim() !== '' || h.rank !== '');
          
          filled.sort((a, b) => {
              return nextDirection === 'asc' 
                  ? a.name.localeCompare(b.name) 
                  : b.name.localeCompare(a.name);
          });
          
          if (isReadOnly) return filled;
          
          return [...filled, { id: crypto.randomUUID(), name: '', rank: '' }];
      });
  };

  const handleSaveEditor = async () => {
    if (isReadOnly) return;
    if (editingListId) {
      const currentList = lists.find(l => l.id === editingListId);
      if (currentList?.isCloud && checkConnectivity && addToast && !(await checkConnectivity())) {
          addToast("Нет интернета", "error"); return;
      }
      const activeHeroes = editorHeroes.filter(h => h.name.trim() !== '' || h.rank !== '');
      
      if (activeHeroes.length > 0) {
          const hasEmptyNames = activeHeroes.some(h => !h.name.trim());
          if (hasEmptyNames) {
              if (addToast) addToast("У всех героев должны быть имена", "warning");
              return;
          }

          // Check for duplicates within the current list
          const seenNames = new Set<string>();
          for (const hero of activeHeroes) {
              const normalized = hero.name.trim().toLowerCase();
              if (seenNames.has(normalized)) {
                  if (addToast) addToast(`Герой "${hero.name.trim()}" уже есть в списке`, "error");
                  return;
              }
              seenNames.add(normalized);
          }
      }

      const cleanHeroes = activeHeroes.map(h => ({...h, name: h.name.trim()}));
      onUpdateList(editingListId, { 
          heroes: cleanHeroes,
          isGroupable: editorIsGroupable
      });
      
      isDirtyRef.current = false;
      setOriginalHeroesJson(JSON.stringify({
          heroes: getCleanHeroes(cleanHeroes),
          isGroupable: editorIsGroupable
      }));
      
      manualGoBack();
    }
  };
  
  const handleCancelModal = () => {
      setNameModalOpen(false);
      setListToDelete(null);
  };
  
  const handleCancelEditor = () => {
      if (isDirtyRef.current) {
          setDiscardModalOpen(true);
      } else {
          manualGoBack();
      }
  };

  const handleDiscardConfirm = () => {
      if (editingListId && onDismissHeroUpdates) onDismissHeroUpdates(editingListId);
      setEditingListId(null);
      setEditorHeroes([]);
      setEditorIsGroupable(false);
      setOriginalHeroesJson('');
      setDiscardModalOpen(false);
      window.history.back(); 
  };
  
  const handleDiscardCancel = () => {
      setDiscardModalOpen(false);
  };

  const handleVersionClick = () => {
      if (isDebugMode) return;
      setDebugClicks(prev => {
          const next = prev + 1;
          if (next >= 10) {
              if (onToggleDebug) onToggleDebug(true);
              return 10;
          }
          return next;
      });
  };

  const handleDebugOff = () => {
      setIsDebugExitModalOpen(true);
  };
  
  const confirmDebugOff = () => {
      if (onToggleDebug) onToggleDebug(false);
      setDebugClicks(0);
      setActiveTab('lists');
      setIsDebugExitModalOpen(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = tabsContainerRef.current; if (!el) return;
    setIsDragging(true); setIsDragScroll(false); setStartX(e.pageX - el.offsetLeft); setScrollLeft(el.scrollLeft);
  };
  const handleMouseUp = () => { setIsDragging(false); setTimeout(() => setIsDragScroll(false), 50); };
  const handleMouseLeave = () => { setIsDragging(false); setIsDragScroll(false); };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tabsContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    if (Math.abs((x - startX) * 2) > 5) setIsDragScroll(true);
    tabsContainerRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
  };

  // Swipe Navigation Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
      touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (editingListId || isListDragging) return;
      touchEndX.current = e.changedTouches[0].clientX;
      touchEndY.current = e.changedTouches[0].clientY;
      handleSwipe();
  };

  const handleSwipe = () => {
      const SWIPE_THRESHOLD = 60;
      const diffX = touchStartX.current - touchEndX.current;
      const diffY = touchStartY.current - touchEndY.current;

      // Ignore if vertical swipe is significant (more than horizontal)
      if (Math.abs(diffY) > Math.abs(diffX)) return;
      
      const tabs: TabType[] = isDebugMode 
          ? ['lists', 'appearance', 'app', 'debug'] 
          : ['lists', 'appearance', 'app'];
      
      const currentIndex = tabs.indexOf(activeTab);

      if (Math.abs(diffX) > SWIPE_THRESHOLD) {
          if (diffX > 0 && currentIndex < tabs.length - 1) {
              // Swipe Left -> Next Tab
              setActiveTab(tabs[currentIndex + 1]);
          } else if (diffX < 0 && currentIndex > 0) {
              // Swipe Right -> Prev Tab
              setActiveTab(tabs[currentIndex - 1]);
          }
      }
  };

  const renderTabButton = (id: TabType, label: string, icon: React.ReactNode) => (
    <button
      data-tab-id={id}
      onClick={(e) => {
        if (isDragScroll) { e.preventDefault(); e.stopPropagation(); return; }
        setActiveTab(id);
      }}
      className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap select-none border
        ${activeTab === id
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md'
          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
      } ${isDragScroll ? 'pointer-events-none' : ''}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const activeListForMenu = lists.find(l => l.id === contextMenuTargetId);

  const getListIcon = (list: HeroList) => {
      if (list.isTemporary) return <Filter size={22} className="text-primary-500" />;
      if (list.isCloud) return <Cloud size={22} className="text-sky-500" />;
      return <Database size={22} className="text-slate-400" />;
  };
  
  const getStats = () => {
      const counts: Record<string, number> = {};
      let total = 0;
      editorHeroes.forEach(h => {
          if (h.name.trim() !== '' || h.rank !== '') {
             if (h.rank) counts[h.rank] = (counts[h.rank] || 0) + 1;
             total++;
          }
      });
      const max = Math.max(...Object.values(counts), 1);
      return { counts, max, total };
  };

  const getRankBarColor = (rank: string) => {
      if (rank === 'S+') return 'bg-yellow-500 dark:bg-yellow-500';
      if (rank === 'S-') return 'bg-yellow-400 dark:bg-yellow-400';
      if (rank.startsWith('S')) return 'bg-yellow-500 dark:bg-yellow-500';

      if (rank === 'A+') return 'bg-violet-600 dark:bg-violet-600';
      if (rank === 'A-') return 'bg-violet-500 dark:bg-violet-500';
      if (rank.startsWith('A')) return 'bg-violet-600 dark:bg-violet-600';

      if (rank === 'B+') return 'bg-blue-600 dark:bg-blue-600';
      if (rank === 'B-') return 'bg-blue-500 dark:bg-blue-500';
      if (rank.startsWith('B')) return 'bg-blue-600 dark:bg-blue-600';

      if (rank === 'C+') return 'bg-green-600 dark:bg-green-600';
      if (rank === 'C-') return 'bg-green-500 dark:bg-green-500';
      if (rank.startsWith('C')) return 'bg-green-600 dark:bg-green-600';

      if (rank === 'D+') return 'bg-slate-300 dark:bg-slate-200';
      if (rank === 'D-') return 'bg-slate-200 dark:bg-slate-300';
      if (rank.startsWith('D')) return 'bg-slate-300 dark:bg-slate-200';

      if (rank === 'E+') return 'bg-gray-600 dark:bg-gray-500';
      if (rank === 'E-') return 'bg-gray-500 dark:bg-gray-600';
      if (rank.startsWith('E')) return 'bg-gray-600 dark:bg-gray-500';

      return 'bg-slate-200 dark:bg-slate-700'; 
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    setIsListDragging(true);
    handleCloseMenu();
    if (sortOrder !== 'custom') setSortOrder('custom');
    if ('touches' in e) document.body.style.overflow = 'hidden';
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (dragItem.current === null) return;
    dragOverItem.current = index;
    if (dragItem.current !== index && reorderLists) {
      const newLists = [...lists];
      const draggedListContent = newLists[dragItem.current];
      newLists.splice(dragItem.current, 1);
      newLists.splice(index, 0, draggedListContent);
      dragItem.current = index;
      reorderLists(newLists);
      if (sortOrder !== 'custom') setSortOrder('custom');
    }
  };
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    dragItem.current = null;
    dragOverItem.current = null;
    setIsListDragging(false);
    if ('changedTouches' in e) document.body.style.overflow = '';
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (dragItem.current === null || !reorderLists) return;
    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const listItem = targetElement?.closest('[data-list-index]');
    if (listItem) {
        const index = parseInt(listItem.getAttribute('data-list-index') || '-1', 10);
        if (index !== -1 && index !== dragItem.current) {
            const newLists = [...lists];
            const draggedListContent = newLists[dragItem.current];
            newLists.splice(dragItem.current, 1);
            newLists.splice(index, 0, draggedListContent);
            dragItem.current = index;
            reorderLists(newLists);
            if (sortOrder !== 'custom') setSortOrder('custom');
        }
    }
  };

  const filteredLogs = useMemo(() => {
      if (debugFilter === 'all') return logs;
      return logs.filter(l => l.type === debugFilter);
  }, [logs, debugFilter]);

  return (
    <div className={`fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible'}`}>
      
      {focusedRowIndex !== null && (
          <div 
             className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 animate-in fade-in duration-200" 
             onPointerDown={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 setFocusedRowIndex(null);
             }}
          />
      )}
      
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800">
        <div className="px-4 py-3 pt-safe-area-top">
          {editingListId ? (
            <div className="flex flex-col w-full pb-1">
                 {/* Top Row: Back, Title, Menu */}
                 <div className="flex items-center justify-between min-h-[44px]">
                    <button onClick={handleCancelEditor} className="p-2 -ml-2 rounded-full md:hover:bg-slate-100 dark:md:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-800 text-slate-900 dark:text-white">
                        <ChevronLeft size={24} />
                    </button>
                    
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate flex-1 text-center px-4">
                        {lists.find(l => l.id === editingListId)?.name}
                        {isReadOnly && <span className="ml-2 text-xs font-normal opacity-60">(Только чтение)</span>}
                    </h2>

                    {!currentList?.isTemporary ? (
                        <button 
                            onClick={handleToggleEditorMenu}
                            className={`p-2 -mr-2 rounded-full transition-colors ${isEditorMenuOpen ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'md:hover:bg-slate-100 dark:md:hover:bg-slate-100 active:bg-slate-100 dark:active:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                        >
                            <MoreVertical size={24} />
                        </button>
                    ) : (
                        <div className="w-10" /> // Dummy to balance back button
                    )}
                 </div>

                 {/* Second Row: Group Toggle and Actions */}
                 <div className="flex items-center justify-between mt-1">
                    {!currentList?.isTemporary ? (
                        <button 
                            onClick={() => !isReadOnly && setEditorIsGroupable(!editorIsGroupable)}
                            disabled={isReadOnly}
                            className={`mr-2 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all border ${editorIsGroupable ? 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700'} ${isReadOnly ? 'opacity-70' : ''}`}
                        >
                            <SquareStack size={14} className="shrink-0" />
                            <span className="truncate">{editorIsGroupable ? 'В группе' : 'Не в группе'}</span>
                            <div className={`w-2 h-2 rounded-full ml-auto shrink-0 ${editorIsGroupable ? 'bg-primary-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        </button>
                    ) : (
                        // Hide In Group button completely for temporary lists
                         <div className="w-1" />
                    )}

                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => setIsStatsModalOpen(true)} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform">
                            <BarChart3 size={18} />
                        </button>
                        <button onClick={handleSortEditorHeroes} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform">
                            {heroSortDirection === 'desc' ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
                        </button>
                        {!isReadOnly && (
                            <button onClick={handleSaveEditor} className="h-8 sm:h-9 px-3 sm:px-4 flex items-center justify-center gap-2 rounded-xl bg-primary-600 text-white font-bold text-xs shadow-lg shadow-primary-600/20 active:scale-95 transition-transform">
                               <Save size={16} /> <span>Сохранить</span>
                            </button>
                        )}
                    </div>
                 </div>
                 
                 {/* Hidden File Input for Import */}
                 <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".json" 
                      onChange={handleFileChange} 
                 />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-full min-h-[44px]">
              <button 
                onClick={manualGoBack} 
                className="absolute left-0 p-2 -ml-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white md:hover:bg-slate-200 dark:md:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-700 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Настройки</h2>
            </div>
          )}
        </div>

        {!editingListId && (
          <div className="px-4 pb-3">
             <div ref={tabsContainerRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}
                className={`flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
             >
                {renderTabButton('lists', 'Списки', <Files size={16} />)}
                {renderTabButton('appearance', 'Внешний вид', <Palette size={16} />)}
                {renderTabButton('app', 'Инфо', <Smartphone size={16} />)}
                {isDebugMode && renderTabButton('debug', 'Debug', <Terminal size={16} />)}
             </div>
          </div>
        )}
      </div>

      <div 
        className="flex-1 relative overflow-hidden" 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
      >
        
        <div 
            ref={listContainerRef} 
            onTouchMove={handleTouchMove}
            className={`absolute inset-0 overflow-y-auto no-scrollbar transition-transform duration-300 ease-out 
                ${editingListId ? '-translate-x-[20%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100 pointer-events-auto'}
            `}
        >
          <div className="pb-safe-area-bottom">
            {activeTab === 'lists' && (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center justify-between sticky top-0 z-30 px-4 pt-4 pb-4 bg-slate-50 dark:bg-slate-950">
                     <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${isOnline ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                        {isSyncing ? <><Loader2 size={10} className="animate-spin" /> Sync</> : isOnline ? <><Wifi size={10} /> Online</> : <><WifiOff size={10} /> Offline</>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleToggleReorderMode} className={`w-9 h-9 flex items-center justify-center rounded-full border shadow-sm transition-colors ${isReorderMode ? 'bg-primary-100 text-primary-600 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            <GripVertical size={18} />
                        </button>
                        <button onClick={handleToggleSort} className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300">
                            {sortOrder === 'desc' ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
                        </button>
                        <button onClick={handleOpenCreate} className="h-9 px-4 flex items-center gap-2 bg-primary-600 text-white rounded-full shadow-md shadow-primary-600/20 active:scale-95 transition-transform">
                            <Plus size={18} /> <span className="text-sm font-bold">Новый</span>
                        </button>
                    </div>
                 </div>
                 
                 <div className="px-4 pb-4">
                    {lists.length === 0 && <div className="text-center py-20 text-slate-400">Нет списков</div>}
                    {lists.map((list, idx) => (
                      <ListItem 
                        key={list.id} 
                        list={list} 
                        index={idx} 
                        total={lists.length} 
                        isOnline={isOnline} 
                        contextMenuTargetId={contextMenuTargetId} 
                        onOpenMenu={handleOpenMenu} 
                        onEdit={handleOpenEditor} 
                        onDragStart={handleDragStart} 
                        onDragEnter={handleDragEnter} 
                        onDragEnd={handleDragEnd} 
                        isDragging={dragItem.current === idx} 
                        hasUpdate={updatedListIds ? updatedListIds.has(list.id) : false}
                        onMarkSeen={onMarkSeen}
                        isReorderMode={isReorderMode}
                    />
                    ))}
                 </div>
              </div>
            )}
            
            {activeTab === 'appearance' && (
              <div className="flex flex-col items-center justify-start min-h-full p-6 text-center animate-in fade-in slide-in-from-bottom-2">
                 <div className="w-full max-w-sm">
                    <h3 className="text-left text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Цветовая схема</h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        {Object.entries(COLOR_SCHEMES_DATA).map(([key, data]) => {
                            const isSelected = colorScheme === key;
                            const colorValue = `rgb(${data.primary[500]})`;
                            
                            return (
                                <button
                                    key={key}
                                    onClick={() => setColorScheme && setColorScheme(key as any)}
                                    className={`relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95
                                        ${isSelected 
                                            ? 'border-primary-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-primary-500/20' 
                                            : 'border-transparent bg-white dark:bg-slate-900 md:hover:bg-slate-50 dark:md:hover:bg-slate-800'
                                        }
                                    `}
                                >
                                    <div 
                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 shadow-sm flex items-center justify-center"
                                        style={{ backgroundColor: colorValue }}
                                    >
                                        {isSelected && <Check size={20} className="text-white drop-shadow-md" />}
                                    </div>
                                    <div className="text-left min-w-0">
                                        <div className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {data.label}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                        <div className="text-center">
                             <div className="text-sm font-bold text-slate-900 dark:text-white mb-2">Пример кнопки</div>
                             <button className="px-6 py-2 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-600/30">
                                 Action
                             </button>
                        </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'app' && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in slide-in-from-bottom-2">
                 <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center text-primary-600 dark:text-primary-400 mb-6 shadow-xl shadow-primary-500/10 rotate-3">
                    <Dice5 size={48} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Randomatched</h3>
                 
                 <div onClick={handleVersionClick} className="relative cursor-pointer inline-block mb-8">
                     <p className="text-sm font-bold text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full select-none">v2.2.3</p>
                     {!isDebugMode && debugClicks > 5 && debugClicks < 10 && (
                         <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-slate-400">
                             Debug через {10 - debugClicks}...
                         </div>
                     )}
                 </div>
                 
                 <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 w-full max-w-xs text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    <p className="mb-3">
                        Генератор команд 2x2 для настольной игры <strong>Unmatched</strong>.
                    </p>
                    <p>
                        Создавайте свои списки героев, синхронизируйте их между устройствами и используйте умные алгоритмы для создания идеально сбалансированных матчей.
                    </p>
                 </div>

                 {isUpdateAvailable && onUpdateApp && (
                    <button 
                        onClick={onUpdateApp}
                        className="mb-8 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-transform"
                    >
                        <Download size={14} /> 
                        Обновить и перезапустить
                    </button>
                 )}
                 
                 <div className="mt-auto pt-4 pb-4 text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest flex flex-col gap-1 items-center">
                    <span>Designed for Unmatched Fans</span>
                    <span>by Nikitoid</span>
                 </div>
              </div>
            )}

            {activeTab === 'debug' && isDebugMode && (
                <div className="flex flex-col h-full bg-[#0d1117] text-gray-300 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#161b22]">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono"><Terminal size={16} /> TERMINAL</h3>
                        <button onClick={handleDebugOff} className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"><Power size={16} /></button>
                    </div>
                    
                    <div className="flex items-center gap-1 p-2 bg-[#0d1117] border-b border-gray-800 overflow-x-auto no-scrollbar">
                        <button onClick={() => setDebugFilter('all')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-colors border ${debugFilter === 'all' ? 'bg-gray-800 text-white border-gray-600' : 'text-gray-500 border-transparent hover:bg-gray-900'}`}>ALL</button>
                        <button onClick={() => setDebugFilter('log')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-colors border ${debugFilter === 'log' ? 'bg-blue-900/30 text-blue-400 border-blue-900' : 'text-gray-500 border-transparent hover:bg-gray-900'}`}><Info size={10} /> LOG</button>
                        <button onClick={() => setDebugFilter('warn')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-colors border ${debugFilter === 'warn' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900' : 'text-gray-500 border-transparent hover:bg-gray-900'}`}><AlertTriangle size={10} /> WARN</button>
                        <button onClick={() => setDebugFilter('error')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-colors border ${debugFilter === 'error' ? 'bg-red-900/30 text-red-400 border-red-900' : 'text-gray-500 border-transparent hover:bg-gray-900'}`}><Bug size={10} /> ERROR</button>
                        <div className="flex-1" />
                        <div className="text-[10px] text-gray-600 font-mono px-2">{filteredLogs.length} items</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed">
                        {filteredLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-2">
                                <Terminal size={32} className="opacity-20" />
                                <span>No output to display</span>
                            </div>
                        ) : (
                            filteredLogs.map((log, i) => (
                                <div key={i} className={`mb-2 font-mono break-all flex gap-3 group ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                                    <span className="text-gray-600 shrink-0 select-none w-8 text-right opacity-50 group-hover:opacity-100 transition-opacity">{i + 1}</span>
                                    <div className="flex-1">
                                        <div className="opacity-80">{log.args.join(' ')}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>

        <div 
            className={`absolute inset-0 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-slate-950 transition-transform duration-300 ease-out ${editingListId ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ 
                transform: focusedRowIndex !== null ? 'none' : undefined,
                transition: focusedRowIndex !== null ? 'none' : undefined
            }}
        >
           <div className="p-4 pb-safe-area-bottom min-h-full flex flex-col">
              
              <div className="space-y-1.5 pb-20 mt-2">
                  {editorHeroes.map((hero, idx) => {
                      const isLast = idx === editorHeroes.length - 1;
                      const isEmpty = hero.name.trim() === '' && hero.rank === '';
                      const showDelete = (!isLast || !isEmpty) && !isReadOnly;

                      // Check cloud updates
                      const updatedFields = editingListId && updatedHeroIds ? updatedHeroIds.get(editingListId) : undefined;
                      const isNameUpdated = updatedFields ? updatedFields.has(`${hero.id}:name`) : false;
                      const isRankUpdated = (updatedFields ? updatedFields.has(`${hero.id}:rank`) : false) || localHeroUpdates.has(`${hero.id}:rank`);
                      
                      const isRowFocused = focusedRowIndex === idx;
                      const isAnyMenuOpen = focusedRowIndex !== null;

                      // Check for duplicates
                      const normalizedName = hero.name.trim().toLowerCase();
                      const isDuplicate = normalizedName !== '' && editorHeroes.filter(h => h.name.trim().toLowerCase() === normalizedName).length > 1;

                      return (
                      <div key={hero.id} className={`flex gap-2 items-center animate-fade-in relative transition-[transform,box-shadow] duration-200 ${isRowFocused ? 'z-50 scale-[1.02]' : 'z-auto'}`}>
                          <div className="flex-1 relative">
                              {isNameUpdated && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full z-20 ring-2 ring-white dark:ring-slate-950" />}
                              <input 
                                  type="text" 
                                  value={hero.name}
                                  onChange={(e) => handleHeroChange(idx, 'name', e.target.value)}
                                  placeholder={isLast ? "Добавить героя..." : "Имя героя"}
                                  disabled={isReadOnly || isAnyMenuOpen}
                                  readOnly={isRowFocused}
                                  className={`w-full h-[38px] px-4 text-sm rounded-xl border outline-none select-text transition-all
                                    ${isReadOnly ? 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-600 dark:text-slate-300' : 
                                    isLast 
                                        ? 'bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 placeholder:text-slate-400 italic focus:bg-white dark:focus:bg-slate-900 focus:border-solid focus:not-italic focus:text-slate-900 dark:focus:text-white'
                                        : 'bg-white dark:bg-slate-900 border-solid border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white'
                                    }
                                    ${!isReadOnly && isRowFocused 
                                        ? `border-primary-500 ring-2 ring-primary-500/20 shadow-lg z-10 ${isLast ? 'bg-white dark:bg-slate-900 border-solid not-italic text-slate-900 dark:text-white' : ''}`
                                        : !isReadOnly && isDuplicate 
                                            ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-200 focus:ring-2 focus:ring-red-500' 
                                            : !isReadOnly ? 'focus:ring-2 focus:ring-primary-500' : ''
                                    }
                                  `}
                              />
                          </div>
                          <div className="w-20 h-[38px] shrink-0 relative z-30">
                              {isRankUpdated && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full z-20 ring-2 ring-white dark:ring-slate-950 pointer-events-none" />}
                              <RankSelect 
                                value={hero.rank}
                                onChange={(val) => handleHeroChange(idx, 'rank', val)}
                                isOpen={isRowFocused}
                                onOpen={() => setFocusedRowIndex(idx)}
                                onClose={() => setFocusedRowIndex(null)}
                                disabled={isReadOnly || (isAnyMenuOpen && !isRowFocused)}
                              />
                          </div>
                          {!isReadOnly ? (
                              <div className="w-10 flex items-center justify-center">
                                  {showDelete && (
                                    <button 
                                        onClick={() => handleRemoveHero(idx)}
                                        disabled={isRowFocused || isAnyMenuOpen}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all
                                            ${isRowFocused
                                                ? 'opacity-0 pointer-events-none'
                                                : 'text-red-300 md:hover:text-red-500 md:hover:bg-red-50 dark:md:hover:bg-red-900/20 active:text-red-500'
                                            }
                                        `}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                  )}
                              </div>
                          ) : (
                              // Placeholder to maintain layout consistency in readonly mode
                              <div className="w-0" />
                          )}
                      </div>
                  )})}
              </div>

           </div>
        </div>

      </div>

      {/* Editor Menu Portal */}
      {isEditorMenuOpen && editorMenuRect && createPortal(
         <>
             <div 
                className="fixed inset-0 z-[60] bg-transparent" 
                onClick={() => setIsEditorMenuOpen(false)} 
             />
             <div 
                className="fixed z-[61] w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-menu-in origin-top-right"
                style={{
                    top: editorMenuRect.bottom + 8,
                    right: window.innerWidth - editorMenuRect.right,
                }}
             >
                <button onClick={() => handleEditorMenuAction(handleFileExport)} className="w-full text-left px-4 py-3 flex items-center gap-3 md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium">
                    <FileJson size={16} /> Экспорт в файл
                </button>
                {!isReadOnly && !currentList?.isTemporary && (
                    <>
                        <button onClick={() => handleEditorMenuAction(triggerFileUpload)} className="w-full text-left px-4 py-3 flex items-center gap-3 md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium">
                            <Upload size={16} /> Импорт из файла
                        </button>
                    </>
                )}
                <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2" />
                <button onClick={() => handleEditorMenuAction(() => openTextExport(undefined))} className="w-full text-left px-4 py-3 flex items-center gap-3 md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium">
                    <Copy size={16} /> Экспорт (Текст)
                </button>
                {!isReadOnly && !currentList?.isTemporary && (
                    <>
                        <button onClick={() => handleEditorMenuAction(openTextImport)} className="w-full text-left px-4 py-3 flex items-center gap-3 md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium">
                            <FileText size={16} /> Импорт (Текст)
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2" />
                        <button onClick={() => handleEditorMenuAction(openRankImport)} className="w-full text-left px-4 py-3 flex items-center gap-3 md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-violet-600 dark:text-violet-400 text-sm font-medium">
                            <ArrowLeftRight size={16} /> Импорт рангов
                        </button>
                    </>
                )}
             </div>
         </>,
         document.body
      )}

      {contextMenuTargetId && menuPosition && activeListForMenu && activeItemRect && createPortal(
         <>
             <div 
                className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-[2px] animate-in fade-in duration-200" 
                onClick={(e) => { e.stopPropagation(); handleCloseMenu(); }} 
             />

             <div 
                onClick={() => handleCloseMenu()}
                className="fixed z-[61] bg-white dark:bg-slate-900 p-4 rounded-2xl flex items-center shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-200"
                style={{
                   top: activeItemRect.top,
                   left: activeItemRect.left,
                   width: activeItemRect.width,
                   height: activeItemRect.height,
                   transformOrigin: 'center center'
                }}
             >
                <div className="mr-4 ml-1 flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-700/50 relative">
                     {getListIcon(activeListForMenu)}
                     {updatedListIds && updatedListIds.has(activeListForMenu.id) && (
                       <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                     )}
                </div>
                <div className="flex-1 mr-4">
                    <h3 className={`font-bold text-lg leading-tight mb-0.5 ${activeListForMenu.isTemporary ? 'text-primary-900 dark:text-primary-300 italic' : 'text-slate-900 dark:text-slate-100'}`}>
                        {activeListForMenu.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-500 flex items-center gap-2">
                        <span>Героев: {activeListForMenu.heroes.length}</span>
                        {activeListForMenu.isTemporary && <span className="text-primary-500 dark:text-primary-400">временный</span>}
                        {activeListForMenu.isCloud && !isOnline && <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">Offline</span>}
                    </p>
                </div>
                <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 shrink-0">
                    <MoreVertical size={20} />
                </div>
             </div>

             <div 
                className={`fixed z-[62] w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden ${
                    menuPosition.origin === 'bottom' ? 'animate-menu-in-up origin-bottom-right' : 'animate-menu-in origin-top-right'
                }`}
                style={{ 
                    top: menuPosition.top, 
                    bottom: menuPosition.bottom, 
                    right: menuPosition.right 
                }}
             >
                 {!activeListForMenu.isCloud && !activeListForMenu.isTemporary && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleUpload(activeListForMenu.id); }} 
                        disabled={!isOnline} 
                        className={`w-full text-left px-4 py-3.5 flex items-center gap-3 text-sm font-medium border-b border-slate-50 dark:border-slate-700/50 ${!isOnline ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500' : 'md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-sky-600 dark:text-sky-400'}`}
                    >
                        <UploadCloud size={16} /> Выгрузить в облако
                    </button>
                )}
                {!activeListForMenu.isTemporary && (
                    <button onClick={(e) => { e.stopPropagation(); handleOpenRename(activeListForMenu); }} disabled={(!isOnline && activeListForMenu.isCloud)} className={`w-full text-left px-4 py-3.5 flex items-center gap-3 text-sm font-medium transition-colors ${(!isOnline && activeListForMenu.isCloud) ? 'opacity-40 cursor-not-allowed text-slate-400' : 'md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                    <Edit2 size={16} /> Переименовать
                    </button>
                )}
                
                <button onClick={(e) => { e.stopPropagation(); openTextExport(activeListForMenu); }} className={`w-full text-left px-4 py-3.5 flex items-center gap-3 md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium`}>
                    <Copy size={16} /> Экспорт (Текст)
                </button>

                {!activeListForMenu.isTemporary && (
                    <button onClick={(e) => { e.stopPropagation(); handleExternalFileExport(activeListForMenu); }} className={`w-full text-left px-4 py-3.5 flex items-center gap-3 md:hover:bg-slate-50 dark:md:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium`}>
                        <FileJson size={16} /> Экспорт в файл
                    </button>
                )}
                <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2" />
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(activeListForMenu); }} 
                    disabled={activeListForMenu.isCloud && !isOnline}
                    className={`w-full text-left px-4 py-3.5 flex items-center gap-3 text-sm font-medium transition-colors ${activeListForMenu.isCloud && !isOnline ? 'opacity-40 cursor-not-allowed text-slate-400' : 'md:hover:bg-red-50 dark:md:hover:bg-red-900/20 text-red-600 dark:text-red-400'}`}
                >
                    <Trash2 size={16} /> {activeListForMenu.isCloud ? 'Удалить из облака' : 'Удалить'}
                </button>
             </div>
         </>,
         document.body
      )}
      
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isNameModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${isNameModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
              <form onSubmit={handleNameSubmit}>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{nameModalMode === 'create' ? 'Новый список' : 'Переименовать'}</h3>
                  <input autoFocus={isNameModalOpen} type="text" value={nameInputValue} onChange={(e) => setNameInputValue(e.target.value)} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white select-text" placeholder="Название..." />
                  
                  {nameModalMode === 'create' && (
                      <div className="mb-6">
                          <div className="flex items-center gap-2 mb-2">
                              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                              <span className="text-[10px] uppercase text-slate-400 font-bold">Или</span>
                              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                          </div>
                          <button type="button" onClick={triggerCreateListFileUpload} className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700 md:hover:bg-slate-100 dark:md:hover:bg-slate-700 transition-colors">
                              <Upload size={16} /> Загрузить из файла
                          </button>
                          <input 
                              type="file" 
                              ref={createListFileInputRef} 
                              className="hidden" 
                              accept=".json" 
                              onChange={handleNewListImport} 
                          />
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button type="button" onClick={handleCancelModal} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                      <button type="submit" disabled={!nameInputValue.trim()} className="py-3 font-bold text-white bg-primary-600 rounded-xl">ОК</button>
                  </div>
              </form>
          </div>
      </div>

      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${listToDelete ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${listToDelete ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Удалить?</h3>
              <p className="text-sm text-slate-500 mb-6">{isDeleteCloud ? 'Удалить из облака?' : 'Это действие необратимо.'}</p>
              <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleCancelModal} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                  <button onClick={confirmDelete} className="py-3 font-bold text-white bg-red-500 rounded-xl">Удалить</button>
              </div>
          </div>
      </div>

      {/* IMPORT / EXPORT MODALS */}
      
      {/* 1. TEXT EXPORT */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${importMode === 'text_export' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setImportMode('none')}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${importMode === 'text_export' ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Экспорт текста</h3>
              <p className="text-xs text-slate-500 mb-4">Формат: Имя|Ранг (одна строка - один герой)</p>
              <textarea 
                  value={importTextValue} 
                  readOnly 
                  className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 select-text mb-4"
              />
              <div className="flex gap-3">
                 <button onClick={handleCopyText} className="flex-1 py-3 font-bold text-white bg-primary-600 rounded-xl">Копировать</button>
                 <button onClick={() => setImportMode('none')} className="px-6 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Закрыть</button>
              </div>
          </div>
      </div>

      {/* 2. TEXT IMPORT */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${importMode === 'text_import' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setImportMode('none')}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${importMode === 'text_import' ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-2 text-orange-500">
                  <AlertCircle size={24} />
                  <h3 className="text-lg font-bold">Внимание!</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  Текущий список героев будет <strong>полностью заменен</strong> данными из текстового поля.
              </p>
              <textarea 
                  value={importTextValue} 
                  onChange={(e) => setImportTextValue(e.target.value)}
                  placeholder="Вставьте список героев (Имя|Ранг)"
                  className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 select-text mb-6"
              />
              <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setImportMode('none')} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                  <button onClick={confirmTextImport} className="py-3 font-bold text-white bg-orange-500 rounded-xl">Заменить</button>
              </div>
          </div>
      </div>
      
      {/* 3. RANK IMPORT */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${importMode === 'rank_import' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setImportMode('none')}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${importMode === 'rank_import' ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-2 text-violet-600 dark:text-violet-400">
                  <ArrowLeftRight size={24} />
                  <h3 className="text-lg font-bold">Импорт рангов</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                  Выберите список, из которого нужно скопировать ранги. Если имена совпадут, ранг текущего героя будет обновлен.
              </p>
              
              <div className="mb-6 relative">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Источник</label>
                  
                  <div className="relative">
                      <button
                          onClick={() => setIsRankSourceDropdownOpen(!isRankSourceDropdownOpen)}
                          className={`w-full p-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl border transition-all outline-none font-medium text-sm ${isRankSourceDropdownOpen ? 'border-violet-500 ring-1 ring-violet-500/20' : 'border-transparent'}`}
                      >
                          <span className={rankSourceListId ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                              {lists.find(l => l.id === rankSourceListId)?.name || "Выберите список..."}
                          </span>
                          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isRankSourceDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isRankSourceDropdownOpen && (
                          <>
                              <div className="fixed inset-0 z-10" onClick={() => setIsRankSourceDropdownOpen(false)} />
                              <div className="absolute top-full left-0 mt-2 w-full max-h-48 overflow-y-auto no-scrollbar bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 animate-in fade-in zoom-in-95 duration-200">
                                  {lists.filter(l => l.id !== editingListId).length > 0 ? (
                                      lists.filter(l => l.id !== editingListId).map(list => (
                                          <button
                                              key={list.id}
                                              onClick={() => {
                                                  setRankSourceListId(list.id);
                                                  setIsRankSourceDropdownOpen(false);
                                              }}
                                              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${rankSourceListId === list.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 md:hover:bg-slate-50 dark:md:hover:bg-slate-700'}`}
                                          >
                                              <span className="truncate">{list.name}</span>
                                              {rankSourceListId === list.id && <Check size={14} className="text-violet-500" />}
                                          </button>
                                      ))
                                  ) : (
                                      <div className="px-4 py-6 text-center text-xs text-slate-400">Нет доступных списков</div>
                                  )}
                              </div>
                          </>
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setImportMode('none')} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                  <button onClick={confirmRankImport} disabled={!rankSourceListId} className="py-3 font-bold text-white bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl">Импорт</button>
              </div>
          </div>
      </div>
      
      {/* 4. FILE IMPORT CONFIRM */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${importMode === 'file_import_confirm' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${importMode === 'file_import_confirm' ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
              <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Заменить список?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Текущие герои ({editorHeroes.length - (editorHeroes.some(h => !h.name) ? 1 : 0)}) будут заменены данными из файла ({pendingFileHeroes?.length}).
                  </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setImportMode('none'); setPendingFileHeroes(null); }} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                  <button onClick={confirmFileImport} className="py-3 font-bold text-white bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">Заменить</button>
              </div>
          </div>
      </div>

      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isDebugExitModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${isDebugExitModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
              <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4"><Power size={24} /></div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Отключить Debug?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Режим отладки будет скрыт.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setIsDebugExitModalOpen(false)} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                  <button onClick={confirmDebugOff} className="py-3 font-bold text-white bg-red-500 rounded-xl">Отключить</button>
              </div>
          </div>
      </div>

      {/* Editor Stats Modal */}
      <div className={`fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isStatsModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setIsStatsModalOpen(false)}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 max-h-[90dvh] flex flex-col ${isStatsModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                          <BarChart3 size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Баланс героев</h3>
                  </div>
                  <button onClick={() => setIsStatsModalOpen(false)} className="p-2 -mr-2 text-slate-400 md:hover:text-slate-900 dark:md:hover:text-white active:text-slate-900 rounded-full">
                      <X size={20} />
                  </button>
              </div>
              
              <div className="overflow-y-auto no-scrollbar flex-1 -mr-2 pr-2">
                 {(() => {
                    const { counts, max, total } = getStats();
                    return (
                        <>
                            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4 text-center">
                                Всего героев: <span className="text-slate-900 dark:text-white font-bold">{total}</span>
                            </div>
                            {RANKS.map((rank, idx) => {
                                const count = counts[rank] || 0;
                                const percent = max > 0 ? (count / max) * 100 : 0;
                                const colorClass = getRankBarColor(rank);
                                
                                return (
                                    <div key={rank} className="mb-3 last:mb-0">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                            <span>{rank}</span>
                                            <span>{count}</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass} ${percent === 0 ? 'opacity-0' : 'opacity-100'}`}
                                                style={{ 
                                                    width: isStatsModalOpen ? `${percent}%` : '0%',
                                                    transitionDelay: `${idx * 50}ms`
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    );
                 })()}
              </div>
          </div>
      </div>

      {/* Discard Changes Modal */}
      <div className={`fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isDiscardModalOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${isDiscardModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
              <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Несохраненные изменения</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Вы уверены, что хотите выйти? Изменения будут потеряны.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleDiscardCancel} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                  <button onClick={handleDiscardConfirm} className="py-3 font-bold text-white bg-orange-500 rounded-xl">Выйти</button>
              </div>
          </div>
      </div>

    </div>
  );
};
