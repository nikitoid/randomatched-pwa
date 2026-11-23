import React, { createContext, useContext, useMemo } from 'react';
import { useSeasons } from '../hooks/useSeasons';
import { useToastContext } from './ToastContext';

export type SeasonsContextType = ReturnType<typeof useSeasons>;

const SeasonsContext = createContext<SeasonsContextType | undefined>(undefined);

export const SeasonsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToastContext();
  const {
    seasons,
    latestSeason,
    userDefaultSeasonId,
    setUserDefaultSeasonId,
    isLoaded,
    isSyncingSeasons,
    addSeason,
    updateSeason,
    deleteSeason,
    importSeasons,
    syncSeasons,
  } = useSeasons(addToast);

  const value = useMemo<SeasonsContextType>(
    () => ({
      seasons,
      latestSeason,
      userDefaultSeasonId,
      setUserDefaultSeasonId,
      isLoaded,
      isSyncingSeasons,
      addSeason,
      updateSeason,
      deleteSeason,
      importSeasons,
      syncSeasons,
    }),
    [
      seasons,
      latestSeason,
      userDefaultSeasonId,
      setUserDefaultSeasonId,
      isLoaded,
      isSyncingSeasons,
      addSeason,
      updateSeason,
      deleteSeason,
      importSeasons,
      syncSeasons,
    ]
  );

  return <SeasonsContext.Provider value={value}>{children}</SeasonsContext.Provider>;
};

export const useSeasonsContext = (): SeasonsContextType => {
  const context = useContext(SeasonsContext);
  if (!context) {
    throw new Error('useSeasonsContext must be used within a SeasonsProvider');
  }
  return context;
};
