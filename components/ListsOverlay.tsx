import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Plus, ChevronLeft, Edit2, Trash2, Filter, Cloud, UploadCloud, Database, 
    Wifi, WifiOff, Loader2, Files, ArrowDownAZ, ArrowUpAZ, Save, AlertCircle, 
    BarChart3, Dice5, Check, GripVertical, MoreVertical, FileJson, FileText, 
    ArrowLeftRight, Download, Upload, Copy, AlertTriangle, ChevronDown, 
    SquareStack, Info, SlidersHorizontal
} from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { HeroList, Hero, MatchRecord } from '../types';
import { RANKS, RANK_VALUES } from '../constants';
import { RankSelect } from './RankSelect';
import { ListItem } from './ListItem';
import { CustomScrollbar } from './CustomScrollbar';
import { HeroEditorRow, HeroViewRow } from './HeroEditorRow';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';
import { generateUUID } from '../utils/uuid';

interface ListsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    lists: HeroList[];
    onAddList: (name: string) => string;
    onUpdateList: (id: string, updates: Partial<HeroList>) => void;
    onDeleteList: (id: string) => void;
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
    triggerHaptic: (pattern?: number | number[]) => void;
    history?: MatchRecord[];
}

type SortOrder = 'asc' | 'desc' | 'custom';
type ImportMode = 'none' | 'text_import' | 'text_export' | 'rank_import' | 'file_import_confirm' | 'rank_import_confirm';

