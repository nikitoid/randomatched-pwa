
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Swords, Edit2, Trash2, Save, RefreshCw, Loader2, Plus, User, Shield, ChevronLeft, ChevronRight, Calendar, Check, Search, TrendingUp, TrendingDown, Star, Skull, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ArrowDownAZ, ArrowUpAZ, Percent, BarChart3, Eye, HelpCircle, Crown, Flame, Sparkles, Calculator, Info } from 'lucide-react';
import { MatchRecord, PlayerStat, MatchPlayer, HeroList, Hero, HeroStat, CloudBackup, Season, ToastType } from '../types';
import { PlayerDetails } from './PlayerDetails';
import { HeroDetails } from './HeroDetails';
import { CloudBackupManager } from './CloudBackupManager';
import { useBackHandler } from '../hooks/useBackHandler';
import { useStatsCalculations, getPlayerWeightedBreakdown } from './stats/hooks/useStatsCalculations';
import { useMatchFilters } from './stats/hooks/useMatchFilters';
import { StatsOverviewTab } from './stats/StatsOverviewTab';
import { MatchEditorForm, MatchFormState } from './stats/MatchEditorForm';
import { StatsBackupMenu } from './stats/StatsBackupMenu';
import { StatsPlayersTab } from './stats/StatsPlayersTab';
import { StatsHeroesTab } from './stats/StatsHeroesTab';
import { StatsMatchesTab } from './stats/StatsMatchesTab';
import { StatsDateFilter } from './stats/StatsDateFilter';
import { SeasonsManagerModal } from './stats/SeasonsManagerModal';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: MatchRecord[];
    onDeleteMatch: (id: string) => void;
    onUpdateMatch: (id: string, data: Partial<MatchRecord>) => void;
    onAddMatch: (t1: MatchPlayer[], t2: MatchPlayer[], winner: 'team1' | 'team2', timestamp: number) => void;
    onRenamePlayer: (oldName: string, newName: string) => void;
    onRenameHero: (oldName: string, newName: string) => void;
    onSync: (options?: { silentIfNoChanges?: boolean }) => Promise<boolean>;
    isSyncing: boolean;
    isOnline: boolean;
    lists: HeroList[]; // For autocomplete
    triggerHaptic: (pattern?: number | number[]) => void;
    deletedHistory: MatchRecord[];
    onRestoreMatch: (id: string) => void;

    onPermanentDeleteMatch: (id: string) => void;
    onClearTrash: () => void;

    onImportData: (data: { history: MatchRecord[], deletedHistory: MatchRecord[], seasons?: Season[] }) => boolean;
    checkConnectivity?: () => Promise<boolean>;
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

    cloudBackups: Array<{ id: string; createdAt: number; matchCount: number }>;
    isCreatingBackup: boolean;
    isLoadingBackups: boolean;
    isRestoringBackup: boolean;
    onCreateCloudBackup: () => Promise<string | null>;
    onListCloudBackups: () => Promise<Array<{ id: string; createdAt: number; matchCount: number }>>;
    onRestoreFromCloudBackup: (id: string) => Promise<boolean>;
    onDeleteCloudBackup: (id: string) => Promise<boolean>;
    onGetCloudBackupDetails: (id: string) => Promise<CloudBackup | null>;
    isDebugMode?: boolean;
    onOpenInactiveModal?: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
    isOpen,
    onClose,
    history,
    onDeleteMatch,
    onUpdateMatch,
    onAddMatch,
    onRenamePlayer,
    onRenameHero,
    onSync,
    isSyncing,
    isOnline,
    lists,
    triggerHaptic,
    deletedHistory = [],
    onRestoreMatch = () => { },
    onPermanentDeleteMatch = () => { },
    onClearTrash = () => { },

    onImportData,
    checkConnectivity,
    addToast,

    // Seasons management
    seasons = [],
    latestSeasonId = null,
    userDefaultSeasonId = null,
    onSetUserDefaultSeason,
    onAddSeason,
    onUpdateSeason,
    onDeleteSeason,

    // Облачный бэкап
    cloudBackups = [],
    isCreatingBackup = false,
    isLoadingBackups = false,
    isRestoringBackup = false,
    onCreateCloudBackup = async () => null,
    onListCloudBackups = async () => [],
    onRestoreFromCloudBackup = async () => false,
    onDeleteCloudBackup = async () => false,
    onGetCloudBackupDetails = async () => null,
    isDebugMode = false,
    onOpenInactiveModal
}) => {
    // Backup Menu State
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
    const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false);
    const [isSeasonsManagerOpen, setIsSeasonsManagerOpen] = useState(false);
    const [showEfficiencyInfo, setShowEfficiencyInfo] = useState(false);
    const [showEfficiencyBreakdown, setShowEfficiencyBreakdown] = useState(false);
    const [activeNominationModal, setActiveNominationModal] = useState<'mvp' | 'underdog' | 'streak' | 'seriesKills' | 'totalKills' | null>(null);
    const [selectedWeightedPlayer, setSelectedWeightedPlayer] = useState<{ player: PlayerStat; focusType: 'wins' | 'matches' } | null>(null);
    const [expandedPlayerMath, setExpandedPlayerMath] = useState<Record<string, boolean>>({});


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




    const titleClickCount = useRef(0);
    const titleClickTimeout = useRef<NodeJS.Timeout | null>(null);

    // Загрузка списка бэкапов при открытии меню
    useEffect(() => {
        if (isDataMenuOpen && isOnline && !isDebugMode) {
            onListCloudBackups();
        }
    }, [isDataMenuOpen, isOnline, isDebugMode]);

    const handleTitleClick = () => {
        titleClickCount.current += 1;

        if (titleClickTimeout.current) clearTimeout(titleClickTimeout.current);

        if (titleClickCount.current >= 3) {
            setIsDataMenuOpen(true);
            triggerHaptic([10, 50, 10]);
            titleClickCount.current = 0;
            return;
        }

        titleClickTimeout.current = setTimeout(() => {
            titleClickCount.current = 0;
        }, 500);
    };

    // Export/Import Handlers
    const handleExport = () => {
        const data = {
            history,
            deletedHistory,
            seasons
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `randomatched_stats_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDataMenuOpen(false);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const success = onImportData(json);
                if (success) {
                    setIsDataMenuOpen(false);
                }
            } catch (err) {
                console.error('Import error', err);
                alert('Ошибка чтения файла');
            }
        };
        reader.readAsText(file);
    };

    // Visual Sync State Logic
    const [visualSyncState, setVisualSyncState] = useState<'idle' | 'syncing' | 'success'>('idle');

    const syncWithAnimation = async (options?: any) => {
        // Allow auto-sync to trigger animation even if not idle, but prefer idle state management
        // If we are already syncing, we might just let it loop?
        // Actually, we want to visually show it.
        if (visualSyncState !== 'idle' && !options?.force) return;
        if (!isOnline) return;

        setVisualSyncState('syncing');
        const startTime = Date.now();
        let success = false;

        try {
            success = await onSync(options);
        } catch (e) {
            success = false;
        } finally {
            const elapsed = Date.now() - startTime;
            const minDuration = 1000; // Spinner animation duration (approx)
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
    };
    const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'heroes' | 'matches'>('overview');
    const [editMode, setEditMode] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteConfirmAction, setDeleteConfirmAction] = useState<'move-to-trash' | 'permanent' | 'clear-trash'>('move-to-trash');
    const [showTrashOnly, setShowTrashOnly] = useState(false);

    // Detail Views State
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerStat | null>(null);
    const [selectedHero, setSelectedHero] = useState<HeroStat | null>(null);

    // Hero Tab State
    const [heroSearch, setHeroSearch] = useState('');
    const [heroSort, setHeroSort] = useState<'winrate' | 'matches' | 'az' | 'za' | 'pop'>('winrate');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    // Player Tab State
    const [playerSearch, setPlayerSearch] = useState('');
    const [playerSort, setPlayerSort] = useState<'efficiency' | 'winrate' | 'matches' | 'kills' | 'killPercent' | 'az' | 'za'>('efficiency');
    const [isPlayerSortMenuOpen, setIsPlayerSortMenuOpen] = useState(false);
    const [playerDropdownPosition, setPlayerDropdownPosition] = useState<{ top: number, left: number, width: number } | null>(null);

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

    const contentContainerRef = useRef<HTMLDivElement>(null);

    // Swipe Logic
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchStartTime = useRef(0);
    const gestureDirection = useRef<'none' | 'horizontal' | 'vertical'>('none');
    const isIgnoredSwipe = useRef(false);

    // Auto-sync Logic
    // We need a stable reference to syncWithAnimation to use in useEffect
    // But syncWithAnimation depends on state/props, so better to just use the logic or ref it?
    // Actually, syncWithAnimation uses `onSync` and `setVisualSyncState`.
    // Let's rely on standard useEffect deps or a fresh ref.

    // We need to keep a ref to checkConnectivity as well to use in cleanup
    // We need to keep a ref to checkConnectivity as well to use in cleanup
    const checkConnectivityRef = useRef(checkConnectivity);
    const syncWithAnimationRef = useRef(syncWithAnimation);
    const onSyncRef = useRef(onSync);

    useEffect(() => {
        checkConnectivityRef.current = checkConnectivity;
        syncWithAnimationRef.current = syncWithAnimation;
        onSyncRef.current = onSync;
    }, [checkConnectivity, syncWithAnimation, onSync]);



    // Match Form State
    const [matchForm, setMatchForm] = useState<MatchFormState | null>(null);

    // Autocomplete State

    const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number, width: number } | null>(null);


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
            // Always open on the first tab
            setActiveTab('overview');
            setSelectedPlayer(null);
            setSelectedHero(null);
        }
    }, [isOpen]);

    // Сбрасываем подробную статистику и лимит матчей при смене вкладки
    useEffect(() => {
        setSelectedPlayer(null);
        setSelectedHero(null);
        setVisibleMatchesCount(15);
    }, [activeTab]);

    // Сбрасываем лимит матчей при изменении поиска
    useEffect(() => {
        setVisibleMatchesCount(15);
    }, [matchSearch]);

    // Обработчик автоподгрузки матчей при скролле (Infinite Scroll)
    useEffect(() => {
        if (activeTab !== 'matches') return;
        const container = contentContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Если осталось меньше 120 пикселей до низа контейнера, подгружаем еще матчи
            if (container.scrollHeight - container.scrollTop - container.clientHeight < 120) {
                setVisibleMatchesCount(prev => prev + 15);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [activeTab]);

    // Сбрасываем скролл контейнера при смене вкладки или переходе в детали
    useLayoutEffect(() => {
        if (contentContainerRef.current) {
            contentContainerRef.current.scrollTop = 0;
        }
    }, [activeTab, selectedPlayer, selectedHero]);


    // Back Button Logic with useBackHandler
    useBackHandler(!!selectedPlayer, () => {
        setSelectedPlayer(null);
    }, { id: 'player-details-modal', priority: 20 });

    useBackHandler(!!selectedHero, () => {
        setSelectedHero(null);
    }, { id: 'hero-details-modal', priority: 20 });

    useBackHandler(isOpen, () => {
        onClose();
    }, { id: 'stats-modal', priority: 10 });

    // We still need to handle "forward" navigation or state consistency if we rely on history.state.view
    // But since we are moving away from relying on history for logic, we just manage internal state.
    // However, for "Deep Linking" or keeping browser forward button working, we might need more.
    // For now, mirroring old logic's intent: Close details first, then modal.

    // Old effect for synchronizing history state when details open/close?
    // The old logic pushed 'stats-details'.
    // If we use useBackHandler, we intercept the hardware back.
    // So we don't need to listen to popstate manually.

    /* 
    DEPRECATED: Old popstate listener removed.
    */

    const openHeroDetails = (hero: HeroStat) => {
        triggerHaptic(10);
        // window.history.pushState({ view: 'stats-details' }, ''); // Optional: if we want to support browser forward
        setSelectedHero(hero);
    };

    const openPlayerDetails = (player: PlayerStat) => {
        triggerHaptic(10);
        // window.history.pushState({ view: 'stats-details' }, '');
        setSelectedPlayer(player);
    };

    const closeDetails = () => {
        triggerHaptic(10);
        setSelectedPlayer(null);
        setSelectedHero(null);
    };

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
        bloodiestMatch,
        totalKillsAll,
        avgKillsPerMatch,
        mvpCandidates,
        underdogCandidates,
        streakCandidates,
        seriesKillsCandidates,
        totalKillsCandidates
    } = useStatsCalculations(filteredHistory);

    // Filtered & Sorted Players
    const processedPlayers = useMemo(() => {
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
    }, [sortedPlayers, playerSearch, playerSort]);

    // Filtered & Sorted Heroes
    const processedHeroes = useMemo(() => {
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
                // Popularity logic (using total matches across all players vs hero specific matches? For now same as matches but maybe explicitly defined)
                return b.matches - a.matches;
            }
            return 0;
        });

        return result;
    }, [sortedHeroes, heroSearch, heroSort]);

    // Filtered Matches
    const processedMatches = useMemo(() => {
        if (!matchSearch.trim()) return filteredHistory;
        const lower = matchSearch.toLowerCase().trim();
        return filteredHistory.filter(m => {
            // Search in Player Names
            const pNames = [...m.team1, ...m.team2].map(p => p.name.toLowerCase());
            if (pNames.some(n => n.includes(lower))) return true;

            // Search in Hero Names
            const hNames = [...m.team1, ...m.team2].map(p => p.heroName.toLowerCase());
            if (hNames.some(n => n.includes(lower))) return true;

            // Search by Date (if user types "2023" or "12.05")
            const dateStr = new Date(m.timestamp).toLocaleDateString();
            if (dateStr.includes(lower)) return true;

            return false;
        });
    }, [filteredHistory, matchSearch]);

    // Matches slice for pagination/lazy loading
    const matchesToShow = useMemo(() => {
        return processedMatches.slice(0, visibleMatchesCount);
    }, [processedMatches, visibleMatchesCount]);

    const hasMoreMatches = processedMatches.length > visibleMatchesCount;

    // Group matches by day (shifting by 6 hours for gaming evening)
    const groupedMatches = useMemo(() => {
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
    }, [matchesToShow]);





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
        // Correct timezone offset adjustment for input value
        const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
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



    const renderHeroWithKills = (player: MatchPlayer): string => {
        if (player.kills !== undefined && player.kills !== null) {
            return `${player.heroName} (${player.kills} 💀)`;
        }
        return player.heroName;
    };



    const confirmDeleteMatch = () => {
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

        // Reset touch state on tab switch to prevent leaks
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

            // Determine gesture direction once movement exceeds deadzone threshold
            if (gestureDirection.current === 'none') {
                const DEADZONE = 10;
                if (absX < DEADZONE && absY < DEADZONE) {
                    return;
                }
                // If vertical movement dominates or is equal, lock to vertical scrolling immediately
                if (absY >= absX) {
                    gestureDirection.current = 'vertical';
                    isIgnoredSwipe.current = true;
                    return;
                }
                // If horizontal movement clearly dominates, lock to horizontal swipe
                if (absX > absY * 1.5) {
                    gestureDirection.current = 'horizontal';
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                } else {
                    // Diagonal movement - treat as scroll to avoid accidental tab changes
                    gestureDirection.current = 'vertical';
                    isIgnoredSwipe.current = true;
                    return;
                }
            } else if (gestureDirection.current === 'horizontal') {
                // Keep preventing vertical scroll while swiping tabs horizontally
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

            // Reset touch coordinates
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





    // Portal for Autocomplete Dropdown


    // Match Form Overlay
    const matchFormOverlay = matchForm ? (
        <MatchEditorForm
            matchForm={matchForm}
            setMatchForm={setMatchForm}
            closeMatchForm={closeMatchForm}
            allHeroesList={allHeroesList}
            uniquePlayerNames={uniquePlayerNames}
            onAddMatch={onAddMatch}
            onUpdateMatch={onUpdateMatch}
            triggerHaptic={triggerHaptic}
        />
    ) : null;

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



            {/* Backup Viewer Modal - Removed here as it's inside CloudBackupManager, OR kept if needed for other flows? 
                Actually CloudBackupManager handles it internally now.
                But wait, does StatsModal need it for anything else? No.
            */}

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

            <div
                data-testid="stats-modal"
                className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-50 dark:bg-slate-950 bg-grid-pattern transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                onClick={onClose}
            >
                <div
                    className={`bg-transparent w-full h-full flex flex-col overflow-hidden transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div 
                        className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0 bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl z-10 sticky top-0 touch-manipulation"
                        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
                    >
                        <h2
                            className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 select-none active:scale-95 transition-transform"
                            data-testid="stats-title"
                            onClick={handleTitleClick}
                        >
                            <Trophy size={20} className="text-yellow-500" /> Статистика
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
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
                            <button
                                onClick={onClose}
                                data-testid="stats-close-btn"
                                aria-label="Закрыть"
                                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-white active:scale-95 active:bg-slate-200 dark:active:bg-slate-700 transition-all backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-xs"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex border-b border-slate-200/40 dark:border-slate-800/40 shrink-0 overflow-x-auto overscroll-contain no-scrollbar bg-white/30 dark:bg-slate-950/30 backdrop-blur-xl touch-manipulation">
                        {['overview', 'players', 'heroes', 'matches'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => {
                                    if (activeTab === tab) return;
                                    setActiveTab(tab as any);
                                    // Ensure detailed views are closed when switching tabs
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
                    <div className="flex items-center justify-between gap-1.5 px-3 py-2 bg-white/20 dark:bg-slate-950/20 backdrop-blur-xl z-10 border-b border-slate-200/40 dark:border-slate-800/40 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
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
                                            onClick={() => { currentSearchState.onChange(''); triggerHaptic(10); searchInputRef.current?.focus(); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-600 dark:active:text-slate-200 p-1"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                <button
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleResetDateFilter();
                                                    triggerHaptic(10);
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
                                                onClick={() => { setIsSearchExpanded(true); triggerHaptic(10); }}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md text-slate-500 dark:text-slate-400 active:scale-95 transition-all shrink-0"
                                                aria-label="Поиск"
                                            >
                                                <Search size={16} />
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1 h-9 px-2 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/60 rounded-xl text-xs font-bold text-primary-600 dark:text-primary-400 flex-1 min-w-0">
                                                <button
                                                    onClick={() => { setIsSearchExpanded(true); triggerHaptic(10); }}
                                                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left truncate"
                                                    aria-label="Редактировать поиск"
                                                >
                                                    <Search size={13} className="shrink-0 text-primary-500" />
                                                    <span className="truncate flex-1">{currentSearchState.value}</span>
                                                </button>
                                                <button
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
                                                    onClick={openAddMatch}
                                                    className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 active:scale-95 transition-transform"
                                                    aria-label="Добавить матч"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { setEditMode(!editMode); setShowTrashOnly(false); triggerHaptic(10); }}
                                                className={`w-9 h-9 rounded-xl border transition-colors flex items-center justify-center ${editMode ? 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                                                aria-label={editMode ? 'Готово' : 'Редактировать'}
                                            >
                                                {editMode ? <Check size={16} /> : <Edit2 size={16} />}
                                            </button>
                                        </>
                                    )}

                                    {activeTab === 'heroes' && !selectedHero && (
                                        <div className="relative shrink-0">
                                            <button
                                                ref={(el) => {
                                                    if (el && isSortMenuOpen && !dropdownPosition) {
                                                        const rect = el.getBoundingClientRect();
                                                        setDropdownPosition({
                                                            top: rect.bottom + 8,
                                                            left: rect.right - 192,
                                                            width: 192
                                                        });
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    if (!isSortMenuOpen) {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setDropdownPosition({
                                                            top: rect.bottom + 8,
                                                            left: rect.right - 192,
                                                            width: 192
                                                        });
                                                    }
                                                    setIsSortMenuOpen(!isSortMenuOpen);
                                                    triggerHaptic(10);
                                                }}
                                                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${isSortMenuOpen ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                                                aria-label="Сортировка"
                                            >
                                                {heroSort === 'winrate' && <TrendingUp size={16} />}
                                                {heroSort === 'matches' && <BarChart3 size={16} />}
                                                {heroSort === 'az' && <ArrowDownAZ size={16} />}
                                                {heroSort === 'za' && <ArrowUpAZ size={16} />}
                                                {heroSort === 'pop' && <BarChart3 size={16} />}
                                            </button>

                                            {/* Sort Dropdown Portal */}
                                            {isSortMenuOpen && dropdownPosition && createPortal(
                                                <>
                                                    <div className="fixed inset-0 z-[9990]" onClick={() => setIsSortMenuOpen(false)}></div>
                                                    <div
                                                        className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-100"
                                                        style={{
                                                            top: dropdownPosition.top,
                                                            left: dropdownPosition.left,
                                                            width: dropdownPosition.width
                                                        }}
                                                    >
                                                        <button onClick={() => { setHeroSort('winrate'); setIsSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${heroSort === 'winrate' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><TrendingUp size={14} /> По винрейту</span>
                                                            {heroSort === 'winrate' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setHeroSort('matches'); setIsSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${heroSort === 'matches' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><BarChart3 size={14} /> По популярности</span>
                                                            {heroSort === 'matches' && <Check size={14} />}
                                                        </button>
                                                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-0"></div>
                                                        <button onClick={() => { setHeroSort('az'); setIsSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${heroSort === 'az' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><ArrowDownAZ size={14} /> По алфавиту (А-Я)</span>
                                                            {heroSort === 'az' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setHeroSort('za'); setIsSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${heroSort === 'za' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><ArrowUpAZ size={14} /> По алфавиту (Я-А)</span>
                                                            {heroSort === 'za' && <Check size={14} />}
                                                        </button>
                                                    </div>
                                                </>,
                                                document.body
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'players' && !selectedPlayer && (
                                        <div className="relative shrink-0">
                                            <button
                                                ref={(el) => {
                                                    if (el && isPlayerSortMenuOpen && !playerDropdownPosition) {
                                                        const rect = el.getBoundingClientRect();
                                                        setPlayerDropdownPosition({
                                                            top: rect.bottom + 8,
                                                            left: rect.right - 192,
                                                            width: 192
                                                        });
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    if (!isPlayerSortMenuOpen) {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setPlayerDropdownPosition({
                                                            top: rect.bottom + 8,
                                                            left: rect.right - 192,
                                                            width: 192
                                                        });
                                                    }
                                                    setIsPlayerSortMenuOpen(!isPlayerSortMenuOpen);
                                                    triggerHaptic(10);
                                                }}
                                                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${isPlayerSortMenuOpen ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                                                aria-label="Сортировка"
                                            >
                                                {playerSort === 'efficiency' && <TrendingUp size={16} />}
                                                {playerSort === 'winrate' && <TrendingUp size={16} />}
                                                {playerSort === 'matches' && <BarChart3 size={16} />}
                                                {playerSort === 'kills' && <Skull size={16} />}
                                                {playerSort === 'killPercent' && <Percent size={16} />}
                                                {playerSort === 'az' && <ArrowDownAZ size={16} />}
                                                {playerSort === 'za' && <ArrowUpAZ size={16} />}
                                            </button>

                                            {/* Player Sort Dropdown Portal */}
                                            {isPlayerSortMenuOpen && playerDropdownPosition && createPortal(
                                                <>
                                                    <div className="fixed inset-0 z-[9990]" onClick={() => setIsPlayerSortMenuOpen(false)}></div>
                                                    <div
                                                        className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-100"
                                                        style={{
                                                            top: playerDropdownPosition.top,
                                                            left: playerDropdownPosition.left,
                                                            width: playerDropdownPosition.width
                                                        }}
                                                    >
                                                        <button onClick={() => { setPlayerSort('efficiency'); setIsPlayerSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${playerSort === 'efficiency' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><TrendingUp size={14} /> По эффективности</span>
                                                            {playerSort === 'efficiency' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setPlayerSort('winrate'); setIsPlayerSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${playerSort === 'winrate' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><TrendingUp size={14} /> По винрейту</span>
                                                            {playerSort === 'winrate' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setPlayerSort('matches'); setIsPlayerSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${playerSort === 'matches' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><BarChart3 size={14} /> По популярности</span>
                                                            {playerSort === 'matches' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setPlayerSort('kills'); setIsPlayerSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${playerSort === 'kills' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><Skull size={14} /> По убийствам</span>
                                                            {playerSort === 'kills' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setPlayerSort('killPercent'); setIsPlayerSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${playerSort === 'killPercent' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><Percent size={14} /> По % убийств</span>
                                                            {playerSort === 'killPercent' && <Check size={14} />}
                                                        </button>
                                                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-0"></div>
                                                        <button onClick={() => { setPlayerSort('az'); setIsPlayerSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${playerSort === 'az' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><ArrowDownAZ size={14} /> По алфавиту (А-Я)</span>
                                                            {playerSort === 'az' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setPlayerSort('za'); setIsPlayerSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${playerSort === 'za' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><ArrowUpAZ size={14} /> По алфавиту (Я-А)</span>
                                                            {playerSort === 'za' && <Check size={14} />}
                                                        </button>
                                                    </div>
                                                </>,
                                                document.body
                                            )}
                                        </div>
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

                    <div
                        ref={contentContainerRef}
                        className="overflow-y-auto flex-1 no-scrollbar touch-pan-y p-0"
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
                                selectedPlayer={selectedPlayer}
                                setSelectedPlayer={setSelectedPlayer}
                                filteredHistory={filteredHistory}
                                onRenamePlayer={onRenamePlayer}
                                streakStats={streakStats}
                                mvp={mvp}
                                underdog={underdog}
                                topTotalKillers={topTotalKillers}
                                playerSort={playerSort}
                                openPlayerDetails={(player) => {
                                    triggerHaptic(10);
                                    setSelectedPlayer(player);
                                }}
                                closeDetails={() => setSelectedPlayer(null)}
                                handleTitleClick={handleTitleClick}
                                onOpenEfficiencyBreakdown={() => { setShowEfficiencyBreakdown(true); triggerHaptic(10); }}
                            />
                        )}

                        {activeTab === 'heroes' && (
                            <StatsHeroesTab
                                processedHeroes={processedHeroes}
                                selectedHero={selectedHero}
                                setSelectedHero={setSelectedHero}
                                filteredHistory={filteredHistory}
                                onRenameHero={onRenameHero}
                                heroSort={heroSort}
                                openHeroDetails={openHeroDetails}
                                closeDetails={() => setSelectedHero(null)}
                                topWinrateHero={topWinrateHero}
                                mostPopularHero={mostPopularHero}
                                mostDeadlyHero={mostDeadlyHero}
                                onOpenInactiveModal={onOpenInactiveModal}
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
                                onRestoreMatch={onRestoreMatch}
                                triggerHaptic={triggerHaptic}
                            />
                        )}
                    </div>

                    {/* Delete Confirmation Modal */}
                    <ConfirmModal
                        isOpen={!!deleteConfirmId}
                        onCancel={() => setDeleteConfirmId(null)}
                        onConfirm={confirmDeleteMatch}
                        title={
                            deleteConfirmAction === 'clear-trash' ? 'Очистить корзину?' :
                                deleteConfirmAction === 'permanent' ? 'Удалить навсегда?' : 'Удалить матч?'
                        }
                        description={
                            deleteConfirmAction === 'move-to-trash' ? 'Матч будет перемещен в корзину.' : 'Это действие нельзя отменить.'
                        }
                        confirmText={deleteConfirmAction === 'move-to-trash' ? 'В корзину' : 'Удалить'}
                        cancelText="Отмена"
                        confirmVariant="danger"
                        icon={<Trash2 size={24} />}
                        priority={80}
                        modalId="stats-delete-confirm-modal"
                    />

                </div>
            </div>

            {/* Efficiency Info Overlay */}
            <BaseModal
                isOpen={showEfficiencyInfo}
                onClose={() => setShowEfficiencyInfo(false)}
                title="Алгоритм эффективности"
                subtitle="Ранжирование игроков в статистике"
                icon={<TrendingUp size={20} className="text-primary-500" />}
                maxWidth="md"
                variant="auto"
                modalId="stats-efficiency-modal"
                priority={80}
                showCloseButton={false}
                footer={(close) => (
                    <button
                        onClick={() => { close(); triggerHaptic(10); }}
                        className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-primary-500/20 active:scale-95 min-h-[48px]"
                    >
                        Понятно
                    </button>
                )}
            >
                <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                    {/* Главная идея */}
                    <div className="p-3.5 bg-primary-50/80 dark:bg-primary-950/50 rounded-2xl border border-primary-100 dark:border-primary-900/30">
                        <div className="font-bold text-primary-900 dark:text-primary-300 mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
                            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                            <span>Зачем необходим данный расчёт?</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            Простой процент побед обманчив. Игрок с <strong>3 победами из 4 матчей (75%)</strong> ещё не доказал стабильность. Алгоритм вычисляет <strong>минимальный гарантированный винрейт</strong> с учётом дистанции и давности игр.
                        </div>
                    </div>

                    {/* Наглядное сравнение */}
                    <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/90 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Почему этот расчёт справедлив?</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            Сравнение результатов игроков на разной дистанции:
                        </p>

                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-[11px]">
                                <div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">2 победы / 10 матчей</span>
                                    <span className="text-[10px] text-slate-400 ml-1">(20% винрейт)</span>
                                </div>
                                <div className="font-bold text-slate-500">
                                    Эффективность: <span className="font-mono text-red-500">6.0%</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 rounded-xl text-[11px]">
                                <div>
                                    <span className="font-semibold text-emerald-900 dark:text-emerald-300">39 побед / 95 матчей</span>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">(41% винрейт)</span>
                                </div>
                                <div className="font-bold text-emerald-700 dark:text-emerald-400">
                                    Эффективность: <span className="font-mono text-emerald-900 dark:text-emerald-200">31.6%</span> 🏆
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-primary-50/80 dark:bg-primary-950/40 border border-primary-200/70 dark:border-primary-800/50 rounded-xl text-[11px]">
                                <div>
                                    <span className="font-semibold text-primary-900 dark:text-primary-300">3 победы / 4 матча</span>
                                    <span className="text-[10px] text-primary-600 dark:text-primary-400 ml-1">(75% винрейт)</span>
                                </div>
                                <div className="font-mono font-bold text-primary-700 dark:text-primary-400">
                                    Эффективность: <span className="text-primary-900 dark:text-primary-200">30.1%</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-1">
                            * Игрок с 39/95 по праву стоит выше игрока с 3/4 на малой дистанции, так как подкрепил результат 95 играми.
                        </p>
                    </div>

                    {/* Учёт времени */}
                    <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>Учёт давности игр и активность</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-0.5 leading-relaxed">
                            <li>Свежие победы ценнее: вес матча уменьшается в 2 раза каждые 6 месяцев.</li>
                            <li>Игроки без активных матчей более 60 дней автоматически опускаются в конец списка.</li>
                        </ul>
                    </div>
                </div>
            </BaseModal>

            {/* Nomination Modal Overlay */}
            <BaseModal
                isOpen={!!activeNominationModal}
                onClose={() => setActiveNominationModal(null)}
                title={
                    activeNominationModal === 'mvp' ? 'Самый ценный игрок (MVP)' :
                    activeNominationModal === 'underdog' ? 'Андердог (Underdog)' :
                    activeNominationModal === 'streak' ? 'В огне (Серия побед)' :
                    activeNominationModal === 'seriesKills' ? 'Рекорд за встречу' :
                    'Король убийств'
                }
                icon={
                    activeNominationModal === 'mvp' ? <Star size={20} fill="currentColor" className="text-yellow-500" /> :
                    activeNominationModal === 'underdog' ? <Skull size={20} className="text-red-500" /> :
                    activeNominationModal === 'streak' ? <Flame size={20} className="text-orange-500" /> :
                    activeNominationModal === 'seriesKills' ? <Swords size={20} className="text-rose-500" /> :
                    <Crown size={20} className="text-yellow-600 dark:text-yellow-500" />
                }
                maxWidth="md"
                variant="auto"
                modalId="nomination-modal"
                priority={80}
                showCloseButton={false}
                footer={(close) => (
                    <button
                        onClick={() => { close(); triggerHaptic(10); }}
                        className={`w-full py-3.5 text-white font-bold text-sm sm:text-base rounded-2xl transition-all shadow-lg active:scale-95 min-h-[48px] ${
                            activeNominationModal === 'mvp' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' :
                            activeNominationModal === 'underdog' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' :
                            activeNominationModal === 'streak' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' :
                            activeNominationModal === 'seriesKills' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' :
                            'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                        }`}
                    >
                        Понятно
                    </button>
                )}
            >
                <div className="space-y-4 text-sm">
                    <p className="text-slate-650 dark:text-slate-400 leading-relaxed">
                        {activeNominationModal === 'mvp' &&
                            'MVP — это наиболее эффективный игрок, определяемый на основе метода Уилсона (Wilson Score Interval). Данный метод рассчитывает нижнюю границу рейтинга с 95% надежностью, учитывая винрейт, количество матчей и затухание по времени.'
                        }
                        {activeNominationModal === 'underdog' &&
                            'Underdog — номинация для игрока, который переживает полосу неудач или имеет наименьшую эффективность. В первую очередь номинируется игрок с наибольшей активной серией поражений (от 3-х матчей). Если таких серий нет, номинируется игрок с худшим винрейтом (требуется минимум 3 матча).'
                        }
                        {activeNominationModal === 'streak' &&
                            'В огне — это игрок с лучшей активной серией побед на данный момент (требуется минимум 3 победы подряд). При равенстве серий приоритет отдается тому, кто сыграл свой победный матч позже остальных.'
                        }
                        {activeNominationModal === 'seriesKills' &&
                            'Рекорд за встречу — это наибольшее количество убийств, совершенное игроком за одну игровую сессию. Сессией считается череда матчей с интервалом между ними не более 6 часов.'
                        }
                        {activeNominationModal === 'totalKills' &&
                            'Король убийств — это игрок, совершивший наибольшее суммарное количество убийств за все матчи в выбранном периоде времени.'
                        }
                    </p>

                    {/* Список кандидатов */}
                    <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {activeNominationModal === 'underdog' ? 'Очередь кандидатов (Underdog внизу)' : 'Претенденты на номинацию'}
                        </h4>

                        {activeNominationModal === 'mvp' && (
                            <div className="space-y-2">
                                {mvpCandidates.map((player, idx) => {
                                    const isHighlighted = mvp?.name === player.name;
                                    return (
                                        <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-yellow-500/10 border-yellow-500/30 dark:border-yellow-500/20 text-yellow-950 dark:text-yellow-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-yellow-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{idx + 1}</span>
                                                <span className="truncate">{player.name}</span>
                                            </div>
                                            <div className="text-xs">
                                                <span>{Math.round((player.wins / player.matches) * 100)}% </span>
                                                <span className="text-[10px] opacity-60">({player.wins}/{player.matches} игр)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {mvpCandidates.length === 0 && (
                                    <div className="text-xs text-slate-400 italic text-center py-2">Нет подходящих игроков</div>
                                )}
                            </div>
                        )}

                        {activeNominationModal === 'underdog' && (
                            <div className="space-y-2">
                                {(() => {
                                    const reversedList = [...underdogCandidates].reverse();
                                    return reversedList.map((player, idx) => {
                                        const originalIndex = underdogCandidates.findIndex(p => p.name === player.name);
                                        const place = originalIndex !== -1 ? originalIndex + 1 : underdogCandidates.length - idx;
                                        const isHighlighted = underdog?.name === player.name;
                                        const loseStreak = streakStats[player.name]?.loseStreak || 0;
                                        const subText = loseStreak >= 3
                                            ? `${loseStreak} поражений подряд`
                                            : `${Math.round((player.wins / player.matches) * 100)}% винрейт (${player.wins}/${player.matches} игр)`;

                                        return (
                                            <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-red-500/10 border-red-500/30 dark:border-red-500/20 text-red-955 dark:text-red-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{place}</span>
                                                    <span className="truncate">{player.name}</span>
                                                </div>
                                                <span className="text-xs opacity-80">{subText}</span>
                                            </div>
                                        );
                                    });
                                })()}
                                {underdogCandidates.length === 0 && (
                                    <div className="text-xs text-slate-400 italic text-center py-2">Нет подходящих игроков</div>
                                )}
                            </div>
                        )}

                        {activeNominationModal === 'streak' && (
                            <div className="space-y-2">
                                {streakCandidates.map((player, idx) => {
                                    const isHighlighted = bestStreakPlayer?.name === player.name;
                                    return (
                                        <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-orange-500/10 border-orange-500/30 dark:border-orange-500/20 text-orange-950 dark:text-orange-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{idx + 1}</span>
                                                <span className="truncate">{player.name}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{player.streak} побед подряд</span>
                                        </div>
                                    );
                                })}
                                {streakCandidates.length === 0 && (
                                    <div className="text-xs text-slate-400 italic text-center py-2">Нет игроков с активной серией побед &gt;= 3</div>
                                )}
                            </div>
                        )}

                        {activeNominationModal === 'seriesKills' && (
                            <div className="space-y-2">
                                {seriesKillsCandidates.map((player, idx) => {
                                    const isHighlighted = topKillsSeriesPlayer?.name === player.name;
                                    return (
                                        <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-rose-500/10 border-rose-500/30 dark:border-rose-500/20 text-rose-955 dark:text-rose-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{idx + 1}</span>
                                                <span className="truncate">{player.name}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{player.record} 💀 за серию</span>
                                        </div>
                                    );
                                })}
                                {seriesKillsCandidates.length === 0 && (
                                    <div className="text-xs text-slate-400 italic text-center py-2">Нет подходящих данных</div>
                                )}
                            </div>
                        )}

                        {activeNominationModal === 'totalKills' && (
                            <div className="space-y-2">
                                {totalKillsCandidates.map((player, idx) => {
                                    const isHighlighted = topTotalKillers[0]?.name === player.name;
                                    return (
                                        <div key={player.name} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isHighlighted ? 'bg-red-500/10 border-red-500/30 dark:border-red-500/20 text-red-955 dark:text-red-300 font-bold' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-350'}`}>
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isHighlighted ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{idx + 1}</span>
                                                <span className="truncate">{player.name}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">Всего: {player.total} 💀</span>
                                        </div>
                                    );
                                })}
                                {totalKillsCandidates.length === 0 && (
                                    <div className="text-xs text-slate-400 italic text-center py-2">Нет подходящих данных</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </BaseModal>

            {/* Efficiency Breakdown Modal */}
            <BaseModal
                isOpen={showEfficiencyBreakdown}
                onClose={() => setShowEfficiencyBreakdown(false)}
                title="Расшифровка эффективности"
                subtitle="Подробный расчёт рейтинга игроков"
                icon={<TrendingUp size={20} className="text-primary-500" />}
                maxWidth="md"
                variant="auto"
                modalId="stats-efficiency-breakdown-modal"
                priority={80}
                showCloseButton={false}
                footer={(close) => (
                    <button
                        onClick={() => { close(); triggerHaptic(10); }}
                        className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-primary-500/20 active:scale-95 min-h-[48px]"
                    >
                        Понятно
                    </button>
                )}
            >
                <div className="space-y-3">
                    {/* Visual Summary Header */}
                    <div className="p-3.5 bg-gradient-to-br from-primary-50/80 via-slate-50 to-emerald-50/60 dark:from-primary-950/30 dark:via-slate-800/80 dark:to-emerald-950/20 rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-2.5 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={14} className="text-primary-500" />
                                <span>Как рассчитывается рейтинг?</span>
                            </div>
                            <button
                                type="button"
                                data-testid="stats-efficiency-info-btn"
                                onClick={() => {
                                    setShowEfficiencyInfo(true);
                                    triggerHaptic(10);
                                }}
                                className="px-2.5 py-1 text-[11px] font-extrabold rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/20 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                            >
                                <HelpCircle size={12} />
                                <span>Инфо</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                            <div className="p-1.5 bg-white/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-center">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">1. Факты</span>
                                <span className="text-slate-400">Победы / игры</span>
                            </div>
                            <div className="p-1.5 bg-emerald-100/70 dark:bg-emerald-950/60 rounded-xl border-2 border-emerald-400/80 dark:border-emerald-500/70 shadow-sm flex flex-col justify-center">
                                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-0.5">
                                    2. Свежесть
                                </span>
                                <span className="text-emerald-700/90 dark:text-emerald-300/90 font-extrabold text-[9px]">Нажмите ниже 👇</span>
                            </div>
                            <div className="p-1.5 bg-primary-50/80 dark:bg-primary-950/40 rounded-xl border border-primary-200/50 dark:border-primary-800/40 flex flex-col justify-center">
                                <span className="font-bold text-primary-700 dark:text-primary-400 block">3. Рейтинг</span>
                                <span className="text-primary-600/80 dark:text-primary-400/80">Защита от случая</span>
                            </div>
                        </div>
                    </div>

                    {sortedPlayers.map((player, idx) => {
                        const rawWinrateNum = player.matches > 0 ? (player.wins / player.matches) * 100 : 0;
                        const rawWinrateFormatted = rawWinrateNum.toFixed(1);
                        const effScoreNum = player.score * 100;
                        const effScoreFormatted = effScoreNum.toFixed(1);

                        const wWins = player.weightedWins ?? player.wins;
                        const wMatches = player.weightedMatches ?? player.matches;
                        const weightedWinrateNum = wMatches > 0 ? (wWins / wMatches) * 100 : 0;
                        const weightedWinrateFormatted = weightedWinrateNum.toFixed(1);

                        const decayDiff = Number((weightedWinrateNum - rawWinrateNum).toFixed(1));
                        const wilsonDiff = Number((effScoreNum - weightedWinrateNum).toFixed(1));

                        const isMathExpanded = !!expandedPlayerMath[player.name];

                        return (
                            <div key={player.name} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 space-y-3 transition-all shadow-md dark:shadow-slate-950/50 shadow-slate-200/60 ring-1 ring-black/5 dark:ring-white/5">
                                {/* Player Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-bold text-slate-400 shrink-0">#{idx + 1}</span>
                                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{player.name}</span>
                                        {player.isInactive && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-md shrink-0">
                                                Неактивен
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-base font-black text-primary-600 dark:text-primary-400">{effScoreFormatted}%</span>
                                        <span className="text-[9px] text-slate-400 block leading-none font-semibold uppercase tracking-wider">Рейтинг</span>
                                    </div>
                                </div>

                                {/* Visual 3-Step Chain */}
                                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-0.5">
                                        <span>Воронка расчёта</span>
                                        <span className="text-slate-400 font-normal normal-case">3 шага к рейтингу</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1.5 text-center items-stretch">
                                        {/* Step 1: Raw */}
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex flex-col items-center justify-between min-h-[60px]">
                                            <span className="text-[9px] text-slate-400 font-medium">1. Факты</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 my-0.5">{rawWinrateFormatted}%</span>
                                            <span className="text-[9px] text-slate-400">{player.wins}/{player.matches} игр</span>
                                        </div>

                                        {/* Step 2: Weighted */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedWeightedPlayer({ player, focusType: 'wins' });
                                                triggerHaptic(10);
                                            }}
                                            className="bg-gradient-to-b from-emerald-50 to-emerald-100/80 dark:from-emerald-950/70 dark:to-emerald-900/50 hover:from-emerald-100 hover:to-emerald-200/80 dark:hover:from-emerald-900/80 dark:hover:to-emerald-800/60 p-1.5 rounded-xl border-2 border-emerald-400/80 dark:border-emerald-500/70 shadow-sm shadow-emerald-500/10 flex flex-col items-center justify-between min-h-[60px] cursor-pointer active:scale-95 transition-all group relative overflow-hidden"
                                            title="Нажмите для подробного расчёта весов по периодам"
                                        >
                                            <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold">2. Свежесть</span>
                                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 my-0.5">{weightedWinrateFormatted}%</span>
                                            <div className="w-full text-[8px] font-extrabold uppercase px-1 py-0.5 bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 rounded flex items-center justify-center gap-0.5 group-hover:bg-emerald-700 transition-colors">
                                                <span>Детали</span>
                                                <ChevronRight size={9} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </button>

                                        {/* Step 3: Wilson */}
                                        <div className="bg-primary-50 dark:bg-primary-950/40 p-2 rounded-xl border border-primary-200/60 dark:border-primary-800/50 flex flex-col items-center justify-between min-h-[60px]">
                                            <span className="text-[9px] text-primary-700 dark:text-primary-400 font-medium">3. Рейтинг</span>
                                            <span className="text-xs font-black text-primary-600 dark:text-primary-400 my-0.5">{effScoreFormatted}%</span>
                                            <span className="text-[9px] text-primary-600/80 dark:text-primary-400/80">Уилсон (80%)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Explanation items */}
                                <div className="space-y-1.5 text-[11px]">
                                    <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 leading-snug">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                                            ⏱️ Влияние давности: <span className={decayDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>{decayDiff > 0 ? `+${decayDiff}%` : `${decayDiff}%`}</span>
                                        </span>
                                        {decayDiff < 0
                                            ? `В давних матчах винрейт был выше. С учетом полураспада весов за 6 месяцев недавний винрейт составляет ${weightedWinrateFormatted}%.`
                                            : decayDiff > 0
                                            ? `В недавних матчах игрок выигрывает чаще! Свежие победы поднимают взвешенный винрейт до ${weightedWinrateFormatted}%.`
                                            : `Свежие и старые матчи показывают одинаковую результативность (${weightedWinrateFormatted}%).`}
                                    </div>

                                    <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 leading-snug">
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                                            🛡️ Поправка на объём выборки (Уилсон): <span className="text-slate-500 font-bold">{wilsonDiff > 0 ? `+${wilsonDiff}%` : `${wilsonDiff}%`}</span>
                                        </span>
                                        Защита от случайностей. Для дистанции в {wMatches} взвеш. игр алгоритм гарантирует 80% надежность с результатом не ниже <strong>{effScoreFormatted}%</strong>.
                                    </div>
                                </div>

                                {/* Math toggle */}
                                <div className="pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setExpandedPlayerMath(prev => ({ ...prev, [player.name]: !prev[player.name] }));
                                            triggerHaptic(10);
                                        }}
                                        className="text-[10px] font-semibold text-slate-400 hover:text-primary-500 flex items-center gap-1 transition-colors active:scale-95"
                                    >
                                        <Calculator size={11} />
                                        <span>{isMathExpanded ? 'Скрыть параметры Уилсона' : 'Параметры Уилсона (для гиков)'}</span>
                                        <ChevronDown size={11} className={`transition-transform duration-200 ${isMathExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                        {isMathExpanded && (
                                            <div className="mt-2 p-2.5 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono space-y-1 overflow-x-auto">
                                                <div className="text-slate-400">// 1. Переменные для подстановки в формулу</div>
                                                <div>p (взвеш. винрейт в долях) = {wWins} / {wMatches} = {(weightedWinrateNum / 100).toFixed(4)}</div>
                                                <div>N (взвеш. объём игр) = {wMatches}</div>
                                                <div>z (константа 80% доверия) = 1.28</div>
                                                <div className="text-slate-400 pt-1">// 2. Формула нижней границы Уилсона</div>
                                                <div className="text-slate-300">Score = (p + z²/2N - z*√(p(1-p)/N + z²/4N²)) / (1 + z²/N)</div>
                                                <div className="text-emerald-400 font-bold pt-0.5">Score = {player.score.toFixed(4)} (в долях 0..1) ➔ {effScoreFormatted}%</div>
                                            </div>
                                        )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </BaseModal>

            {/* Weighted Player Details Modal Sheet */}
            <BaseModal
                isOpen={!!selectedWeightedPlayer}
                onClose={() => setSelectedWeightedPlayer(null)}
                title={selectedWeightedPlayer?.player.name}
                subtitle="Подробный расчёт статистики эффективности"
                icon={<TrendingUp size={20} className="text-emerald-500" />}
                maxWidth="lg"
                variant="auto"
                modalId="weighted-player-modal"
                priority={90}
            >
                {selectedWeightedPlayer && (() => {
                    const breakdown = getPlayerWeightedBreakdown(selectedWeightedPlayer.player.name, filteredHistory);
                    const rawWinrateNum = breakdown.totalMatches > 0 ? (breakdown.totalWins / breakdown.totalMatches) * 100 : 0;
                    const rawWinrateFormatted = rawWinrateNum.toFixed(1);
                    const weightedWinrateNum = breakdown.totalWeightedMatches > 0 ? (breakdown.totalWeightedWins / breakdown.totalWeightedMatches) * 100 : 0;
                    const weightedWinrateFormatted = weightedWinrateNum.toFixed(1);
                    const effScoreFormatted = (selectedWeightedPlayer.player.score * 100).toFixed(1);

                    return (
                        <div className="space-y-4">
                            {/* 3-Step Summary Banner */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                                    Воронка расчёта рейтинга
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                                        <div className="text-[9px] text-slate-400 font-medium">1. Фактический</div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{rawWinrateFormatted}%</div>
                                        <div className="text-[9px] text-slate-400">{breakdown.totalWins}/{breakdown.totalMatches} игр</div>
                                    </div>
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50">
                                        <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-medium">2. Взвешенный</div>
                                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{weightedWinrateFormatted}%</div>
                                        <div className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80">{breakdown.totalWeightedWins}/{breakdown.totalWeightedMatches}</div>
                                    </div>
                                    <div className="p-2 bg-primary-50 dark:bg-primary-950/40 rounded-xl border border-primary-200/60 dark:border-primary-800/50">
                                        <div className="text-[9px] text-primary-700 dark:text-primary-400 font-medium">3. Рейтинг</div>
                                        <div className="text-xs font-black text-primary-600 dark:text-primary-400 mt-0.5">{effScoreFormatted}%</div>
                                        <div className="text-[9px] text-primary-600/80 dark:text-primary-400/80">Уилсон (80%)</div>
                                    </div>
                                </div>
                            </div>

                            {/* KPI Summary Cards */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className={`p-3 rounded-2xl border transition-colors ${selectedWeightedPlayer.focusType === 'matches' ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700' : 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50'}`}>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">Матчи (Факт ➔ Взвешенные)</div>
                                    <div className="text-base font-black text-slate-900 dark:text-white flex items-baseline gap-1 mt-0.5">
                                        <span>{breakdown.totalMatches} игр</span>
                                        <span className="text-xs font-normal text-slate-400">➔</span>
                                        <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{breakdown.totalWeightedMatches}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        Ср. вес игры: <span className="font-semibold text-slate-700 dark:text-slate-300">{breakdown.totalMatches > 0 ? Math.round((breakdown.totalWeightedMatches / breakdown.totalMatches) * 100) : 0}%</span>
                                    </div>
                                </div>

                                <div className={`p-3 rounded-2xl border transition-colors ${selectedWeightedPlayer.focusType === 'wins' ? 'bg-emerald-100/70 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600' : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30'}`}>
                                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Победы (Факт ➔ Взвешенные)</div>
                                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1 mt-0.5">
                                        <span>{breakdown.totalWins} побед</span>
                                        <span className="text-xs font-normal opacity-60">➔</span>
                                        <span className="text-sm font-bold">{breakdown.totalWeightedWins}</span>
                                    </div>
                                    <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                                        Винрейт: <span className="font-semibold">{rawWinrateFormatted}%</span> (Рейтинг: <span className="font-bold">{effScoreFormatted}%</span>)
                                    </div>
                                </div>
                            </div>

                            {/* Period breakdown */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 px-0.5">
                                    <BarChart3 size={14} className="text-primary-500" />
                                    <span>Разбивка сыгранных матчей по периодам</span>
                                </div>

                                <div className="space-y-1.5">
                                    {breakdown.periods.map(period => (
                                        <div
                                            key={period.key}
                                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 flex items-center justify-between text-xs"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-base leading-none">{period.icon}</span>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                        {period.label}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Вес игры: <span className="font-medium text-slate-600 dark:text-slate-300">{period.weightRange}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {period.wins} из {period.matches} побед
                                                </div>
                                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                    + {period.weightedWins} побед / + {period.weightedMatches} игр
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Explanatory note */}
                            <div className="p-3 bg-primary-50/70 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/30 rounded-2xl text-xs text-slate-700 dark:text-slate-300 space-y-1">
                                <div className="font-bold flex items-center gap-1 text-primary-700 dark:text-primary-300">
                                    <HelpCircle size={13} />
                                    <span>Как это работает?</span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                                    Чем свежее матч, тем больше баллов он даёт (от <strong>1.0</strong> за новые игры до <strong>0.5</strong> за игры 6-месячной давности). <strong>Взвешенные победы</strong> — это реальная суммарная ценность побед с учётом их даты.
                                </p>
                            </div>
                        </div>
                    );
                })()}
            </BaseModal>

            <SeasonsManagerModal
                isOpen={isSeasonsManagerOpen}
                onClose={() => setIsSeasonsManagerOpen(false)}
                seasons={seasons}
                latestSeasonId={latestSeasonId}
                userDefaultSeasonId={userDefaultSeasonId}
                onSetUserDefaultSeason={onSetUserDefaultSeason}
                onAddSeason={(name, start, end) => onAddSeason ? onAddSeason(name, start, end) : null}
                onUpdateSeason={(id, patch) => onUpdateSeason && onUpdateSeason(id, patch)}
                onDeleteSeason={(id) => onDeleteSeason && onDeleteSeason(id)}
                triggerHaptic={triggerHaptic}
            />

            {matchFormOverlay}
        </>
    );
};
