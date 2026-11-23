import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useThemeContext } from './context/ThemeContext';
import { useHeroListsContext } from './context/HeroListsContext';
import { useToast } from './hooks/useToast';
import { usePWA } from './hooks/usePWA';
import { useHaptics } from './hooks/useHaptics';
import { useMatchHistoryContext } from './context/MatchHistoryContext';
import { useAppStats } from './hooks/useAppStats';
import { useGroupSelection } from './hooks/useGroupSelection';
import { useHistoryInput } from './hooks/useHistoryInput';
import { useTeamGeneration } from './hooks/useTeamGeneration';
import { useInitialAutoSync } from './hooks/useInitialAutoSync';
import { Header } from './components/Header';
import { Z_INDEX_BASE } from './constants/zIndex';
import { SourceSelector } from './components/SourceSelector';
import { PlayerNameInput } from './components/PlayerNameInput';
import { MainControls } from './components/MainControls';
import { AppNavigation } from './components/AppNavigation';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { UpdateBanner } from './components/UpdateBanner';
import { GenConfirmModal } from './components/GenConfirmModal';
import { getUniqueHeroesFromLists } from './utils/generator';
import { NavigationProvider } from './context/NavigationContext';
import { PrankOverlay } from './components/PrankOverlay';
import { useClientSync } from './hooks/useClientSync';
import { usePranks } from './hooks/usePranks';
import { APP_VERSION, getInitialLastSeenVersion } from './utils/changelog';
import { STORAGE_KEYS, getStorageItem, getStorageJSON, setStorageItem, removeStorageItem } from './utils/storage';
import { LazyOverlayBoundary } from './components/common/ErrorBoundary';
import {
    LazyResultOverlay as ResultOverlay,
    LazySettingsOverlay as SettingsOverlay,
    LazyListsOverlay as ListsOverlay,
    LazyStatsModal as StatsModal,
    LazyGroupStatsModal as GroupStatsModal,
    LazyAddHeroesModal as AddHeroesModal,
    LazyInactiveHeroesModal as InactiveHeroesModal,
    LazyChangelogOverlay as ChangelogOverlay,
    LazyAdminModal as AdminModal,
    preloadAllScreens,
} from './utils/lazyScreens';

import { Hero } from './types';

