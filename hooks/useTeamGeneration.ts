import { useState, useEffect } from 'react';
import { Hero, HeroList, AssignedPlayer, GenerationMode, MatchRecord } from '../types';
import { generateAssignmentsWithMode, getHeroWeight, getUniqueHeroesFromLists, getHeroHistoryWeights, selectWeightedSingle } from '../utils/generator';

const STORAGE_KEY_ASSIGNMENTS = 'randomatched_last_session_v1';
const STORAGE_KEY_DEBUG_MODE = 'randomatched_debug_mode_v1';

// We need to define the props this hook expects
interface UseTeamGenerationProps {
    lists: HeroList[];
    activeList?: HeroList;
    isGroupMode: boolean;
    selectedGroupIds: Set<string>;
    addToast: (msg: string, type?: any, duration?: number) => void;
    triggerHaptic: (pattern: number | number[]) => void;
    playerNames: string[];
    saveTeamHistory: () => void;
    resetTemporaryLists: () => void;
    updateList: (id: string, updates: Partial<HeroList>) => void;
    forkList: (id: string, heroes: Hero[]) => string | null;
    createTemporaryList: (heroes: Hero[], name?: string) => string;
    setSelectedListId: (id: string) => void;
    setIsGroupMode: (val: boolean) => void;
    addMatch: (assignments: AssignedPlayer[], winner: 'team1' | 'team2', playerNames: string[], playerKills?: Record<string, number>) => void;
    onSwapNames: (idx1: number, idx2: number) => void;
    history: MatchRecord[];
}

