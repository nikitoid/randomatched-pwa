import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SquareStack } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { HeroList, Hero, MatchRecord } from '../types';
import { RANKS, RANK_VALUES } from '../constants';
import { Z_INDEX_BASE } from '../constants/zIndex';
import { ConfirmModal } from './common/ConfirmModal';
import { ScreenOverlay } from './common/ScreenOverlay';
import { DuplicateResolutionModal } from './DuplicateResolutionModal';
import { ListsSubHeader, ListsCollectionView } from './lists/ListsCollectionView';
import { ListEditorHeaderActions, ListEditorView } from './lists/ListEditorView';
import { ListContextMenu } from './lists/ListContextMenu';
import { ListNameModal } from './lists/ListNameModal';
import { ListImportExportModals, ListImportMode } from './lists/ListImportExportModals';
import { generateUUID } from '../utils/uuid';
import { normalizeHeroKey, findDuplicateOrSimilarHeroGroups, DuplicateGroup, KNOWN_HERO_ALIASES } from '../utils/heroNormalization';
import { useHeroListsContext } from '../context/HeroListsContext';
import { useConnectivityContext } from '../context/ConnectivityContext';
import { useMatchHistoryContext } from '../context/MatchHistoryContext';
import { useToast } from '../hooks/useToast';
import { useHaptics } from '../hooks/useHaptics';

interface ListsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    lists?: HeroList[];
    onAddList?: (name: string) => string;
    onUpdateList?: (id: string, updates: Partial<HeroList>) => void;
    onDeleteList?: (id: string) => void;
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
    triggerHaptic?: (pattern?: number | number[]) => void;
    history?: MatchRecord[];
    onOpenInactiveModal?: () => void;
}

type RawImportedHero = {
    id?: string;
    name?: string;
    rank?: string;
};

type SortOrder = 'asc' | 'desc' | 'custom';

