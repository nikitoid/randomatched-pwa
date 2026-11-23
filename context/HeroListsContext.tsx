import React, { createContext, useContext, useMemo } from 'react';
import { useHeroLists } from '../hooks/useHeroLists';
import { useToastContext } from './ToastContext';

export type HeroListsContextType = ReturnType<typeof useHeroLists>;

const HeroListsContext = createContext<HeroListsContextType | undefined>(undefined);

export const HeroListsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToastContext();
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
    batchMergeHeroesInLists,
    renameHeroInLists,
    checkConnectivity,
    isLoaded,
    isOnline,
    isSyncing,
    updatedListIds,
    markListAsSeen,
    updatedHeroIds,
    dismissHeroUpdates,
  } = useHeroLists(addToast);

  const value = useMemo<HeroListsContextType>(
    () => ({
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
      batchMergeHeroesInLists,
      renameHeroInLists,
      checkConnectivity,
      isLoaded,
      isOnline,
      isSyncing,
      updatedListIds,
      markListAsSeen,
      updatedHeroIds,
      dismissHeroUpdates,
    }),
    [
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
      batchMergeHeroesInLists,
      renameHeroInLists,
      checkConnectivity,
      isLoaded,
      isOnline,
      isSyncing,
      updatedListIds,
      markListAsSeen,
      updatedHeroIds,
      dismissHeroUpdates,
    ]
  );

  return <HeroListsContext.Provider value={value}>{children}</HeroListsContext.Provider>;
};

export const useHeroListsContext = (): HeroListsContextType => {
  const context = useContext(HeroListsContext);
  if (!context) {
    throw new Error('useHeroListsContext must be used within a HeroListsProvider');
  }
  return context;
};
