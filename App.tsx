import React, { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useHeroLists } from './hooks/useHeroLists';
import { useToast } from './hooks/useToast';
import { usePWA } from './hooks/usePWA';
import { useHaptics } from './hooks/useHaptics';
import { useMatchHistory } from './hooks/useMatchHistory';
import { useAppStats } from './hooks/useAppStats';
import { useGroupSelection } from './hooks/useGroupSelection';
import { useHistoryInput } from './hooks/useHistoryInput';
import { useTeamGeneration } from './hooks/useTeamGeneration';
import { useBackButton } from './hooks/useBackButton';
import { ResultOverlay } from './components/ResultOverlay';
import { SettingsOverlay } from './components/SettingsOverlay';
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

const App: React.FC = () => {
    const { theme, toggleTheme, colorScheme, setColorScheme } = useTheme();
    const { toasts, addToast, removeToast } = useToast();
    const { trigger: triggerHaptic, toggle: toggleHaptics, isEnabled: hapticsEnabled } = useHaptics();

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

    // UI State
    const [selectedListId, setSelectedListId] = useState<string>('');
    const [isListSelectorOpen, setIsListSelectorOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isGroupStatsOpen, setIsGroupStatsOpen] = useState(false);
    const [isHistoryStatsOpen, setIsHistoryStatsOpen] = useState(false);
    const [isGenConfirmOpen, setIsGenConfirmOpen] = useState(false);

    // Custom Hooks
    // const { consoleLogs, isDebugMode, setIsDebugMode } = useDebugLogs(); // REMOVED

    const {
        isGroupMode, setIsGroupMode, selectedGroupIds, setSelectedGroupIds, handleToggleGroupItem: baseHandleToggleGroup
    } = useGroupSelection(lists);

    const {
        playerNames, setPlayerNames, savedTeams, setSavedTeams, deleteHistoryConfirm,
        setDeleteHistoryConfirm, isNamesOpen, setIsNamesOpen, handleNameChange,
        saveTeamHistory, handleSelectSavedTeam: baseHandleSelectSavedTeam, handleDeleteHistoryItem,
        historyScrollRef, isHistoryDragging, handleHistoryMouseDown, handleHistoryMouseLeave,
        handleHistoryMouseUp, handleHistoryMouseMove, isHistoryDragScroll
    } = useHistoryInput();

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
        handleSwapPositions, handleManualHeroSelect, getAvailableHeroesPool
    } = useTeamGeneration({
        lists, activeList, isGroupMode, selectedGroupIds, addToast, triggerHaptic,
        playerNames, saveTeamHistory, resetTemporaryLists, updateList, forkList,
        createTemporaryList, setSelectedListId, setIsGroupMode, addMatch,
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

    useBackButton({
        isSettingsOpen, setIsSettingsOpen, showResult, setShowResult,
        isResetConfirmOpen, setIsResetConfirmOpen, isGroupStatsOpen, setIsGroupStatsOpen,
        isNamesOpen, setIsNamesOpen, isListSelectorOpen, setIsListSelectorOpen,
        isHistoryStatsOpen, setIsHistoryStatsOpen, addToast
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

    // Handlers wrapped with haptics
    const handleSelectList = (id: string) => {
        setSelectedListId(id);
        setIsListSelectorOpen(false);
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

    return (
        <div className="relative h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary-50/50 to-transparent dark:from-primary-950/20 pointer-events-none" />
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <Header
                isCheckingUpdate={isCheckingUpdate}
                isUpdateAvailable={isUpdateAvailable}
                handleOpenUpdateBanner={handleOpenUpdateBanner}
                theme={theme}
                toggleTheme={toggleTheme}
            />

            <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-lg mx-auto relative z-1">

                <div
                    className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-30 transition-all duration-300 ${isListSelectorOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                    onClick={() => setIsListSelectorOpen(false)}
                />
                <div
                    className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-30 transition-all duration-300 ${isNamesOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
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
                />

                <MainControls
                    handleGenerate={handleGenerateClick}
                    isAnimating={isAnimating}
                    hasLists={lists.length > 0}
                    canReset={canReset}
                    handleResetSessionClick={handleResetSessionClick}
                />
            </main>

            <AppNavigation
                onOpenStats={() => { window.history.pushState({ view: 'stats' }, ''); setIsHistoryStatsOpen(true); triggerHaptic(10); }}
                onOpenHistory={handleShowLastResult}
                onOpenSettings={() => { setIsSettingsOpen(true); triggerHaptic(10); }}
                hasResult={hasResult}
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
                // logs={consoleLogs} // REMOVED
                checkForUpdate={checkForUpdate}
                isCheckingUpdate={isCheckingUpdate}
                isUpdateAvailable={isUpdateAvailable}
                onUpdateApp={handleUpdateApp}
                // isDebugMode={isDebugMode} // REMOVED
                // onToggleDebug={setIsDebugMode} // REMOVED
                hapticsEnabled={hapticsEnabled}
                onToggleHaptics={toggleHaptics}
                triggerHaptic={triggerHaptic}
                history={history}

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
                onSync={syncHistory}
                isSyncing={isSyncingHistory}
                isOnline={isOnline}

                lists={lists}
                triggerHaptic={triggerHaptic}
                deletedHistory={deletedHistory}
                onRestoreMatch={restoreMatch}
                onPermanentDeleteMatch={permanentDeleteMatch}
                onClearTrash={clearTrash}

                onImportData={importData}
                checkConnectivity={checkConnectivity}
                // Облачный бэкап
                cloudBackups={cloudBackups}
                isCreatingBackup={isCreatingBackup}
                isLoadingBackups={isLoadingBackups}
                isRestoringBackup={isRestoringBackup}
                onCreateCloudBackup={createCloudBackup}
                onListCloudBackups={listCloudBackups}
                onRestoreFromCloudBackup={restoreFromCloudBackup}
                onDeleteCloudBackup={deleteCloudBackup}
                onGetCloudBackupDetails={getCloudBackupDetails}
            />

            <ResetConfirmModal
                isOpen={isResetConfirmOpen}
                onCancel={cancelReset}
                onConfirm={confirmReset}
                onResetAndSync={() => {
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

            <UpdateBanner
                isVisible={showUpdateBanner}
                onUpdate={handleUpdateApp}
                onClose={() => setShowUpdateBanner(false)}
            />
        </div>
    );
};

export default App;