export const ListsOverlay: React.FC<ListsOverlayProps> = React.memo(({
    isOpen,
    onClose,
    lists: listsProp,
    onAddList: onAddListProp,
    onUpdateList: onUpdateListProp,
    onDeleteList: onDeleteListProp,
    onUploadToCloud: onUploadToCloudProp,
    onSync: onSyncProp,
    reorderLists: reorderListsProp,
    sortLists: sortListsProp,
    isOnline: isOnlineProp,
    isSyncing: isSyncingProp,
    checkConnectivity: checkConnectivityProp,
    addToast: addToastProp,
    updatedListIds: updatedListIdsProp,
    onMarkSeen: onMarkSeenProp,
    updatedHeroIds: updatedHeroIdsProp,
    onDismissHeroUpdates: onDismissHeroUpdatesProp,
    triggerHaptic: triggerHapticProp,
    history: historyProp,
    onOpenInactiveModal,
}) => {
    const heroListsCtx = useHeroListsContext();
    const connectivityCtx = useConnectivityContext();
    const { history: ctxHistory } = useMatchHistoryContext();
    const { addToast: ctxAddToast } = useToast();
    const { trigger: ctxTriggerHaptic } = useHaptics();

    const lists = listsProp ?? heroListsCtx.lists;
    const onAddList = onAddListProp ?? heroListsCtx.addList;
    const onUpdateList = onUpdateListProp ?? heroListsCtx.updateList;
    const onDeleteList = onDeleteListProp ?? heroListsCtx.deleteList;
    const onUploadToCloud = onUploadToCloudProp ?? heroListsCtx.uploadToCloud;
    const onSync = onSyncProp ?? heroListsCtx.syncWithCloud;
    const reorderLists = reorderListsProp ?? heroListsCtx.reorderLists;
    const sortLists = sortListsProp ?? heroListsCtx.sortLists;
    const isOnline = isOnlineProp ?? connectivityCtx.isOnline;
    const isSyncing = isSyncingProp ?? heroListsCtx.isSyncing;
    const checkConnectivity = checkConnectivityProp ?? connectivityCtx.checkConnectivity;
    const addToast = addToastProp ?? ctxAddToast;
    const updatedListIds = updatedListIdsProp ?? heroListsCtx.updatedListIds;
    const onMarkSeen = onMarkSeenProp ?? heroListsCtx.markListAsSeen;
    const updatedHeroIds = updatedHeroIdsProp ?? heroListsCtx.updatedHeroIds;
    const onDismissHeroUpdates = onDismissHeroUpdatesProp ?? heroListsCtx.dismissHeroUpdates;
    const triggerHaptic = triggerHapticProp ?? ctxTriggerHaptic;
    const history = historyProp ?? ctxHistory;
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
    const [importMode, setImportMode] = useState<ListImportMode>('none');
    const [importTextValue, setImportTextValue] = useState('');
    const [rankSourceListId, setRankSourceListId] = useState('');
    const [rankSourceType, setRankSourceType] = useState<'list' | 'stats'>('list');
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
    const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number; origin: 'top' | 'bottom' } | null>(null);
    const [activeItemRect, setActiveItemRect] = useState<DOMRect | null>(null);
    const [editorMenuRect, setEditorMenuRect] = useState<DOMRect | null>(null);

    // Editor State
    const [editorHeroes, setEditorHeroes] = useState<Hero[]>([]);
    const [editorIsGroupable, setEditorIsGroupable] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Sort State
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [heroSortType, setHeroSortType] = useState<'name' | 'rank'>('name');

    // Duplicate resolution state
    const [pendingDuplicatesData, setPendingDuplicatesData] = useState<{
        groups: DuplicateGroup[];
        originalHeroes: Hero[];
        onApply: (resolved: Hero[]) => void;
    } | null>(null);

    // Global hero suggestions for autocomplete (computed only when active in editor mode)
    const allHeroSuggestions = useMemo(() => {
        if (!editingListId || !isEditMode) {
            return [];
        }

        const map = new Map<string, { name: string; norm: string; lower: string; rank?: string }>();

        lists.forEach(l => {
            l.heroes.forEach(h => {
                const name = (h.name || '').trim();
                const norm = normalizeHeroKey(name);
                if (name && norm && !map.has(norm)) {
                    map.set(norm, { name, norm, lower: name.toLowerCase(), rank: h.rank });
                }
            });
        });

        if (history && history.length > 0) {
            history.forEach(m => {
                [...m.team1, ...m.team2].forEach(p => {
                    const name = (p.heroName || '').trim();
                    const norm = normalizeHeroKey(name);
                    if (name && norm && !map.has(norm)) {
                        map.set(norm, { name, norm, lower: name.toLowerCase(), rank: '' });
                    }
                });
            });
        }

        Object.keys(KNOWN_HERO_ALIASES).forEach(aliasKey => {
            const norm = normalizeHeroKey(aliasKey);
            if (norm && !map.has(norm)) {
                const titleCased = aliasKey.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                map.set(norm, { name: titleCased, norm, lower: titleCased.toLowerCase(), rank: '' });
            }
        });

        return Array.from(map.values());
    }, [editingListId, isEditMode, lists, history]);

    // Duplicates in the active list editor (debounced to ensure zero latency during typing)
    const [currentEditorDuplicateGroups, setCurrentEditorDuplicateGroups] = useState<DuplicateGroup[]>([]);

    useEffect(() => {
        if (!editingListId) {
            setCurrentEditorDuplicateGroups([]);
            return;
        }
        const timer = setTimeout(() => {
            const activeHeroes = editorHeroes.filter(h => h.name.trim() !== '');
            const groups = findDuplicateOrSimilarHeroGroups(activeHeroes.map(h => h.name));
            setCurrentEditorDuplicateGroups(groups);
        }, 400);

        return () => clearTimeout(timer);
    }, [editingListId, editorHeroes]);

    // Drag/Scroll refs
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const listContainerRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const sortButtonRef = useRef<HTMLButtonElement>(null);

    const currentList = lists.find(l => l.id === editingListId);
    const isPermanentlyReadOnly = !!(currentList?.isCloud && !isOnline);
    const isReadOnly = !isEditMode || isPermanentlyReadOnly;

    const hasFieldUpdate = (heroId: string, field: 'name' | 'rank') => {
        if (localHeroUpdates.has(`${heroId}:${field}`)) return true;
        if (editingListId && updatedHeroIds) {
            const listUpdates = updatedHeroIds.get(editingListId);
            if (listUpdates && listUpdates.has(`${heroId}:${field}`)) return true;
        }
        return false;
    };

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

    const onSyncRef = useRef(onSync);
    useEffect(() => {
        onSyncRef.current = onSync;
    }, [onSync]);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            if (onSyncRef.current) {
                onSyncRef.current();
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const manualGoBack = () => {
        if (editingListId) {
            if (onDismissHeroUpdates) {
                onDismissHeroUpdates(editingListId);
            }
            if (editorContainerRef.current) {
                editorContainerRef.current.scrollTop = 0;
            }
            setLocalHeroUpdates(new Set());
            setEditingListId(null);
            setEditorHeroes([]);
            setEditorIsGroupable(false);
            setOriginalHeroesJson('');
            setIsEditMode(false);
        }
    };

    const handleCloseMenu = useCallback(() => {
        setContextMenuTargetId(null);
        setMenuPosition(null);
        setActiveItemRect(null);
    }, []);

    const handleCancelEditor = () => {
        if (isEditMode) {
            if (isDirty) {
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

    // --- BACK BUTTON NAVIGATION (PWA/Android) ---
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

    useEffect(() => {
        if (editingListId) {
            if (editorContainerRef.current) {
                editorContainerRef.current.scrollTop = 0;
            }
            const rafId = requestAnimationFrame(() => {
                if (editorContainerRef.current) {
                    editorContainerRef.current.scrollTop = 0;
                }
            });
            return () => cancelAnimationFrame(rafId);
        }
    }, [editingListId]);

    const getHeroStats = (heroName: string) => {
        let wins = 0;
        let matches = 0;
        const normTarget = normalizeHeroKey(heroName);
        if (!normTarget) return { wins: 0, matches: 0 };
        history.forEach(m => {
            const inTeam1 = m.team1.some(p => normalizeHeroKey(p.heroName) === normTarget);
            const inTeam2 = m.team2.some(p => normalizeHeroKey(p.heroName) === normTarget);
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

    const getStatsEligibleHelpers = () => {
        const currentHeroes = editorHeroes.filter(h => h.name.trim() !== '');
        let eligibleCount = 0;
        currentHeroes.forEach(h => {
            const { matches } = getHeroStats(h.name.trim());
            if (matches >= 3) eligibleCount++;
        });
        return { eligibleCount, total: currentHeroes.length };
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

    useEffect(() => {
        if (!isOpen) {
            handleCloseMenu();
            if (editingListId && onDismissHeroUpdates) {
                onDismissHeroUpdates(editingListId);
            }
            if (editorContainerRef.current) {
                editorContainerRef.current.scrollTop = 0;
            }
            setLocalHeroUpdates(new Set());
        }
    }, [isOpen, editingListId, onDismissHeroUpdates, handleCloseMenu]);

    useEffect(() => {
        if (contextMenuTargetId) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [contextMenuTargetId]);

    // --- IMPORT / EXPORT HANDLERS ---
    const validateRanks = (heroes: RawImportedHero[]): boolean => {
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
        link.download = `${list.name.replace(/[/\\:*?"<>|]/g, '_')}.json`;
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
        link.download = `${list.name.replace(/[/\\:*?"<>|]/g, '_')}.json`;
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
                    setPendingFileHeroes(json.heroes.map((h: RawImportedHero) => ({
                        id: h.id || generateUUID(),
                        name: h.name || '',
                        rank: h.rank || ''
                    })));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setImportMode('file_import_confirm');
                } else { if (addToast) addToast("Неверный формат файла", "error"); }
            } catch { if (addToast) addToast("Ошибка чтения файла", "error"); }
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
                    const cleanHeroes = json.heroes.map((h: RawImportedHero) => ({
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
            } catch { if (addToast) addToast("Ошибка чтения файла", "error"); }
        };
        reader.readAsText(file);
    };

    const confirmFileImport = () => {
        if (pendingFileHeroes) {
            const clean = getCleanHeroes(pendingFileHeroes);
            const duplicateGroups = findDuplicateOrSimilarHeroGroups(clean.map(h => h.name));
            if (duplicateGroups.length > 0) {
                setPendingDuplicatesData({
                    groups: duplicateGroups,
                    originalHeroes: clean,
                    onApply: (resolvedHeroes) => {
                        setEditorHeroes(resolvedHeroes);
                        setPendingFileHeroes(null);
                        setImportMode('none');
                        setPendingDuplicatesData(null);
                        if (addToast) addToast("Список импортирован", "success");
                    }
                });
                return;
            }
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

        const duplicateGroups = findDuplicateOrSimilarHeroGroups(newHeroes.map(h => h.name));
        if (duplicateGroups.length > 0) {
            setPendingDuplicatesData({
                groups: duplicateGroups,
                originalHeroes: newHeroes,
                onApply: (resolvedHeroes) => {
                    setEditorHeroes(resolvedHeroes);
                    setImportMode('none');
                    setPendingDuplicatesData(null);
                    if (addToast) addToast(`Импортировано ${resolvedHeroes.filter(h => h.name.trim()).length} героев`, "success");
                }
            });
            return;
        }

        newHeroes.push({ id: generateUUID(), name: '', rank: '' });
        setEditorHeroes(newHeroes);
        setImportMode('none');
        if (addToast) addToast(`Импортировано ${lines.length} героев`, "success");
    };

    const handleCopyText = () => { navigator.clipboard.writeText(importTextValue); if (addToast) addToast("Скопировано в буфер", "info"); };

    const openRankImport = () => {
        setRankSourceListId('');
        setRankSourceType('list');
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

    const handleToggleSort = useCallback(() => {
        if (!sortLists) return;
        triggerHaptic(10);
        setSortOrder(prev => {
            const nextOrder: SortOrder = prev === 'custom' ? 'asc' : prev === 'asc' ? 'desc' : 'asc';
            sortLists(nextOrder === 'desc' ? 'desc' : 'asc');
            return nextOrder;
        });
    }, [sortLists, triggerHaptic]);

    const handleToggleReorderMode = useCallback(() => {
        triggerHaptic(10);
        setIsReorderMode(prev => !prev);
    }, [triggerHaptic]);

    const handleOpenMenu = useCallback((id: string, buttonRect: DOMRect, cardRect: DOMRect) => {
        triggerHaptic(10);
        if (contextMenuTargetId === id) {
            handleCloseMenu();
            return;
        }
        setContextMenuTargetId(id);
        setActiveItemRect(cardRect);
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const minSpaceNeeded = 280;
        const isBottom = spaceBelow < minSpaceNeeded;
        if (isBottom) {
            setMenuPosition({ bottom: window.innerHeight - buttonRect.top + 8, right: window.innerWidth - buttonRect.right, origin: 'bottom' });
        } else {
            setMenuPosition({ top: buttonRect.bottom + 8, right: window.innerWidth - buttonRect.right, origin: 'top' });
        }
    }, [contextMenuTargetId, handleCloseMenu, triggerHaptic]);

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
            if (editorContainerRef.current) {
                editorContainerRef.current.scrollTop = 0;
            }
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

    const handleOpenEditor = useCallback((list: HeroList) => {
        triggerHaptic(10);
        if (editingListId && editingListId !== list.id && onDismissHeroUpdates) {
            onDismissHeroUpdates(editingListId);
        }
        if (editorContainerRef.current) {
            editorContainerRef.current.scrollTop = 0;
        }
        setLocalHeroUpdates(new Set());
        setEditingListId(list.id);
        setIsEditMode(false);
        const heroes = JSON.parse(JSON.stringify(list.heroes));
        const isGroupable = !!list.isGroupable;
        setEditorIsGroupable(isGroupable);
        setOriginalHeroesJson(JSON.stringify({ heroes: getCleanHeroes(heroes), isGroupable }));
        const isReadOnlyLocal = !!(list.isCloud && !isOnline);
        if (!isReadOnlyLocal) {
            const last = heroes[heroes.length - 1];
            if (!last || last.name.trim() !== '' || last.rank !== '') { heroes.push({ id: generateUUID(), name: '', rank: '' }); }
        }
        setEditorHeroes(heroes);
        handleCloseMenu();
    }, [editingListId, onDismissHeroUpdates, isOnline, triggerHaptic, handleCloseMenu]);

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

    const executeSave = (heroesToSave: Hero[]) => {
        if (!editingListId) return;
        const cleanHeroes = getCleanHeroes(heroesToSave);
        onUpdateList(editingListId, { heroes: cleanHeroes, isGroupable: editorIsGroupable });
        if (onDismissHeroUpdates) {
            onDismissHeroUpdates(editingListId);
        }
        setLocalHeroUpdates(new Set());
        isDirtyRef.current = false;
        setOriginalHeroesJson(JSON.stringify({ heroes: cleanHeroes, isGroupable: editorIsGroupable }));
        setIsEditMode(false);
        const nextHeroes = [...cleanHeroes, { id: generateUUID(), name: '', rank: '' }];
        setEditorHeroes(nextHeroes);
    };

    const handleSaveEditor = async () => {
        if (isReadOnly) return;
        triggerHaptic(20);
        if (editingListId) {
            const targetList = lists.find(l => l.id === editingListId);
            if (targetList?.isCloud && checkConnectivity && addToast && !(await checkConnectivity())) { addToast("Нет интернета", "error"); return; }
            const activeHeroes = editorHeroes.filter(h => h.name.trim() !== '' || h.rank !== '');
            if (activeHeroes.length > 0) {
                const hasEmptyNames = activeHeroes.some(h => !h.name.trim());
                if (hasEmptyNames) { if (addToast) addToast("У всех героев должны быть имена", "warning"); return; }

                let namesChanged = true;
                try {
                    const originalData = JSON.parse(originalHeroesJson || '{}') as { heroes?: Array<{ name?: string }> };
                    const originalNames = (originalData.heroes || []).map((h) => (h.name || '').trim()).join('|||');
                    const currentNames = activeHeroes.map(h => h.name.trim()).join('|||');
                    namesChanged = originalNames !== currentNames;
                } catch {
                    namesChanged = true;
                }

                if (namesChanged) {
                    const duplicateGroups = findDuplicateOrSimilarHeroGroups(activeHeroes.map(h => h.name));
                    if (duplicateGroups.length > 0) {
                        setPendingDuplicatesData({
                            groups: duplicateGroups,
                            originalHeroes: activeHeroes,
                            onApply: (resolvedHeroes) => {
                                executeSave(resolvedHeroes);
                                setPendingDuplicatesData(null);
                            }
                        });
                        return;
                    }
                }
            }
            executeSave(activeHeroes);
        }
    };

    const handleCancelModal = () => { setNameModalOpen(false); setListToDelete(null); };

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

    const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        setDraggedIndex(index);
        handleCloseMenu();
        if (sortOrder !== 'custom') setSortOrder('custom');
        if ('touches' in e) document.body.style.overflow = 'hidden';
        triggerHaptic(10);
    }, [sortOrder, triggerHaptic, handleCloseMenu]);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
        if (dragItem.current === null) return;
        dragOverItem.current = index;
        if (dragItem.current !== index && reorderLists) {
            const newLists = [...lists];
            const draggedListContent = newLists[dragItem.current];
            newLists.splice(dragItem.current, 1);
            newLists.splice(index, 0, draggedListContent);
            dragItem.current = index;
            setDraggedIndex(index);
            reorderLists(newLists);
            if (sortOrder !== 'custom') setSortOrder('custom');
            triggerHaptic(5);
        }
    }, [lists, reorderLists, sortOrder, triggerHaptic]);

    const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggedIndex(null);
        if ('changedTouches' in e) document.body.style.overflow = '';
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
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
                setDraggedIndex(index);
                reorderLists(newLists);
                if (sortOrder !== 'custom') setSortOrder('custom');
                triggerHaptic(5);
            }
        }
    }, [lists, reorderLists, sortOrder, triggerHaptic]);

    const activeListForMenu = lists.find(l => l.id === contextMenuTargetId);

    return (
        <>
            <ScreenOverlay
                isOpen={isOpen}
                onClose={onClose}
                screenId="lists-screen"
                priority={20}
                testId="lists-overlay"
                headerAlign={editingListId ? 'left' : 'center'}
                onBackClick={editingListId ? handleCancelEditor : onClose}
                closeButtonAriaLabel={editingListId ? 'Назад' : 'Закрыть списки'}
                closeButtonTestId={editingListId ? undefined : 'lists-close-btn'}
                headerClassName={focusedRowIndex !== null ? 'opacity-25 pointer-events-none' : ''}
                overlayTopSlot={
                    focusedRowIndex !== null ? (
                        <div
                            className="fixed inset-0 bg-transparent"
                            style={{ zIndex: Z_INDEX_BASE.OVERLAY_BACKDROP }}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFocusedRowIndex(null);
                            }}
                        />
                    ) : null
                }
                title={
                    editingListId ? (
                        <h2
                            className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate leading-tight"
                            title={currentList?.name}
                        >
                            {currentList?.name}
                        </h2>
                    ) : (
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Списки героев</h2>
                    )
                }
                subtitle={
                    editingListId ? (
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">Героев: {getCleanHeroes(editorHeroes).length}</span>
                            <span
                                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-bold border shrink-0 whitespace-nowrap ${
                                    editorIsGroupable
                                        ? 'bg-violet-500/10 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-500/20'
                                        : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-700/70'
                                }`}
                                title={editorIsGroupable ? "Список включен в групповой режим" : "Список не включен в групповой режим"}
                            >
                                <SquareStack size={11} className={editorIsGroupable ? "text-violet-600 dark:text-violet-400" : "opacity-60"} />
                                <span>{editorIsGroupable ? 'В группе' : 'Не в группе'}</span>
                            </span>
                        </div>
                    ) : undefined
                }
                headerActions={
                    editingListId ? (
                        <ListEditorHeaderActions
                            heroSortType={heroSortType}
                            heroSortDirection={heroSortDirection}
                            isSortMenuOpen={isSortMenuOpen}
                            isEditorMenuOpen={isEditorMenuOpen}
                            isReadOnly={isReadOnly}
                            isPermanentlyReadOnly={isPermanentlyReadOnly}
                            sortButtonRef={sortButtonRef}
                            fileInputRef={fileInputRef}
                            onToggleSortMenu={(e) => { e.stopPropagation(); setIsSortMenuOpen(!isSortMenuOpen); triggerHaptic(10); }}
                            onToggleEditorMenu={handleToggleEditorMenu}
                            onSaveEditor={handleSaveEditor}
                            onEnableEditMode={() => { setIsEditMode(true); triggerHaptic(10); }}
                            onFileChange={handleFileChange}
                        />
                    ) : undefined
                }
                subHeader={
                    !editingListId ? (
                        <ListsSubHeader
                            isOnline={isOnline}
                            isSyncing={isSyncing}
                            isReorderMode={isReorderMode}
                            sortOrder={sortOrder}
                            onOpenInactiveModal={onOpenInactiveModal}
                            onToggleReorderMode={handleToggleReorderMode}
                            onToggleSort={handleToggleSort}
                            onOpenCreate={handleOpenCreate}
                            triggerHaptic={triggerHaptic}
                        />
                    ) : undefined
                }
                bodyScrollable={false}
            >
                <ListEditorView
                    isVisible={!!editingListId}
                    isReadOnly={isReadOnly}
                    currentList={currentList}
                    editorHeroes={editorHeroes}
                    editorIsGroupable={editorIsGroupable}
                    setEditorIsGroupable={setEditorIsGroupable}
                    currentEditorDuplicateGroups={currentEditorDuplicateGroups}
                    focusedRowIndex={focusedRowIndex}
                    setFocusedRowIndex={setFocusedRowIndex}
                    localHeroUpdates={localHeroUpdates}
                    hasFieldUpdate={hasFieldUpdate}
                    allHeroSuggestions={allHeroSuggestions}
                    editorContainerRef={editorContainerRef}
                    onChangeHero={handleHeroChange}
                    onRemoveHero={handleRemoveHero}
                    onOpenDuplicatesModal={() => {
                        triggerHaptic(20);
                        setPendingDuplicatesData({
                            groups: currentEditorDuplicateGroups,
                            originalHeroes: editorHeroes.filter(h => h.name.trim() !== ''),
                            onApply: (resolvedHeroes) => {
                                setEditorHeroes(resolvedHeroes);
                                setPendingDuplicatesData(null);
                                if (addToast) addToast("Дубликаты в списке объединены", "success");
                            }
                        });
                    }}
                    isSortMenuOpen={isSortMenuOpen}
                    setIsSortMenuOpen={setIsSortMenuOpen}
                    sortButtonRef={sortButtonRef}
                    heroSortType={heroSortType}
                    heroSortDirection={heroSortDirection}
                    onSort={handleSort}
                    isEditorMenuOpen={isEditorMenuOpen}
                    setIsEditorMenuOpen={setIsEditorMenuOpen}
                    editorMenuRect={editorMenuRect}
                    onEditorMenuAction={handleEditorMenuAction}
                    onOpenBalanceStats={() => setIsStatsModalOpen(true)}
                    onTriggerMergeDuplicates={() => {
                        const activeHeroes = editorHeroes.filter(h => h.name.trim() !== '');
                        const groups = findDuplicateOrSimilarHeroGroups(activeHeroes.map(h => h.name));
                        if (groups.length === 0) {
                            if (addToast) addToast("В списке нет дубликатов", "info");
                            return;
                        }
                        setPendingDuplicatesData({
                            groups,
                            originalHeroes: activeHeroes,
                            onApply: (resolved) => {
                                setEditorHeroes(resolved);
                                setPendingDuplicatesData(null);
                                if (addToast) addToast("Дубликаты объединены", "success");
                            }
                        });
                    }}
                    onFileExport={handleFileExport}
                    onTriggerFileUpload={triggerFileUpload}
                    onOpenTextExport={() => openTextExport(undefined)}
                    onOpenTextImport={openTextImport}
                    onOpenRankImport={openRankImport}
                    triggerHaptic={triggerHaptic}
                />

                <ListsCollectionView
                    isHidden={!!editingListId}
                    lists={lists}
                    isOnline={isOnline}
                    contextMenuTargetId={contextMenuTargetId}
                    draggedIndex={draggedIndex}
                    updatedListIds={updatedListIds}
                    isReorderMode={isReorderMode}
                    listContainerRef={listContainerRef}
                    onTouchMove={handleTouchMove}
                    onOpenMenu={handleOpenMenu}
                    onEdit={handleOpenEditor}
                    onDragStart={handleDragStart}
                    onDragEnter={handleDragEnter}
                    onDragEnd={handleDragEnd}
                    onMarkSeen={onMarkSeen}
                    onOpenCreate={handleOpenCreate}
                />
            </ScreenOverlay>

            <ListContextMenu
                list={contextMenuTargetId && menuPosition && activeItemRect ? activeListForMenu : undefined}
                menuPosition={menuPosition}
                activeItemRect={activeItemRect}
                isOnline={isOnline}
                hasUpdate={!!(activeListForMenu && updatedListIds && updatedListIds.has(activeListForMenu.id))}
                onClose={handleCloseMenu}
                onUpload={handleUpload}
                onRename={handleOpenRename}
                onMergeDuplicates={(list) => {
                    const groups = findDuplicateOrSimilarHeroGroups(list.heroes.map(h => h.name));
                    if (groups.length === 0) {
                        if (addToast) addToast("В этом списке нет дубликатов", "info");
                        return;
                    }
                    setPendingDuplicatesData({
                        groups,
                        originalHeroes: list.heroes,
                        onApply: (resolved) => {
                            const clean = getCleanHeroes(resolved);
                            onUpdateList(list.id, { heroes: clean });
                            setPendingDuplicatesData(null);
                            if (addToast) addToast("Дубликаты в списке объединены", "success");
                        }
                    });
                }}
                onTextExport={openTextExport}
                onFileExport={handleExternalFileExport}
                onDelete={handleDeleteClick}
            />

            <ListNameModal
                isOpen={isNameModalOpen}
                mode={nameModalMode}
                nameInputValue={nameInputValue}
                setNameInputValue={setNameInputValue}
                createListFileInputRef={createListFileInputRef}
                onTriggerCreateListFileUpload={triggerCreateListFileUpload}
                onNewListImport={handleNewListImport}
                onSubmit={handleNameSubmit}
                onCancel={handleCancelModal}
            />

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

            <ListImportExportModals
                importMode={importMode}
                setImportMode={setImportMode}
                importTextValue={importTextValue}
                setImportTextValue={setImportTextValue}
                onCopyText={handleCopyText}
                onConfirmTextImport={confirmTextImport}
                rankSourceType={rankSourceType}
                setRankSourceType={setRankSourceType}
                rankSourceListId={rankSourceListId}
                setRankSourceListId={setRankSourceListId}
                lists={lists}
                editingListId={editingListId}
                onConfirmRankImport={confirmRankImport}
                statsEligibleHelpers={getStatsEligibleHelpers()}
                editorHeroes={editorHeroes}
                pendingFileHeroes={pendingFileHeroes}
                onCancelFileImport={() => { setImportMode('none'); setPendingFileHeroes(null); }}
                onConfirmFileImport={confirmFileImport}
                isStatsModalOpen={isStatsModalOpen}
                onCloseStatsModal={() => setIsStatsModalOpen(false)}
            />

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

            {/* Duplicate Resolution Modal */}
            {pendingDuplicatesData && (
                <DuplicateResolutionModal
                    isOpen={!!pendingDuplicatesData}
                    onClose={() => setPendingDuplicatesData(null)}
                    duplicateGroups={pendingDuplicatesData.groups}
                    originalHeroes={pendingDuplicatesData.originalHeroes}
                    onResolve={pendingDuplicatesData.onApply}
                    triggerHaptic={triggerHaptic}
                />
            )}
        </>
    );
});
