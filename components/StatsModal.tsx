
import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Swords, Edit2, Trash2, Save, RefreshCw, Loader2, Plus, User, Shield, ChevronLeft, Calendar, Check, Search, TrendingUp, TrendingDown, Star, Skull, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ArrowDownAZ, ArrowUpAZ, Percent, BarChart3, Eye } from 'lucide-react';
import { MatchRecord, PlayerStat, MatchPlayer, HeroList, Hero, HeroStat, CloudBackup } from '../types';
import { PlayerDetails } from './PlayerDetails';
import { HeroDetails } from './HeroDetails';
import { CloudBackupManager } from './CloudBackupManager';
import { useBackHandler } from '../hooks/useBackHandler';

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

    onImportData: (data: { history: MatchRecord[], deletedHistory: MatchRecord[] }) => boolean;
    checkConnectivity?: () => Promise<boolean>;
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
    // Облачный бэкап
    cloudBackups = [],
    isCreatingBackup = false,
    isLoadingBackups = false,
    isRestoringBackup = false,
    onCreateCloudBackup = async () => null,
    onListCloudBackups = async () => [],
    onRestoreFromCloudBackup = async () => false,
    onDeleteCloudBackup = async () => false,
    onGetCloudBackupDetails = async () => null
}) => {
    // Backup Menu State
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
    const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false);

    useBackHandler(isDataMenuOpen, () => {
        setIsDataMenuOpen(false);
    }, { id: 'stats-data-menu', priority: 30 });

    const titleClickCount = useRef(0);
    const titleClickTimeout = useRef<NodeJS.Timeout | null>(null);

    // Загрузка списка бэкапов при открытии меню
    useEffect(() => {
        if (isDataMenuOpen && isOnline) {
            onListCloudBackups();
        }
    }, [isDataMenuOpen]);

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
            deletedHistory
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

    // Match Tab State
    const [matchSearch, setMatchSearch] = useState('');

    // Overview Card State
    const [activeOverviewCard, setActiveOverviewCard] = useState(0); // 0 = Streak, 1 = Underdog
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Swipe Logic
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const touchStartY = useRef(0);
    const touchEndY = useRef(0);

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
    const [matchForm, setMatchForm] = useState<{
        id?: string;
        date: string;
        time: string;
        t1p1: string; t1p1h: string;
        t1p2: string; t1p2h: string;
        t2p1: string; t2p1h: string;
        t2p2: string; t2p2h: string;
        winner: 'team1' | 'team2';
        errors: { [key: string]: boolean };
    } | null>(null);
    const [matchFormClosing, setMatchFormClosing] = useState(false);

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<{ field: string, list: string[] } | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number, width: number } | null>(null);

    // Update dropdown position when suggestions or anchor changes
    useLayoutEffect(() => {
        if (suggestions && anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        } else {
            setDropdownPosition(null);
        }
    }, [suggestions, anchorEl]);

    // Reset states on close & Open first tab
    useEffect(() => {
        if (!isOpen) {
            setEditMode(false);
            setMatchForm(null);
            setMatchFormClosing(false);
            setDeleteConfirmId(null);
            setSuggestions(null);
            setAnchorEl(null);
            setSelectedPlayer(null);
            setSelectedHero(null);
        } else {
            // Always open on the first tab
            setActiveTab('overview');
            setSelectedPlayer(null);
            setSelectedHero(null);
        }
    }, [isOpen]);

    // Back Button Logic with useBackHandler
    useBackHandler(isOpen, () => {
        // 1. Close Detail Views if open
        if (selectedPlayer || selectedHero) {
            setSelectedPlayer(null);
            setSelectedHero(null);
            // Restore 'stats' view state if needed, or just let it be.
            // Since we are "going back" from details, we conceptually stay in Stats.
            // In the old logic we used history.back() which triggered popstate.
            // Here we just update state.
            // BUT: usage of pushState for details means we might have a browser history entry to pop?
            // If we opened details with pushState, pressing physical back pops it.
            // NavigationContext traps physical back.
            // If we have a forward history for details, we should probably pop it to keep URL/state clean?
            // ACTUALLY: The Context traps the event, so browser history IS popped (conceptually) or we trapped it.
            // If we trapped it (pushState inserted), we are good.
            return;
        }

        // 2. Close Modal
        onClose();
    }, { id: 'stats-modal', priority: 20 }); // Higher priority than App/Root

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
        setMatchFormClosing(true);
        setTimeout(() => {
            setMatchForm(null);
            setMatchFormClosing(false);
        }, 200); // 200ms matches animate-out duration
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

    // Statistics Calculation
    const { totalMatches, sortedPlayers, sortedHeroes, mvp, underdog, streakStats, bestStreakPlayer } = useMemo(() => {
        const playerStats: Record<string, PlayerStat> = {};
        const heroStats: Record<string, HeroStat> = {};
        let totalMatches = 0;

        history.forEach(match => {
            totalMatches++;
            const winner = match.winner;

            const processPlayer = (name: string, won: boolean, heroName: string) => {
                const cleanName = name.trim();
                const cleanHero = heroName.trim() || 'Unknown';
                if (!cleanName) return;

                if (!playerStats[cleanName]) {
                    playerStats[cleanName] = { name: cleanName, matches: 0, wins: 0, losses: 0, heroesPlayed: {}, score: 0 };
                }
                playerStats[cleanName].matches++;
                if (won) playerStats[cleanName].wins++;
                else playerStats[cleanName].losses++;

                playerStats[cleanName].heroesPlayed[cleanHero] = (playerStats[cleanName].heroesPlayed[cleanHero] || 0) + 1;

                // Hero Stats
                if (cleanHero !== 'Unknown') {
                    if (!heroStats[cleanHero]) {
                        heroStats[cleanHero] = { name: cleanHero, matches: 0, wins: 0, losses: 0 };
                    }
                    heroStats[cleanHero].matches++;
                    if (won) heroStats[cleanHero].wins++;
                    else heroStats[cleanHero].losses++;
                }
            };

            match.team1.forEach(p => processPlayer(p.name, winner === 'team1', p.heroName));
            match.team2.forEach(p => processPlayer(p.name, winner === 'team2', p.heroName));
        });

        // Calculate Weighted Score for Players (Bayesian-ish or simple weighted)
        Object.values(playerStats).forEach(p => {
            const winRate = p.matches > 0 ? p.wins / p.matches : 0;
            p.score = winRate * (1 - 1 / (p.matches + 1));
        });

        const sortedPlayers = Object.values(playerStats).sort((a, b) => b.score - a.score || b.wins - a.wins);
        const sortedHeroes = Object.values(heroStats).sort((a, b) => (b.wins / b.matches) - (a.wins / a.matches) || b.matches - a.matches);

        const qualifiedPlayers = sortedPlayers.filter(p => p.matches >= 2);
        const mvp = qualifiedPlayers.length > 0 ? qualifiedPlayers[0] : (sortedPlayers.length > 0 ? sortedPlayers[0] : null);
        // Базовый underdog по винрейту (fallback) — минимум 3 матча для объективности
        const qualifiedForUnderdog = sortedPlayers.filter(p => p.matches >= 3);
        const fallbackUnderdog = qualifiedForUnderdog.length > 0
            ? qualifiedForUnderdog[qualifiedForUnderdog.length - 1]
            : (qualifiedPlayers.length > 0 ? qualifiedPlayers[qualifiedPlayers.length - 1] : null);

        // Streak Calculation (победы и поражения)
        // lastStreakMatchIndex отслеживает индекс последнего матча в серии игрока
        const streakStats: Record<string, {
            current: number, // текущая серия побед (положительное) 
            max: number,
            lastStreakMatchIndex: number,
            loseStreak: number, // текущая серия поражений
            lastLoseStreakMatchIndex: number
        }> = {};
        // History is Newest -> Oldest. Reverse to process chronologically.
        const reversedHistory = [...history].reverse();
        reversedHistory.forEach((match, matchIndex) => {
            const winner = match.winner;
            const processStreak = (p: MatchPlayer, won: boolean) => {
                const name = p.name;
                if (!streakStats[name]) streakStats[name] = {
                    current: 0,
                    max: 0,
                    lastStreakMatchIndex: -1,
                    loseStreak: 0,
                    lastLoseStreakMatchIndex: -1
                };

                if (won) {
                    streakStats[name].current += 1;
                    streakStats[name].lastStreakMatchIndex = matchIndex;
                    if (streakStats[name].current > streakStats[name].max) {
                        streakStats[name].max = streakStats[name].current;
                    }
                    // Сбрасываем серию поражений при победе
                    streakStats[name].loseStreak = 0;
                    streakStats[name].lastLoseStreakMatchIndex = -1;
                } else {
                    // Сбрасываем серию побед при поражении
                    streakStats[name].current = 0;
                    streakStats[name].lastStreakMatchIndex = -1;
                    // Увеличиваем серию поражений
                    streakStats[name].loseStreak += 1;
                    streakStats[name].lastLoseStreakMatchIndex = matchIndex;
                }
            };

            match.team1.forEach(p => processStreak(p, winner === 'team1'));
            match.team2.forEach(p => processStreak(p, winner === 'team2'));
        });

        // Find Best Active Win Streak ("В огне")
        // При равных сериях приоритет отдаётся тому, кто последним получил этот статус
        let bestStreakPlayer: { name: string, streak: number } | null = null;
        let bestStreakMatchIndex = -1;
        Object.entries(streakStats).forEach(([name, stats]) => {
            if (stats.current >= 3) {
                if (!bestStreakPlayer ||
                    stats.current > bestStreakPlayer.streak ||
                    (stats.current === bestStreakPlayer.streak && stats.lastStreakMatchIndex > bestStreakMatchIndex)) {
                    bestStreakPlayer = { name, streak: stats.current };
                    bestStreakMatchIndex = stats.lastStreakMatchIndex;
                }
            }
        });

        // Find Underdog (комбинированный подход)
        // Приоритет 1: Игрок с активной серией поражений >= 3
        // Приоритет 2: При равных сериях — последний получивший этот статус
        // Fallback: Игрок с худшим винрейтом (>= 3 матчей)
        let underdogByLoseStreak: { name: string, loseStreak: number, player: PlayerStat } | null = null;
        let underdogLoseStreakMatchIndex = -1;
        Object.entries(streakStats).forEach(([name, stats]) => {
            if (stats.loseStreak >= 3) {
                const player = playerStats[name];
                if (player) {
                    if (!underdogByLoseStreak ||
                        stats.loseStreak > underdogByLoseStreak.loseStreak ||
                        (stats.loseStreak === underdogByLoseStreak.loseStreak && stats.lastLoseStreakMatchIndex > underdogLoseStreakMatchIndex)) {
                        underdogByLoseStreak = { name, loseStreak: stats.loseStreak, player };
                        underdogLoseStreakMatchIndex = stats.lastLoseStreakMatchIndex;
                    }
                }
            }
        });

        // Финальный underdog: приоритет серии поражений, иначе fallback
        const underdog = underdogByLoseStreak ? underdogByLoseStreak.player : fallbackUnderdog;

        return { totalMatches, sortedPlayers, sortedHeroes, mvp, underdog, streakStats, bestStreakPlayer };
    }, [history]);

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
        if (!matchSearch.trim()) return history;
        const lower = matchSearch.toLowerCase().trim();
        return history.filter(m => {
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
    }, [history, matchSearch]);




    const openAddMatch = () => {
        triggerHaptic(10);
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().slice(0, 5);

        setMatchForm({
            date: dateStr,
            time: timeStr,
            t1p1: '', t1p1h: '',
            t1p2: '', t1p2h: '',
            t2p1: '', t2p1h: '',
            t2p2: '', t2p2h: '',
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
            t1p1: match.team1[0]?.name || '', t1p1h: match.team1[0]?.heroName || '',
            t1p2: match.team1[1]?.name || '', t1p2h: match.team1[1]?.heroName || '',
            t2p1: match.team2[0]?.name || '', t2p1h: match.team2[0]?.heroName || '',
            t2p2: match.team2[1]?.name || '', t2p2h: match.team2[1]?.heroName || '',
            winner: match.winner || 'team1',
            errors: {}
        });
    };

    const validateHero = (name: string) => {
        if (!name.trim()) return true; // allow empty if logical, but here we require heroes usually. Let's say empty is allowed but if filled must exist.
        return allHeroesList.some(h => h.name.toLowerCase() === name.trim().toLowerCase());
    }

    const handleMatchSubmit = () => {
        if (!matchForm) return;

        const errors: { [key: string]: boolean } = {};

        // Validate Heroes
        if (matchForm.t1p1h && !validateHero(matchForm.t1p1h)) errors.t1p1h = true;
        if (matchForm.t1p2h && !validateHero(matchForm.t1p2h)) errors.t1p2h = true;
        if (matchForm.t2p1h && !validateHero(matchForm.t2p1h)) errors.t2p1h = true;
        if (matchForm.t2p2h && !validateHero(matchForm.t2p2h)) errors.t2p2h = true;

        if (Object.keys(errors).length > 0) {
            triggerHaptic([20, 50, 20]);
            setMatchForm({ ...matchForm, errors });
            return;
        }

        const team1: MatchPlayer[] = [];
        if (matchForm.t1p1.trim()) {
            const hName = matchForm.t1p1h.trim();
            team1.push({ name: matchForm.t1p1.trim(), heroName: hName, heroId: 'manual' });
        }
        if (matchForm.t1p2.trim()) {
            const hName = matchForm.t1p2h.trim();
            team1.push({ name: matchForm.t1p2.trim(), heroName: hName, heroId: 'manual' });
        }

        const team2: MatchPlayer[] = [];
        if (matchForm.t2p1.trim()) {
            const hName = matchForm.t2p1h.trim();
            team2.push({ name: matchForm.t2p1.trim(), heroName: hName, heroId: 'manual' });
        }
        if (matchForm.t2p2.trim()) {
            const hName = matchForm.t2p2h.trim();
            team2.push({ name: matchForm.t2p2.trim(), heroName: hName, heroId: 'manual' });
        }

        if (team1.length === 0 || team2.length === 0) return;

        const timestamp = new Date(`${matchForm.date}T${matchForm.time}`).getTime();

        if (matchForm.id) {
            onUpdateMatch(matchForm.id, {
                team1, team2, winner: matchForm.winner, timestamp
            });
        } else {
            onAddMatch(team1, team2, matchForm.winner, timestamp);
        }
        triggerHaptic(50);
        closeMatchForm();
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

    const handleAutocomplete = (field: string, value: string, target: HTMLElement) => {
        if (!matchForm) return;
        setMatchForm({
            ...matchForm,
            [field]: value,
            errors: { ...matchForm.errors, [field]: false } // clear error on type
        });

        // Update anchor immediately
        setAnchorEl(target);

        if (value.length < 1) {
            setSuggestions(null);
            return;
        }

        const isHeroField = field.endsWith('h');
        let matches: string[] = [];

        if (isHeroField) {
            matches = allHeroesList
                .filter(h => h.name.toLowerCase().includes(value.toLowerCase()))
                .map(h => h.name)
                .slice(0, 5);
        } else {
            matches = uniquePlayerNames
                .filter(name => name.toLowerCase().includes(value.toLowerCase()))
                .slice(0, 5);
        }

        if (matches.length > 0) {
            setSuggestions({ field, list: matches });
        } else {
            setSuggestions(null);
        }
    };

    const applySuggestion = (val: string) => {
        if (suggestions && matchForm) {
            setMatchForm({
                ...matchForm,
                [suggestions.field]: val,
                errors: { ...matchForm.errors, [suggestions.field]: false }
            });
            setSuggestions(null);
            setAnchorEl(null);
        }
    };



    // Swipe Handling - Global Tabs
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchStartY.current = e.targetTouches[0].clientY;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        touchEndX.current = e.changedTouches[0].clientX;
        touchEndY.current = e.changedTouches[0].clientY;
        const diffX = touchStartX.current - touchEndX.current;
        const diffY = touchStartY.current - touchEndY.current;
        const SWIPE_THRESHOLD = 50;

        // Stricter horizontal swipe check: horizontal movement must be 1.5x larger than vertical
        // And NOT swiping the card (checked via target or just allow global only if not stopped propagation)
        // Note: The card handler calls stopPropagation, so this shouldn't fire if card is touched.
        if (Math.abs(diffX) > Math.abs(diffY) * 1.5 && Math.abs(diffX) > SWIPE_THRESHOLD) {
            const tabs = ['overview', 'players', 'heroes', 'matches'];
            const idx = tabs.indexOf(activeTab);
            let nextTab = null;
            if (diffX > 0 && idx < tabs.length - 1) nextTab = tabs[idx + 1];
            if (diffX < 0 && idx > 0) nextTab = tabs[idx - 1];

            if (nextTab) {
                setActiveTab(nextTab as any);

            }
        }
    };

    // Swipe Handling - Overview Card
    const handleCardTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        touchStartX.current = e.touches[0].clientX;
        setIsSwiping(true);
        setSwipeOffset(0);
    };

    const handleCardTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (!isSwiping) return;

        const currentX = e.touches[0].clientX;
        const diff = currentX - touchStartX.current;

        // Resistance/Limits
        if (activeOverviewCard === 0 && diff > 0) {
            // Trying to swipe right from start (rubber band?) -> Limit
            setSwipeOffset(diff * 0.3);
        } else if (activeOverviewCard === 1 && diff < 0) {
            // Trying to swipe left from end -> Limit
            setSwipeOffset(diff * 0.3);
        } else {
            setSwipeOffset(diff);
        }
    };

    const handleCardTouchEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        setIsSwiping(false);

        const threshold = 50; // px

        if (activeOverviewCard === 0) {
            if (swipeOffset < -threshold) {
                setActiveOverviewCard(1);
            }
        } else {
            if (swipeOffset > threshold) {
                setActiveOverviewCard(0);
            }
        }
        setSwipeOffset(0);
    };

    const renderInput = (label: string, valKey: keyof typeof matchForm, icon?: React.ReactNode, placeholder: string = "") => {
        if (!matchForm) return null;
        const value = matchForm[valKey as keyof typeof matchForm] as string;
        const isError = matchForm.errors && matchForm.errors[valKey as string];

        return (
            <div className="flex-1 relative group">
                {label && <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">{label}</label>}
                <div className="relative">
                    <input
                        type="text"
                        value={value}
                        onFocus={(e) => setAnchorEl(e.target)}
                        onBlur={() => {
                            // Delay blur to allow click on suggestion to register
                            setTimeout(() => {
                                setSuggestions(null);
                                setAnchorEl(null);
                            }, 150);
                        }}
                        onChange={(e) => handleAutocomplete(valKey as string, e.target.value, e.target)}
                        placeholder={placeholder}
                        className={`w-full pl-8 pr-2 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border focus:bg-white dark:focus:bg-slate-900 outline-none transition-all ${isError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-primary-500'}`}
                    />
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isError ? 'text-red-500' : 'text-slate-400'}`}>
                        {icon}
                    </div>
                </div>
            </div>
        );
    };

    // Portal for Autocomplete Dropdown
    const renderAutocompletePortal = () => {
        if (!suggestions || !dropdownPosition) return null;

        return createPortal(
            <div
                className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-[100] overflow-hidden mt-1 animate-in fade-in zoom-in-95 duration-100"
                style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}
            >
                {suggestions.list.map(item => (
                    <button
                        key={item}
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                        onClick={() => applySuggestion(item)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors truncate border-b border-slate-50 dark:border-slate-700 last:border-0"
                    >
                        {item}
                    </button>
                ))}
            </div>,
            document.body
        );
    };

    // Match Form Overlay
    const matchFormOverlay = matchForm ? (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm ${matchFormClosing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200'} fill-mode-forwards`}>
            <div className={`bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] border border-slate-100 dark:border-slate-800 overflow-hidden ${matchFormClosing ? 'animate-out zoom-out-95 duration-200' : 'animate-in zoom-in-95 duration-200'} fill-mode-forwards`}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {matchForm.id ? 'Редактировать' : 'Новый матч'}
                    </h2>
                    <button onClick={closeMatchForm} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar">
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Дата</label>
                            <input type="date" required value={matchForm.date} onChange={e => setMatchForm({ ...matchForm, date: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500" />
                        </div>
                        <div className="w-1/3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Время</label>
                            <input type="time" required value={matchForm.time} onChange={e => setMatchForm({ ...matchForm, time: e.target.value })} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-primary-500" />
                        </div>
                    </div>

                    {/* Team 1 */}
                    <div className="mb-2">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Команда 1</h3>
                            <button
                                onClick={() => setMatchForm({ ...matchForm, winner: 'team1' })}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${matchForm.winner === 'team1' ? 'bg-secondary-100 text-secondary-700 border-secondary-200 dark:bg-secondary-900/30 dark:text-secondary-400 dark:border-secondary-800' : 'bg-slate-100 text-slate-400 border-transparent dark:bg-slate-800'}`}
                            >
                                {matchForm.winner === 'team1' ? 'Победитель' : 'Выбрать победителем'}
                            </button>
                        </div>
                        <div className={`p-3 rounded-2xl border-2 transition-colors ${matchForm.winner === 'team1' ? 'border-secondary-500/50 bg-secondary-50/50 dark:bg-secondary-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    {renderInput("", "t1p1", <User size={14} />, "Игрок 1")}
                                    {renderInput("", "t1p1h", <Shield size={14} />, "Герой")}
                                </div>
                                <div className="flex gap-2">
                                    {renderInput("", "t1p2", <User size={14} />, "Игрок 2")}
                                    {renderInput("", "t1p2h", <Shield size={14} />, "Герой")}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center my-1 relative z-10 pointer-events-none">
                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm text-slate-300">
                            <Swords size={16} />
                        </div>
                    </div>

                    {/* Team 2 */}
                    <div className="mt-2">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Команда 2</h3>
                            <button
                                onClick={() => setMatchForm({ ...matchForm, winner: 'team2' })}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${matchForm.winner === 'team2' ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800' : 'bg-slate-100 text-slate-400 border-transparent dark:bg-slate-800'}`}
                            >
                                {matchForm.winner === 'team2' ? 'Победитель' : 'Выбрать победителем'}
                            </button>
                        </div>
                        <div className={`p-3 rounded-2xl border-2 transition-colors ${matchForm.winner === 'team2' ? 'border-primary-500/50 bg-primary-50/50 dark:bg-primary-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    {renderInput("", "t2p1", <User size={14} />, "Игрок 3")}
                                    {renderInput("", "t2p1h", <Shield size={14} />, "Герой")}
                                </div>
                                <div className="flex gap-2">
                                    {renderInput("", "t2p2", <User size={14} />, "Игрок 4")}
                                    {renderInput("", "t2p2h", <Shield size={14} />, "Герой")}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900 z-10 mt-auto">
                    <button onClick={closeMatchForm} className="flex-1 py-3.5 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">Отмена</button>
                    <button onClick={handleMatchSubmit} className="flex-1 py-3.5 font-bold text-white bg-primary-600 rounded-xl shadow-lg shadow-primary-600/20 text-sm active:scale-95 transition-transform">Сохранить</button>
                </div>
            </div>
            {renderAutocompletePortal()}
        </div>
    ) : null;

    return (
        <>
            {/* Backup Menu Overlay */}
            {isDataMenuOpen && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[85dvh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 pb-3 shrink-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Резервное копирование</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Сохраните статистику локально или в облако.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 space-y-4">
                            {/* Локальный бэкап */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Локальный бэкап</h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={handleExport}
                                        data-testid="backup-export-btn"
                                        className="w-full flex items-center gap-3 p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <ArrowUp className="text-green-500" size={20} />
                                        <span>Экспорт в файл</span>
                                    </button>

                                    <label className="w-full flex items-center gap-3 p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer relative overflow-hidden">
                                        <ArrowDown className="text-blue-500" size={20} />
                                        <span>Импорт из файла</span>
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleImport}
                                            data-testid="backup-import-input"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Облачный бэкап */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Облачный бэкап</h4>

                                <button
                                    onClick={() => {
                                        triggerHaptic(10);
                                        setIsDataMenuOpen(false);
                                        setIsBackupManagerOpen(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-3 p-3.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-2xl font-medium hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                                    data-testid="backup-open-manager-btn"
                                >
                                    <RefreshCw size={20} />
                                    <span>Управление облачными бэкапами</span>
                                </button>

                                {cloudBackups.length > 0 && (
                                    <p className="text-center text-xs text-slate-400 mt-2">
                                        Доступно бэкапов: {cloudBackups.length}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 pt-4 shrink-0">
                            <button
                                onClick={() => setIsDataMenuOpen(false)}
                                data-testid="backup-close-btn"
                                className="w-full p-3 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium transition-colors bg-slate-100 dark:bg-slate-800"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
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
                className={`fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isOpen && !matchForm ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                onClick={onClose}
            >
                <div
                    className={`bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col h-[90dvh] border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 sticky top-0">
                        <h2
                            className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 select-none active:scale-95 transition-transform"
                            onClick={handleTitleClick}
                        >
                            <Trophy size={20} className="text-yellow-500" /> Статистика
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => syncWithAnimation()}
                                disabled={!isOnline || visualSyncState !== 'idle'}
                                className={`p-2 rounded-full transition-all duration-300 ${(!isOnline) ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' :
                                    visualSyncState === 'success' ? 'text-green-500 bg-green-100 dark:bg-green-900/30' :
                                        'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                                title="Синхронизация"
                            >
                                {visualSyncState === 'syncing' ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : visualSyncState === 'success' ? (
                                    <Check size={20} className="animate-in zoom-in spin-in-90 duration-300" />
                                ) : (
                                    <RefreshCw size={20} />
                                )}
                            </button>
                            <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
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
                                className={`flex-1 min-w-[80px] py-3 text-sm font-bold border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 md:hover:bg-slate-50 dark:md:hover:bg-slate-800/50'}`}
                            >
                                {tab === 'overview' ? 'Обзор' : tab === 'players' ? 'Игроки' : tab === 'heroes' ? 'Герои' : 'Матчи'}
                            </button>
                        ))}
                    </div>

                    {/* Matches Tab Action Bar - Sticky under tabs */}
                    {activeTab === 'matches' && (
                        <div className="flex justify-end gap-2 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 border-b border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                            {editMode && deletedHistory.length > 0 && (
                                <button
                                    onClick={() => { setShowTrashOnly(!showTrashOnly); triggerHaptic(10); }}
                                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors flex items-center gap-1.5 ${showTrashOnly ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                                >
                                    <Trash2 size={16} /> {showTrashOnly ? 'Все матчи' : `Корзина (${deletedHistory.length})`}
                                </button>
                            )}
                            {!editMode && (
                                <button
                                    onClick={openAddMatch}
                                    className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 active:scale-95 transition-transform"
                                >
                                    <Plus size={16} /> Добавить
                                </button>
                            )}
                            <button
                                onClick={() => { setEditMode(!editMode); setShowTrashOnly(false); triggerHaptic(10); }}
                                className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors flex items-center gap-1.5 ${editMode ? 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                            >
                                <Edit2 size={16} /> {editMode ? 'Готово' : 'Редактировать'}
                            </button>
                        </div>
                    )}

                    <div
                        className={`overflow-y-auto flex-1 no-scrollbar touch-pan-y ${activeTab === 'matches' || selectedPlayer || selectedHero ? 'p-0' : 'p-4'}`}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {activeTab === 'overview' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">{totalMatches}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Всего матчей</div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* MVP Card */}
                                    <div className="p-4 rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border border-yellow-100 dark:border-yellow-900/30 relative overflow-hidden h-full">
                                        <div className="flex items-center gap-2 mb-3 text-yellow-600 dark:text-yellow-500">
                                            <Star size={18} fill="currentColor" />
                                            <span className="text-xs font-black uppercase tracking-wider">MVP</span>
                                        </div>
                                        {mvp ? (
                                            <>
                                                <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{mvp.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Винрейт: <span className="font-bold text-green-600">{Math.round((mvp.wins / mvp.matches) * 100)}%</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{mvp.matches} игр</div>
                                            </>
                                        ) : (
                                            <div className="text-sm text-slate-400 italic">Нет данных</div>
                                        )}
                                    </div>

                                    {/* Scrollable Card Area */}
                                    {bestStreakPlayer ? (
                                        <div
                                            className="relative overflow-hidden h-full rounded-3xl"
                                            onTouchStart={handleCardTouchStart}
                                            onTouchMove={handleCardTouchMove}
                                            onTouchEnd={handleCardTouchEnd}
                                        >
                                            <div
                                                className={`flex h-full will-change-transform ${isSwiping ? '' : 'transition-transform duration-300 ease-out'}`}
                                                style={{ transform: `translateX(calc(-${activeOverviewCard * 100}% + ${swipeOffset}px))` }}
                                            >
                                                {/* Slide 1: Hot Streak */}
                                                <div className="w-full h-full flex-shrink-0">
                                                    <div className="p-4 h-full rounded-3xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 border border-orange-100 dark:border-orange-900/30 relative overflow-hidden">
                                                        <div className="flex items-center gap-2 mb-3 text-orange-500">
                                                            <TrendingUp size={18} />
                                                            <span className="text-xs font-black uppercase tracking-wider">В огне</span>
                                                        </div>
                                                        <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{bestStreakPlayer.name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            Серия: <span className="font-bold text-orange-600">{bestStreakPlayer.streak} побед</span>
                                                        </div>
                                                        <div className="absolute opacity-10 bottom-1 right-1 text-orange-500">
                                                            <TrendingUp size={48} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Slide 2: Underdog */}
                                                <div className="w-full h-full flex-shrink-0">
                                                    <div className="p-4 h-full rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                                                        <div className="flex items-center gap-2 mb-3 text-slate-400">
                                                            <Skull size={18} />
                                                            <span className="text-xs font-black uppercase tracking-wider">Underdog</span>
                                                        </div>
                                                        {underdog ? (
                                                            <>
                                                                <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{underdog.name}</div>
                                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                    Винрейт: <span className="font-bold text-red-500">{Math.round((underdog.wins / underdog.matches) * 100)}%</span>
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">{underdog.matches} игр</div>
                                                            </>
                                                        ) : (
                                                            <div className="text-sm text-slate-400 italic">Нет данных</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Pagination Dots - Overlay at bottom */}
                                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                                                <div className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${activeOverviewCard === 0 ? 'w-4 bg-primary-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`} />
                                                <div className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${activeOverviewCard === 1 ? 'w-4 bg-primary-500' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`} />
                                            </div>
                                        </div>
                                    ) : (
                                        /* No streak - just show Underdog */
                                        <div className="p-4 h-full rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2 mb-3 text-slate-400">
                                                <Skull size={18} />
                                                <span className="text-xs font-black uppercase tracking-wider">Underdog</span>
                                            </div>
                                            {underdog ? (
                                                <>
                                                    <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{underdog.name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                        Винрейт: <span className="font-bold text-red-500">{Math.round((underdog.wins / underdog.matches) * 100)}%</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{underdog.matches} игр</div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-slate-400 italic">Нет данных</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Top Efficiency Chart */}
                                    <div className="pt-2 col-span-2">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                            <TrendingUp size={16} className="text-primary-500" /> Топ эффективности
                                        </h3>
                                        <div className="space-y-3">
                                            {sortedPlayers.filter(p => p.matches > 1).slice(0, 5).map((player, i) => {
                                                const winRate = (player.wins / player.matches) * 100;
                                                return (
                                                    <div key={player.name}>
                                                        <div className="flex justify-between text-xs font-medium mb-1">
                                                            <span className="text-slate-700 dark:text-slate-300">{i + 1}. {player.name}</span>
                                                            <span className="text-slate-500">{Math.round(winRate)}% <span className="text-[9px] opacity-60">({player.wins}/{player.matches})</span></span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${winRate}%` }}></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {sortedPlayers.filter(p => p.matches > 1).length === 0 && (
                                                <div className="text-xs text-slate-400 italic text-center py-4">Недостаточно матчей для статистики</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'players' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                                {selectedPlayer ? (
                                    <PlayerDetails
                                        key={selectedPlayer.name}
                                        player={selectedPlayer}
                                        history={history}
                                        onBack={closeDetails}
                                        onRename={(newName) => {
                                            onRenamePlayer(selectedPlayer.name, newName);
                                            setSelectedPlayer(prev => prev ? { ...prev, name: newName } : null);
                                        }}
                                    />
                                ) : (
                                    <>
                                        {sortedPlayers.map((player, idx) => (
                                            <div
                                                key={player.name}
                                                onClick={() => {
                                                    openPlayerDetails(player);
                                                }}
                                                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                            {player.name}
                                                            {streakStats[player.name]?.current >= 3 && (
                                                                <div className="text-[10px] font-black px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-md flex items-center gap-0.5">
                                                                    <TrendingUp size={10} /> {streakStats[player.name].current}
                                                                </div>
                                                            )}
                                                            {mvp?.name === player.name && (
                                                                <div className="text-[10px] font-black px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded-md flex items-center gap-0.5">
                                                                    <Star size={10} fill="currentColor" /> MVP
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500">Игр: {player.matches} • Побед: {player.wins}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm font-bold ${player.wins / player.matches >= 0.5 ? 'text-green-600' : 'text-slate-500'}`}>{Math.round((player.wins / player.matches) * 100)}%</div>
                                                </div>
                                            </div>
                                        ))}
                                        {sortedPlayers.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных об игроках</div>}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'heroes' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Hero Search & Sort - Hidden when viewing details */}
                                {!selectedHero && (
                                    <div className="flex gap-2 relative z-20">
                                        <div className="relative flex-1 min-w-0">
                                            <input
                                                type="text"
                                                value={heroSearch}
                                                onChange={(e) => setHeroSearch(e.target.value)}
                                                placeholder="Поиск героя..."
                                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors"
                                            />
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            {heroSearch && (
                                                <button onClick={() => { setHeroSearch(''); triggerHaptic(10); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative shrink-0 w-10">
                                            <button
                                                ref={(el) => {
                                                    // Save ref and calculate position if opening
                                                    if (el && isSortMenuOpen && !dropdownPosition) {
                                                        const rect = el.getBoundingClientRect();
                                                        setDropdownPosition({
                                                            top: rect.bottom + 8,
                                                            left: rect.right - 192, // 192px = w-48
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
                                                className={`w-full h-full flex items-center justify-center rounded-xl border transition-colors ${isSortMenuOpen ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                                            >
                                                {heroSort === 'winrate' && <TrendingUp size={18} />}
                                                {heroSort === 'matches' && <BarChart3 size={18} />}
                                                {heroSort === 'az' && <ArrowDownAZ size={18} />}
                                                {heroSort === 'za' && <ArrowUpAZ size={18} />}
                                                {heroSort === 'pop' && <BarChart3 size={18} />}
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
                                                        <button onClick={() => { setHeroSort('winrate'); setIsSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${heroSort === 'winrate' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><TrendingUp size={14} /> По винрейту</span>
                                                            {heroSort === 'winrate' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setHeroSort('matches'); setIsSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${heroSort === 'matches' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><BarChart3 size={14} /> По популярности</span>
                                                            {heroSort === 'matches' && <Check size={14} />}
                                                        </button>
                                                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-0"></div>
                                                        <button onClick={() => { setHeroSort('az'); setIsSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${heroSort === 'az' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><ArrowDownAZ size={14} /> По алфавиту (А-Я)</span>
                                                            {heroSort === 'az' && <Check size={14} />}
                                                        </button>
                                                        <button onClick={() => { setHeroSort('za'); setIsSortMenuOpen(false); triggerHaptic(10); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${heroSort === 'za' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                            <span className="flex items-center gap-2"><ArrowUpAZ size={14} /> По алфавиту (Я-А)</span>
                                                            {heroSort === 'za' && <Check size={14} />}
                                                        </button>
                                                    </div>
                                                </>,
                                                document.body
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {selectedHero ? (
                                        <HeroDetails
                                            key={selectedHero.name}
                                            hero={selectedHero}
                                            history={history}
                                            onBack={closeDetails}
                                            onRename={(newName) => {
                                                onRenameHero(selectedHero.name, newName);
                                                setSelectedHero(prev => prev ? { ...prev, name: newName } : null);
                                            }}
                                        />
                                    ) : (
                                        <>
                                            {processedHeroes.map((hero, idx) => (
                                                <div
                                                    key={hero.name}
                                                    onClick={() => {
                                                        openHeroDetails(hero);
                                                    }}
                                                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                            <Shield size={14} className="text-slate-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                                                {hero.name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">Игр: {hero.matches}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-2">
                                                        <div className={`text-sm font-bold ${hero.wins / hero.matches >= 0.5 ? 'text-green-600' : 'text-slate-500'}`}>{Math.round((hero.wins / hero.matches) * 100)}%</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {processedHeroes.length === 0 && <div className="text-center text-slate-400 py-10">Нет данных о героях</div>}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'matches' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 p-4">
                                {/* Matches Search */}
                                <div className="mb-4 relative">
                                    <input
                                        type="text"
                                        value={matchSearch}
                                        onChange={(e) => setMatchSearch(e.target.value)}
                                        placeholder="Поиск матча (игрок, герой, дата)"
                                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:border-primary-500 transition-colors"
                                    />
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    {matchSearch && (
                                        <button onClick={() => { setMatchSearch(''); triggerHaptic(10); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {!showTrashOnly && (
                                        <>
                                            {processedMatches.map(match => {
                                                const date = new Date(match.timestamp).toLocaleDateString();
                                                const time = new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                                return (
                                                    <div
                                                        key={match.id}
                                                        className={`relative overflow-hidden p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all ${editMode ? 'pr-12' : ''}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-3 border-b border-slate-50 dark:border-slate-700 pb-2">
                                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Calendar size={10} /> {date} <span className="opacity-50">|</span> {time}</span>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {/* Team 1 */}
                                                            <div className={`flex items-center gap-2 ${match.winner === 'team1' ? 'opacity-100' : 'opacity-60'}`}>
                                                                <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team1' ? 'bg-secondary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                                        {match.team1.map(p => p.name).join(', ')}
                                                                        {match.winner === 'team1' && <Trophy size={10} className="text-yellow-500" />}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 flex gap-2">
                                                                        {match.team1.map(p => p.heroName).join(' & ')}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Team 2 */}
                                                            <div className={`flex items-center gap-2 ${match.winner === 'team2' ? 'opacity-100' : 'opacity-60'}`}>
                                                                <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team2' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                                        {match.team2.map(p => p.name).join(', ')}
                                                                        {match.winner === 'team2' && <Trophy size={10} className="text-yellow-500" />}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 flex gap-2">
                                                                        {match.team2.map(p => p.heroName).join(' & ')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {editMode && (
                                                            <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/80 border-l border-slate-100 dark:border-slate-700 backdrop-blur-sm z-10">
                                                                <button onClick={() => openEditMatch(match)} className="p-2 text-blue-500 active:scale-90 transition-transform"><Edit2 size={16} /></button>
                                                                <button onClick={() => { setDeleteConfirmId(match.id); setDeleteConfirmAction('move-to-trash'); }} className="p-2 text-red-500 active:scale-90 transition-transform"><Trash2 size={16} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {processedMatches.length === 0 && <div className="text-center text-slate-400 py-10">Матчи не найдены</div>}
                                        </>
                                    )}
                                </div>

                                {/* Deleted Matches Section */}
                                {editMode && deletedHistory.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 relative">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-white dark:bg-slate-900 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Корзина ({deletedHistory.length})
                                        </div>
                                        <div className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                                            {deletedHistory.map(match => {
                                                const date = new Date(match.timestamp).toLocaleDateString();
                                                const time = new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                                return (
                                                    <div
                                                        key={match.id}
                                                        className="relative overflow-hidden p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 shadow-sm border border-red-200 dark:border-red-900/30 pr-20"
                                                    >
                                                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-700/50 pb-2">
                                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Trash2 size={10} /> {date} <span className="opacity-50">|</span> {time}</span>
                                                        </div>

                                                        <div className="space-y-2 opacity-60 grayscale-[50%]">
                                                            {/* Team 1 */}
                                                            <div className={`flex items-center gap-2 ${match.winner === 'team1' ? 'opacity-100' : 'opacity-60'}`}>
                                                                <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team1' ? 'bg-secondary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                                        {match.team1.map(p => p.name).join(', ')}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Team 2 */}
                                                            <div className={`flex items-center gap-2 ${match.winner === 'team2' ? 'opacity-100' : 'opacity-60'}`}>
                                                                <div className={`w-1.5 h-8 rounded-full ${match.winner === 'team2' ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                                        {match.team2.map(p => p.name).join(', ')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="absolute right-0 top-0 bottom-0 w-20 flex flex-col items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 border-l border-red-100 dark:border-red-900/30 backdrop-blur-sm z-10">
                                                            <button onClick={() => { onRestoreMatch(match.id); triggerHaptic(20); }} className="p-2 text-green-500 active:scale-90 transition-transform" title="Восстановить">
                                                                <RefreshCw size={16} />
                                                            </button>
                                                            <button onClick={() => { setDeleteConfirmId(match.id); setDeleteConfirmAction('permanent'); triggerHaptic(50); }} className="p-2 text-red-500 active:scale-90 transition-transform" title="Удалить навсегда">
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="text-center mt-6 mb-4">
                                            <button
                                                onClick={() => { setDeleteConfirmId('all'); setDeleteConfirmAction('clear-trash'); triggerHaptic(50); }}
                                                className="text-xs font-bold text-red-400 hover:text-red-500 py-2 px-4 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 mx-auto"
                                            >
                                                <Trash2 size={14} /> Очистить корзину ({deletedHistory.length})
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Delete Confirmation Modal */}
                    <div
                        className={`fixed inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${deleteConfirmId ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${deleteConfirmId ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4"><Trash2 size={24} /></div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    {deleteConfirmAction === 'clear-trash' ? 'Очистить корзину?' :
                                        deleteConfirmAction === 'permanent' ? 'Удалить навсегда?' : 'Удалить матч?'}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {deleteConfirmAction === 'move-to-trash' ? 'Матч будет перемещен в корзину.' : 'Это действие нельзя отменить.'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setDeleteConfirmId(null)} className="py-3 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">Отмена</button>
                                <button onClick={confirmDeleteMatch} className="py-3 font-bold text-white bg-red-500 rounded-xl">
                                    {deleteConfirmAction === 'move-to-trash' ? 'В корзину' : 'Удалить'}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            {matchFormOverlay}
        </>
    );
};
