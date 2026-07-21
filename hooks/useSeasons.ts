import { useState, useEffect, useCallback } from 'react';
import { Season, ToastType } from '../types';
import { db } from '../firebase';
import { useConnectivity } from './useConnectivity';

const STORAGE_KEY_SEASONS = 'randomatched_seasons_v1';

// Helper to remove any undefined fields before sending data to Firebase Firestore
const cleanSeasonForFirestore = (season: Season) => {
    const clean: Record<string, any> = {
        id: season.id,
        name: season.name,
        startDate: season.startDate,
        lastUpdated: season.lastUpdated || Date.now()
    };
    if (season.endDate && season.endDate.trim() !== '') {
        clean.endDate = season.endDate.trim();
    }
    return clean;
};

export const useSeasons = (
    addToast?: (message: string, type: ToastType, duration?: number) => void
) => {
    const { isOnline } = useConnectivity();
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSyncingSeasons, setIsSyncingSeasons] = useState(false);

    // Initial load from localStorage
    useEffect(() => {
        try {
            const savedSeasons = localStorage.getItem(STORAGE_KEY_SEASONS);
            if (savedSeasons) {
                const parsed = JSON.parse(savedSeasons);
                if (Array.isArray(parsed)) {
                    setSeasons(parsed);
                }
            }
        } catch (e) {
            console.error('Failed to load seasons from local storage', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save to localStorage when seasons change
    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem(STORAGE_KEY_SEASONS, JSON.stringify(seasons));
        } catch (e) {
            console.error('Failed to save seasons to local storage', e);
        }
    }, [seasons, isLoaded]);

    // Sort seasons by startDate ascending
    const sortedSeasons = [...seasons].sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Get latest (current) season - highest startDate
    const latestSeason = sortedSeasons.length > 0 ? sortedSeasons[sortedSeasons.length - 1] : null;

    const addSeason = useCallback((name: string, startDate: string, endDate?: string) => {
        const trimmedName = name.trim();
        if (!trimmedName || !startDate) return null;

        const newSeason: Season = {
            id: crypto.randomUUID(),
            name: trimmedName,
            startDate,
            ...(endDate && endDate.trim() !== '' ? { endDate: endDate.trim() } : {}),
            lastUpdated: Date.now()
        };

        setSeasons(prev => [...prev, newSeason]);
        if (addToast) addToast(`Сезон "${trimmedName}" успешно создан`, 'success');
        return newSeason;
    }, [addToast]);

    const updateSeason = useCallback((id: string, updatedData: Partial<Omit<Season, 'id'>>) => {
        setSeasons(prev => prev.map(s => {
            if (s.id !== id) return s;

            const nextSeason: Season = {
                ...s,
                ...updatedData,
                lastUpdated: Date.now()
            };

            if (!nextSeason.endDate || nextSeason.endDate.trim() === '') {
                delete nextSeason.endDate;
            }

            return nextSeason;
        }));
        if (addToast) addToast('Сезон обновлен', 'success');
    }, [addToast]);

    const deleteSeason = useCallback((id: string) => {
        setSeasons(prev => prev.filter(s => s.id !== id));
        if (addToast) addToast('Сезон удален', 'info');
    }, [addToast]);

    const importSeasons = useCallback((importedSeasons: Season[]) => {
        if (!Array.isArray(importedSeasons)) return;
        setSeasons(importedSeasons);
    }, []);

    // Cloud Sync method for Firebase Firestore
    const syncSeasons = useCallback(async (options?: { silentIfNoChanges?: boolean }): Promise<boolean> => {
        if (!isOnline) {
            if (!options?.silentIfNoChanges && addToast) {
                addToast('Синхронизация недоступна в оффлайн-режиме', 'warning');
            }
            return false;
        }

        setIsSyncingSeasons(true);
        try {
            const snapshot = await db.collection('seasons').get();
            const remoteSeasonsMap = new Map<string, Season>();
            if (snapshot && snapshot.docs) {
                snapshot.docs.forEach((doc: any) => {
                    const data = doc.data() as Season;
                    remoteSeasonsMap.set(doc.id, { ...data, id: doc.id });
                });
            }

            const localSeasonsMap = new Map<string, Season>();
            seasons.forEach(s => localSeasonsMap.set(s.id, s));

            const mergedSeasonsMap = new Map<string, Season>();
            let hasChanges = false;

            // Merge local and remote
            const allIds = new Set([...Array.from(localSeasonsMap.keys()), ...Array.from(remoteSeasonsMap.keys())]);

            for (const id of allIds) {
                const local = localSeasonsMap.get(id);
                const remote = remoteSeasonsMap.get(id);

                if (local && remote) {
                    const localTime = local.lastUpdated || 0;
                    const remoteTime = remote.lastUpdated || 0;
                    if (localTime > remoteTime) {
                        mergedSeasonsMap.set(id, local);
                        await db.collection('seasons').doc(id).set(cleanSeasonForFirestore(local));
                        hasChanges = true;
                    } else {
                        mergedSeasonsMap.set(id, remote);
                        if (remoteTime > localTime) hasChanges = true;
                    }
                } else if (local) {
                    mergedSeasonsMap.set(id, local);
                    await db.collection('seasons').doc(id).set(cleanSeasonForFirestore(local));
                    hasChanges = true;
                } else if (remote) {
                    mergedSeasonsMap.set(id, remote);
                    hasChanges = true;
                }
            }

            const mergedList = Array.from(mergedSeasonsMap.values());
            setSeasons(mergedList);

            if (!options?.silentIfNoChanges && addToast && hasChanges) {
                addToast('Сезоны успешно синхронизированы с облаком', 'success');
            }
            return true;
        } catch (e) {
            console.error('Error syncing seasons with Firebase:', e);
            if (!options?.silentIfNoChanges && addToast) {
                addToast('Ошибка при синхронизации сезонов', 'error');
            }
            return false;
        } finally {
            setIsSyncingSeasons(false);
        }
    }, [isOnline, seasons, addToast]);

    return {
        seasons: sortedSeasons,
        latestSeason,
        isLoaded,
        isSyncingSeasons,
        addSeason,
        updateSeason,
        deleteSeason,
        importSeasons,
        syncSeasons
    };
};
