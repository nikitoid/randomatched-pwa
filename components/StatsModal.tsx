import React, { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { X, Trophy, Edit2, Trash2, RefreshCw, Loader2, Plus, Calendar, Check, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { MatchRecord, PlayerStat, MatchPlayer, HeroList, Hero, HeroStat, CloudBackup, Season, ToastType } from '../types';
import { PlayerDetails } from './PlayerDetails';
import { HeroDetails } from './HeroDetails';
import { CloudBackupManager } from './CloudBackupManager';
import { useStatsCalculations } from './stats/hooks/useStatsCalculations';
import { useMatchFilters } from './stats/hooks/useMatchFilters';
import { useStatsExportImport } from './stats/hooks/useStatsExportImport';
import { StatsOverviewTab } from './stats/StatsOverviewTab';
import { MatchEditorForm, MatchFormState } from './stats/MatchEditorForm';
import { StatsBackupMenu } from './stats/StatsBackupMenu';
import { StatsPlayersTab } from './stats/StatsPlayersTab';
import { StatsHeroesTab } from './stats/StatsHeroesTab';
import { StatsMatchesTab } from './stats/StatsMatchesTab';
import { StatsDateFilter } from './stats/StatsDateFilter';
import { SeasonsManagerModal } from './stats/SeasonsManagerModal';
import { MergeHeroesModal } from './stats/MergeHeroesModal';
import { EfficiencyInfoModal } from './stats/EfficiencyInfoModal';
import { EfficiencyBreakdownModal } from './stats/EfficiencyBreakdownModal';
import { NominationModal, NominationType } from './stats/NominationModal';
import { WeightedPlayerModal } from './stats/WeightedPlayerModal';
import { TrashMatchesModal, DeleteMatchAction } from './stats/TrashMatchesModal';
import { StatsSortDropdown, HeroSortOption, PlayerSortOption } from './stats/StatsSortDropdown';
import { ScreenOverlay } from './common/ScreenOverlay';
import { findDuplicateOrSimilarHeroGroups, normalizeHeroKey } from '../utils/heroNormalization';
import { useMatchHistoryContext } from '../context/MatchHistoryContext';
import { useHeroListsContext } from '../context/HeroListsContext';
import { useSeasonsContext } from '../context/SeasonsContext';
import { useAvatars } from '../context/AvatarContext';
import { useConnectivityContext } from '../context/ConnectivityContext';
import { useToast } from '../hooks/useToast';
import { useHaptics } from '../hooks/useHaptics';

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    history?: MatchRecord[];
    onDeleteMatch?: (id: string) => void;
    onUpdateMatch?: (id: string, data: Partial<MatchRecord>) => void;
    onAddMatch?: (t1: MatchPlayer[], t2: MatchPlayer[], winner: 'team1' | 'team2', timestamp: number) => void;
    onRenamePlayer?: (oldName: string, newName: string) => void;
    onRenameHero?: (oldName: string, newName: string) => void;
    onMergeHeroes?: (targetName: string, sourceNames: string[]) => void;
    onSync?: (options?: { silentIfNoChanges?: boolean; silentErrors?: boolean }) => Promise<boolean>;
    isSyncing?: boolean;
    isOnline?: boolean;
    lists?: HeroList[]; // For autocomplete
    triggerHaptic?: (pattern?: number | number[]) => void;
    deletedHistory?: MatchRecord[];
    onRestoreMatch?: (id: string) => void;

    onPermanentDeleteMatch?: (id: string) => void;
    onClearTrash?: () => void;

    onImportData?: (data: { history: MatchRecord[], deletedHistory: MatchRecord[], seasons?: Season[], avatars?: Record<string, string> }) => boolean;
    checkConnectivity?: (timeoutMs?: number) => Promise<boolean>;
    addToast?: (message: string, type: ToastType, duration?: number) => void;

    // Seasons management
    seasons?: Season[];
    latestSeasonId?: string | null;
    userDefaultSeasonId?: string | null;
    onSetUserDefaultSeason?: (id: string | null) => void;
    onAddSeason?: (name: string, startDate: string, endDate?: string) => Season | null;
    onUpdateSeason?: (id: string, updatedData: Partial<Omit<Season, 'id'>>) => void;
    onDeleteSeason?: (id: string) => void;

    // Облачный бэкап
    cloudBackups?: Array<{ id: string; createdAt: number; matchCount: number }>;
    isCreatingBackup?: boolean;
    isLoadingBackups?: boolean;
    isRestoringBackup?: boolean;
    onCreateCloudBackup?: () => Promise<string | null>;
    onListCloudBackups?: () => Promise<Array<{ id: string; createdAt: number; matchCount: number }>>;
    onRestoreFromCloudBackup?: (id: string) => Promise<boolean>;
    onDeleteCloudBackup?: (id: string) => Promise<boolean>;
    onGetCloudBackupDetails?: (id: string) => Promise<CloudBackup | null>;
    isDebugMode?: boolean;
    onOpenInactiveModal?: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
    isOpen,
    onClose,
    history: historyProp,
    onDeleteMatch: onDeleteMatchProp,
    onUpdateMatch: onUpdateMatchProp,
    onAddMatch: onAddMatchProp,
    onRenamePlayer: onRenamePlayerProp,
    onRenameHero: onRenameHeroProp,
    onMergeHeroes: onMergeHeroesProp,
    onSync: onSyncProp,
    isSyncing: _isSyncing,
    isOnline: isOnlineProp,
    lists: listsProp,
    triggerHaptic: triggerHapticProp,
    deletedHistory: deletedHistoryProp,
    onRestoreMatch: onRestoreMatchProp,
    onPermanentDeleteMatch: onPermanentDeleteMatchProp,
    onClearTrash: onClearTrashProp,

    onImportData: onImportDataProp,
    checkConnectivity: checkConnectivityProp,
    addToast: addToastProp,

    // Seasons management
    seasons: seasonsProp,
    latestSeasonId: latestSeasonIdProp,
    userDefaultSeasonId: userDefaultSeasonIdProp,
    onSetUserDefaultSeason: onSetUserDefaultSeasonProp,
    onAddSeason: onAddSeasonProp,
    onUpdateSeason: onUpdateSeasonProp,
    onDeleteSeason: onDeleteSeasonProp,

    // Облачный бэкап
    cloudBackups: cloudBackupsProp,
    isCreatingBackup: isCreatingBackupProp,
    isLoadingBackups: isLoadingBackupsProp,
    isRestoringBackup: isRestoringBackupProp,
    onCreateCloudBackup: onCreateCloudBackupProp,
    onListCloudBackups: onListCloudBackupsProp,
    onRestoreFromCloudBackup: onRestoreFromCloudBackupProp,
    onDeleteCloudBackup: onDeleteCloudBackupProp,
    onGetCloudBackupDetails: onGetCloudBackupDetailsProp,
    isDebugMode = false,
    onOpenInactiveModal
}) => {
    const matchHistoryCtx = useMatchHistoryContext();
    const heroListsCtx = useHeroListsContext();
    const seasonsCtx = useSeasonsContext();
    const { importAvatars, syncAvatarsToCloud } = useAvatars();
    const connectivityCtx = useConnectivityContext();
    const { addToast: ctxAddToast } = useToast();
    const { trigger: ctxTriggerHaptic } = useHaptics();

    const addToast = addToastProp ?? ctxAddToast;
    const triggerHaptic = triggerHapticProp ?? ctxTriggerHaptic;

    const {
        renameHero: ctxRenameHero,
        batchMergeHeroes: ctxBatchMergeHeroes,
        syncHistory: ctxSyncHistory,
        importData: ctxImportData,
        getCloudBackupDetails: ctxGetCloudBackupDetails,
        restoreFromCloudBackup: ctxRestoreFromCloudBackup,
    } = matchHistoryCtx;
    const {
        renameHeroInLists: ctxRenameHeroInLists,
        batchMergeHeroesInLists: ctxBatchMergeHeroesInLists,
    } = heroListsCtx;
    const { importSeasons: ctxImportSeasons, syncSeasons: ctxSyncSeasons } = seasonsCtx;

    const defaultOnRenameHero = useCallback(
        async (oldName: string, newName: string) => {
            ctxRenameHero(oldName, newName);
            await ctxRenameHeroInLists(oldName, newName);
        },
        [ctxRenameHero, ctxRenameHeroInLists]
    );

    const defaultOnMergeHeroes = useCallback(
        async (targetHeroName: string, sourceHeroNames: string[]) => {
            await ctxBatchMergeHeroes(targetHeroName, sourceHeroNames);
            const affectedLists = await ctxBatchMergeHeroesInLists(targetHeroName, sourceHeroNames);
            if (affectedLists > 0) {
                addToast(`Герой «${targetHeroName}» обновлен в ${affectedLists} списк(ах)`, 'info', 2500);
            }
        },
        [ctxBatchMergeHeroes, ctxBatchMergeHeroesInLists, addToast]
    );

    const defaultOnSync = useCallback(
        async (options?: { silentIfNoChanges?: boolean; silentErrors?: boolean }) => {
            const historySuccess = await ctxSyncHistory(options);
            await ctxSyncSeasons(options);
            await syncAvatarsToCloud();
            return historySuccess;
        },
        [ctxSyncHistory, ctxSyncSeasons, syncAvatarsToCloud]
    );

    const defaultOnImportData = useCallback(
        (data: { history: MatchRecord[]; deletedHistory: MatchRecord[]; seasons?: Season[]; avatars?: Record<string, string> }) => {
            const success = ctxImportData(data);
            if (success && Array.isArray(data.seasons)) {
                ctxImportSeasons(data.seasons);
            }
            if (success && data.avatars && typeof data.avatars === 'object') {
                void importAvatars(data.avatars);
            }
            return success;
        },
        [ctxImportData, ctxImportSeasons, importAvatars]
    );

    const defaultOnRestoreFromCloudBackup = useCallback(
        async (id: string) => {
            const backup = await ctxGetCloudBackupDetails(id);
            const res = await ctxRestoreFromCloudBackup(id);
            if (res && backup && Array.isArray(backup.seasons)) {
                ctxImportSeasons(backup.seasons);
            }
            return res;
        },
        [ctxGetCloudBackupDetails, ctxRestoreFromCloudBackup, ctxImportSeasons]
    );

    const history = historyProp ?? matchHistoryCtx.history;
    const onDeleteMatch = onDeleteMatchProp ?? matchHistoryCtx.deleteMatch;
    const onUpdateMatch = onUpdateMatchProp ?? matchHistoryCtx.updateMatch;
    const onAddMatch = onAddMatchProp ?? matchHistoryCtx.addManualMatch;
    const onRenamePlayer = onRenamePlayerProp ?? matchHistoryCtx.renamePlayer;
    const onRenameHero = onRenameHeroProp ?? defaultOnRenameHero;
    const onMergeHeroes = onMergeHeroesProp ?? defaultOnMergeHeroes;
    const onSync = onSyncProp ?? defaultOnSync;
    const isOnline = isOnlineProp ?? connectivityCtx.isOnline;
    const lists = listsProp ?? heroListsCtx.lists;
    const deletedHistory = deletedHistoryProp ?? matchHistoryCtx.deletedHistory;
    const onRestoreMatch = onRestoreMatchProp ?? matchHistoryCtx.restoreMatch;
    const onPermanentDeleteMatch = onPermanentDeleteMatchProp ?? matchHistoryCtx.permanentDeleteMatch;
    const onClearTrash = onClearTrashProp ?? matchHistoryCtx.clearTrash;
    const onImportData = onImportDataProp ?? defaultOnImportData;
    const checkConnectivity = checkConnectivityProp ?? connectivityCtx.checkConnectivity;

    const seasons = seasonsProp ?? seasonsCtx.seasons;
    const latestSeasonId = latestSeasonIdProp !== undefined ? latestSeasonIdProp : (seasonsCtx.latestSeason?.id ?? null);
    const userDefaultSeasonId = userDefaultSeasonIdProp !== undefined ? userDefaultSeasonIdProp : seasonsCtx.userDefaultSeasonId;
    const onSetUserDefaultSeason = onSetUserDefaultSeasonProp ?? seasonsCtx.setUserDefaultSeasonId;
    const onAddSeason = onAddSeasonProp ?? seasonsCtx.addSeason;
    const onUpdateSeason = onUpdateSeasonProp ?? seasonsCtx.updateSeason;
    const onDeleteSeason = onDeleteSeasonProp ?? seasonsCtx.deleteSeason;

    const cloudBackups = cloudBackupsProp ?? matchHistoryCtx.cloudBackups;
    const isCreatingBackup = isCreatingBackupProp ?? matchHistoryCtx.isCreatingBackup;
    const isLoadingBackups = isLoadingBackupsProp ?? matchHistoryCtx.isLoadingBackups;
    const isRestoringBackup = isRestoringBackupProp ?? matchHistoryCtx.isRestoringBackup;
    const onCreateCloudBackup = onCreateCloudBackupProp ?? matchHistoryCtx.createCloudBackup;
    const onListCloudBackups = onListCloudBackupsProp ?? matchHistoryCtx.listCloudBackups;
    const onRestoreFromCloudBackup = onRestoreFromCloudBackupProp ?? defaultOnRestoreFromCloudBackup;
    const onDeleteCloudBackup = onDeleteCloudBackupProp ?? matchHistoryCtx.deleteCloudBackup;
    const onGetCloudBackupDetails = onGetCloudBackupDetailsProp ?? ctxGetCloudBackupDetails;
    const [isSeasonsManagerOpen, setIsSeasonsManagerOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [showEfficiencyInfo, setShowEfficiencyInfo] = useState(false);
    const [showEfficiencyBreakdown, setShowEfficiencyBreakdown] = useState(false);
    const [activeNominationModal, setActiveNominationModal] = useState<NominationType | null>(null);
    const [selectedWeightedPlayer, setSelectedWeightedPlayer] = useState<{ player: PlayerStat; focusType: 'wins' | 'matches' } | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'heroes' | 'matches'>('overview');

    const {
        selectedSeasonId, handleSelectSeason,
        filterStartDate, setFilterStartDate,
        filterEndDate, setFilterEndDate,
        isDateFilterOpen, setIsDateFilterOpen,
        todayStr, yesterdayStr, lastEveningDateStr,
        handlePresetToday, handlePresetYesterday, handlePresetLastEvening, handleResetDateFilter,
        isDefaultFilterState, formatPeriodLabel,
        filteredHistory,
        defaultSeasonId, isManualDefault
    } = useMatchFilters(history, triggerHaptic, seasons, isOpen, addToast, userDefaultSeasonId);

    const hasLocalMutationsRef = useRef(false);

    const {
        isDataMenuOpen,
        setIsDataMenuOpen,
        isBackupManagerOpen,
        setIsBackupManagerOpen,
        handleTitleClick,
        handleExport,
        handleImport
    } = useStatsExportImport({
        history,
        deletedHistory,
        seasons,
        isOnline,
        isDebugMode,
        onImportData,
        onListCloudBackups,
        triggerHaptic,
        onLocalMutation: () => {
            hasLocalMutationsRef.current = true;
        }
    });

    // Global count of duplicate groups across all heroes in history + lists
    // Computed in the background when StatsModal opens, so opening the "Heroes" tab is instant
    const [heroDuplicateCount, setHeroDuplicateCount] = useState<number>(0);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let isCancelled = false;

        const runBackgroundDuplicateCheck = () => {
            const names = new Set<string>();
            for (let i = 0; i < history.length; i++) {
                const m = history[i];
                for (let j = 0; j < m.team1.length; j++) {
                    const n = (m.team1[j].heroName || '').trim();
                    if (n) names.add(n);
                }
                for (let j = 0; j < m.team2.length; j++) {
                    const n = (m.team2[j].heroName || '').trim();
                    if (n) names.add(n);
                }
            }
            if (lists && lists.length > 0) {
                for (let i = 0; i < lists.length; i++) {
                    const heroes = lists[i].heroes;
                    for (let j = 0; j < heroes.length; j++) {
                        const n = (heroes[j].name || '').trim();
                        if (n) names.add(n);
                    }
                }
            }

            if (names.size < 2) {
                if (!isCancelled) setHeroDuplicateCount(0);
                return;
            }

            const count = findDuplicateOrSimilarHeroGroups(Array.from(names)).length;
            if (!isCancelled) {
                setHeroDuplicateCount(count);
            }
        };

        // Defer computation via requestIdleCallback / setTimeout so it never blocks UI rendering or tab switching
        let idleId: number | null = null;
        let timerId: NodeJS.Timeout | null = null;

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            idleId = (window as any).requestIdleCallback(runBackgroundDuplicateCheck, { timeout: 1000 });
        } else {
            timerId = setTimeout(runBackgroundDuplicateCheck, 50);
        }

        return () => {
            isCancelled = true;
            if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
                (window as any).cancelIdleCallback(idleId);
            }
            if (timerId !== null) {
                clearTimeout(timerId);
            }
        };
    }, [isOpen, history, lists, isMergeModalOpen]);

    // Visual Sync State Logic
    const [visualSyncState, setVisualSyncState] = useState<'idle' | 'syncing' | 'success'>('idle');

    // Auto-sync Logic with Lie-Fi protection
    const checkConnectivityRef = useRef(checkConnectivity);
    const onSyncRef = useRef(onSync);
    const prevIsOpenRef = useRef(false);
    const hasAutoSyncedOpenRef = useRef(false);

    const syncWithAnimation = useCallback(async (options?: { silentIfNoChanges?: boolean; silentErrors?: boolean; force?: boolean }) => {
        if (visualSyncState !== 'idle' && !options?.force) return;
        if (!isOnline) return;

        // Perform active Lie-Fi connectivity check
        if (checkConnectivityRef.current) {
            const hasNet = await checkConnectivityRef.current(2500);
            if (!hasNet) {
                if (!options?.silentIfNoChanges && !options?.silentErrors && addToast) {
                    addToast("Нет подключения к интернету", "error", 2000);
                }
                return;
            }
        }

        setVisualSyncState('syncing');
        const startTime = Date.now();
        let success = false;

        try {
            if (onSyncRef.current) {
                success = await onSyncRef.current(options);
                if (success) {
                    hasLocalMutationsRef.current = false;
                }
            }
        } catch (e) {
            console.error('Sync with animation failed', e);
            success = false;
        } finally {
            const elapsed = Date.now() - startTime;
            const minDuration = 800; // Spinner animation duration
            const remaining = Math.max(0, minDuration - elapsed);

            setTimeout(() => {
                if (success) {
                    setVisualSyncState('success');
                    setTimeout(() => {
                        setVisualSyncState('idle');
                    }, 2000);
                } else {
                    setVisualSyncState('idle');
                }
            }, remaining);
        }
    }, [visualSyncState, isOnline, addToast]);

    const [editMode, setEditMode] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteConfirmAction, setDeleteConfirmAction] = useState<DeleteMatchAction>('move-to-trash');
    const [showTrashOnly, setShowTrashOnly] = useState(false);

    // Detail Views State
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
    const [selectedHero, setSelectedHero] = useState<HeroStat | null>(null);

    // Hero & Player Tab State
    const [heroSearch, setHeroSearch] = useState('');
    const [heroSort, setHeroSort] = useState<HeroSortOption>('winrate');
    const [playerSearch, setPlayerSearch] = useState('');
    const [playerSort, setPlayerSort] = useState<PlayerSortOption>('efficiency');

    // Match Tab State
    const [matchSearch, setMatchSearch] = useState('');
    const [visibleMatchesCount, setVisibleMatchesCount] = useState(15);

    // Collapsible Search State
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const currentSearchState = useMemo(() => {
        if (activeTab === 'players') {
            return {
                value: playerSearch,
                onChange: setPlayerSearch,
                placeholder: 'Поиск игрока...'
            };
        } else if (activeTab === 'heroes') {
            return {
                value: heroSearch,
                onChange: setHeroSearch,
                placeholder: 'Поиск героя...'
            };
        } else if (activeTab === 'matches') {
            return {
                value: matchSearch,
                onChange: setMatchSearch,
                placeholder: 'Поиск матча (игрок, герой, дата)'
            };
        }
        return null;
    }, [activeTab, playerSearch, heroSearch, matchSearch]);

    const contentContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsSearchExpanded(false);
        setPlayerSearch('');
        setHeroSearch('');
        setMatchSearch('');
        if (contentContainerRef.current) {
            contentContainerRef.current.scrollTop = 0;
        }
    }, [activeTab]);

    useEffect(() => {
        if (isOpen && contentContainerRef.current) {
            contentContainerRef.current.scrollTop = 0;
        }
    }, [isOpen]);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    // Swipe Logic
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchStartTime = useRef(0);
    const gestureDirection = useRef<'none' | 'horizontal' | 'vertical'>('none');
    const isIgnoredSwipe = useRef(false);

    useEffect(() => {
        checkConnectivityRef.current = checkConnectivity;
        onSyncRef.current = onSync;
    }, [checkConnectivity, onSync]);

    // Trigger auto-sync on modal open (deferred to avoid jank during entrance animation),
    // and quiet sync on modal close if mutations occurred
    useEffect(() => {
        const wasOpen = prevIsOpenRef.current;
        prevIsOpenRef.current = isOpen;

        let autoSyncTimer: NodeJS.Timeout | null = null;

        if (isOpen) {
            if (!hasAutoSyncedOpenRef.current && !isDebugMode && isOnline) {
                autoSyncTimer = setTimeout(() => {
                    hasAutoSyncedOpenRef.current = true;
                    syncWithAnimation({ silentIfNoChanges: true, silentErrors: true });
                }, 400);
            }
        } else {
            hasAutoSyncedOpenRef.current = false;
            if (wasOpen) {
                if (hasLocalMutationsRef.current && !isDebugMode) {
                    hasLocalMutationsRef.current = false;
                    (async () => {
                        const checkFn = checkConnectivityRef.current;
                        const hasNet = checkFn ? await checkFn(2500) : isOnline;
                        if (hasNet && onSyncRef.current) {
                            await onSyncRef.current({ silentIfNoChanges: true, silentErrors: true });
                        }
                    })().catch(e => console.warn('Background auto-sync on close failed:', e));
                }
            }
        }

        return () => {
            if (autoSyncTimer) clearTimeout(autoSyncTimer);
        };
    }, [isOpen, isDebugMode, isOnline, syncWithAnimation]);

    // Match Form State
    const [matchForm, setMatchForm] = useState<MatchFormState | null>(null);

    // Reset states on close & Open first tab
    useEffect(() => {
        if (!isOpen) {
            setEditMode(false);
            setMatchForm(null);
            setDeleteConfirmId(null);
            setSelectedPlayer(null);
            setSelectedHero(null);
            setIsDateFilterOpen(false);
        } else {
            setActiveTab('overview');
            setSelectedPlayer(null);
            setSelectedHero(null);
        }
    }, [isOpen, setIsDateFilterOpen]);

    // Reset detail views & match pagination on tab change
    useEffect(() => {
        setSelectedPlayer(null);
        setSelectedHero(null);
        setVisibleMatchesCount(15);
    }, [activeTab]);

    useEffect(() => {
        setVisibleMatchesCount(15);
    }, [matchSearch]);

    // Infinite Scroll on Matches tab
    useEffect(() => {
        if (activeTab !== 'matches') return;
        const container = contentContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (container.scrollHeight - container.scrollTop - container.clientHeight < 120) {
                setVisibleMatchesCount(prev => prev + 15);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [activeTab]);

    useLayoutEffect(() => {
        if (contentContainerRef.current) {
            contentContainerRef.current.scrollTop = 0;
        }
    }, [activeTab]);

    const closeMatchForm = () => {
        setMatchForm(null);
    };

    // All Heroes for Validation
    const allHeroesList = useMemo(() => {
        const unique = new Map<string, Hero>();
        lists.forEach(l => l.heroes.forEach(h => {
            const name = h.name.trim();
            if (name && !unique.has(name.toLowerCase())) {
                unique.set(name.toLowerCase(), h);
            }
        }));
        return Array.from(unique.values());
    }, [lists]);

    // Unique Players for Autocomplete
    const uniquePlayerNames = useMemo(() => {
        const names = new Set<string>();
        history.forEach(m => {
            m.team1.forEach(p => names.add(p.name));
            m.team2.forEach(p => names.add(p.name));
        });
        return Array.from(names).sort();
    }, [history]);

    const {
        totalMatches,
        sortedPlayers,
        sortedHeroes,
        topWinrateHero,
        mostPopularHero,
        mostDeadlyHero,
        mvp,
        underdog,
        streakStats,
        bestStreakPlayer,
        topKillsSeriesPlayer,
        topTotalKillers,
        mvpCandidates,
        underdogCandidates,
        streakCandidates,
        seriesKillsCandidates,
        totalKillsCandidates
    } = useStatsCalculations(filteredHistory);

    // Filtered & Sorted Players
    const processedPlayers = useMemo(() => {
        if (activeTab !== 'players' && !selectedPlayer) {
            return sortedPlayers;
        }
        let result = [...sortedPlayers];

        if (playerSearch.trim()) {
            const lower = playerSearch.toLowerCase().trim();
            result = result.filter(p => p.name.toLowerCase().includes(lower));
        }

        result.sort((a, b) => {
            const isQual = (p: PlayerStat) => !p.isInactive && p.matches >= 3 && (p.weightedMatches ?? p.matches) >= 3.0;
            if (playerSort === 'efficiency') {
                const aActive = !a.isInactive ? 1 : 0;
                const bActive = !b.isInactive ? 1 : 0;
                if (aActive !== bActive) return bActive - aActive;

                return b.score - a.score || b.wins - a.wins;
            } else if (playerSort === 'winrate') {
                const aActive = !a.isInactive ? 1 : 0;
                const bActive = !b.isInactive ? 1 : 0;
                if (aActive !== bActive) return bActive - aActive;

                const aQual = isQual(a) ? 1 : 0;
                const bQual = isQual(b) ? 1 : 0;
                if (aQual !== bQual) return bQual - aQual;

                return (b.wins / b.matches) - (a.wins / a.matches) || b.matches - a.matches;
            } else if (playerSort === 'matches') {
                return b.matches - a.matches || (b.wins / b.matches) - (a.wins / a.matches);
            } else if (playerSort === 'kills') {
                return (b.totalKills || 0) - (a.totalKills || 0) || (b.avgKills || 0) - (a.avgKills || 0) || b.matches - a.matches;
            } else if (playerSort === 'killPercent') {
                const aPct = a.matches > 0 ? (((a.totalKills || 0) * 100) / a.matches) / 2 : 0;
                const bPct = b.matches > 0 ? (((b.totalKills || 0) * 100) / b.matches) / 2 : 0;
                return bPct - aPct || (b.totalKills || 0) - (a.totalKills || 0) || b.matches - a.matches;
            } else if (playerSort === 'az') {
                return a.name.localeCompare(b.name);
            } else if (playerSort === 'za') {
                return b.name.localeCompare(a.name);
            }
            return 0;
        });

        return result;
    }, [sortedPlayers, playerSearch, playerSort, activeTab, selectedPlayer]);

    // Filtered & Sorted Heroes
    const processedHeroes = useMemo(() => {
        if (activeTab !== 'heroes' && !selectedHero) {
            return sortedHeroes;
        }
        let result = [...sortedHeroes];

        if (heroSearch.trim()) {
            const lower = heroSearch.toLowerCase().trim();
            result = result.filter(h => h.name.toLowerCase().includes(lower));
        }

        result.sort((a, b) => {
            if (heroSort === 'winrate') {
                return (b.wins / b.matches) - (a.wins / a.matches) || b.matches - a.matches;
            } else if (heroSort === 'matches') {
                return b.matches - a.matches || (b.wins / b.matches) - (a.wins / a.matches);
            } else if (heroSort === 'az') {
                return a.name.localeCompare(b.name);
            } else if (heroSort === 'za') {
                return b.name.localeCompare(a.name);
            } else if (heroSort === 'pop') {
                return b.matches - a.matches;
            }
            return 0;
        });

        return result;
    }, [sortedHeroes, heroSearch, heroSort, activeTab, selectedHero]);

    const openHeroDetails = useCallback((hero: HeroStat) => {
        triggerHaptic(10);
        setSelectedHero(hero);
    }, [triggerHaptic]);

    const openPlayerDetails = useCallback((player: PlayerStat) => {
        triggerHaptic(10);
        setSelectedPlayer(player);
    }, [triggerHaptic]);

    const handleSelectPlayerByName = useCallback((playerName: string) => {
        triggerHaptic(10);
        const targetName = playerName.trim();
        const found = sortedPlayers.find(p => p.name.toLowerCase() === targetName.toLowerCase());
        if (found) {
            setSelectedPlayer(found);
        } else {
            const playerMatches = filteredHistory.filter(m =>
                m.team1.some(p => p.name.toLowerCase() === targetName.toLowerCase()) ||
                m.team2.some(p => p.name.toLowerCase() === targetName.toLowerCase())
            );
            const wins = playerMatches.filter(m =>
                (m.team1.some(p => p.name.toLowerCase() === targetName.toLowerCase()) && m.winner === 'team1') ||
                (m.team2.some(p => p.name.toLowerCase() === targetName.toLowerCase()) && m.winner === 'team2')
            ).length;
            const totalKills = playerMatches.reduce((acc, m) => {
                const p = [...m.team1, ...m.team2].find(pl => pl.name.toLowerCase() === targetName.toLowerCase());
                return acc + (p?.kills || 0);
            }, 0);
            setSelectedPlayer({
                name: targetName,
                matches: playerMatches.length,
                wins,
                losses: playerMatches.length - wins,
                score: 0.5,
                heroesPlayed: {},
                totalKills,
                avgKills: playerMatches.length > 0 ? totalKills / playerMatches.length : 0
            });
        }
        setSelectedHero(null);
    }, [sortedPlayers, filteredHistory, triggerHaptic]);

    const handleSelectHeroByName = useCallback((heroName: string) => {
        triggerHaptic(10);
        const targetName = heroName.trim();
        const targetKey = normalizeHeroKey(targetName);
        const found = sortedHeroes.find(h => normalizeHeroKey(h.name) === targetKey);
        if (found) {
            setSelectedHero(found);
        } else {
            const heroMatches = filteredHistory.filter(m =>
                m.team1.some(p => normalizeHeroKey(p.heroName) === targetKey) ||
                m.team2.some(p => normalizeHeroKey(p.heroName) === targetKey)
            );
            const wins = heroMatches.filter(m =>
                (m.team1.some(p => normalizeHeroKey(p.heroName) === targetKey) && m.winner === 'team1') ||
                (m.team2.some(p => normalizeHeroKey(p.heroName) === targetKey) && m.winner === 'team2')
            ).length;
            setSelectedHero({
                name: targetName,
                matches: heroMatches.length,
                wins,
                losses: heroMatches.length - wins
            });
        }
        setSelectedPlayer(null);
    }, [sortedHeroes, filteredHistory, triggerHaptic]);

    // Filtered Matches
    const processedMatches = useMemo(() => {
        if (!matchSearch.trim()) return filteredHistory;
        const lower = matchSearch.toLowerCase().trim();
        return filteredHistory.filter(m => {
            const pNames = [...m.team1, ...m.team2].map(p => p.name.toLowerCase());
            if (pNames.some(n => n.includes(lower))) return true;

            const hNames = [...m.team1, ...m.team2].map(p => p.heroName.toLowerCase());
            if (hNames.some(n => n.includes(lower))) return true;

            const dateStr = new Date(m.timestamp).toLocaleDateString();
            if (dateStr.includes(lower)) return true;

            return false;
        });
    }, [filteredHistory, matchSearch]);

    const matchesToShow = useMemo(() => {
        return processedMatches.slice(0, visibleMatchesCount);
    }, [processedMatches, visibleMatchesCount]);

    const hasMoreMatches = processedMatches.length > visibleMatchesCount;

    // Group matches by day (shifting by 6 hours for gaming evening)
    const groupedMatches = useMemo(() => {
        if (activeTab !== 'matches') {
            return [];
        }
        const groups: { [key: string]: MatchRecord[] } = {};

        matchesToShow.forEach(match => {
            const adjustedTime = match.timestamp - 6 * 60 * 60 * 1000;
            const dateObj = new Date(adjustedTime);
            const groupKey = dateObj.toLocaleDateString('en-CA');

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(match);
        });

        return Object.entries(groups)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([dateStr, matches]) => {
                let label = '';
                const today = new Date().toLocaleDateString('en-CA');
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toLocaleDateString('en-CA');

                if (dateStr === today) {
                    label = 'Сегодня';
                } else if (dateStr === yesterdayStr) {
                    label = 'Вчера';
                } else {
                    const [y, m, d] = dateStr.split('-');
                    const months = [
                        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
                    ];
                    const monthName = months[parseInt(m, 10) - 1];
                    label = `${parseInt(d, 10)} ${monthName} ${y}`;
                }

                return {
                    dateStr,
                    label,
                    matches
                };
            });
    }, [matchesToShow, activeTab]);

    const openAddMatch = () => {
        triggerHaptic(10);
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);

        setMatchForm({
            date: dateStr,
            time: timeStr,
            t1p1: '', t1p1h: '', t1p1k: '',
            t1p2: '', t1p2h: '', t1p2k: '',
            t2p1: '', t2p1h: '', t2p1k: '',
            t2p2: '', t2p2h: '', t2p2k: '',
            winner: 'team1',
            errors: {}
        });
    };

    const openEditMatch = (match: MatchRecord) => {
        triggerHaptic(10);
        const d = new Date(match.timestamp);
        const dateStr = d.toLocaleDateString('en-CA');
        const timeStr = d.toTimeString().slice(0, 5);

        setMatchForm({
            id: match.id,
            date: dateStr,
            time: timeStr,
            t1p1: match.team1[0]?.name || '', t1p1h: match.team1[0]?.heroName || '', t1p1k: match.team1[0]?.kills !== undefined ? String(match.team1[0].kills) : '',
            t1p2: match.team1[1]?.name || '', t1p2h: match.team1[1]?.heroName || '', t1p2k: match.team1[1]?.kills !== undefined ? String(match.team1[1].kills) : '',
            t2p1: match.team2[0]?.name || '', t2p1h: match.team2[0]?.heroName || '', t2p1k: match.team2[0]?.kills !== undefined ? String(match.team2[0].kills) : '',
            t2p2: match.team2[1]?.name || '', t2p2h: match.team2[1]?.heroName || '', t2p2k: match.team2[1]?.kills !== undefined ? String(match.team2[1].kills) : '',
            winner: match.winner || 'team1',
            errors: {}
        });
    };

    const confirmDeleteMatch = () => {
        hasLocalMutationsRef.current = true;
        if (deleteConfirmAction === 'clear-trash') {
            onClearTrash();
            triggerHaptic([20, 50]);
            setDeleteConfirmId(null);
            return;
        }

        if (deleteConfirmId) {
            if (deleteConfirmAction === 'permanent') {
                onPermanentDeleteMatch(deleteConfirmId);
            } else {
                onDeleteMatch(deleteConfirmId);
            }
            triggerHaptic(20);
            setDeleteConfirmId(null);
        }
    };

    // Swipe Handling - Global Tabs (Non-passive listener registration to allow preventDefault)
    useEffect(() => {
        const container = contentContainerRef.current;
        if (!container) return;

        touchStartX.current = 0;
        touchStartY.current = 0;
        touchStartTime.current = 0;
        gestureDirection.current = 'none';
        isIgnoredSwipe.current = false;

        const handleTouchStartRaw = (e: TouchEvent) => {
            if (!e.touches || e.touches.length !== 1) {
                isIgnoredSwipe.current = true;
                gestureDirection.current = 'none';
                return;
            }
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-no-tab-swipe="true"]') || selectedPlayer || selectedHero || matchForm) {
                isIgnoredSwipe.current = true;
                gestureDirection.current = 'none';
                touchStartX.current = 0;
                touchStartY.current = 0;
                return;
            }
            isIgnoredSwipe.current = false;
            gestureDirection.current = 'none';
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
            touchStartTime.current = Date.now();
        };

        const handleTouchMoveRaw = (e: TouchEvent) => {
            if (isIgnoredSwipe.current) return;
            if (!touchStartX.current || !touchStartY.current || !e.touches || e.touches.length !== 1) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = touchStartX.current - currentX;
            const diffY = touchStartY.current - currentY;
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);

            if (gestureDirection.current === 'none') {
                const DEADZONE = 10;
                if (absX < DEADZONE && absY < DEADZONE) {
                    return;
                }
                if (absY >= absX) {
                    gestureDirection.current = 'vertical';
                    isIgnoredSwipe.current = true;
                    return;
                }
                if (absX > absY * 1.5) {
                    gestureDirection.current = 'horizontal';
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                } else {
                    gestureDirection.current = 'vertical';
                    isIgnoredSwipe.current = true;
                    return;
                }
            } else if (gestureDirection.current === 'horizontal') {
                if (e.cancelable) {
                    e.preventDefault();
                }
            }
        };

        const handleTouchEndRaw = (e: TouchEvent) => {
            if (isIgnoredSwipe.current || gestureDirection.current !== 'horizontal') {
                isIgnoredSwipe.current = false;
                gestureDirection.current = 'none';
                touchStartX.current = 0;
                touchStartY.current = 0;
                return;
            }
            if (!touchStartX.current || !touchStartY.current) return;
            if (!e.changedTouches || e.changedTouches.length === 0) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = touchStartX.current - endX;
            const diffY = touchStartY.current - endY;
            const elapsed = Date.now() - touchStartTime.current;

            touchStartX.current = 0;
            touchStartY.current = 0;
            gestureDirection.current = 'none';
            isIgnoredSwipe.current = false;

            const SWIPE_THRESHOLD = 50;

            if (elapsed < 600 && Math.abs(diffX) > Math.abs(diffY) * 1.5 && Math.abs(diffX) > SWIPE_THRESHOLD) {
                const tabs: ('overview' | 'players' | 'heroes' | 'matches')[] = ['overview', 'players', 'heroes', 'matches'];
                const idx = tabs.indexOf(activeTab);
                let nextTab: ('overview' | 'players' | 'heroes' | 'matches') | null = null;
                if (diffX > 0 && idx < tabs.length - 1) nextTab = tabs[idx + 1];
                if (diffX < 0 && idx > 0) nextTab = tabs[idx - 1];

                if (nextTab) {
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                    setActiveTab(nextTab);
                    setSelectedPlayer(null);
                    setSelectedHero(null);
                    if (contentContainerRef.current) {
                        contentContainerRef.current.scrollTop = 0;
                    }
                    triggerHaptic(10);
                }
            }
        };

        const handleTouchCancelRaw = () => {
            touchStartX.current = 0;
            touchStartY.current = 0;
            gestureDirection.current = 'none';
            isIgnoredSwipe.current = false;
        };

        container.addEventListener('touchstart', handleTouchStartRaw, { passive: true });
        container.addEventListener('touchmove', handleTouchMoveRaw, { passive: false });
        container.addEventListener('touchend', handleTouchEndRaw, { passive: false });
        container.addEventListener('touchcancel', handleTouchCancelRaw);

        return () => {
            container.removeEventListener('touchstart', handleTouchStartRaw);
            container.removeEventListener('touchmove', handleTouchMoveRaw);
            container.removeEventListener('touchend', handleTouchEndRaw);
            container.removeEventListener('touchcancel', handleTouchCancelRaw);
        };
    }, [activeTab, selectedPlayer, selectedHero, matchForm, triggerHaptic]);

    return (
        <>
            {/* Backup Menu Overlay */}
            {isDataMenuOpen && (
                <StatsBackupMenu
                    isDataMenuOpen={isDataMenuOpen}
                    setIsDataMenuOpen={setIsDataMenuOpen}
                    handleExport={handleExport}
                    handleImport={handleImport}
                    isDebugMode={isDebugMode}
                    triggerHaptic={triggerHaptic}
                    setIsBackupManagerOpen={setIsBackupManagerOpen}
                    cloudBackupsLength={cloudBackups.length}
                />
            )}

            {/* Cloud Backup Manager */}
            {isBackupManagerOpen && (
                <CloudBackupManager
                    isOpen={isBackupManagerOpen}
                    onClose={() => setIsBackupManagerOpen(false)}
                    backups={cloudBackups}
                    isLoadingBackups={isLoadingBackups}
                    isCreatingBackup={isCreatingBackup}
                    isRestoringBackup={isRestoringBackup}
                    onCreateBackup={onCreateCloudBackup}
                    onRestoreBackup={onRestoreFromCloudBackup}
                    onDeleteBackup={onDeleteCloudBackup}
                    onGetBackupDetails={onGetCloudBackupDetails}
                    triggerHaptic={triggerHaptic}
                    isOnline={isOnline}
                />
            )}

            <ScreenOverlay
                isOpen={isOpen}
                onClose={onClose}
                screenId="stats-screen"
                priority={10}
                testId="stats-modal"
                closeButtonTestId="stats-close-btn"
                closeButtonAriaLabel="Закрыть"
                title={
                    <h2
                        className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 select-none active:scale-95 transition-transform cursor-pointer"
                        data-testid="stats-title"
                        onClick={handleTitleClick}
                    >
                        <Trophy size={20} className="text-yellow-500 shrink-0" /> Статистика
                    </h2>
                }
                headerActions={
                    <button
                        type="button"
                        onClick={() => syncWithAnimation()}
                        disabled={!isOnline || visualSyncState !== 'idle' || isDebugMode}
                        className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all duration-150 active:scale-95 ${(!isOnline || isDebugMode) ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' :
                            visualSyncState === 'success' ? 'text-green-500 bg-green-100 dark:bg-green-900/30' :
                                'text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800'}`}
                        aria-label={isDebugMode ? "Синхронизация отключена в режиме разработчика" : "Синхронизация"}
                    >
                        {visualSyncState === 'syncing' ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : visualSyncState === 'success' ? (
                            <Check size={20} className="animate-in zoom-in spin-in-90 duration-300" />
                        ) : (
                            <RefreshCw size={20} />
                        )}
                    </button>
                }
                subHeader={
                    <>
                        <div className="flex border-t border-b border-slate-200/40 dark:border-slate-800/40 shrink-0 overflow-x-auto overscroll-contain no-scrollbar bg-white/30 dark:bg-slate-950/30 backdrop-blur-xl touch-manipulation">
                            {['overview', 'players', 'heroes', 'matches'].map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => {
                                        if (activeTab === tab) return;
                                        setActiveTab(tab as any);
                                        setSelectedPlayer(null);
                                        setSelectedHero(null);
                                        triggerHaptic(10);
                                    }}
                                    className={`flex-1 min-w-[84px] min-h-[44px] py-2.5 text-sm font-bold border-b-2 transition-all active:scale-95 capitalize ${activeTab === tab ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-900/20'}`}
                                >
                                    {tab === 'overview' ? 'Обзор' : tab === 'players' ? 'Игроки' : tab === 'heroes' ? 'Герои' : 'Матчи'}
                                </button>
                            ))}
                        </div>

                        {/* Unified Stats Control Toolbar */}
                        <div className="flex items-center justify-between gap-1.5 px-3 py-2 bg-white/20 dark:bg-slate-950/20 backdrop-blur-xl border-b border-slate-200/40 dark:border-slate-800/40 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                            {isSearchExpanded && currentSearchState ? (
                                /* Full-width Search Input Mode */
                                <div className="flex-1 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="relative flex-1 min-w-0">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={currentSearchState.value}
                                            onChange={(e) => currentSearchState.onChange(e.target.value)}
                                            placeholder={currentSearchState.placeholder}
                                            className="w-full pl-8 pr-8 py-1.5 h-9 bg-white/80 dark:bg-slate-900/80 rounded-xl text-xs border border-slate-200/80 dark:border-slate-700/60 outline-none focus:border-primary-500 transition-colors text-slate-900 dark:text-white"
                                        />
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        {currentSearchState.value && (
                                            <button
                                                type="button"
                                                onClick={() => { currentSearchState.onChange(''); triggerHaptic(10); searchInputRef.current?.focus(); }}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-600 dark:active:text-slate-200 p-1"
                                                aria-label="Очистить поиск"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setIsSearchExpanded(false); triggerHaptic(10); }}
                                        className="h-9 px-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 active:scale-95 transition-all"
                                    >
                                        Готово
                                    </button>
                                </div>
                            ) : (
                                /* Compact Mode: Flex-1 Date Pill + Collapsed Search + Right Actions */
                                <>
                                    {/* Period / Season Filter Pill Button */}
                                    <button
                                        type="button"
                                        onClick={() => { setIsDateFilterOpen(!isDateFilterOpen); triggerHaptic(10); }}
                                        title={isDateFilterOpen ? "Свернуть настройки периода" : "Открыть настройки периода"}
                                        className={`h-9 px-2.5 text-xs font-bold rounded-xl flex items-center justify-between gap-1 flex-1 min-w-0 transition-all active:scale-95 border ${
                                            isDateFilterOpen
                                                ? 'bg-primary-500/10 dark:bg-primary-500/20 border-primary-500/60 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500/30 shadow-xs font-extrabold'
                                                : filterStartDate && filterEndDate && filterEndDate < filterStartDate
                                                    ? 'bg-rose-50/80 border-rose-200 text-rose-600 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-400'
                                                    : !isDefaultFilterState
                                                        ? 'bg-primary-50/80 border-primary-200 text-primary-600 dark:bg-primary-900/40 dark:border-primary-800 dark:text-primary-400 font-extrabold'
                                                        : 'bg-white/60 border-slate-200/80 text-slate-700 dark:bg-slate-900/60 dark:border-slate-700/60 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                                            <Calendar size={14} className={isDateFilterOpen || !isDefaultFilterState ? 'text-primary-500 shrink-0' : filterStartDate && filterEndDate && filterEndDate < filterStartDate ? 'text-rose-500 shrink-0' : 'text-slate-400 shrink-0'} />
                                            <span className="hidden sm:inline shrink-0 text-slate-400 font-normal">Период: </span>
                                            <span className="truncate text-left">{formatPeriodLabel()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 ml-1.5 shrink-0">
                                            {!isDefaultFilterState && (
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleResetDateFilter();
                                                        triggerHaptic(10);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleResetDateFilter();
                                                            triggerHaptic(10);
                                                        }
                                                    }}
                                                    data-testid="reset-date-filter-btn"
                                                    className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center justify-center active:scale-90"
                                                    title="Сбросить фильтр дат"
                                                    aria-label="Сбросить фильтр дат"
                                                >
                                                    <X size={13} strokeWidth={2.5} />
                                                </span>
                                            )}
                                            <div className={`p-0.5 rounded-lg transition-all flex items-center justify-center ${
                                                isDateFilterOpen
                                                    ? 'bg-primary-500 text-white shadow-xs'
                                                    : 'text-slate-400'
                                            }`}>
                                                {isDateFilterOpen ? <ChevronUp size={14} strokeWidth={2.5} /> : <ChevronDown size={14} />}
                                            </div>
                                        </div>
                                    </button>

                                    <div className={`flex items-center gap-1.5 justify-end ${currentSearchState?.value ? 'flex-1 min-w-0' : 'shrink-0'}`}>
                                        {/* Search Toggle / Active Chip */}
                                        {currentSearchState && (
                                            !currentSearchState.value ? (
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsSearchExpanded(true); triggerHaptic(10); }}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-500 dark:text-slate-400 active:scale-95 transition-all shrink-0"
                                                    aria-label="Поиск"
                                                >
                                                    <Search size={16} />
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-1 h-9 px-2 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/60 rounded-xl text-xs font-bold text-primary-600 dark:text-primary-400 flex-1 min-w-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsSearchExpanded(true); triggerHaptic(10); }}
                                                        className="flex items-center gap-1.5 min-w-0 flex-1 text-left truncate"
                                                        aria-label="Редактировать поиск"
                                                    >
                                                        <Search size={13} className="shrink-0 text-primary-500" />
                                                        <span className="truncate flex-1">{currentSearchState.value}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { currentSearchState.onChange(''); triggerHaptic(10); }}
                                                        className="w-6 h-6 rounded-md hover:bg-primary-200/60 dark:hover:bg-primary-800/60 text-primary-500 flex items-center justify-center shrink-0 active:scale-90 transition-all"
                                                        aria-label="Очистить поиск"
                                                    >
                                                        <X size={13} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            )
                                        )}

                                        {/* Tab Specific Action Buttons */}
                                        {activeTab === 'matches' && (
                                            <>
                                                {editMode && deletedHistory.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowTrashOnly(!showTrashOnly); triggerHaptic(10); }}
                                                        className={`w-9 h-9 rounded-xl border transition-colors flex items-center justify-center relative ${showTrashOnly ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/50' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                                                        aria-label={showTrashOnly ? 'Все матчи' : `Корзина (${deletedHistory.length})`}
                                                    >
                                                        <Trash2 size={16} />
                                                        {!showTrashOnly && (
                                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
                                                                {deletedHistory.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                )}
                                                {editMode && (
                                                    <button
                                                        type="button"
                                                        onClick={openAddMatch}
                                                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 active:scale-95 transition-transform"
                                                        aria-label="Добавить матч"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditMode(!editMode); setShowTrashOnly(false); triggerHaptic(10); }}
                                                    className={`w-9 h-9 rounded-xl border transition-colors flex items-center justify-center ${editMode ? 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                                                    aria-label={editMode ? 'Готово' : 'Редактировать'}
                                                >
                                                    {editMode ? <Check size={16} /> : <Edit2 size={16} />}
                                                </button>
                                            </>
                                        )}

                                        {activeTab === 'heroes' && (
                                            <StatsSortDropdown
                                                mode="heroes"
                                                value={heroSort}
                                                onChange={setHeroSort}
                                                triggerHaptic={triggerHaptic}
                                            />
                                        )}

                                        {activeTab === 'players' && (
                                            <StatsSortDropdown
                                                mode="players"
                                                value={playerSort}
                                                onChange={setPlayerSort}
                                                triggerHaptic={triggerHaptic}
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Date Filter Collapsible Panel */}
                        <StatsDateFilter
                            isDateFilterOpen={isDateFilterOpen}
                            setIsDateFilterOpen={setIsDateFilterOpen}
                            filterStartDate={filterStartDate}
                            setFilterStartDate={setFilterStartDate}
                            filterEndDate={filterEndDate}
                            setFilterEndDate={setFilterEndDate}
                            formatPeriodLabel={formatPeriodLabel}
                            handleResetDateFilter={handleResetDateFilter}
                            isDefaultFilterState={isDefaultFilterState}
                            handlePresetToday={handlePresetToday}
                            handlePresetYesterday={handlePresetYesterday}
                            handlePresetLastEvening={handlePresetLastEvening}
                            todayStr={todayStr}
                            yesterdayStr={yesterdayStr}
                            lastEveningDateStr={lastEveningDateStr}
                            historyLength={history.length}
                            triggerHaptic={triggerHaptic}
                            seasons={seasons}
                            selectedSeasonId={selectedSeasonId}
                            defaultSeasonId={defaultSeasonId}
                            isManualDefault={isManualDefault}
                            onSelectSeason={handleSelectSeason}
                            onOpenSeasonsManager={() => setIsSeasonsManagerOpen(true)}
                        />
                    </>
                }
                bodyRef={contentContainerRef}
                bodyClassName="no-scrollbar touch-pan-y p-0"
            >
                {activeTab === 'overview' && (
                    <StatsOverviewTab
                        totalMatches={totalMatches}
                        mvp={mvp}
                        underdog={underdog}
                        bestStreakPlayer={bestStreakPlayer}
                        topKillsSeriesPlayer={topKillsSeriesPlayer}
                        topTotalKillers={topTotalKillers}
                        sortedPlayers={sortedPlayers}
                        setActiveNominationModal={setActiveNominationModal}
                        setShowEfficiencyInfo={setShowEfficiencyInfo}
                        triggerHaptic={triggerHaptic}
                    />
                )}

                {activeTab === 'players' && (
                    <StatsPlayersTab
                        processedPlayers={processedPlayers}
                        filteredHistory={filteredHistory}
                        onRenamePlayer={(oldName, newName) => {
                            hasLocalMutationsRef.current = true;
                            onRenamePlayer(oldName, newName);
                        }}
                        streakStats={streakStats}
                        mvp={mvp}
                        underdog={underdog}
                        topTotalKillers={topTotalKillers}
                        playerSort={playerSort}
                        openPlayerDetails={openPlayerDetails}
                        handleTitleClick={handleTitleClick}
                        onOpenEfficiencyBreakdown={() => { setShowEfficiencyBreakdown(true); triggerHaptic(10); }}
                    />
                )}

                {activeTab === 'heroes' && (
                    <StatsHeroesTab
                        processedHeroes={processedHeroes}
                        filteredHistory={filteredHistory}
                        onRenameHero={(oldName, newName) => {
                            hasLocalMutationsRef.current = true;
                            onRenameHero(oldName, newName);
                        }}
                        heroSort={heroSort}
                        openHeroDetails={openHeroDetails}
                        topWinrateHero={topWinrateHero}
                        mostPopularHero={mostPopularHero}
                        mostDeadlyHero={mostDeadlyHero}
                        onOpenInactiveModal={onOpenInactiveModal}
                        onOpenMergeModal={() => { triggerHaptic(10); setIsMergeModalOpen(true); }}
                        duplicateCount={heroDuplicateCount}
                    />
                )}

                {activeTab === 'matches' && (
                    <StatsMatchesTab
                        groupedMatches={groupedMatches}
                        processedMatches={processedMatches}
                        hasMoreMatches={hasMoreMatches}
                        editMode={editMode}
                        showTrashOnly={showTrashOnly}
                        deletedHistory={deletedHistory}
                        sortedPlayers={sortedPlayers}
                        sortedHeroes={sortedHeroes}
                        openPlayerDetails={(player) => {
                            triggerHaptic(10);
                            setSelectedPlayer(player);
                        }}
                        openHeroDetails={openHeroDetails}
                        openEditMatch={openEditMatch}
                        setDeleteConfirmId={setDeleteConfirmId}
                        setDeleteConfirmAction={setDeleteConfirmAction}
                        onRestoreMatch={(id) => {
                            hasLocalMutationsRef.current = true;
                            onRestoreMatch(id);
                        }}
                        triggerHaptic={triggerHaptic}
                    />
                )}
            </ScreenOverlay>

            <TrashMatchesModal
                isOpen={!!deleteConfirmId}
                action={deleteConfirmAction}
                onCancel={() => setDeleteConfirmId(null)}
                onConfirm={confirmDeleteMatch}
            />

            <EfficiencyInfoModal
                isOpen={showEfficiencyInfo}
                onClose={() => setShowEfficiencyInfo(false)}
                triggerHaptic={triggerHaptic}
            />

            <NominationModal
                activeNomination={activeNominationModal}
                onClose={() => setActiveNominationModal(null)}
                mvp={mvp}
                underdog={underdog}
                bestStreakPlayer={bestStreakPlayer}
                topKillsSeriesPlayer={topKillsSeriesPlayer}
                topTotalKillers={topTotalKillers}
                streakStats={streakStats}
                mvpCandidates={mvpCandidates}
                underdogCandidates={underdogCandidates}
                streakCandidates={streakCandidates}
                seriesKillsCandidates={seriesKillsCandidates}
                totalKillsCandidates={totalKillsCandidates}
                triggerHaptic={triggerHaptic}
            />

            <EfficiencyBreakdownModal
                isOpen={showEfficiencyBreakdown}
                onClose={() => setShowEfficiencyBreakdown(false)}
                sortedPlayers={sortedPlayers}
                onOpenInfo={() => setShowEfficiencyInfo(true)}
                onSelectWeightedPlayer={setSelectedWeightedPlayer}
                triggerHaptic={triggerHaptic}
            />

            <WeightedPlayerModal
                selection={selectedWeightedPlayer}
                onClose={() => setSelectedWeightedPlayer(null)}
                filteredHistory={filteredHistory}
            />

            <SeasonsManagerModal
                isOpen={isSeasonsManagerOpen}
                onClose={() => setIsSeasonsManagerOpen(false)}
                seasons={seasons}
                latestSeasonId={latestSeasonId}
                userDefaultSeasonId={userDefaultSeasonId}
                onSetUserDefaultSeason={onSetUserDefaultSeason}
                onAddSeason={(name, start, end) => {
                    if (onAddSeason) {
                        hasLocalMutationsRef.current = true;
                        return onAddSeason(name, start, end);
                    }
                    return null;
                }}
                onUpdateSeason={(id, patch) => {
                    if (onUpdateSeason) {
                        hasLocalMutationsRef.current = true;
                        onUpdateSeason(id, patch);
                    }
                }}
                onDeleteSeason={(id) => {
                    if (onDeleteSeason) {
                        hasLocalMutationsRef.current = true;
                        onDeleteSeason(id);
                    }
                }}
                triggerHaptic={triggerHaptic}
            />

            {isMergeModalOpen && (
                <MergeHeroesModal
                    isOpen={isMergeModalOpen}
                    onClose={() => setIsMergeModalOpen(false)}
                    history={history}
                    lists={lists}
                    onMergeHeroes={(target, sources) => {
                        hasLocalMutationsRef.current = true;
                        if (onMergeHeroes) {
                            onMergeHeroes(target, sources);
                        }
                    }}
                    triggerHaptic={triggerHaptic}
                />
            )}

            {/* Player Details Modal */}
            <PlayerDetails
                isOpen={!!selectedPlayer}
                player={selectedPlayer}
                history={filteredHistory}
                onClose={() => setSelectedPlayer(null)}
                onRename={(newName) => {
                    if (selectedPlayer) {
                        hasLocalMutationsRef.current = true;
                        onRenamePlayer(selectedPlayer.name, newName);
                        setSelectedPlayer(prev => prev ? { ...prev, name: newName } : null);
                    }
                }}
                onSelectHero={handleSelectHeroByName}
                onSelectPlayer={handleSelectPlayerByName}
                triggerHaptic={triggerHaptic}
            />

            {/* Hero Details Modal */}
            <HeroDetails
                isOpen={!!selectedHero}
                hero={selectedHero}
                history={filteredHistory}
                onClose={() => setSelectedHero(null)}
                onRename={(newName) => {
                    if (selectedHero) {
                        hasLocalMutationsRef.current = true;
                        onRenameHero(selectedHero.name, newName);
                        setSelectedHero(prev => prev ? { ...prev, name: newName } : null);
                    }
                }}
                onOpenMerge={() => {
                    triggerHaptic(10);
                    setSelectedHero(null);
                    setIsMergeModalOpen(true);
                }}
                onSelectHero={handleSelectHeroByName}
                onSelectPlayer={handleSelectPlayerByName}
                triggerHaptic={triggerHaptic}
            />

            {matchForm && (
                <MatchEditorForm
                    matchForm={matchForm}
                    setMatchForm={setMatchForm}
                    closeMatchForm={closeMatchForm}
                    allHeroesList={allHeroesList}
                    uniquePlayerNames={uniquePlayerNames}
                    onAddMatch={(t1, t2, winner, timestamp) => {
                        hasLocalMutationsRef.current = true;
                        onAddMatch(t1, t2, winner, timestamp);
                    }}
                    onUpdateMatch={(id, data) => {
                        hasLocalMutationsRef.current = true;
                        onUpdateMatch(id, data);
                    }}
                    triggerHaptic={triggerHaptic}
                />
            )}
        </>
    );
};
