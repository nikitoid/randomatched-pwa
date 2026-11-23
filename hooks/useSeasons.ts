import { useState, useEffect, useCallback, useMemo } from 'react';
import { Season, ToastType } from '../types';
import { collection, doc, getDocs, setDoc, type AppQuerySnapshot, type AppQueryDocSnapshot } from '../services/firestore';
import { useConnectivity } from './useConnectivity';
import { generateUUID } from '../utils/uuid';
import { withTimeout } from '../utils/connectivity';
import { STORAGE_KEYS, getStorageItem, setStorageItem, removeStorageItem, getStorageJSON, setStorageJSON } from '../utils/storage';

// Helper to remove any undefined fields before sending data to Firebase Firestore
const cleanSeasonForFirestore = (season: Season) => {
    const clean: Record<string, string | number> = {
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
    const { isOnline, checkConnectivity } = useConnectivity();
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [deletedSeasonIds, setDeletedSeasonIds] = useState<Set<string>>(new Set());
    const [userDefaultSeasonId, setUserDefaultSeasonIdState] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSyncingSeasons, setIsSyncingSeasons] = useState(false);

    // Initial load from localStorage
    useEffect(() => {
        try {
            const parsed = getStorageJSON<unknown>(STORAGE_KEYS.SEASONS, null);
            if (Array.isArray(parsed)) {
                setSeasons(parsed);
            }
            const parsedDeleted = getStorageJSON<unknown>(STORAGE_KEYS.DELETED_SEASONS, null);
            if (Array.isArray(parsedDeleted)) {
                setDeletedSeasonIds(new Set(parsedDeleted));
            }
            const savedUserDefault = getStorageItem(STORAGE_KEYS.USER_DEFAULT_SEASON);
            if (savedUserDefault) {
                setUserDefaultSeasonIdState(savedUserDefault);
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
        setStorageJSON(STORAGE_KEYS.SEASONS, seasons);
    }, [seasons, isLoaded]);

    // Save deletedSeasonIds to localStorage
    useEffect(() => {
        if (!isLoaded) return;
        setStorageJSON(STORAGE_KEYS.DELETED_SEASONS, Array.from(deletedSeasonIds));
    }, [deletedSeasonIds, isLoaded]);

    // Sort seasons by startDate ascending
    const sortedSeasons = useMemo(
        () => [...seasons].sort((a, b) => a.startDate.localeCompare(b.startDate)),
        [seasons]
    );

    // Get latest (current) season - highest startDate
    const latestSeason = sortedSeasons.length > 0 ? sortedSeasons[sortedSeasons.length - 1] : null;

    const addSeason = useCallback((name: string, startDate: string, endDate?: string) => {
        const trimmedName = name.trim();
        if (!trimmedName || !startDate) return null;

        const normalizedName = trimmedName.toLowerCase();
        const isDuplicate = seasons.some(s => s.name.trim().toLowerCase() === normalizedName);
        if (isDuplicate) {
            if (addToast) addToast('Сезон с таким названием уже существует', 'warning');
            return null;
        }

        const newSeason: Season = {
            id: generateUUID(),
            name: trimmedName,
            startDate,
            ...(endDate && endDate.trim() !== '' ? { endDate: endDate.trim() } : {}),
            lastUpdated: Date.now()
        };

        setDeletedSeasonIds(prev => {
            const next = new Set(prev);
            next.delete(newSeason.id);
            return next;
        });

        setSeasons(prev => [...prev, newSeason]);
        if (addToast) addToast(`Сезон "${trimmedName}" успешно создан`, 'success');
        return newSeason;
    }, [seasons, addToast]);

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

    const setUserDefaultSeasonId = useCallback((id: string | null) => {
        setUserDefaultSeasonIdState(id);
        if (id) {
            setStorageItem(STORAGE_KEYS.USER_DEFAULT_SEASON, id);
        } else {
            removeStorageItem(STORAGE_KEYS.USER_DEFAULT_SEASON);
        }
    }, []);

    // Validate that userDefaultSeasonId actually exists in seasons list
    useEffect(() => {
        if (!isLoaded || !userDefaultSeasonId) return;
        const exists = seasons.some(s => s.id === userDefaultSeasonId);
        if (!exists) {
            setUserDefaultSeasonId(null);
        }
    }, [seasons, isLoaded, userDefaultSeasonId, setUserDefaultSeasonId]);

    const deleteSeason = useCallback((id: string) => {
        setSeasons(prev => prev.filter(s => s.id !== id));
        setDeletedSeasonIds(prev => new Set(prev).add(id));
        setUserDefaultSeasonIdState(prev => {
            if (prev === id) {
                removeStorageItem(STORAGE_KEYS.USER_DEFAULT_SEASON);
                return null;
            }
            return prev;
        });
        if (addToast) addToast('Сезон удален', 'info');
    }, [addToast]);

    const importSeasons = useCallback((importedSeasons: Season[]) => {
        if (!Array.isArray(importedSeasons)) return;
        setSeasons(importedSeasons);
    }, []);

    // Cloud Sync method for Firebase Firestore
    const syncSeasons = useCallback(async (options?: { silentIfNoChanges?: boolean; silentErrors?: boolean }): Promise<boolean> => {
        const { silentIfNoChanges = false, silentErrors = false } = options || {};

        if (!isOnline && !(await checkConnectivity())) {
            if (!silentIfNoChanges && !silentErrors && addToast) {
                addToast('Синхронизация недоступна в оффлайн-режиме', 'warning');
            }
            return false;
        }

        setIsSyncingSeasons(true);
        try {
            // 1. Push local tombstones (deleted items) to Firestore
            if (deletedSeasonIds.size > 0) {
                for (const deletedId of deletedSeasonIds) {
                    await withTimeout(setDoc(doc('seasons', deletedId), {
                        id: deletedId,
                        deleted: true,
                        lastUpdated: Date.now()
                    }, { merge: true }), 6000);
                }
            }

            // 2. Fetch remote seasons from cloud
            const snapshot = await withTimeout<AppQuerySnapshot>(getDocs(collection('seasons')), 6000);
            const remoteSeasonsMap = new Map<string, Season & { deleted?: boolean }>();
            const remoteByNameMap = new Map<string, Season>();

            if (snapshot && snapshot.docs) {
                snapshot.docs.forEach((docSnap: AppQueryDocSnapshot) => {
                    const data = docSnap.data() as unknown as Season & { deleted?: boolean };
                    const seasonObj = { ...data, id: docSnap.id };
                    remoteSeasonsMap.set(docSnap.id, seasonObj);
                    if (!data.deleted && data.name) {
                        const normName = data.name.trim().toLowerCase();
                        remoteByNameMap.set(normName, seasonObj);
                    }
                });
            }

            const localSeasonsMap = new Map<string, Season>();
            seasons.forEach(s => {
                if (!deletedSeasonIds.has(s.id)) {
                    localSeasonsMap.set(s.id, s);
                }
            });

            const mergedSeasonsMap = new Map<string, Season>();
            const nextDeletedIds = new Set(deletedSeasonIds);
            let hasChanges = false;
            let duplicateReplacedName: string | null = null;

            // Process duplicate detection for local seasons against cloud
            const localDuplicatesToRemove = new Set<string>();
            for (const [id, local] of localSeasonsMap.entries()) {
                const normName = local.name.trim().toLowerCase();
                const remoteSameName = remoteByNameMap.get(normName);
                if (remoteSameName && remoteSameName.id !== id) {
                    // Duplicate detected! Use remote version as canonical.
                    localDuplicatesToRemove.add(id);
                    duplicateReplacedName = remoteSameName.name;
                    hasChanges = true;
                }
            }

            // Remove local duplicates
            for (const dupId of localDuplicatesToRemove) {
                localSeasonsMap.delete(dupId);
            }

            // All IDs to evaluate
            const allIds = new Set([...Array.from(localSeasonsMap.keys()), ...Array.from(remoteSeasonsMap.keys())]);

            for (const id of allIds) {
                const local = localSeasonsMap.get(id);
                const remote = remoteSeasonsMap.get(id);

                if (remote?.deleted) {
                    // Cloud says season is deleted
                    if (local) {
                        const localTime = local.lastUpdated || 0;
                        const remoteTime = remote.lastUpdated || 0;
                        if (localTime > remoteTime) {
                            // Local updated after remote delete -> resurrect
                            mergedSeasonsMap.set(id, local);
                            await withTimeout(setDoc(doc('seasons', id), cleanSeasonForFirestore(local)), 6000);
                            nextDeletedIds.delete(id);
                            hasChanges = true;
                        } else {
                            // Remote deletion wins -> remove local
                            nextDeletedIds.add(id);
                            hasChanges = true;
                        }
                    } else {
                        nextDeletedIds.add(id);
                    }
                    continue;
                }

                if (local && remote) {
                    const localTime = local.lastUpdated || 0;
                    const remoteTime = remote.lastUpdated || 0;
                    if (localTime > remoteTime) {
                        mergedSeasonsMap.set(id, local);
                        await withTimeout(setDoc(doc('seasons', id), cleanSeasonForFirestore(local)), 6000);
                        hasChanges = true;
                    } else {
                        mergedSeasonsMap.set(id, remote);
                        if (remoteTime > localTime) hasChanges = true;
                    }
                } else if (local) {
                    // Local only -> push to cloud
                    mergedSeasonsMap.set(id, local);
                    await withTimeout(setDoc(doc('seasons', id), cleanSeasonForFirestore(local)), 6000);
                    hasChanges = true;
                } else if (remote) {
                    // Remote only
                    if (nextDeletedIds.has(id)) {
                        // We locally deleted this season, but remote wasn't marked deleted yet -> mark deleted in cloud
                        await withTimeout(setDoc(doc('seasons', id), {
                            id,
                            deleted: true,
                            lastUpdated: Date.now()
                        }, { merge: true }), 6000);
                        hasChanges = true;
                    } else {
                        mergedSeasonsMap.set(id, remote);
                        hasChanges = true;
                    }
                }
            }

            if (hasChanges || mergedSeasonsMap.size !== seasons.length) {
                setDeletedSeasonIds(nextDeletedIds);
                const mergedList = Array.from(mergedSeasonsMap.values());
                setSeasons(mergedList);
            }

            if (!silentIfNoChanges && addToast) {
                if (duplicateReplacedName) {
                    addToast(`Обнаружен дубликат сезона "${duplicateReplacedName}". Использована облачная версия`, 'info');
                } else if (hasChanges) {
                    addToast('Сезоны успешно синхронизированы с облаком', 'success');
                }
            }
            return true;
        } catch (e) {
            console.error('Error syncing seasons with Firebase:', e);
            if (!silentIfNoChanges && !silentErrors && addToast) {
                addToast('Ошибка при синхронизации сезонов', 'error');
            }
            return false;
        } finally {
            setIsSyncingSeasons(false);
        }
    }, [isOnline, checkConnectivity, seasons, deletedSeasonIds, addToast]);

    return {
        seasons: sortedSeasons,
        latestSeason,
        userDefaultSeasonId,
        setUserDefaultSeasonId,
        isLoaded,
        isSyncingSeasons,
        addSeason,
        updateSeason,
        deleteSeason,
        importSeasons,
        syncSeasons
    };
};
