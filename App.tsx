import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from './hooks/useTheme';
import { useHeroLists } from './hooks/useHeroLists';
import { useToast } from './hooks/useToast';
import { usePWA } from './hooks/usePWA';
import { useHaptics, HapticsProvider } from './hooks/useHaptics';
import { useMatchHistory } from './hooks/useMatchHistory';
import { useAppStats } from './hooks/useAppStats';
import { useGroupSelection } from './hooks/useGroupSelection';
import { useHistoryInput } from './hooks/useHistoryInput';
import { useTeamGeneration } from './hooks/useTeamGeneration';
import { useSeasons } from './hooks/useSeasons';
import { ResultOverlay } from './components/ResultOverlay';
import { SettingsOverlay } from './components/SettingsOverlay';
import { ListsOverlay } from './components/ListsOverlay';
import { StatsModal } from './components/StatsModal';
import { ToastContainer } from './components/Toast';
import { Header } from './components/Header';
import { SourceSelector } from './components/SourceSelector';
import { PlayerNameInput } from './components/PlayerNameInput';
import { MainControls } from './components/MainControls';
import { AppNavigation } from './components/AppNavigation';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { GroupStatsModal } from './components/GroupStatsModal';
import { UpdateBanner } from './components/UpdateBanner';
import { GenConfirmModal } from './components/GenConfirmModal';
import { getUniqueHeroesFromLists } from './utils/generator';
import { NavigationProvider } from './context/NavigationContext';
import { AddHeroesModal } from './components/AddHeroesModal';
import { ChangelogOverlay } from './components/ChangelogOverlay';
import { useAvatars } from './context/AvatarContext';
import { APP_VERSION, getInitialLastSeenVersion } from './utils/changelog';

import { Hero } from './types';