export const ListsOverlay: React.FC<ListsOverlayProps> = ({
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
    triggerHaptic,
    history = [],
}) => {
    const [editingListId, setEditingListId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('custom');
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [heroSortDirection, setHeroSortDirection] = useState<'asc' | 'desc' | null>(null);
    const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

    // Modals
    const [isNameModalOpen, setNameModalOpen] = useState(false);
    const [nameModalMode, setNameModalMode] = useState<'create' | 'rename'>('create');
    const [nameInputValue, setNameInputValue] = useState('');
    const [targetListId, setTargetListId] = useState<string | null>(null);
    const [listToDelete, setListToDelete] = useState<HeroList | null>(null);
    const [isDeleteCloud, setIsDeleteCloud] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

    // Import/Export States
    const [importMode, setImportMode] = useState<ImportMode>('none');
    const [importTextValue, setImportTextValue] = useState('');
    const [rankSourceListId, setRankSourceListId] = useState('');
    const [rankSourceType, setRankSourceType] = useState<'list' | 'stats'>('list');
    const [isRankSourceDropdownOpen, setIsRankSourceDropdownOpen] = useState(false);
    const [isRankInfoOpen, setIsRankInfoOpen] = useState(false);
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
    const [editorMenuRect, setEditorMenuRect] = useState<DOMRect | null>(null);

    // Editor State
    const [editorHeroes, setEditorHeroes] = useState<Hero[]>([]);
    const [editorIsGroupable, setEditorIsGroupable] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);


    // Sort State
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [heroSortType, setHeroSortType] = useState<'name' | 'rank'>('name');

    // Drag/Scroll refs
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [isListDragging, setIsListDragging] = useState(false);
    const listContainerRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const sortButtonRef = useRef<HTMLButtonElement>(null);

    // Determine if current editor session is read-only (offline cloud list or not in edit mode)
    const currentList = lists.find(l => l.id === editingListId);
    const isPermanentlyReadOnly = !!(currentList?.isCloud && !isOnline);
    const isReadOnly = !isEditMode || isPermanentlyReadOnly;

    // --- CHANGE DETECTION LOGIC ---
    const hasFieldUpdate = (heroId: string, field: 'name' | 'rank') => {
        if (localHeroUpdates.has(`${heroId}:${field}`)) return true;
        if (editingListId && updatedHeroIds) {
            const listUpdates = updatedHeroIds.get(editingListId);
            if (listUpdates && listUpdates.has(`${heroId}:${field}`)) return true;
        }
        return false;
    };

    // --- DIRTY CHECK LOGIC ---
    const getCleanHeroes = (heroes: Hero[]) => {
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

    // --- BACK BUTTON NAVIGATION (PWA/Android) ---
    useBackHandler(isOpen, () => {
        onClose();
    }, { id: 'lists-overlay', priority: 20 });

    useBackHandler(isOpen && !!editingListId, () => {
        if (isEditMode) {
            handleCancelEditor();
        } else {
            manualGoBack();
        }
    }, { id: 'list-details', priority: 25 });

    useBackHandler(isOpen && !!editingListId && isEditMode, () => {
        handleCancelEditor();
    }, { id: 'list-editing', priority: 28 });

    useBackHandler(!!contextMenuTargetId, () => {
        handleCloseMenu();
    }, { id: 'list-context-menu', priority: 25 });

    useBackHandler(isEditorMenuOpen, () => {
        setIsEditorMenuOpen(false);
    }, { id: 'list-editor-menu', priority: 25 });

    useBackHandler(isSortMenuOpen, () => {
        setIsSortMenuOpen(false);
    }, { id: 'list-sort-menu', priority: 25 });

    const manualGoBack = () => {
        if (editingListId) {
            setEditingListId(null);
            setEditorHeroes([]);
            setEditorIsGroupable(false);
            setOriginalHeroesJson('');
            setIsEditMode(false);
        }
    };

    const getStatsEligibleHelpers = () => {
        const currentHeroes = editorHeroes.filter(h => h.name.trim() !== '');
        let eligibleCount = 0;
        currentHeroes.forEach(h => {
            const { matches } = getHeroStats(h.name.trim());
            if (matches >= 3) eligibleCount++;
        });
        return { eligibleCount, total: currentHeroes.length };
    };

    const getHeroStats = (heroName: string) => {
        let wins = 0;
        let matches = 0;
        history.forEach(m => {
            const inTeam1 = m.team1.some(p => p.heroName === heroName);
            const inTeam2 = m.team2.some(p => p.heroName === heroName);
            if (inTeam1 || inTeam2) {
                matches++;
                const isTeam1Winner = m.winner === 'team1';
                if ((inTeam1 && isTeam1Winner) || (inTeam2 && !isTeam1Winner)) {
                    wins++;
                }
            }
        });
        return { wins, matches };
    };

    const calculateRank = (wins: number, matches: number) => {
        if (matches < 3) return null;
        const rate = (wins / matches) * 100;
        if (rate >= 80) return 'S+';
        if (rate >= 70) return 'S-';
        if (rate >= 65) return 'A+';
        if (rate >= 60) return 'A-';
        if (rate >= 55) return 'B+';
        if (rate >= 50) return 'B-';
        if (rate >= 45) return 'C+';
        if (rate >= 40) return 'C-';
        if (rate >= 35) return 'D+';
        if (rate >= 30) return 'D-';
        if (rate >= 20) return 'E+';
        return 'E-';
    };

    useEffect(() => { if (!isOpen) handleCloseMenu(); }, [isOpen]);

    useEffect(() => {
        if (contextMenuTargetId) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; }
    }, [contextMenuTargetId]);

    // --- IMPORT / EXPORT HANDLERS ---
    const validateRanks = (heroes: any[]): boolean => {
        return heroes.every(h => {
            if (!h.rank) return true;
            return h.rank.trim() === '' || RANKS.includes(h.rank.trim());
        });
    };

    const handleEditorMenuAction = (action: () => void) => {
        setIsEditorMenuOpen(false);
        setTimeout(() => action(), 50);
    };

    const handleToggleEditorMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(10);
        if (isEditorMenuOpen) {
            setIsEditorMenuOpen(false);
        } else {
            setEditorMenuRect(e.currentTarget.getBoundingClientRect());
            setIsEditorMenuOpen(true);
        }
    };

    const handleFileExport = () => {
        const list = lists.find(l => l.id === editingListId);
        if (!list) return;
        const dataStr = JSON.stringify({ ...list, heroes: getCleanHeroes(editorHeroes), isGroupable: editorIsGroupable }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
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

    const triggerFileUpload = () => { if (fileInputRef.current) fileInputRef.current.click(); };
    const triggerCreateListFileUpload = () => { if (createListFileInputRef.current) createListFileInputRef.current.click(); };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json.heroes)) {
                    if (!validateRanks(json.heroes)) {
                        if (addToast) addToast("Ошибка: Файл содержит недопустимые ранги", "error");
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                    }
                    setPendingFileHeroes(json.heroes.map((h: any) => ({
                        id: h.id || generateUUID(),
                        name: h.name || '',
                        rank: h.rank || ''
                    })));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setImportMode('file_import_confirm');
                } else { if (addToast) addToast("Неверный формат файла", "error"); }
            } catch (err) { if (addToast) addToast("Ошибка чтения файла", "error"); }
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
                        if (addToast) addToast("Ошибка: Файл содержит недопустимые ранги", "error");
                        if (createListFileInputRef.current) createListFileInputRef.current.value = '';
                        return;
                    }
                    const name = file.name.replace(/\.json$/i, '');
                    const cleanHeroes = json.heroes.map((h: any) => ({
                        id: h.id || generateUUID(),
                        name: h.name || '',
                        rank: h.rank || ''
                    }));
                    const newId = onAddList(name);
                    onUpdateList(newId, { heroes: cleanHeroes, isGroupable: json.isGroupable ?? false });
                    setNameModalOpen(false);
                    if (createListFileInputRef.current) createListFileInputRef.current.value = '';
                    if (addToast) addToast(`Список "${name}" создан`, "success");
                } else { if (addToast) addToast("Неверный формат файла", "error"); }
            } catch (err) { if (addToast) addToast("Ошибка чтения файла", "error"); }
        };
        reader.readAsText(file);
    };

    const confirmFileImport = () => {
        if (pendingFileHeroes) {
            const clean = getCleanHeroes(pendingFileHeroes);
            const withEmpty = [...clean, { id: generateUUID(), name: '', rank: '' }];
            setEditorHeroes(withEmpty);
            if (addToast) addToast("Список импортирован", "success");
        }
        setPendingFileHeroes(null);
        setImportMode('none');
    };

    const openTextExport = (list?: HeroList) => {
        let heroesToExport = editorHeroes;
        if (list) heroesToExport = list.heroes;
        const text = getCleanHeroes(heroesToExport).map(h => `${h.name}${h.rank ? `|${h.rank}` : ''}`).join('\n');
        setImportTextValue(text);
        setImportMode('text_export');
        handleCloseMenu();
    };

    const openTextImport = () => { setImportTextValue(''); setImportMode('text_import'); };

    const confirmTextImport = () => {
        if (!importTextValue.trim()) { if (addToast) addToast("Введите текст для импорта", "warning"); return; }
        const lines = importTextValue.split(/\r?\n/).filter(l => l.trim() !== '');
        const newHeroes: Hero[] = lines.map(line => {
            const parts = line.split('|');
            const name = parts[0].trim();
            const rank = parts.length > 1 ? parts[1].trim() : '';
            return { id: generateUUID(), name, rank };
        });
        if (!validateRanks(newHeroes)) { if (addToast) addToast("Ошибка: Найдены недопустимые ранги. Используйте формат S+, A-, и т.д.", "error"); return; }
        newHeroes.push({ id: generateUUID(), name: '', rank: '' });
        setEditorHeroes(newHeroes);
        setImportMode('none');
        if (addToast) addToast(`Импортировано ${lines.length} героев`, "success");
    };

    const handleCopyText = () => { navigator.clipboard.writeText(importTextValue); if (addToast) addToast("Скопировано в буфер", "info"); };

    const openRankImport = () => {
        setRankSourceListId('');
        setRankSourceType('list');
        setIsRankSourceDropdownOpen(false);
        setIsRankInfoOpen(false);
        setImportMode('rank_import');
    };

    const confirmRankImport = () => {
        const newHeroes = [...editorHeroes];
        const newLocalUpdates = new Set(localHeroUpdates);
        let changesCount = 0;
        const normalize = (str: string) => str.trim().toLowerCase().replace(/ё/g, 'е');

        if (rankSourceType === 'list') {
            const sourceList = lists.find(l => l.id === rankSourceListId);
            if (!sourceList) return;

            const sourceMap = new Map<string, string>();
            sourceList.heroes.forEach(h => { if (h.name.trim()) sourceMap.set(normalize(h.name), h.rank); });

            newHeroes.forEach((hero, idx) => {
                const nameNorm = normalize(hero.name);
                if (nameNorm && sourceMap.has(nameNorm)) {
                    const newRank = sourceMap.get(nameNorm) || '';
                    const oldRank = hero.rank || '';
                    if (newRank !== oldRank) {
                        if (oldRank !== '') newLocalUpdates.add(`${hero.id}:rank`);
                        newHeroes[idx] = { ...hero, rank: newRank };
                        changesCount++;
                    }
                }
            });
            setEditorHeroes(newHeroes);
            setLocalHeroUpdates(newLocalUpdates);
            setImportMode('none');
            if (addToast) addToast(`Обновлено рангов: ${changesCount}`, "success", 2000);
        } else {
            // Stats Import
            if (importMode !== 'rank_import_confirm') {
                const { eligibleCount, total } = getStatsEligibleHelpers();
                if (eligibleCount < total && eligibleCount > 0) {
                    setImportMode('rank_import_confirm');
                    return;
                }
                if (eligibleCount === 0) {
                    if (addToast) addToast("Нет героев с достаточной статистикой (мин. 3 матча)", "warning");
                    return;
                }
            }

            // Execute Import
            newHeroes.forEach((hero, idx) => {
                const name = hero.name.trim();
                if (!name) return;
                const { wins, matches } = getHeroStats(name);
                const calculatedRank = calculateRank(wins, matches);

                if (calculatedRank) {
                    const oldRank = hero.rank || '';
                    if (calculatedRank !== oldRank) {
                        newLocalUpdates.add(`${hero.id}:rank`);
                        newHeroes[idx] = { ...hero, rank: calculatedRank };
                        changesCount++;
                    }
                }
            });

            setEditorHeroes(newHeroes);
            setLocalHeroUpdates(newLocalUpdates);
            setImportMode('none');
            if (addToast) {
                if (changesCount > 0) addToast(`Обновлено рангов: ${changesCount}`, "success", 2000);
                else addToast("Ранги не изменились", "info");
            }
        }
    };

    const handleToggleSort = () => {
        if (!sortLists) return;
        triggerHaptic(10);
        let nextOrder: SortOrder = sortOrder === 'custom' ? 'asc' : sortOrder === 'asc' ? 'desc' : 'asc';
        setSortOrder(nextOrder);
        sortLists(nextOrder === 'desc' ? 'desc' : 'asc');
    };

    const handleToggleReorderMode = () => { triggerHaptic(10); setIsReorderMode(!isReorderMode); };

    const handleOpenMenu = (id: string, buttonRect: DOMRect, cardRect: DOMRect) => {
        triggerHaptic(10);
        if (contextMenuTargetId === id) { handleCloseMenu(); return; }
        setContextMenuTargetId(id);
        setActiveItemRect(cardRect);
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const minSpaceNeeded = 280;
        const isBottom = spaceBelow < minSpaceNeeded;
        if (isBottom) { setMenuPosition({ bottom: window.innerHeight - buttonRect.top + 8, right: window.innerWidth - buttonRect.right, origin: 'bottom' }); }
        else { setMenuPosition({ top: buttonRect.bottom + 8, right: window.innerWidth - buttonRect.right, origin: 'top' }); }
    };

    const handleCloseMenu = () => { setContextMenuTargetId(null); setMenuPosition(null); setActiveItemRect(null); };

    const handleOpenCreate = () => { triggerHaptic(10); setNameModalMode('create'); setNameInputValue(''); setNameModalOpen(true); handleCloseMenu(); };
    const handleOpenRename = (list: HeroList) => { setNameModalMode('rename'); setTargetListId(list.id); setNameInputValue(list.name); setNameModalOpen(true); handleCloseMenu(); };

    const handleNameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = nameInputValue.trim();
        if (!trimmedName) return;
        const isDuplicate = lists.some(l => !l.isTemporary && l.name.toLowerCase() === trimmedName.toLowerCase() && l.id !== targetListId);
        if (isDuplicate) { if (addToast) addToast('Такое имя уже есть', 'warning'); return; }

        if (nameModalMode === 'create') {
            const newId = onAddList(trimmedName);
            setNameModalOpen(false);
            const newHeroes = [{ id: generateUUID(), name: '', rank: '' }];
            setEditorHeroes(newHeroes);
            setEditorIsGroupable(false);
            setOriginalHeroesJson(JSON.stringify({ heroes: getCleanHeroes(newHeroes), isGroupable: false }));
            setEditingListId(newId);
            setIsEditMode(true);
        } else if (nameModalMode === 'rename' && targetListId) {
            if (checkConnectivity && addToast) { if (!(await checkConnectivity()) && lists.find(l => l.id === targetListId)?.isCloud) { addToast("Нет интернета", "error"); return; } }
            onUpdateList(targetListId, { name: trimmedName });
            setNameModalOpen(false);
        }
    };

    const handleDeleteClick = (list: HeroList) => { setIsDeleteCloud(!!list.isCloud); setListToDelete(list); handleCloseMenu(); };
    const confirmDelete = async () => {
        if (listToDelete) {
            triggerHaptic(20);
            if (listToDelete.isCloud && checkConnectivity && addToast) { if (!(await checkConnectivity())) { addToast("Нет интернета", "error"); return; } }
            onDeleteList(listToDelete.id);
            setListToDelete(null);
        }
    };

    const handleUpload = async (id: string) => {
        if (checkConnectivity && addToast && !(await checkConnectivity())) { addToast("Нет интернета", "error"); handleCloseMenu(); return; }
        if (onUploadToCloud) onUploadToCloud(id);
        handleCloseMenu();
    };

    const handleOpenEditor = (list: HeroList) => {
        triggerHaptic(10);
        setEditingListId(list.id);
        setIsEditMode(false);
        const heroes = JSON.parse(JSON.stringify(list.heroes));
        const isGroupable = !!list.isGroupable;
        setEditorIsGroupable(isGroupable);
        setOriginalHeroesJson(JSON.stringify({ heroes: getCleanHeroes(heroes), isGroupable: isGroupable }));
        const isReadOnlyLocal = !!(list.isCloud && !isOnline);
        if (!isReadOnlyLocal) {
            const last = heroes[heroes.length - 1];
            if (!last || last.name.trim() !== '' || last.rank !== '') { heroes.push({ id: generateUUID(), name: '', rank: '' }); }
        }
        setEditorHeroes(heroes);
        handleCloseMenu();
    };

    const handleRemoveHero = useCallback((index: number) => {
        if (isReadOnly) return;
        setEditorHeroes(prev => {
            const newHeroes = prev.filter((_, i) => i !== index);
            const last = newHeroes[newHeroes.length - 1];
            if (!last || last.name.trim() !== '' || last.rank !== '') { newHeroes.push({ id: generateUUID(), name: '', rank: '' }); }
            return newHeroes;
        });
    }, [isReadOnly]);

    const handleHeroChange = useCallback((index: number, field: 'name' | 'rank', value: string) => {
        if (isReadOnly) return;
        setEditorHeroes(prev => {
            const newHeroes = [...prev];
            newHeroes[index] = { ...newHeroes[index], [field]: value };
            const lastIndex = newHeroes.length - 1;
            if (index === lastIndex) {
                const current = newHeroes[index];
                if (current.name.trim() !== '' || current.rank !== '') { newHeroes.push({ id: generateUUID(), name: '', rank: '' }); }
            }
            return newHeroes;
        });
    }, [isReadOnly]);

    const handleSort = (type: 'name' | 'rank', direction: 'asc' | 'desc') => {
        triggerHaptic(10);
        setHeroSortType(type);
        setHeroSortDirection(direction);
        setEditorHeroes(prev => {
            const filled = prev.filter(h => h.name.trim() !== '' || h.rank !== '');
            filled.sort((a, b) => {
                if (type === 'name') {
                    return direction === 'asc'
                        ? a.name.localeCompare(b.name)
                        : b.name.localeCompare(a.name);
                } else {
                    const valA = RANK_VALUES[a.rank] || 0;
                    const valB = RANK_VALUES[b.rank] || 0;
                    if (valA !== valB) {
                        return direction === 'desc' ? valB - valA : valA - valB;
                    }
                    return a.name.localeCompare(b.name);
                }
            });
            if (isReadOnly) return filled;
            return [...filled, { id: generateUUID(), name: '', rank: '' }];
        });
    };

    const handleSaveEditor = async () => {
        if (isReadOnly) return;
        triggerHaptic(20);
        if (editingListId) {
            const currentList = lists.find(l => l.id === editingListId);
            if (currentList?.isCloud && checkConnectivity && addToast && !(await checkConnectivity())) { addToast("Нет интернета", "error"); return; }
            const activeHeroes = editorHeroes.filter(h => h.name.trim() !== '' || h.rank !== '');
            if (activeHeroes.length > 0) {
                const hasEmptyNames = activeHeroes.some(h => !h.name.trim());
                if (hasEmptyNames) { if (addToast) addToast("У всех героев должны быть имена", "warning"); return; }
                const seenNames = new Set<string>();
                for (const hero of activeHeroes) {
                    const normalized = hero.name.trim().toLowerCase();
                    if (seenNames.has(normalized)) { if (addToast) addToast(`Герой "${hero.name.trim()}" уже есть в списке`, "error"); return; }
                    seenNames.add(normalized);
                }
            }
            const cleanHeroes = activeHeroes.map(h => ({ ...h, name: h.name.trim() }));
            onUpdateList(editingListId, { heroes: cleanHeroes, isGroupable: editorIsGroupable });
            isDirtyRef.current = false;
            setOriginalHeroesJson(JSON.stringify({ heroes: getCleanHeroes(cleanHeroes), isGroupable: editorIsGroupable }));
            setIsEditMode(false);
            const nextHeroes = [...cleanHeroes, { id: generateUUID(), name: '', rank: '' }];
            setEditorHeroes(nextHeroes);
        }
    };

    const handleCancelModal = () => { setNameModalOpen(false); setListToDelete(null); };

    const handleCancelEditor = () => {
        if (isEditMode) {
            if (isDirty) {
                // Если мы попали сюда через системную кнопку "Назад", история уже вернулась к 'list-details'.
                // Чтобы при отмене модали подтверждения мы могли вернуться в редактор,
                // восстанавливаем состояние редактора в истории перед показом модали.
                if (window.history.state?.id !== 'list-editing') {
                    window.history.pushState({ type: 'modal', id: 'list-editing' }, '');
                }
                setDiscardModalOpen(true);
            } else {
                setIsEditMode(false);
            }
        } else {
            manualGoBack();
        }
    };

    const handleDiscardConfirm = () => {
        if (editingListId) {
            const originalData = JSON.parse(originalHeroesJson);
            const originalHeroes = originalData.heroes ? JSON.parse(JSON.stringify(originalData.heroes)) : [];
            setEditorIsGroupable(originalData.isGroupable || false);
            const isReadOnlyLocal = !!(lists.find(l => l.id === editingListId)?.isCloud && !isOnline);
            if (!isReadOnlyLocal) {
                originalHeroes.push({ id: generateUUID(), name: '', rank: '' });
            }
            setEditorHeroes(originalHeroes);
            setIsEditMode(false);
        }
        setDiscardModalOpen(false);
    };

    const handleDiscardCancel = () => { setDiscardModalOpen(false); };

    const activeListForMenu = lists.find(l => l.id === contextMenuTargetId);
    const getListIcon = (list: HeroList) => { if (list.isTemporary) return <Filter size={22} className="text-primary-500" />; if (list.isCloud) return <Cloud size={22} className="text-sky-500" />; return <Database size={22} className="text-slate-400" />; };
    const getStats = () => { const counts: Record<string, number> = {}; let total = 0; editorHeroes.forEach(h => { if (h.name.trim() !== '' || h.rank !== '') { if (h.rank) counts[h.rank] = (counts[h.rank] || 0) + 1; total++; } }); const max = Math.max(...Object.values(counts), 1); return { counts, max, total }; };
    const getRankBarColor = (rank: string) => {
        if (rank === 'S+') return 'bg-yellow-500 dark:bg-yellow-500'; if (rank === 'S-') return 'bg-yellow-400 dark:bg-yellow-400'; if (rank.startsWith('S')) return 'bg-yellow-500 dark:bg-yellow-500';
        if (rank === 'A+') return 'bg-violet-600 dark:bg-violet-600'; if (rank === 'A-') return 'bg-violet-500 dark:bg-violet-500'; if (rank.startsWith('A')) return 'bg-violet-600 dark:bg-violet-600';
        if (rank === 'B+') return 'bg-blue-600 dark:bg-blue-600'; if (rank === 'B-') return 'bg-blue-500 dark:bg-blue-500'; if (rank.startsWith('B')) return 'bg-blue-600 dark:bg-blue-600';
        if (rank === 'C+') return 'bg-green-600 dark:bg-green-600'; if (rank === 'C-') return 'bg-green-500 dark:bg-green-500'; if (rank.startsWith('C')) return 'bg-green-600 dark:bg-green-600';
        if (rank === 'D+') return 'bg-slate-300 dark:bg-slate-200'; if (rank === 'D-') return 'bg-slate-200 dark:bg-slate-300'; if (rank.startsWith('D')) return 'bg-slate-300 dark:bg-slate-200';
        if (rank === 'E+') return 'bg-gray-600 dark:bg-gray-500'; if (rank === 'E-') return 'bg-gray-500 dark:bg-gray-600'; if (rank.startsWith('E')) return 'bg-gray-600 dark:bg-gray-500';
        return 'bg-slate-200 dark:bg-slate-700';
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, index: number) => { dragItem.current = index; setIsListDragging(true); handleCloseMenu(); if (sortOrder !== 'custom') setSortOrder('custom'); if ('touches' in e) document.body.style.overflow = 'hidden'; triggerHaptic(10); };
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => { if (dragItem.current === null) return; dragOverItem.current = index; if (dragItem.current !== index && reorderLists) { const newLists = [...lists]; const draggedListContent = newLists[dragItem.current]; newLists.splice(dragItem.current, 1); newLists.splice(index, 0, draggedListContent); dragItem.current = index; reorderLists(newLists); if (sortOrder !== 'custom') setSortOrder('custom'); triggerHaptic(5); } };
    const handleDragEnd = (e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => { dragItem.current = null; dragOverItem.current = null; setIsListDragging(false); if ('changedTouches' in e) document.body.style.overflow = ''; };
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => { if (dragItem.current === null || !reorderLists) return; const touch = e.touches[0]; const targetElement = document.elementFromPoint(touch.clientX, touch.clientY); const listItem = targetElement?.closest('[data-list-index]'); if (listItem) { const index = parseInt(listItem.getAttribute('data-list-index') || '-1', 10); if (index !== -1 && index !== dragItem.current) { const newLists = [...lists]; const draggedListContent = newLists[dragItem.current]; newLists.splice(dragItem.current, 1); newLists.splice(index, 0, draggedListContent); dragItem.current = index; reorderLists(newLists); if (sortOrder !== 'custom') setSortOrder('custom'); triggerHaptic(5); } } };

    return (
        <div 
            className={`fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 bg-grid-pattern flex flex-col transition-[transform,opacity] duration-300 ease-in-out ${isOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible'}`}
        >
            {focusedRowIndex !== null && (<div className="fixed inset-0 z-40 bg-transparent" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setFocusedRowIndex(null); }} />)}

            <div 
                className={`bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800/60 transition-opacity duration-200 shadow-2xs ${focusedRowIndex !== null ? 'opacity-25 pointer-events-none' : ''}`}
            >
                <div 
                    className="px-4 py-3 touch-manipulation"
                    style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
                >
                    {editingListId ? (
                        <>
                            <div className="flex items-center justify-between gap-2 min-h-[44px]">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <button 
                                        onClick={handleCancelEditor} 
                                        aria-label="Назад"
                                        className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0 border border-slate-200/50 dark:border-slate-700/50"
                                    > 
                                        <ChevronLeft size={22} /> 
                                    </button>
                                    <div className="flex-1 min-w-0 pr-1">
                                        <h2 
                                            className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate leading-tight"
                                            title={lists.find(l => l.id === editingListId)?.name}
                                        >
                                            {lists.find(l => l.id === editingListId)?.name}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Героев: {getCleanHeroes(editorHeroes).length}</span>
                                            {updatedListIds?.has(editingListId) && (
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                                                    Обновлен
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button 
                                        ref={sortButtonRef}
                                        onClick={(e) => { e.stopPropagation(); setIsSortMenuOpen(!isSortMenuOpen); triggerHaptic(10); }} 
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
                                        onClick={handleToggleEditorMenu} 
                                        className={`w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 active:scale-95 transition-all ${isEditorMenuOpen ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white ring-2 ring-primary-500/30' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'}`}
                                        aria-label="Дополнительные функции списка"
                                        title="Опции списка"
                                    >
                                        <SlidersHorizontal size={18} />
                                    </button>
                                    {!isReadOnly ? (
                                        <button 
                                            onClick={handleSaveEditor} 
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
                                                onClick={() => { setIsEditMode(true); triggerHaptic(10); }} 
                                                className="h-10 min-h-[40px] w-10 sm:w-32 flex items-center justify-center gap-1.5 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 text-primary-600 dark:text-primary-300 font-bold text-xs active:scale-95 transition-all shrink-0"
                                                aria-label="Редактировать список"
                                                title="Редактировать список"
                                            > 
                                                <Edit2 size={17} /> 
                                                <span className="hidden sm:inline">Редактировать</span> 
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                        </>
                    ) : (
                        <div className="relative flex items-center justify-center w-full min-h-[44px]">
                            <button 
                                onClick={onClose} 
                                aria-label="Закрыть списки"
                                data-testid="lists-close-btn"
                                className="absolute left-0 w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all border border-slate-200/50 dark:border-slate-700/50"
                            > 
                                <ChevronLeft size={22} /> 
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Списки героев</h2>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                {/* Editor Container */}
                <div 
                    className={`absolute inset-0 overflow-hidden bg-slate-50 dark:bg-slate-950 bg-grid-pattern ${editingListId ? 'block pointer-events-auto' : 'hidden pointer-events-none'}`}
                >
                    <div ref={editorContainerRef} className="absolute inset-0 overflow-y-auto no-scrollbar">
                        <div className="pb-safe-area-bottom px-4 pt-4">
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
                                        onChange={handleHeroChange}
                                        onRemove={handleRemoveHero}
                                        setFocusedRowIndex={setFocusedRowIndex}
                                    />
                                );
                            })}
                            <div className="h-20" />
                        </div>
                    </div>
                    <CustomScrollbar containerRef={editorContainerRef} />
                </div>

                {/* Lists Main Screen */}
                <div ref={listContainerRef} onTouchMove={handleTouchMove} className={`absolute inset-0 overflow-y-auto no-scrollbar ${editingListId ? 'hidden pointer-events-none' : 'block pointer-events-auto'}`}>
                    <div className="pb-safe-area-bottom">
                        <div>
                            <div 
                                className="flex items-center justify-between sticky top-0 z-30 px-4 pt-3.5 pb-3.5 bg-white/70 dark:bg-slate-900/75 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-xs"
                            >
                                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-2xs ${isOnline ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-200/80 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                                    {isSyncing ? <><Loader2 size={11} className="animate-spin text-amber-500" /> Sync</> : isOnline ? <><Wifi size={11} className="text-emerald-500" /> Online</> : <><WifiOff size={11} className="text-slate-400" /> Offline</>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleToggleReorderMode} className={`w-9 h-9 flex items-center justify-center rounded-full border shadow-2xs transition-all ${isReorderMode ? 'bg-primary-500/15 text-primary-600 border-primary-500/40 dark:bg-primary-900/40 dark:text-primary-300' : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}> <GripVertical size={18} /> </button>
                                    <button onClick={handleToggleSort} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"> {sortOrder === 'desc' ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />} </button>
                                    <button onClick={handleOpenCreate} className="h-9 px-4 flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-full shadow-md shadow-primary-600/25 active:scale-95 transition-all font-bold text-xs" data-testid="new-list-btn"> <Plus size={17} /> <span>Новый</span> </button>
                                </div>
                            </div>
                            <div className="px-4 pt-4 pb-4">
                                {lists.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                                        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-inner">
                                            <Files size={32} />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Нет списков</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-5">Создайте свой первый список героев для генерации команд и отслеживания статистики</p>
                                        <button onClick={handleOpenCreate} className="h-10 px-5 flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl shadow-md shadow-primary-600/20 font-bold text-xs active:scale-95 transition-all">
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
                    </div>
                </div>
            </div>

            {/* Sort Menu Portal */}
            {isSortMenuOpen && sortButtonRef.current && createPortal(
                <>
                    <div className="fixed inset-0 z-[60] bg-transparent" onClick={() => setIsSortMenuOpen(false)} />
                    <div 
                        className="fixed z-[61] w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-menu-in origin-top-right animate-in fade-in zoom-in-95 duration-200 p-1.5" 
                        style={{ 
                            top: sortButtonRef.current.getBoundingClientRect().bottom + 8, 
                            right: window.innerWidth - sortButtonRef.current.getBoundingClientRect().right, 
                        }}
                    >
                        <button 
                            onClick={() => { handleSort('name', 'asc'); setIsSortMenuOpen(false); }} 
                            className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5">
                                <ArrowDownAZ size={16} className="text-slate-500" />
                                Имя: А-Я
                            </span>
                            {heroSortType === 'name' && heroSortDirection === 'asc' && <Check size={16} className="text-primary-600 dark:text-primary-400 font-bold" />}
                        </button>
                        <button 
                            onClick={() => { handleSort('name', 'desc'); setIsSortMenuOpen(false); }} 
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
                            onClick={() => { handleSort('rank', 'desc'); setIsSortMenuOpen(false); }} 
                            className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                            <span className="flex items-center gap-2.5">
                                <ArrowLeftRight size={16} className="rotate-90 text-slate-500" />
                                Ранг: по убыванию
                            </span>
                            {heroSortType === 'rank' && heroSortDirection === 'desc' && <Check size={16} className="text-primary-600 dark:text-primary-400 font-bold" />}
                        </button>
                        <button 
                            onClick={() => { handleSort('rank', 'asc'); setIsSortMenuOpen(false); }} 
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
                    <div className="fixed inset-0 z-[60] bg-transparent" onClick={() => setIsEditorMenuOpen(false)} /> 
                    <div 
                        className="fixed z-[61] w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-menu-in origin-top-right animate-in fade-in zoom-in-95 duration-200 p-1.5" 
                        style={{ top: editorMenuRect.bottom + 8, right: window.innerWidth - editorMenuRect.right }}
                    > 
                        <button onClick={() => handleEditorMenuAction(() => setIsStatsModalOpen(true))} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <BarChart3 size={16} className="text-violet-500" /> <span>Баланс героев</span> </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" />
                        <button onClick={() => handleEditorMenuAction(handleFileExport)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <FileJson size={16} className="text-slate-500" /> <span>Экспорт в файл</span> </button> 
                        {!isReadOnly && !currentList?.isTemporary && (
                            <button onClick={() => handleEditorMenuAction(triggerFileUpload)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <Upload size={16} className="text-slate-500" /> <span>Импорт из файла</span> </button> 
                        )} 
                        <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" /> 
                        <button onClick={() => handleEditorMenuAction(() => openTextExport(undefined))} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <Copy size={16} className="text-slate-500" /> <span>Экспорт (Текст)</span> </button> 
                        {!isReadOnly && !currentList?.isTemporary && (
                            <> 
                                <button onClick={() => handleEditorMenuAction(openTextImport)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <FileText size={16} className="text-slate-500" /> <span>Импорт (Текст)</span> </button> 
                                <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" /> 
                                <button onClick={() => handleEditorMenuAction(openRankImport)} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-violet-50 dark:hover:bg-violet-900/30 active:bg-violet-100 dark:active:bg-violet-900/50 text-violet-600 dark:text-violet-300 text-xs font-semibold transition-colors"> <ArrowLeftRight size={16} /> <span>Импорт рангов</span> </button> 
                            </>
                        )} 
                    </div> 
                </>, 
                document.body
            )}

            {/* Context Menu Portal */}
            {contextMenuTargetId && menuPosition && activeListForMenu && activeItemRect && createPortal(
                <>
                    <div className="fixed inset-0 z-[60] bg-slate-950/30 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); handleCloseMenu(); }} /> 
                    <div onClick={() => handleCloseMenu()} className="fixed z-[61] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl flex items-center shadow-2xl ring-1 ring-black/5 dark:ring-white/10" style={{ top: activeItemRect.top, left: activeItemRect.left, width: activeItemRect.width, height: activeItemRect.height, transformOrigin: 'center center' }}> 
                        <div className="mr-3.5 flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-slate-700/60 relative"> 
                            {getListIcon(activeListForMenu)} 
                            {updatedListIds && updatedListIds.has(activeListForMenu.id) && (<span className="absolute -top-1 -right-1 w-3 h-3 bg-sky-500 rounded-full border-2 border-white dark:border-slate-900"></span>)} 
                        </div> 
                        <div className="flex-1 min-w-0 mr-3"> 
                            <h3 className={`font-bold text-base leading-snug truncate mb-0.5 ${activeListForMenu.isTemporary ? 'text-primary-900 dark:text-primary-300 italic' : 'text-slate-900 dark:text-slate-100'}`}> {activeListForMenu.name} </h3> 
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2"> 
                                <span>Героев: {activeListForMenu.heroes.length}</span> 
                                {activeListForMenu.isTemporary && <span className="text-primary-500 dark:text-primary-400 font-bold">временный</span>} 
                                {activeListForMenu.isCloud && !isOnline && <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">Offline</span>} 
                            </p> 
                        </div> 
                        <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 flex items-center justify-center shrink-0"> 
                            <MoreVertical size={18} /> 
                        </div> 
                    </div> 
                    <div className={`fixed z-[62] w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 p-1.5 ${menuPosition.origin === 'bottom' ? 'animate-menu-in-up origin-bottom-right' : 'animate-menu-in origin-top-right'}`} style={{ top: menuPosition.top, bottom: menuPosition.bottom, right: menuPosition.right }}> 
                        {!activeListForMenu.isCloud && !activeListForMenu.isTemporary && (<button onClick={(e) => { e.stopPropagation(); handleUpload(activeListForMenu.id); }} disabled={!isOnline} className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors border-b border-slate-100 dark:border-slate-800/60 mb-1 ${!isOnline ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500' : 'hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-600 dark:text-sky-400'}`}> <UploadCloud size={16} /> Выгрузить в облако </button>)} 
                        {!activeListForMenu.isTemporary && (<button onClick={(e) => { e.stopPropagation(); handleOpenRename(activeListForMenu); }} disabled={(!isOnline && activeListForMenu.isCloud)} className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors ${(!isOnline && activeListForMenu.isCloud) ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200'}`}> <Edit2 size={16} className="text-slate-500" /> Переименовать </button>)} 
                        <button onClick={(e) => { e.stopPropagation(); openTextExport(activeListForMenu); }} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <Copy size={16} className="text-slate-500" /> Экспорт (Текст) </button> 
                        {!activeListForMenu.isTemporary && (<button onClick={(e) => { e.stopPropagation(); handleExternalFileExport(activeListForMenu); }} className="w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"> <FileJson size={16} className="text-slate-500" /> Экспорт в файл </button>)} 
                        <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1 mx-2" /> 
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(activeListForMenu); }} disabled={activeListForMenu.isCloud && !isOnline} className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors ${activeListForMenu.isCloud && !isOnline ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400'}`}> <Trash2 size={16} /> {activeListForMenu.isCloud ? 'Удалить из облака' : 'Удалить'} </button> 
                    </div> 
                </>, 
                document.body
            )}

            {/* Name Modal */}
            <BaseModal
                isOpen={isNameModalOpen}
                onClose={handleCancelModal}
                title={nameModalMode === 'create' ? 'Новый список' : 'Переименовать'}
                maxWidth="xs"
                variant="auto"
                modalId="list-name-modal"
                priority={40}
                showCloseButton={false}
            >
                <form onSubmit={handleNameSubmit} className="space-y-4"> 
                    <input autoFocus={isNameModalOpen} type="text" value={nameInputValue} onChange={(e) => setNameInputValue(e.target.value)} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white select-text" placeholder="Название..." /> 
                    {nameModalMode === 'create' && (
                        <div className="mb-4"> 
                            <div className="flex items-center gap-2 mb-2"> 
                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div> 
                                <span className="text-[10px] uppercase text-slate-400 font-bold">Или</span> 
                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div> 
                            </div> 
                            <button type="button" onClick={triggerCreateListFileUpload} className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700 active:bg-slate-100 dark:active:bg-slate-700 transition-colors"> <Upload size={16} /> Загрузить из файла </button> 
                            <input type="file" ref={createListFileInputRef} className="hidden" accept=".json" onChange={handleNewListImport} /> 
                        </div>
                    )} 
                    <div className="grid grid-cols-2 gap-3 pt-2"> 
                        <button type="button" onClick={handleCancelModal} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button> 
                        <button type="submit" disabled={!nameInputValue.trim()} className="py-3 font-bold text-white bg-primary-600 rounded-xl" data-testid="name-submit-btn">ОК</button> 
                    </div> 
                </form> 
            </BaseModal>

            {/* Delete Modal */}
            <ConfirmModal
                isOpen={!!listToDelete}
                onCancel={handleCancelModal}
                onConfirm={confirmDelete}
                title="Удалить?"
                description={isDeleteCloud ? 'Удалить из облака?' : 'Это действие необратимо.'}
                confirmText="Удалить"
                cancelText="Отмена"
                confirmVariant="danger"
                modalId="delete-list-confirm-modal"
                priority={45}
            />

            {/* Text Export Modal */}
            <BaseModal
                isOpen={importMode === 'text_export'}
                onClose={() => setImportMode('none')}
                title="Экспорт текста"
                subtitle="Формат: Имя|Ранг (одна строка - один герой)"
                maxWidth="md"
                variant="auto"
                modalId="list-export-modal"
                priority={40}
                showCloseButton={false}
                footer={() => (
                    <div className="flex gap-3 w-full"> 
                        <button onClick={handleCopyText} className="flex-1 py-3 font-bold text-white bg-primary-600 rounded-xl">Копировать</button> 
                        <button onClick={() => setImportMode('none')} className="px-6 py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Закрыть</button> 
                    </div> 
                )}
            >
                <textarea value={importTextValue} readOnly className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 select-text" /> 
            </BaseModal>

            {/* Text Import Modal */}
            <BaseModal
                isOpen={importMode === 'text_import'}
                onClose={() => setImportMode('none')}
                title="Внимание!"
                subtitle="Текущий список героев будет полностью заменен данными из текстового поля."
                icon={<AlertCircle size={20} className="text-orange-500" />}
                maxWidth="md"
                variant="auto"
                modalId="list-import-modal"
                priority={40}
                showCloseButton={false}
                footer={() => (
                    <div className="grid grid-cols-2 gap-3 w-full"> 
                        <button onClick={() => setImportMode('none')} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button> 
                        <button onClick={confirmTextImport} className="py-3 font-bold text-white bg-orange-500 rounded-xl">Заменить</button> 
                    </div> 
                )}
            >
                <textarea value={importTextValue} onChange={(e) => setImportTextValue(e.target.value)} placeholder="Вставьте список героев (Имя|Ранг)" className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 select-text" /> 
            </BaseModal>

            {/* Rank Import Modal */}
            <BaseModal
                isOpen={importMode === 'rank_import'}
                onClose={() => setImportMode('none')}
                title="Импорт рангов"
                icon={<ArrowLeftRight size={20} className="text-violet-600 dark:text-violet-400" />}
                maxWidth="sm"
                variant="auto"
                modalId="rank-import-modal"
                priority={40}
                showCloseButton={false}
                footer={() => (
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <button onClick={() => setImportMode('none')} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                        <button
                            onClick={confirmRankImport}
                            disabled={rankSourceType === 'list' && !rankSourceListId}
                            className="py-3 font-bold text-white bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                        >
                            Импорт
                        </button>
                    </div>
                )}
            >
                <div>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
                        <button
                            onClick={() => setRankSourceType('list')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${rankSourceType === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Из списка
                        </button>
                        <button
                            onClick={() => setRankSourceType('stats')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${rankSourceType === 'stats' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            Из статистики
                        </button>
                    </div>

                    {rankSourceType === 'list' ? (
                        <>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6"> Выберите список, из которого нужно скопировать ранги. Если имена совпадут, ранг текущего героя будет обновлен. </p>
                            <div className="mb-6 relative">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Источник</label>
                                <div className="relative">
                                    <button onClick={() => setIsRankSourceDropdownOpen(!isRankSourceDropdownOpen)} className={`w-full p-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl border transition-all outline-none font-medium text-sm ${isRankSourceDropdownOpen ? 'border-violet-500 ring-1 ring-violet-500/20' : 'border-transparent'}`} >
                                        <span className={rankSourceListId ? 'text-slate-900 dark:text-white' : 'text-slate-400'}> {lists.find(l => l.id === rankSourceListId)?.name || "Выберите список..."} </span>
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
                                                            onClick={() => { setRankSourceListId(list.id); setIsRankSourceDropdownOpen(false); }}
                                                            className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${rankSourceListId === list.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200 active:bg-slate-50 dark:active:bg-slate-700'}`}
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
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    Ранги будут рассчитаны автоматически на основе <strong>винрейта</strong>. <br />
                                    <span className="text-xs text-slate-400 mt-2 block">Минимум 3 матча для получения ранга.</span>
                                </p>
                                <button
                                    onClick={() => setIsRankInfoOpen(!isRankInfoOpen)}
                                    className={`p-2 rounded-xl transition-colors ${isRankInfoOpen ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 active:text-slate-600 dark:active:text-slate-300'}`}
                                >
                                    <Info size={18} />
                                </button>
                            </div>

                            {isRankInfoOpen && (
                                <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                        <div className="flex justify-between px-2 py-1 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-bold"><span>S+</span><span>≥ 80%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-yellow-400/10 text-yellow-600 dark:text-yellow-300 font-bold"><span>S-</span><span>70-79%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-violet-600/10 text-violet-700 dark:text-violet-400 font-bold"><span>A+</span><span>65-69%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-violet-500/10 text-violet-600 dark:text-violet-300 font-bold"><span>A-</span><span>60-64%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-blue-600/10 text-blue-700 dark:text-blue-400 font-bold"><span>B+</span><span>55-59%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold"><span>B-</span><span>50-54%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-green-600/10 text-green-700 dark:text-green-400 font-bold"><span>C+</span><span>45-49%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-300 font-bold"><span>C-</span><span>40-44%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-slate-300/20 text-slate-700 dark:text-slate-300 font-bold"><span>D+</span><span>35-39%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-slate-200/20 text-slate-600 dark:text-slate-400 font-bold"><span>D-</span><span>30-34%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-gray-600/10 text-gray-700 dark:text-gray-400 font-bold"><span>E+</span><span>20-29%</span></div>
                                        <div className="flex justify-between px-2 py-1 rounded bg-gray-500/10 text-gray-600 dark:text-gray-500 font-bold"><span>E-</span><span>&lt; 20%</span></div>
                                    </div>
                                </div>
                            )}

                            {!isRankInfoOpen && (
                                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500 dark:text-slate-400">Доступно статистики:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {getStatsEligibleHelpers().eligibleCount} <span className="text-slate-400 font-normal">/ {getStatsEligibleHelpers().total}</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                                        <div
                                            className="bg-violet-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${getStatsEligibleHelpers().total > 0 ? (getStatsEligibleHelpers().eligibleCount / getStatsEligibleHelpers().total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </BaseModal>

            {/* Rank Import Confirm Modal */}
            <ConfirmModal
                isOpen={importMode === 'rank_import_confirm'}
                onCancel={() => setImportMode('rank_import')}
                onConfirm={confirmRankImport}
                title="Неполные данные"
                description={`Статистика доступна не для всех героев. Будут изменены ранги только у ${getStatsEligibleHelpers().eligibleCount} из ${getStatsEligibleHelpers().total} героев.`}
                confirmText="Продолжить"
                cancelText="Назад"
                confirmVariant="warning"
                modalId="rank-import-confirm-modal"
                priority={45}
            />

            {/* File Import Confirm Modal */}
            <ConfirmModal
                isOpen={importMode === 'file_import_confirm'}
                onCancel={() => { setImportMode('none'); setPendingFileHeroes(null); }}
                onConfirm={confirmFileImport}
                title="Заменить список?"
                description={`Текущие герои (${editorHeroes.length - (editorHeroes.some(h => !h.name) ? 1 : 0)}) будут заменены данными из файла (${pendingFileHeroes?.length}).`}
                confirmText="Заменить"
                cancelText="Отмена"
                confirmVariant="warning"
                modalId="file-import-confirm-modal"
                priority={45}
            />

            {/* Hero Stats Modal (Balance) */}
            <BaseModal
                isOpen={isStatsModalOpen}
                onClose={() => setIsStatsModalOpen(false)}
                title="Баланс героев"
                icon={<BarChart3 size={20} className="text-violet-600 dark:text-violet-400" />}
                maxWidth="sm"
                variant="auto"
                modalId="list-stats-modal"
                priority={40}
            >
                <div className="overflow-y-auto no-scrollbar flex-1"> 
                    {(() => { 
                        const { counts, max, total } = getStats(); 
                        return (
                            <> 
                                <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4 text-center"> Всего героев: <span className="text-slate-900 dark:text-white font-bold">{total}</span> </div> 
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
                                                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass} ${percent === 0 ? 'opacity-0' : 'opacity-100'}`} style={{ width: isStatsModalOpen ? `${percent}%` : '0%', transitionDelay: `${idx * 50}ms` }} /> 
                                            </div> 
                                        </div>
                                    ); 
                                })} 
                            </>
                        ); 
                    })()} 
                </div> 
            </BaseModal>

            {/* Discard Modal */}
            <ConfirmModal
                isOpen={isDiscardModalOpen}
                onCancel={handleDiscardCancel}
                onConfirm={handleDiscardConfirm}
                title="Несохраненные изменения"
                description="Вы уверены, что хотите выйти? Изменения будут потеряны."
                confirmText="Выйти"
                cancelText="Отмена"
                confirmVariant="warning"
                modalId="discard-list-confirm-modal"
                priority={45}
            />
        </div>
    );
};
