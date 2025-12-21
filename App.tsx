
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './hooks/useTheme';
import { useHeroLists } from './hooks/useHeroLists';
import { useToast } from './hooks/useToast';
import { usePWA } from './hooks/usePWA';
import { generateAssignmentsWithMode, getHeroWeight, getBestPermutation, getUniqueHeroesFromLists } from './utils/generator';
import { ThemeToggle } from './components/ThemeToggle';
import { ResultOverlay } from './components/ResultOverlay';
import { SettingsOverlay } from './components/SettingsOverlay';
import { ToastContainer } from './components/Toast';
import { AssignedPlayer, GenerationMode, Hero, HeroList } from './types';
import { RANKS } from './constants';
import { Dice5, Shuffle, Settings, History, RotateCcw, Loader2, Download, X, WifiOff, Layers, ChevronDown, LogOut, User, Users, Clock, Trash2, Check, Cloud, Database, Filter, SquareStack, BarChart3 } from 'lucide-react';
import { logger } from './utils/logger';

const STORAGE_KEY_ASSIGNMENTS = 'randomatched_last_session_v1';
const STORAGE_KEY_PLAYER_NAMES = 'randomatched_player_names_v1';
const STORAGE_KEY_SAVED_TEAMS = 'randomatched_saved_teams_v1';
const STORAGE_KEY_GROUP_MODE = 'randomatched_group_mode_v1';
const STORAGE_KEY_SELECTED_GROUP = 'randomatched_selected_group_v1';
const STORAGE_KEY_DEBUG_MODE = 'randomatched_debug_mode_v1';