const App: React.FC = () => {
    const {
        theme,
        toggleTheme,
        colorScheme,
        setColorScheme,
        roundness,
        setRoundness,
        bgPattern,
        setBgPattern,
        bgGradient,
        setBgGradient
    } = useTheme();
    const { toasts, addToast, removeToast } = useToast();
    const { trigger: triggerHaptic, toggle: toggleHaptics, isEnabled: hapticsEnabled, forceAudioMode, toggleForceAudioMode, setForceAudioMode } = useHaptics();

    const {
        lists, addList, updateList, deleteList, forkList, createTemporaryList,
        resetTemporaryLists, uploadToCloud, syncWithCloud, reorderLists,
        sortLists, checkConnectivity, isOnline, isSyncing, updatedListIds,
        markListAsSeen, updatedHeroIds, dismissHeroUpdates, isLoaded
    } = useHeroLists(addToast);

    const {
        isUpdateAvailable, isCheckingUpdate, showUpdateBanner, setShowUpdateBanner,
        handleUpdateApp, handleOpenUpdateBanner, checkForUpdate
    } = usePWA(addToast);

    const {
        history, addMatch, addManualMatch, updateMatch, deleteMatch,
        renamePlayer, renameHero, syncHistory, isSyncingHistory,
        deletedHistory, restoreMatch, permanentDeleteMatch, clearTrash, importData,
        // Облачный бэкап
        createCloudBackup, listCloudBackups, restoreFromCloudBackup,
        cloudBackups, isCreatingBackup, isLoadingBackups, isRestoringBackup,
        deleteCloudBackup, getCloudBackupDetails
    } = useMatchHistory(addToast);

    const {
        seasons, latestSeason, addSeason, updateSeason, deleteSeason, syncSeasons, importSeasons
    } = useSeasons(addToast);

    const { syncAvatarsToCloud, importAvatars } = useAvatars();

    const handleImportDataCombined = (data: any) => {
        const success = importData(data);
        if (success && Array.isArray(data.seasons)) {
            importSeasons(data.seasons);
        }
        if (success && data.avatars && typeof data.avatars === 'object') {
            importAvatars(data.avatars);
        }
        return success;
    };


    // UI State
    const [selectedListId, setSelectedListId] = useState<string>(() => {
        if (typeof window === 'undefined') return '';
        const savedSelectedId = localStorage.getItem('randomatched_selected_list_id');
        if (savedSelectedId) {
            try {
                const storedLists = localStorage.getItem('randomatched_lists_v1');
                if (storedLists) {
                    const parsedLists = JSON.parse(storedLists);
                    if (Array.isArray(parsedLists) && parsedLists.some((l: any) => l.id === savedSelectedId)) {
                        return savedSelectedId;
                    }
                }
            } catch (e) {
                console.error("Failed to parse lists for selectedListId check", e);
            }
        }
        
        try {
            const storedLists = localStorage.getItem('randomatched_lists_v1');
            if (storedLists) {
                const parsedLists = JSON.parse(storedLists);
                if (Array.isArray(parsedLists) && parsedLists.length > 0) {
                    return parsedLists[0].id;
                }
            }
        } catch (e) {
            console.error("Failed to parse lists for default selectedListId", e);
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
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(() =>
        getInitialLastSeenVersion()
    );

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
        }
    });

    // Effect: Select default list if none selected
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

    // Save selected list ID to localStorage whenever it changes
    useEffect(() => {
        if (selectedListId) {
            localStorage.setItem('randomatched_selected_list_id', selectedListId);
        } else {
            localStorage.removeItem('randomatched_selected_list_id');
        }
    }, [selectedListId]);

    // Показ чейнджлога при первом входе после обновления и сброс возможного сдвига скролла PWA
    useEffect(() => {
        if (isLoaded) {
            window.scrollTo(0, 0);
            if (window.location.search.includes('updated=')) {
                window.history.replaceState({}, '', window.location.pathname);
            }

            if (!lastSeenVersion || lastSeenVersion !== APP_VERSION) {
                setIsChangelogOpen(true);
            }
        }
    }, [isLoaded, lastSeenVersion]);

    const handleCloseChangelog = () => {
        setIsChangelogOpen(false);
        localStorage.setItem('randomatched_last_seen_version', APP_VERSION);
        setLastSeenVersion(APP_VERSION);
    };

    const handleSetLastSeenVersion = (version: string | null) => {
        if (!version || version === 'ALL_UNREAD') {
            localStorage.removeItem('randomatched_last_seen_version');
            setLastSeenVersion(null);
        } else {
            localStorage.setItem('randomatched_last_seen_version', version);
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

    return (
        <NavigationProvider>
            <div className="relative h-full w-full flex flex-col bg-transparent transition-colors duration-300 overflow-hidden">
                <ToastContainer toasts={toasts} removeToast={removeToast} />

                <Header
                    isCheckingUpdate={isCheckingUpdate}
                    isUpdateAvailable={isUpdateAvailable}
                    handleOpenUpdateBanner={handleOpenUpdateBanner}
                    theme={theme}
                    toggleTheme={handleToggleTheme}
                />

                <main className="flex-1 flex flex-col items-center main-content-layout px-6 pt-6 pb-28 w-full max-w-lg mx-auto relative z-1">

                    <div
                        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 transition-all duration-300 ${isListSelectorOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                        onClick={() => setIsListSelectorOpen(false)}
                    />
                    <div
                        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 transition-all duration-300 ${isNamesOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                        onClick={() => setIsNamesOpen(false)}
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
                    onOpenLists={() => { setIsListsOpen(true); triggerHaptic(10); }}
                    onOpenSettings={() => { setIsSettingsOpen(true); triggerHaptic(10); }}
                />

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
                    history={history}
                    bgGradient={bgGradient}
                />

                <ListsOverlay
                    isOpen={isListsOpen}
                    onClose={() => setIsListsOpen(false)}
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
                    triggerHaptic={triggerHaptic}
                    history={history}
                />

                <SettingsOverlay
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    lists={lists}
                    colorScheme={colorScheme}
                    setColorScheme={setColorScheme}
                    roundness={roundness}
                    setRoundness={setRoundness}
                    bgPattern={bgPattern}
                    setBgPattern={setBgPattern}
                    bgGradient={bgGradient}
                    setBgGradient={setBgGradient}
                    checkForUpdate={checkForUpdate}
                    isCheckingUpdate={isCheckingUpdate}
                    isUpdateAvailable={isUpdateAvailable}
                    onUpdateApp={handleUpdateApp}
                    isDebugMode={isDebugMode}
                    onToggleDebug={setIsDebugMode}
                    hapticsEnabled={hapticsEnabled}
                    onToggleHaptics={toggleHaptics}
                    forceAudioMode={forceAudioMode}
                    onToggleForceAudioMode={toggleForceAudioMode}
                    triggerHaptic={triggerHaptic}
                    history={history}
                    onImportData={importData}
                    addToast={addToast}
                    onOpenChangelog={() => setIsChangelogOpen(true)}
                    lastSeenVersion={lastSeenVersion}
                    onSetLastSeenVersion={handleSetLastSeenVersion}
                />

                <StatsModal
                    isOpen={isHistoryStatsOpen}
                    onClose={() => setIsHistoryStatsOpen(false)}
                    history={history}
                    onDeleteMatch={deleteMatch}
                    onUpdateMatch={updateMatch}
                    onAddMatch={addManualMatch}
                    onRenamePlayer={renamePlayer}
                    onRenameHero={renameHero}
                    onSync={async (options) => {
                        const historySuccess = await syncHistory(options);
                        await syncSeasons(options);
                        await syncAvatarsToCloud();
                        return historySuccess;
                    }}

                    isSyncing={isSyncingHistory}
                    isOnline={isOnline}
                    isDebugMode={isDebugMode}
                    addToast={addToast}

                    seasons={seasons}
                    latestSeasonId={latestSeason?.id}
                    onAddSeason={addSeason}
                    onUpdateSeason={updateSeason}
                    onDeleteSeason={deleteSeason}

                    lists={lists}
                    triggerHaptic={triggerHaptic}
                    deletedHistory={deletedHistory}
                    onRestoreMatch={restoreMatch}
                    onPermanentDeleteMatch={permanentDeleteMatch}
                    onClearTrash={clearTrash}

                    onImportData={handleImportDataCombined}
                    checkConnectivity={checkConnectivity}
                    // Облачный бэкап
                    cloudBackups={cloudBackups}
                    isCreatingBackup={isCreatingBackup}
                    isLoadingBackups={isLoadingBackups}
                    isRestoringBackup={isRestoringBackup}
                    onCreateCloudBackup={createCloudBackup}
                    onListCloudBackups={listCloudBackups}
                    onRestoreFromCloudBackup={async (id) => {
                        const backup = await getCloudBackupDetails(id);
                        const res = await restoreFromCloudBackup(id);
                        if (res && backup && Array.isArray(backup.seasons)) {
                            importSeasons(backup.seasons);
                        }
                        return res;
                    }}
                    onDeleteCloudBackup={deleteCloudBackup}
                    onGetCloudBackupDetails={getCloudBackupDetails}
                />

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

                <GroupStatsModal
                    isOpen={isGroupStatsOpen}
                    onClose={() => setIsGroupStatsOpen(false)}
                    getSelectionStats={getSelectionStats}
                    getRankBarColor={getRankBarColor}
                />

                <GenConfirmModal
                    isOpen={isGenConfirmOpen}
                    onCancel={() => setIsGenConfirmOpen(false)}
                    onConfirm={confirmGenerate}
                />

                <AddHeroesModal
                    isOpen={isAddHeroesOpen}
                    onClose={() => setIsAddHeroesOpen(false)}
                    lists={lists}
                    excludeListIds={isGroupMode ? selectedGroupIds : new Set(activeList ? [activeList.id] : [])}
                    onAddHeroes={handleAppendHeroesToSelected}
                    triggerHaptic={triggerHaptic}
                />

                <UpdateBanner
                    isVisible={showUpdateBanner}
                    onUpdate={handleUpdateApp}
                    onClose={() => setShowUpdateBanner(false)}
                />

                <ChangelogOverlay
                    isOpen={isChangelogOpen}
                    onClose={handleCloseChangelog}
                    lastSeenVersion={lastSeenVersion}
                    triggerHaptic={triggerHaptic}
                />

                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </div>
        </NavigationProvider>
    );
};

const AppWithHaptics: React.FC = () => (
    <HapticsProvider>
        <App />
    </HapticsProvider>
);

export default AppWithHaptics;

