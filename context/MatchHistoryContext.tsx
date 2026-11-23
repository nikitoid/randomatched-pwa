import React, { createContext, useContext, useMemo } from 'react';
import { useMatchHistory } from '../hooks/useMatchHistory';
import { useToastContext } from './ToastContext';

export type MatchHistoryContextType = ReturnType<typeof useMatchHistory>;

const MatchHistoryContext = createContext<MatchHistoryContextType | undefined>(undefined);

export const MatchHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToastContext();
  const {
    history,
    deletedHistory,
    addMatch,
    addManualMatch,
    updateMatch,
    deleteMatch,
    restoreMatch,
    permanentDeleteMatch,
    clearTrash,
    renamePlayer,
    renameHero,
    batchMergeHeroes,
    syncHistory,
    isSyncingHistory,
    importData,
    createCloudBackup,
    listCloudBackups,
    restoreFromCloudBackup,
    cloudBackups,
    isCreatingBackup,
    isLoadingBackups,
    isRestoringBackup,
    deleteCloudBackup,
    getCloudBackupDetails,
    isLoaded,
  } = useMatchHistory(addToast);

  const value = useMemo<MatchHistoryContextType>(
    () => ({
      history,
      deletedHistory,
      addMatch,
      addManualMatch,
      updateMatch,
      deleteMatch,
      restoreMatch,
      permanentDeleteMatch,
      clearTrash,
      renamePlayer,
      renameHero,
      batchMergeHeroes,
      syncHistory,
      isSyncingHistory,
      importData,
      createCloudBackup,
      listCloudBackups,
      restoreFromCloudBackup,
      cloudBackups,
      isCreatingBackup,
      isLoadingBackups,
      isRestoringBackup,
      deleteCloudBackup,
      getCloudBackupDetails,
      isLoaded,
    }),
    [
      history,
      deletedHistory,
      addMatch,
      addManualMatch,
      updateMatch,
      deleteMatch,
      restoreMatch,
      permanentDeleteMatch,
      clearTrash,
      renamePlayer,
      renameHero,
      batchMergeHeroes,
      syncHistory,
      isSyncingHistory,
      importData,
      createCloudBackup,
      listCloudBackups,
      restoreFromCloudBackup,
      cloudBackups,
      isCreatingBackup,
      isLoadingBackups,
      isRestoringBackup,
      deleteCloudBackup,
      getCloudBackupDetails,
      isLoaded,
    ]
  );

  return <MatchHistoryContext.Provider value={value}>{children}</MatchHistoryContext.Provider>;
};

export const useMatchHistoryContext = (): MatchHistoryContextType => {
  const context = useContext(MatchHistoryContext);
  if (!context) {
    throw new Error('useMatchHistoryContext must be used within a MatchHistoryProvider');
  }
  return context;
};