const App: React.FC = () => {
    const { theme, toggleTheme } = useThemeContext();
    const { addToast } = useToast();
    const { trigger: triggerHaptic } = useHaptics();

    // Background preload all lazy screens after initial paint so offline navigation works without network
    useEffect(() => {
        let cancelled = false;
        let timerId: ReturnType<typeof setTimeout> | null = null;

        const rafId = requestAnimationFrame(() => {
            timerId = setTimeout(() => {
                if (!cancelled) {
                    void preloadAllScreens();
                }
            }, 50);
        });

        const handleOnline = () => {
            if (!cancelled) {
                void preloadAllScreens();
            }
        };
        window.addEventListener('online', handleOnline);

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            if (timerId !== null) clearTimeout(timerId);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const {
        lists, updateList, forkList, createTemporaryList,
        resetTemporaryLists, checkConnectivity, isOnline, isLoaded: isListsLoaded,
    } = useHeroListsContext();

    const {
        isUpdateAvailable, isCheckingUpdate, showUpdateBanner, setShowUpdateBanner,
        handleUpdateApp, handleOpenUpdateBanner, checkForUpdate
    } = usePWA(addToast);

    const {
        history, addMatch, syncHistory,
    } = useMatchHistoryContext();

    // UI State
    const [selectedListId, setSelectedListId] = useState<string>(() => {
        if (typeof window === 'undefined') return '';
        const savedSelectedId = getStorageItem(STORAGE_KEYS.SELECTED_LIST_ID);
        const parsedLists = getStorageJSON<unknown>(STORAGE_KEYS.LISTS, null);

        if (savedSelectedId && Array.isArray(parsedLists) && parsedLists.some((l: any) => l.id === savedSelectedId)) {
            return savedSelectedId;
        }

        if (Array.isArray(parsedLists) && parsedLists.length > 0) {
            return parsedLists[0].id;
        }

        return '';
    });
    const [isListSelectorOpen, setIsListSelectorOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isListsOpen, setIsListsOpen] = useState(false);
    const [isGroupStatsOpen, setIsGroupStatsOpen] = useState(false);
    const [isHistoryStatsOpen, setIsHistoryStatsOpen] = useState(false);
    const [isGenConfirmOpen, setIsGenConfirmOpen] = useState(false);
    const [isAddHeroesOpen, setIsAddHeroesOpen] = useState(false);
    const [isInactiveHeroesOpen, setIsInactiveHeroesOpen] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(() =>
        getInitialLastSeenVersion()
    );

    // Client Sync & Admin / Pranks
    const {
        clientId,
        clientData,
        isAdmin,
        activePrank,
        allClients,
        isLoadingAllClients,
        subscribeToAllClients,
        updateClientName,
        setClientAdmin,
        setClientPrank,
        clearClientPrank,
        deleteClient
    } = useClientSync();

    const {
        isUpsideDown,
        isMirror,
        secretMessage,
        remainingSeconds,
        dismissSecretMessage
    } = usePranks({
        activePrank,
        onClearPrank: () => clearClientPrank(clientId)
    });

    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

    // Custom Hooks
    // const { consoleLogs, isDebugMode, setIsDebugMode } = useDebugLogs(); // REMOVED

    const {
        isGroupMode, setIsGroupMode, selectedGroupIds, setSelectedGroupIds, handleToggleGroupItem: baseHandleToggleGroup
    } = useGroupSelection(lists, selectedListId);

    const {
        playerNames, setPlayerNames, savedTeams, setSavedTeams, deleteHistoryConfirm,
        setDeleteHistoryConfirm, isNamesOpen, setIsNamesOpen, handleNameChange,
        saveTeamHistory, handleSelectSavedTeam: baseHandleSelectSavedTeam, handleDeleteHistoryItem,
        historyScrollRef, isHistoryDragging, handleHistoryMouseDown, handleHistoryMouseLeave,
        handleHistoryMouseUp, handleHistoryMouseMove, isHistoryDragScroll
    } = useHistoryInput();

    // Unique player names from match history for autocomplete
    const uniquePlayerNames = useMemo(() => {
        const names = new Set<string>();
        history.forEach(m => {
            m.team1.forEach(p => {
                const clean = p.name.trim();
                if (clean) names.add(clean);
            });
            m.team2.forEach(p => {
                const clean = p.name.trim();
                if (clean) names.add(clean);
            });
        });
        return Array.from(names).sort();
    }, [history]);

    const activeList = lists.find(l => l.id === selectedListId);

    // Derived Values
    const filledNamesCount = playerNames.filter(n => n.trim() !== '').length;
    // Calculate unique heroes for UI label
    const uniqueGroupHeroes = isGroupMode ? getUniqueHeroesFromLists(lists.filter(l => selectedGroupIds.has(l.id))) : [];
    const groupTotalHeroes = uniqueGroupHeroes.length;
    const selectedGroupCount = selectedGroupIds.size;

    const { getRankBarColor, getSelectionStats } = useAppStats(isGroupMode, selectedGroupIds, lists, activeList);

    const {
        assignments, setAssignments, generationMode, setGenerationMode,
        balanceThreshold, setBalanceThreshold, showResult, setShowResult,
        isAnimating, isResetConfirmOpen, setIsResetConfirmOpen, handleGenerate,
        handleRevealHeroes, handleResetSessionClick, confirmReset, cancelReset,
        handleShowLastResult, handleRecordResult, handleRerollHero,
        handleRerollAllHeroes, handleShuffleTeams, handleBanHero, handleBanAllCurrent,
        handleSwapPositions, handleManualHeroSelect, getAvailableHeroesPool,
        extraMode, setExtraMode,
        prioritizeUnplayed, setPrioritizeUnplayed, isDebugMode, setIsDebugMode
    } = useTeamGeneration({
        lists, activeList, isGroupMode, selectedGroupIds, addToast, triggerHaptic,
        playerNames, saveTeamHistory, resetTemporaryLists, updateList, forkList,
        createTemporaryList, setSelectedListId, setIsGroupMode, addMatch,
        history,
        onSwapNames: (idx1, idx2) => {
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
        },
        onAfterRecordResult: () => {
            if (isDebugMode) return;
            // Quiet background auto-sync with Lie-Fi verification
            (async () => {
                const hasNet = await checkConnectivity(2500);
                if (hasNet) {
                    await syncHistory({ silentIfNoChanges: true, silentErrors: true });
                }
            })().catch(e => console.warn('Background match sync skipped/failed:', e));
        }
    });

    // Одноразовая автосинхронизация списков и статистики при самом первом запуске НОВОГО пользователя из сети
    useInitialAutoSync(setLastSeenVersion);

    // Effect: Select default list if none selected
    useEffect(() => {
        if (isListsLoaded && lists.length > 0) {
            const exists = lists.find(l => l.id === selectedListId);
            if (!exists) {
                setSelectedListId(lists[0].id);
            }
        } else if (isListsLoaded && lists.length === 0) {
            setSelectedListId('');
        }
    }, [lists, isListsLoaded, selectedListId]);

    // Save selected list ID to localStorage whenever it changes
    useEffect(() => {
        if (selectedListId) {
            setStorageItem(STORAGE_KEYS.SELECTED_LIST_ID, selectedListId);
        } else {
            removeStorageItem(STORAGE_KEYS.SELECTED_LIST_ID);
        }
    }, [selectedListId]);

    // Показ чейнджлога при входе после обновления приложения
    useEffect(() => {
        if (isListsLoaded) {
            window.scrollTo(0, 0);
            if (window.location.search.includes('updated=')) {
                window.history.replaceState({}, '', window.location.pathname);
            }

            if (lastSeenVersion && lastSeenVersion !== APP_VERSION) {
                setIsChangelogOpen(true);
            }
        }
    }, [isListsLoaded, lastSeenVersion]);

    const handleCloseChangelog = () => {
        setIsChangelogOpen(false);
        setStorageItem(STORAGE_KEYS.LAST_SEEN_VERSION, APP_VERSION);
        setLastSeenVersion(APP_VERSION);
    };

    const handleSetLastSeenVersion = (version: string | null) => {
        if (!version || version === 'ALL_UNREAD') {
            removeStorageItem(STORAGE_KEYS.LAST_SEEN_VERSION);
            setLastSeenVersion(null);
        } else {
            setStorageItem(STORAGE_KEYS.LAST_SEEN_VERSION, version);
            setLastSeenVersion(version);
        }
    };

    // Handlers wrapped with haptics
    const handleSelectList = (id: string) => {
        setSelectedListId(id);
        triggerHaptic(10);
    };

    const handleToggleGroupItem = (id: string) => {
        baseHandleToggleGroup(id);
        triggerHaptic(10);
    };

    const handleSelectSavedTeam = (team: string[]) => {
        baseHandleSelectSavedTeam(team);
        triggerHaptic(10);
    };

    const handleToggleTheme = () => {
        toggleTheme();
        triggerHaptic(10);
    };

    const hasTemporaryLists = lists.some(l => l.isTemporary);
    const hasResult = assignments.length > 0;
    const canReset = hasResult || hasTemporaryLists;

    const handleGenerateClick = () => {
        if (hasResult) {
            triggerHaptic(10);
            setIsGenConfirmOpen(true);
        } else {
            handleGenerate();
        }
    };

    const confirmGenerate = () => {
        setIsGenConfirmOpen(false);
        handleGenerate();
    };

    const handleAppendHeroesToSelected = (selectedHeroes: Hero[]) => {
        const baseLists = isGroupMode
            ? lists.filter(l => selectedGroupIds.has(l.id))
            : activeList ? [activeList] : [];

        const baseHeroes = getUniqueHeroesFromLists(baseLists);
        const combinedHeroes = [...baseHeroes];
        const existingNames = new Set(baseHeroes.map(h => h.name.trim().toLowerCase()));

        selectedHeroes.forEach(hero => {
            const normName = hero.name.trim().toLowerCase();
            if (!existingNames.has(normName)) {
                combinedHeroes.push(hero);
                existingNames.add(normName);
            }
        });

        const newId = createTemporaryList(combinedHeroes, "Временный");
        setSelectedListId(newId);
        setIsGroupMode(false);

        addToast(`Создан временный список, добавлено героев: ${selectedHeroes.length}`, 'success');
    };

    const handleOpenInactiveModal = () => {
        setIsInactiveHeroesOpen(true);
        triggerHaptic(10);
    };

    const handleOpenLists = useCallback(() => {
        setIsListsOpen(true);
        triggerHaptic(10);
    }, [triggerHaptic]);

    const handleCloseLists = useCallback(() => {
        setIsListsOpen(false);
    }, []);

    return (
        <NavigationProvider>
            <div className="relative h-full w-full flex flex-col bg-transparent transition-colors duration-300 overflow-hidden">
                <Header
                    isCheckingUpdate={isCheckingUpdate}
                    isUpdateAvailable={isUpdateAvailable}
                    handleOpenUpdateBanner={handleOpenUpdateBanner}
                    theme={theme}
                    toggleTheme={handleToggleTheme}
                    isAdmin={isAdmin}
                    onOpenAdmin={() => {
                        triggerHaptic(30);
                        setIsAdminModalOpen(true);
                    }}
                />

                <main className="flex-1 flex flex-col items-center main-content-layout px-6 pt-6 pb-28 w-full max-w-lg mx-auto relative">
                    <div
                        aria-hidden="true"
                        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-all duration-300 ${isListSelectorOpen || isNamesOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                        style={{ zIndex: Z_INDEX_BASE.BACKDROP }}
                        onClick={() => {
                            setIsListSelectorOpen(false);
                            setIsNamesOpen(false);
                        }}
                    />

                    <SourceSelector
                        lists={lists}
                        activeList={activeList}
                        selectedListId={selectedListId}
                        isGroupMode={isGroupMode}
                        setIsGroupMode={setIsGroupMode}
                        selectedGroupIds={selectedGroupIds}
                        handleToggleGroupItem={handleToggleGroupItem}
                        handleSelectList={handleSelectList}
                        isListSelectorOpen={isListSelectorOpen}
                        setIsListSelectorOpen={setIsListSelectorOpen}
                        setIsGroupStatsOpen={setIsGroupStatsOpen}
                        isOnline={isOnline}
                        groupTotalHeroes={groupTotalHeroes}
                        selectedGroupCount={selectedGroupCount}
                        onOpenAddHeroes={() => { setIsAddHeroesOpen(true); triggerHaptic(10); }}
                        onOpenInactiveModal={handleOpenInactiveModal}
                    />

                    <PlayerNameInput
                        isNamesOpen={isNamesOpen}
                        setIsNamesOpen={setIsNamesOpen}
                        filledNamesCount={filledNamesCount}
                        savedTeams={savedTeams}
                        historyScrollRef={historyScrollRef}
                        handleHistoryMouseDown={handleHistoryMouseDown}
                        handleHistoryMouseLeave={handleHistoryMouseLeave}
                        handleHistoryMouseUp={handleHistoryMouseUp}
                        handleHistoryMouseMove={handleHistoryMouseMove}
                        isHistoryDragging={isHistoryDragging}
                        isHistoryDragScroll={isHistoryDragScroll}
                        deleteHistoryConfirm={deleteHistoryConfirm}
                        handleSelectSavedTeam={handleSelectSavedTeam}
                        handleDeleteHistoryItem={(e, i) => {
                            if (handleDeleteHistoryItem(e, i)) {
                                triggerHaptic(20);
                            } else {
                                triggerHaptic(10);
                            }
                        }}
                        playerNames={playerNames}
                        handleNameChange={handleNameChange}
                        uniquePlayerNames={uniquePlayerNames}
                    />

                    <MainControls
                        handleGenerate={handleGenerateClick}
                        isAnimating={isAnimating}
                        hasLists={lists.length > 0}
                        canReset={canReset}
                        handleResetSessionClick={handleResetSessionClick}
                        hasResult={hasResult}
                        handleOpenSession={() => { triggerHaptic(10); handleShowLastResult(); }}
                    />
                </main>

                <AppNavigation
                    onOpenStats={() => { setIsHistoryStatsOpen(true); triggerHaptic(10); }}
                    onOpenLists={handleOpenLists}
                    onOpenSettings={() => { setIsSettingsOpen(true); triggerHaptic(10); }}
                />

                <LazyOverlayBoundary
                    isOpen={showResult}
                    onClose={() => setShowResult(false)}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка экрана результатов"
                >
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
                        onRecordResult={handleRecordResult}
                        onManualSelect={handleManualHeroSelect}
                        availableHeroes={getAvailableHeroesPool()}
                        extraMode={extraMode}
                        setExtraMode={setExtraMode}
                        prioritizeUnplayed={prioritizeUnplayed}
                        setPrioritizeUnplayed={setPrioritizeUnplayed}
                        isDebugMode={isDebugMode}
                    />
                </LazyOverlayBoundary>

                <LazyOverlayBoundary
                    isOpen={isListsOpen}
                    onClose={handleCloseLists}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка экрана списков"
                >
                    <ListsOverlay
                        isOpen={isListsOpen}
                        onClose={handleCloseLists}
                        onOpenInactiveModal={handleOpenInactiveModal}
                    />
                </LazyOverlayBoundary>

                <LazyOverlayBoundary
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка экрана настроек"
                >
                    <SettingsOverlay
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        checkForUpdate={checkForUpdate}
                        isCheckingUpdate={isCheckingUpdate}
                        isUpdateAvailable={isUpdateAvailable}
                        onUpdateApp={handleUpdateApp}
                        isDebugMode={isDebugMode}
                        onToggleDebug={setIsDebugMode}
                        onOpenChangelog={() => setIsChangelogOpen(true)}
                        lastSeenVersion={lastSeenVersion}
                        onSetLastSeenVersion={handleSetLastSeenVersion}
                        clientId={clientId}
                        isAdmin={isAdmin}
                    />
                </LazyOverlayBoundary>

                <LazyOverlayBoundary
                    isOpen={isHistoryStatsOpen}
                    onClose={() => setIsHistoryStatsOpen(false)}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка экрана статистики"
                >
                    <StatsModal
                        isOpen={isHistoryStatsOpen}
                        onClose={() => setIsHistoryStatsOpen(false)}
                        isDebugMode={isDebugMode}
                        onOpenInactiveModal={handleOpenInactiveModal}
                    />
                </LazyOverlayBoundary>

                <ResetConfirmModal
                    isOpen={isResetConfirmOpen}
                    onCancel={cancelReset}
                    onConfirm={confirmReset}
                    onResetAndSync={isDebugMode ? undefined : () => {
                        confirmReset();
                        syncHistory();
                        triggerHaptic(20);
                    }}
                    isOnline={isOnline}
                    checkConnectivity={checkConnectivity}
                />

                <LazyOverlayBoundary
                    isOpen={isGroupStatsOpen}
                    onClose={() => setIsGroupStatsOpen(false)}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка баланса героев"
                >
                    <GroupStatsModal
                        isOpen={isGroupStatsOpen}
                        onClose={() => setIsGroupStatsOpen(false)}
                        getSelectionStats={getSelectionStats}
                        getRankBarColor={getRankBarColor}
                    />
                </LazyOverlayBoundary>

                <GenConfirmModal
                    isOpen={isGenConfirmOpen}
                    onCancel={() => setIsGenConfirmOpen(false)}
                    onConfirm={confirmGenerate}
                />

                <LazyOverlayBoundary
                    isOpen={isAddHeroesOpen}
                    onClose={() => setIsAddHeroesOpen(false)}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка добавления героев"
                >
                    <AddHeroesModal
                        isOpen={isAddHeroesOpen}
                        onClose={() => setIsAddHeroesOpen(false)}
                        lists={lists}
                        excludeListIds={isGroupMode ? selectedGroupIds : new Set(activeList ? [activeList.id] : [])}
                        onAddHeroes={handleAppendHeroesToSelected}
                        triggerHaptic={triggerHaptic}
                    />
                </LazyOverlayBoundary>

                <LazyOverlayBoundary
                    isOpen={isInactiveHeroesOpen}
                    onClose={() => setIsInactiveHeroesOpen(false)}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка фильтра забытых героев"
                >
                    <InactiveHeroesModal
                        isOpen={isInactiveHeroesOpen}
                        onClose={() => setIsInactiveHeroesOpen(false)}
                        lists={lists}
                        history={history}
                        onCreateTemporaryList={createTemporaryList}
                        onSelectList={setSelectedListId}
                        triggerHaptic={triggerHaptic}
                        addToast={addToast}
                    />
                </LazyOverlayBoundary>

                <UpdateBanner
                    isVisible={showUpdateBanner}
                    onUpdate={handleUpdateApp}
                    onClose={() => setShowUpdateBanner(false)}
                />

                <LazyOverlayBoundary
                    isOpen={isChangelogOpen}
                    onClose={handleCloseChangelog}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка списка изменений"
                >
                    <ChangelogOverlay
                        isOpen={isChangelogOpen}
                        onClose={handleCloseChangelog}
                        lastSeenVersion={lastSeenVersion}
                        triggerHaptic={triggerHaptic}
                    />
                </LazyOverlayBoundary>

                <LazyOverlayBoundary
                    isOpen={isAdminModalOpen}
                    onClose={() => setIsAdminModalOpen(false)}
                    showDetails={isDebugMode}
                    fallbackTitle="Ошибка панели администратора"
                >
                    <AdminModal
                        isOpen={isAdminModalOpen}
                        onClose={() => setIsAdminModalOpen(false)}
                        currentClientId={clientId}
                        allClients={allClients}
                        isLoadingClients={isLoadingAllClients}
                        onSubscribeToClients={subscribeToAllClients}
                        onUpdateClientName={updateClientName}
                        onSetClientAdmin={setClientAdmin}
                        onSetClientPrank={setClientPrank}
                        onClearClientPrank={clearClientPrank}
                        onDeleteClient={deleteClient}
                        isOnline={isOnline}
                        addToast={addToast}
                    />
                </LazyOverlayBoundary>

                <PrankOverlay
                    isUpsideDown={isUpsideDown}
                    isMirror={isMirror}
                    secretMessage={secretMessage}
                    remainingSeconds={remainingSeconds}
                    onDismissMessage={dismissSecretMessage}
                />
            </div>
        </NavigationProvider>
    );
};

export default App;