export const useTeamGeneration = ({
    lists,
    activeList,
    isGroupMode,
    selectedGroupIds,
    addToast,
    triggerHaptic,
    playerNames,
    saveTeamHistory,
    resetTemporaryLists,
    updateList,
    forkList,
    createTemporaryList,
    setSelectedListId,
    setIsGroupMode,
    addMatch,
    onSwapNames,
    history
}: UseTeamGenerationProps) => {

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
    const [generationMode, setGenerationMode] = useState<GenerationMode>(() => {
        try {
            const saved = localStorage.getItem('randomatched_generation_mode_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed === 'random' || parsed === 'balanced' || parsed === 'strict') {
                    return parsed;
                }
            }
            return 'balanced';
        } catch (e) {
            return 'balanced';
        }
    });
    const [balanceThreshold, setBalanceThreshold] = useState<number>(1);
    const [prioritizeUnplayed, setPrioritizeUnplayed] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('randomatched_prioritize_unplayed_v1');
            return saved ? JSON.parse(saved) : false;
        } catch (e) {
            return false;
        }
    });
    const [isDebugMode, setIsDebugMode] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_DEBUG_MODE);
            return saved ? JSON.parse(saved) : false;
        } catch (e) {
            return false;
        }
    });
    const [showResult, setShowResult] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
    }, [assignments]);

    useEffect(() => {
        localStorage.setItem('randomatched_generation_mode_v1', JSON.stringify(generationMode));
    }, [generationMode]);

    useEffect(() => {
        localStorage.setItem('randomatched_prioritize_unplayed_v1', JSON.stringify(prioritizeUnplayed));
    }, [prioritizeUnplayed]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_DEBUG_MODE, JSON.stringify(isDebugMode));
    }, [isDebugMode]);

    const handleGenerate = () => {
        triggerHaptic(20);
        if (lists.length === 0) {
            addToast("Сначала создайте список героев в настройках", "warning");
            triggerHaptic([20, 50, 20]);
            return;
        }

        let targetLists: HeroList[] = [];

        if (isGroupMode) {
            if (selectedGroupIds.size === 0) {
                addToast("Выберите хотя бы один список для группы", "warning");
                triggerHaptic([20, 50, 20]);
                return;
            }
            targetLists = lists.filter(l => selectedGroupIds.has(l.id));
        } else {
            if (!activeList) {
                addToast("Выберите список для генерации", "warning");
                triggerHaptic([20, 50, 20]);
                return;
            }
            targetLists = [activeList];
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
            triggerHaptic([20, 50, 20]);
            return;
        }

        saveTeamHistory();
        // Ideally we should close modals here, but state is external. 
        // We can return a success indicator or have the parent handle closing.
        // For now we will assume parent handles closing via "isGenerating" effects or similar, 
        // OR we just focus on logic here. Use a callback or return value if needed.

        setIsAnimating(true);

        setTimeout(() => {
            const positions: ('bottom' | 'top' | 'left' | 'right')[] = ['bottom', 'top', 'left', 'right'];
            const playerNumbers = [1, 2, 3, 4].sort(() => 0.5 - Math.random());

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
            setShowResult(true);
            triggerHaptic(50);
        }, 400);
    };

    const handleRevealHeroes = () => {
        triggerHaptic(20);
        let targetLists: HeroList[] = [];
        if (isGroupMode) {
            targetLists = lists.filter(l => selectedGroupIds.has(l.id));
        } else {
            if (activeList) targetLists = [activeList];
        }

        const pool = getAvailableHeroesPool();
        const weights = getHeroHistoryWeights(history, pool, prioritizeUnplayed);
        const generated = generateAssignmentsWithMode(targetLists, generationMode, balanceThreshold, assignments, addToast, weights);
        setAssignments(generated);
        triggerHaptic(30);
    };

    const handleResetSessionClick = () => {
        setIsResetConfirmOpen(true);
        triggerHaptic(10);
    };

    const confirmReset = () => {
        setAssignments([]);
        // Clearing player names is handled by parent or we need a setter for it
        // But wait, App.tsx cleared player names too. 
        // 'setPlayerNames' is not passed here. 
        // Maybe we should keep playerNames state management separate or pass the setter?
        // Let's assume for now we only reset session-related stuff (assignments).
        // If we want to reset names, we need the setter.
        resetTemporaryLists();
        localStorage.removeItem(STORAGE_KEY_ASSIGNMENTS);
        setIsResetConfirmOpen(false);
        addToast("Сессия сброшена", "info", 1500);
        triggerHaptic(20);
    };

    const cancelReset = () => {
        setIsResetConfirmOpen(false);
    };

    const handleShowLastResult = () => {
        if (assignments.length > 0) {
            setShowResult(true);
            triggerHaptic(10);
        }
    };

    const handleRecordResult = (winner: 'team1' | 'team2', playerKills?: Record<string, number>) => {
        addMatch(assignments, winner, playerNames, playerKills);
        addToast("Результат матча сохранен", "success");
        triggerHaptic(50);
    }

    // --- RE-ROLL LOGIC ---
    const getAvailableHeroesPool = () => {
        if (isGroupMode) {
            return getUniqueHeroesFromLists(lists.filter(l => selectedGroupIds.has(l.id)));
        } else {
            return activeList ? activeList.heroes : [];
        }
    };

    const handleRerollHero = (playerNumber: number) => {
        triggerHaptic(10);
        const allHeroes = getAvailableHeroesPool();
        const currentHeroIds = assignments.map(a => a.hero ? a.hero.id : '').filter(id => id !== '');

        // Filter duplicates by name for safety during reroll check
        const availableHeroes = allHeroes.filter(h => !currentHeroIds.includes(h.id));

        if (availableHeroes.length === 0) {
            addToast("Нет доступных героев для замены.", "warning");
            triggerHaptic([20, 50, 20]);
            return;
        }

        const pool = getAvailableHeroesPool();
        const weights = getHeroHistoryWeights(history, pool, prioritizeUnplayed);

        let newHero: Hero;

        if (generationMode === 'random') {
            if (prioritizeUnplayed && weights) {
                newHero = selectWeightedSingle(availableHeroes, h => weights.get(h.id) || 1);
            } else {
                newHero = availableHeroes[Math.floor(Math.random() * availableHeroes.length)];
            }
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

            const candidates = availableHeroes.map(h => {
                const w = getHeroWeight(h);
                const diff = Math.abs(opposingWeight - (myTeamCurrentWeight + w));
                return { hero: h, diff };
            });

            if (generationMode === 'strict') {
                const validOptions = candidates.filter(c => c.diff <= balanceThreshold);

                if (validOptions.length > 0) {
                    if (prioritizeUnplayed && weights) {
                        newHero = selectWeightedSingle(validOptions, c => weights.get(c.hero.id) || 1).hero;
                    } else {
                        newHero = validOptions[Math.floor(Math.random() * validOptions.length)].hero;
                    }
                } else {
                    const bestPossibleDiff = Math.min(...candidates.map(c => c.diff));
                    const bestOptions = candidates.filter(c => c.diff === bestPossibleDiff);
                    if (prioritizeUnplayed && weights) {
                        newHero = selectWeightedSingle(bestOptions, c => weights.get(c.hero.id) || 1).hero;
                    } else {
                        newHero = bestOptions[Math.floor(Math.random() * bestOptions.length)].hero;
                    }
                    addToast(`Не найдено героев с разницей ≤ ${balanceThreshold}. Выбран ближайший.`, "info", 2000);
                }

            } else {
                const bestPossibleDiff = Math.min(...candidates.map(c => c.diff));
                const TOLERANCE = 1;

                const validOptions = candidates.filter(c => c.diff <= bestPossibleDiff + TOLERANCE);

                if (prioritizeUnplayed && weights) {
                    newHero = selectWeightedSingle(validOptions, c => weights.get(c.hero.id) || 1).hero;
                } else {
                    newHero = validOptions[Math.floor(Math.random() * validOptions.length)].hero;
                }
            }
        }

        setAssignments(prev => prev.map(p => p.playerNumber === playerNumber ? { ...p, hero: newHero } : p));
    };

    const handleRerollAllHeroes = () => {
        triggerHaptic(20);
        let targetLists: HeroList[] = [];
        if (isGroupMode) {
            targetLists = lists.filter(l => selectedGroupIds.has(l.id));
        } else {
            if (activeList) targetLists = [activeList];
        }
        const uniqueHeroes = getUniqueHeroesFromLists(targetLists);

        if (uniqueHeroes.length < 4) {
            addToast("Недостаточно уникальных героев для переброса.", "warning");
            triggerHaptic([20, 50, 20]);
            return;
        }

        const pool = getAvailableHeroesPool();
        const weights = getHeroHistoryWeights(history, pool, prioritizeUnplayed);
        const generated = generateAssignmentsWithMode(targetLists, generationMode, balanceThreshold, assignments, addToast, weights);
        setAssignments(generated);
    };

    const handleShuffleTeams = () => {
        triggerHaptic(20);
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
        triggerHaptic(20);

        const assignmentToBan = assignments.find(a => a.playerNumber === playerNumber);
        if (!assignmentToBan || !assignmentToBan.hero) return;
        const heroToBan = assignmentToBan.hero;

        const allHeroes = getAvailableHeroesPool();
        const currentHeroIds = assignments.map(a => a.hero ? a.hero.id : '').filter(Boolean);
        const availableForReplacement = allHeroes.filter(h => !currentHeroIds.includes(h.id));

        if (availableForReplacement.length === 0) { addToast("Некого брать на замену!", "warning"); triggerHaptic([20, 50, 20]); return; }
        const newHero = availableForReplacement[Math.floor(Math.random() * availableForReplacement.length)];

        setAssignments(prev => prev.map(p => p.playerNumber === playerNumber ? { ...p, hero: newHero } : p));

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
        triggerHaptic(30);
        const heroesToBan = assignments.filter(a => a.hero !== null).map(a => a.hero!);

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

    const handleSwapPositions = (pos1: 'top' | 'bottom' | 'left' | 'right', pos2: 'top' | 'bottom' | 'left' | 'right') => {
        triggerHaptic(10);

        const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
        const idx1 = positionToIndex[pos1];
        const idx2 = positionToIndex[pos2];

        onSwapNames(idx1, idx2);

        setAssignments(prev => {
            const newAssignments = prev.map(a => ({ ...a })); // Shallow copy items
            const a1 = newAssignments.find(a => a.position === pos1);
            const a2 = newAssignments.find(a => a.position === pos2);

            if (a1 && a2) {
                // Swap POSITIONS, keeping everything else (team, hero, playerNumber) attached to the object
                // effectively moving the card to the new slot visually
                const tempPos = a1.position;
                a1.position = a2.position;
                a2.position = tempPos;
            }
            return newAssignments;
        });
    };

    return {
        assignments,
        setAssignments,
        generationMode,
        setGenerationMode,
        balanceThreshold,
        setBalanceThreshold,
        showResult,
        setShowResult,
        isAnimating,
        isResetConfirmOpen,
        setIsResetConfirmOpen,
        handleGenerate,
        handleRevealHeroes,
        handleResetSessionClick,
        confirmReset,
        cancelReset,
        handleShowLastResult,
        handleRecordResult,
        handleRerollHero,
        handleRerollAllHeroes,
        handleShuffleTeams,
        handleBanHero,
        handleBanAllCurrent,
        handleSwapPositions,
        // New manual selection
        getAvailableHeroesPool,
        handleManualHeroSelect: (playerNumber: number, hero: Hero) => {
            triggerHaptic(10);
            if (assignments.some(a => a.playerNumber !== playerNumber && a.hero?.id === hero.id)) {
                addToast("Этот герой уже занят другим игроком!", "warning");
                return;
            }
            setAssignments(prev => prev.map(p => p.playerNumber === playerNumber ? { ...p, hero } : p));
            addToast(`Герой изменен на ${hero.name}`, "success");
        },
        prioritizeUnplayed,
        setPrioritizeUnplayed,
        isDebugMode,
        setIsDebugMode
    };
};