const App: React.FC = () => {
  const { theme, toggleTheme, colorScheme, setColorScheme } = useTheme();
  const { toasts, addToast, removeToast } = useToast();
  
  const { 
    lists, 
    addList, 
    updateList, 
    deleteList, 
    forkList, 
    createTemporaryList,
    resetTemporaryLists,
    uploadToCloud,
    syncWithCloud,
    reorderLists,
    sortLists,
    checkConnectivity,
    isOnline,
    isSyncing,
    updatedListIds,
    markListAsSeen,
    updatedHeroIds,
    dismissHeroUpdates,
    isLoaded 
  } = useHeroLists(addToast);

  const {
      isUpdateAvailable,
      isCheckingUpdate,
      showUpdateBanner,
      setShowUpdateBanner,
      handleUpdateApp,
      handleOpenUpdateBanner,
      checkForUpdate
  } = usePWA(addToast);
  
  const [selectedListId, setSelectedListId] = useState<string>('');
  
  // Group Mode State
  const [isGroupMode, setIsGroupMode] = useState<boolean>(() => {
     try {
         return localStorage.getItem(STORAGE_KEY_GROUP_MODE) === 'true';
     } catch { return false; }
  });
  
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => {
     try {
         const saved = localStorage.getItem(STORAGE_KEY_SELECTED_GROUP);
         return saved ? new Set(JSON.parse(saved)) : new Set();
     } catch { return new Set(); }
  });

  const [assignments, setAssignments] = useState<AssignedPlayer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
      if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
              const sample = parsed[0].hero;
              if (sample && typeof sample !== 'object') {
                  return [];
              }
          }
          return parsed;
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [playerNames, setPlayerNames] = useState<string[]>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_PLAYER_NAMES);
        return saved ? JSON.parse(saved) : ['', '', '', ''];
    } catch {
        return ['', '', '', ''];
    }
  });

  const [savedTeams, setSavedTeams] = useState<string[][]>(() => {
      try {
          const saved = localStorage.getItem(STORAGE_KEY_SAVED_TEAMS);
          return saved ? JSON.parse(saved) : [];
      } catch {
          return [];
      }
  });

  // Debug Mode State - Persisted
  const [isDebugMode, setIsDebugMode] = useState<boolean>(() => {
      try {
          return localStorage.getItem(STORAGE_KEY_DEBUG_MODE) === 'true';
      } catch { return false; }
  });
  
  const [deleteHistoryConfirm, setDeleteHistoryConfirm] = useState<number | null>(null);
  const [isNamesOpen, setIsNamesOpen] = useState(false);
  const [isListSelectorOpen, setIsListSelectorOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('random');
  const [balanceThreshold, setBalanceThreshold] = useState<number>(1);
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  
  // Stats Modal
  const [isGroupStatsOpen, setIsGroupStatsOpen] = useState(false);

  // Debug Console Logs - Synced via global logger
  const [consoleLogs, setConsoleLogs] = useState<{type: string, args: string[], time?: string}[]>([]);

  const historyScrollRef = useRef<HTMLDivElement>(null);
  const [isHistoryDragging, setIsHistoryDragging] = useState(false);
  const [historyStartX, setHistoryStartX] = useState(0);
  const [historyScrollLeft, setHistoryScrollLeft] = useState(0);
  const [isHistoryDragScroll, setIsHistoryDragScroll] = useState(false);
  
  // Double back press logic
  const lastBackPressTime = useRef<number>(0);

  // Subscribe to Logger
  useEffect(() => {
      return logger.subscribe((logs) => {
          // Map to format expected by SettingsOverlay if types differ slightly
          setConsoleLogs(logs);
      });
  }, []);

  // Initialize history state
  useEffect(() => {
      window.history.replaceState({ view: 'root' }, '');
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
        if (isSettingsOpen) {
            // Settings handles its own history
            return;
        }

        const state = event.state;
        
        // Handle Result Overlay Back
        if (showResult) {
            setShowResult(false);
            return;
        }

        if (isResetConfirmOpen || isGroupStatsOpen || isNamesOpen || isListSelectorOpen) {
            if (isResetConfirmOpen) setIsResetConfirmOpen(false);
            if (isGroupStatsOpen) setIsGroupStatsOpen(false);
            if (isNamesOpen) setIsNamesOpen(false);
            if (isListSelectorOpen) setIsListSelectorOpen(false);
            
            // Ensure we stay on root if we just closed a modal that wasn't settings
            if (window.history.state?.view !== 'root') {
                 window.history.replaceState({ view: 'root' }, '');
            }
            return;
        }

        // Handle Root Back Press (Exit app logic)
        const now = Date.now();
        if (now - lastBackPressTime.current < 2000) {
            // Allow default back (exit)
        } else {
            // Trap back button
            window.history.pushState({ view: 'root' }, '');
            lastBackPressTime.current = now;
            addToast("Нажмите еще раз для выхода", "info", 2000);
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSettingsOpen, isResetConfirmOpen, showResult, isNamesOpen, isListSelectorOpen, isGroupStatsOpen, addToast]);

  useEffect(() => {
    if (isLoaded && lists.length > 0) {
      const exists = lists.find(l => l.id === selectedListId);
      if (!exists) {
        setSelectedListId(lists[0].id);
      }
    } else if (isLoaded && lists.length === 0) {
        setSelectedListId('');
    }
  }, [lists, isLoaded, selectedListId]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_GROUP_MODE, String(isGroupMode));
  }, [isGroupMode]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_SELECTED_GROUP, JSON.stringify(Array.from(selectedGroupIds)));
  }, [selectedGroupIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_PLAYER_NAMES, JSON.stringify(playerNames));
  }, [playerNames]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_SAVED_TEAMS, JSON.stringify(savedTeams));
  }, [savedTeams]);
  
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_DEBUG_MODE, String(isDebugMode));
  }, [isDebugMode]);

  // Click outside listener for History Delete Confirmation
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (deleteHistoryConfirm !== null && historyScrollRef.current && !historyScrollRef.current.contains(e.target as Node)) {
              setDeleteHistoryConfirm(null);
          }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [deleteHistoryConfirm]);
  
  const getActiveList = () => lists.find(l => l.id === selectedListId);

  const handleSelectList = (id: string) => {
    setSelectedListId(id);
    setIsListSelectorOpen(false);
  };
  
  const handleToggleGroupItem = (id: string) => {
      setSelectedGroupIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };

  const handleNameChange = (index: number, value: string) => {
      const newNames = [...playerNames];
      newNames[index] = value;
      setPlayerNames(newNames);
  };

  const saveTeamHistory = () => {
      if (playerNames.every(n => !n.trim())) return;

      const currentTeamStr = JSON.stringify(playerNames);
      
      setSavedTeams(prev => {
          const filtered = prev.filter(team => JSON.stringify(team) !== currentTeamStr);
          return [playerNames, ...filtered].slice(0, 10);
      });
  };

  const handleSelectSavedTeam = (team: string[]) => {
      setPlayerNames(team);
  };
  
  const handleDeleteHistoryItem = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      
      if (deleteHistoryConfirm === index) {
          setSavedTeams(prev => prev.filter((_, i) => i !== index));
          setDeleteHistoryConfirm(null);
      } else {
          setDeleteHistoryConfirm(index);
      }
  };

  const handleHistoryMouseDown = (e: React.MouseEvent) => {
      const el = historyScrollRef.current;
      if (!el) return;
      setIsHistoryDragging(true);
      setIsHistoryDragScroll(false);
      setHistoryStartX(e.pageX - el.offsetLeft);
      setHistoryScrollLeft(el.scrollLeft);
  };

  const handleHistoryMouseLeave = () => {
      setIsHistoryDragging(false);
      setIsHistoryDragScroll(false);
  };

  const handleHistoryMouseUp = () => {
      setIsHistoryDragging(false);
      setTimeout(() => setIsHistoryDragScroll(false), 50);
  };

  const handleHistoryMouseMove = (e: React.MouseEvent) => {
      if (!isHistoryDragging || !historyScrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - historyScrollRef.current.offsetLeft;
      const walk = (x - historyStartX) * 2;
      if (Math.abs(x - historyStartX) > 5) {
          setIsHistoryDragScroll(true);
      }
      historyScrollRef.current.scrollLeft = historyScrollLeft - walk;
  };

  const handleGenerate = () => {
    if (lists.length === 0) {
      addToast("Сначала создайте список героев в настройках", "warning");
      return;
    }

    let targetLists: HeroList[] = [];

    if (isGroupMode) {
        if (selectedGroupIds.size === 0) {
            addToast("Выберите хотя бы один список для группы", "warning");
            return;
        }
        targetLists = lists.filter(l => selectedGroupIds.has(l.id));
    } else {
        const list = getActiveList();
        if (!list) {
            addToast("Выберите список для генерации", "warning");
            return;
        }
        targetLists = [list];
    }
    
    // Check missing ranks before deduplication to warn user about source data
    const hasMissingRanks = targetLists.some(l => l.heroes.some(h => !h.rank || !h.rank.trim()));
    if (hasMissingRanks) {
        addToast("У некоторых героев не указан ранг. Исправьте это в настройках.", "warning");
        return;
    }

    // Get unique heroes to ensure we have enough ACTUAL distinct characters
    const uniqueHeroes = getUniqueHeroesFromLists(targetLists);
    
    // Validate Total Heroes
    if (uniqueHeroes.length < 4) {
        addToast(`Недостаточно уникальных героев (${uniqueHeroes.length}). Нужно минимум 4.`, "warning");
        return;
    }

    saveTeamHistory();
    setIsNamesOpen(false);
    setIsListSelectorOpen(false);

    setIsAnimating(true);

    setTimeout(() => {
      const positions: ('bottom' | 'top' | 'left' | 'right')[] = ['bottom', 'top', 'left', 'right'];
      const playerNumbers = [1, 2, 3, 4];

      const newAssignments: AssignedPlayer[] = positions.map((pos, index) => {
        const pNum = playerNumbers[index];
        return {
          hero: null,
          playerNumber: pNum,
          position: pos,
          team: pNum % 2 === 0 ? 'Even' : 'Odd'
        };
      });

      setAssignments(newAssignments);
      setIsAnimating(false);
      window.history.pushState({ view: 'result' }, '');
      setShowResult(true);
    }, 400);
  };

  const handleRevealHeroes = () => {
      let targetLists: HeroList[] = [];
      if (isGroupMode) {
          targetLists = lists.filter(l => selectedGroupIds.has(l.id));
      } else {
          const list = getActiveList();
          if (list) targetLists = [list];
      }

      const generated = generateAssignmentsWithMode(targetLists, generationMode, balanceThreshold, assignments, addToast);
      setAssignments(generated);
  };

  const handleResetSessionClick = () => {
    setIsResetConfirmOpen(true);
  };

  const confirmReset = () => {
    setAssignments([]);
    setPlayerNames(['', '', '', '']);
    resetTemporaryLists();
    localStorage.removeItem(STORAGE_KEY_ASSIGNMENTS);
    setIsResetConfirmOpen(false);
    addToast("Сессия сброшена", "info", 1500);
  };

  const cancelReset = () => {
      setIsResetConfirmOpen(false);
  };

  const handleShowLastResult = () => {
    if (assignments.length > 0) {
      window.history.pushState({ view: 'result' }, '');
      setShowResult(true);
    }
  };

  const hasTemporaryLists = lists.some(l => l.isTemporary);
  const hasResult = assignments.length > 0;
  // Change: Filling player names should not trigger the reset session visibility
  const canReset = hasResult || hasTemporaryLists;

  // --- RE-ROLL LOGIC (UPDATED FOR GROUP) ---
  const getAvailableHeroesPool = () => {
      if (isGroupMode) {
          return getUniqueHeroesFromLists(lists.filter(l => selectedGroupIds.has(l.id)));
      } else {
          const list = getActiveList();
          return list ? list.heroes : [];
      }
  };

  const handleRerollHero = (playerNumber: number) => {
    const allHeroes = getAvailableHeroesPool();
    const currentHeroIds = assignments.map(a => a.hero ? a.hero.id : '').filter(id => id !== '');
    
    // Filter duplicates by name for safety during reroll check
    const availableHeroes = allHeroes.filter(h => !currentHeroIds.includes(h.id));
    
    if (availableHeroes.length === 0) { 
        addToast("Нет доступных героев для замены.", "warning"); 
        return; 
    }

    let newHero: Hero;

    if (generationMode === 'random') {
        newHero = availableHeroes[Math.floor(Math.random() * availableHeroes.length)];
    } else {
        const targetAssignment = assignments.find(a => a.playerNumber === playerNumber);
        if (!targetAssignment) return;

        const myTeam = targetAssignment.team;
        const opposingWeight = assignments
            .filter(a => a.team !== myTeam && a.hero)
            .reduce((sum, a) => sum + getHeroWeight(a.hero), 0);
        
        const myTeamCurrentWeight = assignments
            .filter(a => a.team === myTeam && a.playerNumber !== playerNumber && a.hero)
            .reduce((sum, a) => sum + getHeroWeight(a.hero), 0);

        if (generationMode === 'strict') {
             const candidates = availableHeroes.map(h => {
                 const w = getHeroWeight(h);
                 const diff = Math.abs(opposingWeight - (myTeamCurrentWeight + w));
                 return { hero: h, diff };
             });

             const validOptions = candidates.filter(c => c.diff <= balanceThreshold);

             if (validOptions.length > 0) {
                 newHero = validOptions[Math.floor(Math.random() * validOptions.length)].hero;
             } else {
                 const bestPossibleDiff = Math.min(...candidates.map(c => c.diff));
                 const bestOptions = candidates.filter(c => c.diff === bestPossibleDiff);
                 newHero = bestOptions[Math.floor(Math.random() * bestOptions.length)].hero;
                 addToast(`Не найдено героев с разницей ≤ ${balanceThreshold}. Выбран ближайший.`, "info", 2000);
             }

        } else {
             const candidates = availableHeroes.map(h => {
                 const w = getHeroWeight(h);
                 const diff = Math.abs(opposingWeight - (myTeamCurrentWeight + w));
                 return { hero: h, diff };
             });

             const bestPossibleDiff = Math.min(...candidates.map(c => c.diff));
             const TOLERANCE = 1;

             const validOptions = candidates.filter(c => 
                 c.diff <= 1 ||
                 c.diff <= bestPossibleDiff + TOLERANCE
             );

             newHero = validOptions[Math.floor(Math.random() * validOptions.length)].hero;
        }
    }

    setAssignments(prev => prev.map(p => p.playerNumber === playerNumber ? { ...p, hero: newHero } : p));
  };

  const handleRerollAllHeroes = () => {
    let targetLists: HeroList[] = [];
    if (isGroupMode) {
        targetLists = lists.filter(l => selectedGroupIds.has(l.id));
    } else {
        const list = getActiveList();
        if (list) targetLists = [list];
    }
    const uniqueHeroes = getUniqueHeroesFromLists(targetLists);
    
    if (uniqueHeroes.length < 4) {
        addToast("Недостаточно уникальных героев для переброса.", "warning");
        return;
    }
    
    const generated = generateAssignmentsWithMode(targetLists, generationMode, balanceThreshold, assignments, addToast);
    setAssignments(generated);
  };

  const handleShuffleTeams = () => {
    const pNums = [1, 2, 3, 4].sort(() => 0.5 - Math.random());
    
    const newAssignments: AssignedPlayer[] = assignments.map((assignment, index) => {
      const pNum = pNums[index];
      return { 
          ...assignment, 
          team: pNum % 2 === 0 ? 'Even' : 'Odd',
          playerNumber: pNum 
      };
    });
    
    setAssignments(newAssignments);
  };

  const handleBanHero = (playerNumber: number) => {
    const activeList = getActiveList();
    
    const assignmentToBan = assignments.find(a => a.playerNumber === playerNumber);
    if (!assignmentToBan || !assignmentToBan.hero) return;
    const heroToBan = assignmentToBan.hero;

    const allHeroes = getAvailableHeroesPool();
    const currentHeroIds = assignments.map(a => a.hero ? a.hero.id : '').filter(Boolean);
    const availableForReplacement = allHeroes.filter(h => !currentHeroIds.includes(h.id));

    if (availableForReplacement.length === 0) { addToast("Некого брать на замену!", "warning"); return; }
    const newHero = availableForReplacement[Math.floor(Math.random() * availableForReplacement.length)];

    setAssignments(prev => prev.map(p => p.playerNumber === playerNumber ? { ...p, hero: newHero } : p));
    
    // For single lists, fork/edit list. For groups, we just modify session state (no database change yet for bans in group mode)
    if (!isGroupMode && activeList) {
        if (activeList.isTemporary) { 
            updateList(activeList.id, { heroes: activeList.heroes.filter(h => h.id !== heroToBan.id) }); 
        } else { 
            const newId = forkList(activeList.id, [heroToBan]); 
            if (newId) setSelectedListId(newId); 
        }
    } else if (isGroupMode) {
        const groupLists = lists.filter(l => selectedGroupIds.has(l.id));
        const allGroupHeroes = getUniqueHeroesFromLists(groupLists);
        const filteredHeroes = allGroupHeroes.filter(h => h.id !== heroToBan.id);

        const newId = createTemporaryList(filteredHeroes, "Временный (Группа)");
        setIsGroupMode(false);
        setSelectedListId(newId);
    }
    
    addToast(`Герой ${heroToBan.name} заменен`, "info", 1500);
  };

  const handleBanAllCurrent = () => {
    const heroesToBan = assignments.filter(a => a.hero !== null).map(a => a.hero!);
    const activeList = getActiveList();

    if (!isGroupMode && activeList) {
        if (activeList.isTemporary) {
           const banIds = new Set(heroesToBan.map(h => h.id));
           updateList(activeList.id, { heroes: activeList.heroes.filter(h => !banIds.has(h.id)) });
        } else {
           const newId = forkList(activeList.id, heroesToBan);
           if (newId) setSelectedListId(newId);
        }
    } else if (isGroupMode) {
        const heroesToBanIds = new Set(heroesToBan.map(h => h.id));
        const groupLists = lists.filter(l => selectedGroupIds.has(l.id));
        const allGroupHeroes = getUniqueHeroesFromLists(groupLists);
        const filteredHeroes = allGroupHeroes.filter(h => !heroesToBanIds.has(h.id));

        const newId = createTemporaryList(filteredHeroes, "Временный (Группа)");
        setIsGroupMode(false);
        setSelectedListId(newId);
    }
    
    setAssignments([]);
    setShowResult(false);
    addToast("Все текущие герои исключены", "info", 1500);
  };
  
  const handleSwapPositions = (pos1: 'top'|'bottom'|'left'|'right', pos2: 'top'|'bottom'|'left'|'right') => {
      const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
      const idx1 = positionToIndex[pos1];
      const idx2 = positionToIndex[pos2];

      const newNames = [...playerNames];
      [newNames[idx1], newNames[idx2]] = [newNames[idx2], newNames[idx1]];
      
      setSavedTeams(prev => {
          if (prev.length === 0) return prev;
          
          const currentNamesStr = JSON.stringify(playerNames);
          const latestHistoryStr = JSON.stringify(prev[0]);
          
          if (currentNamesStr === latestHistoryStr) {
              const newHistory = [...prev];
              newHistory[0] = newNames; 
              return newHistory;
          }
          return prev;
      });

      setPlayerNames(newNames);

      setAssignments(prev => {
          const newAssignments = [...prev];
          const a1Index = newAssignments.findIndex(a => a.position === pos1);
          const a2Index = newAssignments.findIndex(a => a.position === pos2);
          
          if (a1Index !== -1 && a2Index !== -1) {
             const tempHero = newAssignments[a1Index].hero;
             const tempTeam = newAssignments[a1Index].team;
             const tempNum = newAssignments[a1Index].playerNumber;
             
             newAssignments[a1Index].hero = newAssignments[a2Index].hero;
             newAssignments[a1Index].team = newAssignments[a2Index].team;
             newAssignments[a1Index].playerNumber = newAssignments[a2Index].playerNumber;
             
             newAssignments[a2Index].hero = tempHero;
             newAssignments[a2Index].team = tempTeam;
             newAssignments[a2Index].playerNumber = tempNum;
          }
          return newAssignments;
      });
  };

  const activeList = getActiveList();
  
  const filledNamesCount = playerNames.filter(n => n.trim() !== '').length;

  // For UI display in main selector
  const groupableLists = lists.filter(l => l.isGroupable);
  const selectedGroupCount = selectedGroupIds.size;
  // Calculate unique heroes for the label
  const uniqueGroupHeroes = getUniqueHeroesFromLists(lists.filter(l => selectedGroupIds.has(l.id)));
  const groupTotalHeroes = uniqueGroupHeroes.length;

  // Helpers for Stats
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

  const getSelectionStats = () => {
      let targetHeroes: Hero[] = [];
      if (isGroupMode) {
          const targetLists = lists.filter(l => selectedGroupIds.has(l.id));
          targetHeroes = getUniqueHeroesFromLists(targetLists);
      } else {
          const list = getActiveList();
          if (list) targetHeroes = list.heroes;
      }

      const counts: Record<string, number> = {};
      targetHeroes.forEach(h => {
          if (h.rank) counts[h.rank] = (counts[h.rank] || 0) + 1;
      });
      const max = Math.max(...Object.values(counts), 1);
      return { counts, max, total: targetHeroes.length };
  };

  return (
    <div className="relative h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary-50/50 to-transparent dark:from-primary-950/20 pointer-events-none" />
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <header className="px-6 pt-safe-area-top pt-6 mt-2 pb-2 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary-600 p-2.5 rounded-xl shadow-lg shadow-primary-600/20">
             <Dice5 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              Random<span className="text-primary-600 dark:text-primary-400">atched</span>
            </h1>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide mt-0.5">GENERATOR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {isCheckingUpdate && <div className="p-2 text-primary-500 animate-spin"><Loader2 size={20} /></div>}
            {!isCheckingUpdate && isUpdateAvailable && (
                <button onClick={handleOpenUpdateBanner} className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 animate-pulse">
                    <Download size={20} />
                </button>
            )}
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-lg mx-auto relative z-0">
        
        <div 
          className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-30 transition-all duration-300 ${isListSelectorOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
          onClick={() => setIsListSelectorOpen(false)}
        />

        <div 
          className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-30 transition-all duration-300 ${isNamesOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
          onClick={() => setIsNamesOpen(false)}
        />

        <div 
          className="w-full mb-6 relative"
          style={{ 
              zIndex: isListSelectorOpen ? 40 : 20,
              transition: isListSelectorOpen ? 'z-index 0s' : 'z-index 0s linear 0.3s'
          }}
        >
           <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block pl-1">
             Источник героев
           </label>
           <div className="relative">
             <button 
                onClick={() => setIsListSelectorOpen(!isListSelectorOpen)}
                disabled={lists.length === 0}
                className={`w-full relative bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center p-5 gap-4 text-left transition-all duration-300 
                    ${isListSelectorOpen ? 'rounded-t-3xl rounded-b-none border-b-transparent' : 'rounded-3xl active:scale-[0.99]'}`}
             >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors
                    ${isGroupMode 
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300'
                        : activeList?.isTemporary 
                            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                     {isGroupMode ? <SquareStack size={28} /> : (activeList ? <Layers size={28} /> : <X size={28} />)}
                 </div>
                 <div className="flex-1 min-w-0">
                    {lists.length > 0 ? (
                        <>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate pr-4">
                                {isGroupMode 
                                    ? (selectedGroupCount > 0 ? `Группа (${selectedGroupCount})` : 'Пустая группа')
                                    : (activeList?.name || 'Выберите список')
                                }
                                {!isGroupMode && activeList?.isTemporary && <span className="text-sm font-normal text-slate-500 ml-2">(врем.)</span>}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                {isGroupMode 
                                    ? `${groupTotalHeroes} Героев доступно`
                                    : (activeList ? `Героев: ${activeList.heroes.length}` : 'Список пуст')
                                }
                            </p>
                        </>
                    ) : (
                        <span className="text-slate-400">Создайте список в настройках</span>
                    )}
                 </div>
                 <div className={`text-slate-300 dark:text-slate-600 transition-transform duration-300 ${isListSelectorOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={24} />
                 </div>
             </button>

             <div className={`absolute top-full left-0 w-full bg-white dark:bg-slate-900 border border-t-0 border-slate-100 dark:border-slate-800 rounded-b-3xl shadow-xl overflow-hidden transition-all duration-300 origin-top flex flex-col max-h-[360px] ${isListSelectorOpen ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-0 pointer-events-none'}`}>
                 
                 {/* Tabs Switcher */}
                 <div className="px-5 pt-4 pb-2">
                     <div className="flex gap-2">
                         <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
                             <button 
                                onClick={() => setIsGroupMode(false)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${!isGroupMode ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 md:hover:text-slate-700 dark:md:hover:text-slate-300 active:text-slate-700'}`}
                             >
                                 <Layers size={16} /> Один
                             </button>
                             <button 
                                onClick={() => setIsGroupMode(true)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${isGroupMode ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400 md:hover:text-slate-700 dark:md:hover:text-slate-300 active:text-slate-700'}`}
                             >
                                 <SquareStack size={16} /> Группа
                             </button>
                         </div>
                         <button 
                            onClick={() => setIsGroupStatsOpen(true)}
                            disabled={isGroupMode ? groupTotalHeroes === 0 : !activeList || activeList.heroes.length === 0}
                            className={`w-10 h-10 my-auto rounded-xl flex items-center justify-center transition-colors border active:scale-95 ${isGroupMode 
                                ? 'bg-primary-50 text-primary-600 border-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800 disabled:opacity-50' 
                                : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 disabled:opacity-50'
                            }`}
                         >
                             <BarChart3 size={18} />
                         </button>
                     </div>
                 </div>

                 <div className="overflow-y-auto no-scrollbar py-2 flex-1">
                    {/* Render lists based on mode */}
                    {!isGroupMode ? (
                        // SINGLE MODE
                        lists.map(list => {
                            const isSelected = list.id === selectedListId;
                            const isOfflineCloud = list.isCloud && !isOnline;
                            
                            let Icon = Database;
                            let iconColor = 'text-slate-400';
                            let iconBg = 'bg-slate-50 dark:bg-slate-800';
                            
                            if (list.isTemporary) {
                                Icon = Filter;
                                iconColor = 'text-primary-500';
                                iconBg = 'bg-primary-50 dark:bg-primary-900/20';
                            } else if (list.isCloud) {
                                Icon = Cloud;
                                iconColor = 'text-sky-500';
                                iconBg = 'bg-sky-50 dark:bg-sky-900/20';
                                if (isOfflineCloud) {
                                    iconColor = 'text-slate-400';
                                    iconBg = 'bg-slate-100 dark:bg-slate-800';
                                }
                            }

                            return (
                                <button
                                    key={list.id}
                                    onClick={() => handleSelectList(list.id)}
                                    className={`w-full px-5 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-slate-50 dark:bg-slate-800/50' : 'md:hover:bg-slate-50 dark:md:hover:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-800'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'} ${list.isTemporary ? 'italic' : ''}`}>
                                            {list.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">Героев: {list.heroes.length}</span>
                                            {isOfflineCloud && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 rounded">Offline</span>}
                                        </div>
                                    </div>
                                    {isSelected && <div className="text-primary-600 dark:text-primary-400"><Check size={20} /></div>}
                                </button>
                            );
                        })
                    ) : (
                        // GROUP MODE
                        <>
                           <div className="px-5 pb-2 text-xs text-slate-400 text-center">
                               Выберите списки для объединения.
                               {groupableLists.length === 0 && <div className="mt-4 text-orange-500">Нет списков, доступных для групп. <br/> Разрешите группировку в настройках списка.</div>}
                           </div>
                           
                           {groupableLists.map(list => {
                                const isSelected = selectedGroupIds.has(list.id);
                                const isOfflineCloud = list.isCloud && !isOnline;
                                
                                let Icon = Database;
                                let iconColor = 'text-slate-400';
                                let iconBg = 'bg-slate-50 dark:bg-slate-800';
                                
                                if (list.isCloud) {
                                    Icon = Cloud;
                                    iconColor = 'text-sky-500';
                                    iconBg = 'bg-sky-50 dark:bg-sky-900/20';
                                    if (isOfflineCloud) {
                                        iconColor = 'text-slate-400';
                                        iconBg = 'bg-slate-100 dark:bg-slate-800';
                                    }
                                }

                                return (
                                    <button
                                        key={list.id}
                                        onClick={() => handleToggleGroupItem(list.id)}
                                        className={`w-full px-5 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : 'md:hover:bg-slate-50 dark:md:hover:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-800'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-primary-500 text-white' : `${iconBg} ${iconColor}`}`}>
                                            {isSelected ? <Check size={18} /> : <Icon size={18} />}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {list.name}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Героев: {list.heroes.length}</span>
                                                {isOfflineCloud && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 rounded">Offline</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                           })}
                        </>
                    )}
                    
                    {lists.length === 0 && (
                        <div className="p-6 text-center text-slate-400 text-sm">
                            Список пуст. <br/> Перейдите в настройки, чтобы создать первый список.
                        </div>
                    )}
                 </div>
             </div>
           </div>
        </div>

        <div className={`w-full mb-4 relative transition-all duration-300 ${isNamesOpen ? 'z-40' : 'z-20'}`}>
             <button 
                onClick={() => setIsNamesOpen(!isNamesOpen)}
                className={`w-full p-4 flex items-center justify-between text-left bg-white dark:bg-slate-900/90 backdrop-blur-md border border-slate-100 dark:border-slate-800 transition-all duration-300 ${isNamesOpen ? 'rounded-t-3xl border-b-transparent shadow-lg' : 'rounded-3xl shadow-sm hover:shadow-md'}`}
             >
                 <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${filledNamesCount > 0 ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                        <Users size={20} />
                     </div>
                     <div>
                         <span className="block text-sm font-bold text-slate-900 dark:text-white">Имена игроков</span>
                         <span className="text-xs text-slate-400 dark:text-slate-500">{filledNamesCount > 0 ? `Заполнено: ${filledNamesCount}` : 'Не заполнены'}</span>
                     </div>
                 </div>
                 <div className={`text-slate-300 transition-transform duration-300 ${isNamesOpen ? 'rotate-180' : ''}`}>
                     <ChevronDown size={20} />
                 </div>
             </button>
             
             <div className={`absolute top-[100%] left-0 w-full bg-white dark:bg-slate-900 border border-t-0 border-slate-100 dark:border-slate-800 rounded-b-3xl shadow-xl overflow-hidden transition-all duration-300 origin-top ${isNamesOpen ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-0 pointer-events-none'}`}>
                 <div className="p-4 pt-5">
                     
                     {savedTeams.length > 0 && (
                         <div className="mb-4">
                             <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                 <Clock size={12} /> <span>История команд</span>
                             </div>
                             <div 
                                ref={historyScrollRef}
                                onMouseDown={handleHistoryMouseDown}
                                onMouseLeave={handleHistoryMouseLeave}
                                onMouseUp={handleHistoryMouseUp}
                                onMouseMove={handleHistoryMouseMove}
                                onWheel={(e) => {
                                    if (historyScrollRef.current) {
                                        historyScrollRef.current.scrollLeft += e.deltaY;
                                    }
                                }}
                                className={`flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1 touch-pan-x ${isHistoryDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                             >
                                 {savedTeams.map((team, idx) => {
                                     const filled = team.filter(n => n.trim());
                                     const label = filled.length > 0 ? filled.slice(0, 2).join(', ') + (filled.length > 2 ? '...' : '') : 'Пустая команда';
                                     const isConfirmingDelete = deleteHistoryConfirm === idx;

                                     return (
                                        <div key={idx} className="relative group shrink-0 flex items-center">
                                            <button 
                                                onClick={() => {
                                                    if (isHistoryDragScroll || isConfirmingDelete) return;
                                                    handleSelectSavedTeam(team);
                                                }}
                                                className={`pl-3 pr-8 py-2 rounded-xl text-xs font-medium transition-colors border select-none
                                                    ${isConfirmingDelete 
                                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-200 dark:border-red-900/50' 
                                                        : 'bg-slate-100 dark:bg-slate-800 md:hover:bg-slate-200 dark:md:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent active:border-primary-500'
                                                    }
                                                `}
                                                style={{ pointerEvents: 'auto' }}
                                            >
                                                {label}
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteHistoryItem(e, idx)}
                                                className={`absolute right-1 p-1.5 rounded-lg transition-colors
                                                    ${isConfirmingDelete 
                                                        ? 'text-red-600 md:hover:bg-red-100 dark:text-red-400 dark:md:hover:bg-red-900/40 active:bg-red-100' 
                                                        : 'text-slate-400 md:hover:text-red-500 md:hover:bg-slate-200 dark:md:hover:bg-slate-700 active:text-red-500 active:bg-slate-200'
                                                    }
                                                `}
                                            >
                                                {isConfirmingDelete ? <Trash2 size={12} /> : <X size={12} />}
                                            </button>
                                        </div>
                                     );
                                 })}
                             </div>
                         </div>
                     )}

                     <div className="grid grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="relative group">
                                <input 
                                    type="text" 
                                    value={playerNames[index]}
                                    onChange={(e) => handleNameChange(index, e.target.value)}
                                    placeholder={`Игрок ${index + 1}`}
                                    className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-900 select-text"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <User size={14} />
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
        </div>

        <div className="w-full relative z-0">
            <button
              onClick={handleGenerate}
              disabled={isAnimating || lists.length === 0}
              className={`w-full relative group overflow-hidden rounded-3xl p-1 transition-all duration-200 active:scale-[0.98]
                ${isAnimating || lists.length === 0 ? 'opacity-70 cursor-not-allowed' : 'md:hover:shadow-2xl md:hover:shadow-primary-500/30'}
              `}
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 transition-all duration-300 ${isAnimating ? 'opacity-80' : 'md:group-hover:scale-105'}`} />
              <div className="relative bg-primary-600/10 backdrop-blur-[1px] rounded-[20px] py-6 flex flex-col items-center justify-center border border-white/10">
                  {isAnimating ? <Dice5 size={48} className="text-white/90 animate-spin mb-2" /> : <Shuffle size={48} className="text-white mb-2 drop-shadow-md" />}
                  <span className="text-2xl font-black text-white tracking-wide drop-shadow-sm">{isAnimating ? 'ГЕНЕРАЦИЯ...' : 'ГЕНЕРИРОВАТЬ'}</span>
                  <span className="text-primary-200 text-sm font-medium mt-1">Случайные команды 2x2</span>
              </div>
            </button>
        </div>

        <div className="h-8 mt-6 flex items-center justify-center relative z-0">
            {canReset && (
            <button onClick={handleResetSessionClick} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 text-xs font-bold uppercase tracking-wider md:hover:bg-red-100 dark:md:hover:bg-red-900/20 active:bg-red-100 transition-colors">
                <RotateCcw size={14} /> Сбросить сессию
            </button>
            )}
        </div>
      </main>

      <nav className="px-6 pb-safe-area-bottom bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
         <div className="flex items-center justify-around max-w-lg mx-auto h-16">
            <button onClick={handleShowLastResult} disabled={!hasResult} className={`flex flex-col items-center justify-center gap-1 w-20 h-full transition-colors ${hasResult ? 'text-primary-600 dark:text-primary-400' : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'}`}>
                <History size={24} strokeWidth={2} /> <span className="text-[10px] font-bold">История</span>
            </button>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center justify-center gap-1 w-20 h-full text-slate-400 md:hover:text-primary-600 dark:md:hover:text-primary-400 active:text-primary-600 transition-colors">
                <Settings size={24} strokeWidth={2} /> <span className="text-[10px] font-bold">Настройки</span>
            </button>
         </div>
      </nav>

      <ResultOverlay 
        isOpen={showResult} 
        onClose={() => setShowResult(false)}
        assignments={assignments}
        onRerollSpecific={handleRerollHero}
        onRerollAllHeroes={handleRerollAllHeroes}
        onShuffleTeams={handleShuffleTeams}
        onBanSpecific={handleBanHero}
        onBanAll={handleBanAllCurrent}
        onRevealHeroes={handleRevealHeroes}
        generationMode={generationMode}
        setGenerationMode={setGenerationMode}
        balanceThreshold={balanceThreshold}
        setBalanceThreshold={setBalanceThreshold}
        playerNames={playerNames}
        onSwapPositions={handleSwapPositions}
      />

      <SettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        lists={lists}
        onAddList={addList}
        onUpdateList={updateList}
        onDeleteList={deleteList}
        onUploadToCloud={uploadToCloud}
        onSync={syncWithCloud}
        reorderLists={reorderLists}
        sortLists={sortLists}
        isOnline={isOnline}
        isSyncing={isSyncing}
        checkConnectivity={checkConnectivity}
        addToast={addToast}
        updatedListIds={updatedListIds}
        onMarkSeen={markListAsSeen}
        updatedHeroIds={updatedHeroIds}
        onDismissHeroUpdates={dismissHeroUpdates}
        colorScheme={colorScheme}
        setColorScheme={setColorScheme}
        logs={consoleLogs}
        checkForUpdate={checkForUpdate}
        isCheckingUpdate={isCheckingUpdate}
        isUpdateAvailable={isUpdateAvailable}
        onUpdateApp={handleUpdateApp}
        isDebugMode={isDebugMode}
        onToggleDebug={setIsDebugMode}
      />

      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isResetConfirmOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
           <div className={`bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl transition-transform duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 ${isResetConfirmOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
              <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4"><RotateCcw size={24} /></div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Сбросить сессию?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Текущее распределение команд, имена игроков и временные списки будут удалены.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={cancelReset} className="px-4 py-3.5 font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all">Отмена</button>
                 <button onClick={confirmReset} className="px-4 py-3.5 font-bold text-white bg-red-500 rounded-2xl active:scale-95 transition-all shadow-lg shadow-red-500/20">Сбросить</button>
              </div>
           </div>
      </div>
      
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isGroupStatsOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setIsGroupStatsOpen(false)}>
          <div className={`bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl transition-all duration-300 border border-slate-100 dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10 max-h-[90dvh] flex flex-col ${isGroupStatsOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                          <BarChart3 size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Баланс героев</h3>
                  </div>
                  <button onClick={() => setIsGroupStatsOpen(false)} className="p-2 -mr-2 text-slate-400 md:hover:text-slate-900 dark:md:hover:text-white active:text-slate-900 rounded-full">
                      <X size={20} />
                  </button>
              </div>
              
              <div className="overflow-y-auto no-scrollbar flex-1 -mr-2 pr-2">
                 {(() => {
                    const { counts, max, total } = getSelectionStats();
                    return (
                        <>
                            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-4 text-center">
                                Всего героев: <span className="text-slate-900 dark:text-white font-bold">{total}</span>
                            </div>
                            {RANKS.map((rank, idx) => {
                                const count = counts[rank] || 0;
                                const percent = (count / max) * 100;
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
                                                    width: isGroupStatsOpen ? `${percent}%` : '0%',
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

      {showUpdateBanner && (
        <div className="fixed top-safe-area-top left-0 w-full z-[70] p-4 animate-in slide-in-from-top duration-500">
            <div className="max-w-md mx-auto bg-primary-600 rounded-2xl shadow-xl shadow-primary-600/30 p-4 flex items-center gap-4 text-white">
                <div className="bg-white/20 p-2 rounded-full shrink-0"><Download size={20} /></div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm">Доступно обновление</h3>
                    <p className="text-xs text-primary-100 truncate">Новая версия готова к установке</p>
                </div>
                <button onClick={handleUpdateApp} className="px-4 py-2 bg-white text-primary-600 text-xs font-bold rounded-xl whitespace-nowrap shadow-sm active:scale-95 transition-transform">Обновить</button>
                <button onClick={() => setShowUpdateBanner(false)} className="text-primary-200"><X size={18} /></button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
