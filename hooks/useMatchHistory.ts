
import { useConnectivity } from './useConnectivity';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchRecord, AssignedPlayer, ToastType, MatchPlayer, CloudBackup } from '../types';
import { db } from '../firebase';
import { getAllAvatarsFromStorage, saveAllAvatarsToStorage, getAvatarFromStorage, saveAvatarToStorage } from '../utils/avatarStorage';
import { generateUUID } from '../utils/uuid';
import { withTimeout } from '../utils/connectivity';


const STORAGE_KEY_HISTORY = 'randomatched_match_history_v1';
const STORAGE_KEY_DELETED = 'randomatched_deleted_matches_v1';
const STORAGE_KEY_DELETED_HISTORY = 'randomatched_deleted_history_content_v1';

export const useMatchHistory = (
    addToast: (message: string, type: ToastType, duration?: number) => void
) => {
    const { checkConnectivity, isOnline } = useConnectivity();
    const [history, setHistory] = useState<MatchRecord[]>([]);
    const [deletedHistory, setDeletedHistory] = useState<MatchRecord[]>([]);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [isSyncingHistory, setIsSyncingHistory] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const historyRef = useRef<MatchRecord[]>([]);
    const deletedHistoryRef = useRef<MatchRecord[]>([]);
    const deletedIdsRef = useRef<Set<string>>(new Set());

    // Keep refs in sync with state changes
    useEffect(() => { historyRef.current = history; }, [history]);
    useEffect(() => { deletedHistoryRef.current = deletedHistory; }, [deletedHistory]);
    useEffect(() => { deletedIdsRef.current = deletedIds; }, [deletedIds]);



    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (savedHistory) {
                const parsed = JSON.parse(savedHistory);
                setHistory(parsed);
                historyRef.current = parsed;
            }
            const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED);
            if (savedDeleted) {
                const parsed = new Set<string>(JSON.parse(savedDeleted));
                setDeletedIds(parsed);
                deletedIdsRef.current = parsed;
            }
            const savedDeletedHistory = localStorage.getItem(STORAGE_KEY_DELETED_HISTORY);
            if (savedDeletedHistory) {
                const parsed = JSON.parse(savedDeletedHistory);
                setDeletedHistory(parsed);
                deletedHistoryRef.current = parsed;
            }



        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }, [history, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(deletedIds)));
    }, [deletedIds, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(STORAGE_KEY_DELETED_HISTORY, JSON.stringify(deletedHistory));
    }, [deletedHistory, isLoaded]);

    const addMatch = (
        assignments: AssignedPlayer[],
        winner: 'team1' | 'team2',
        playerNames: string[],
        playerKills?: Record<string, number>
    ) => {
        const getEffectiveName = (a: AssignedPlayer) => {
            const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
            const idx = positionToIndex[a.position] ?? 0;
            const customName = (playerNames[idx] || '').trim();
            return customName || `Игрок ${a.playerNumber}`;
        };

        const team1Raw = assignments.filter(a => a.team === 'Odd').map(a => {
            const name = getEffectiveName(a);
            return {
                name,
                heroId: a.hero?.id || 'unknown',
                heroName: a.hero?.name || 'Unknown',
                ...(playerKills && playerKills[name] !== undefined ? { kills: playerKills[name] } : {})
            };
        });

        const team2Raw = assignments.filter(a => a.team === 'Even').map(a => {
            const name = getEffectiveName(a);
            return {
                name,
                heroId: a.hero?.id || 'unknown',
                heroName: a.hero?.name || 'Unknown',
                ...(playerKills && playerKills[name] !== undefined ? { kills: playerKills[name] } : {})
            };
        });

        // Filter out players with empty names (should not happen with fallback)
        const team1 = team1Raw.filter(p => p.name !== '');
        const team2 = team2Raw.filter(p => p.name !== '');


        const newMatch: MatchRecord = {
            id: generateUUID(),
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            team1,
            team2,
            winner
        };

        historyRef.current = [newMatch, ...historyRef.current];
        setHistory(prev => [newMatch, ...prev]);
        return newMatch;
    };

    const addManualMatch = (
        team1: MatchPlayer[],
        team2: MatchPlayer[],
        winner: 'team1' | 'team2',
        timestamp: number = Date.now()
    ) => {
        const newMatch: MatchRecord = {
            id: generateUUID(),
            timestamp,
            lastUpdated: Date.now(),
            team1,
            team2,
            winner
        };
        historyRef.current = [newMatch, ...historyRef.current];
        setHistory(prev => [newMatch, ...prev]);
        addToast("Матч добавлен вручную", "success", 2000);
    };

    const updateMatch = (id: string, updates: Partial<MatchRecord>) => {
        const updated = historyRef.current.map(m => m.id === id ? { ...m, ...updates, lastUpdated: Date.now() } : m);
        historyRef.current = updated;
        setHistory(updated);
        addToast("Матч обновлен", "success", 2000);
    };

    const deleteMatch = (id: string) => {
        const matchToDelete = historyRef.current.find(m => m.id === id);
        if (matchToDelete) {
            const nextHistory = historyRef.current.filter(m => m.id !== id);
            const nextDeletedHistory = [matchToDelete, ...deletedHistoryRef.current];
            const nextDeletedIds = new Set(deletedIdsRef.current).add(id);

            historyRef.current = nextHistory;
            deletedHistoryRef.current = nextDeletedHistory;
            deletedIdsRef.current = nextDeletedIds;

            setHistory(nextHistory);
            setDeletedHistory(nextDeletedHistory);
            setDeletedIds(nextDeletedIds);
            addToast("Матч перемещен в корзину", "info", 2000);
        }
    };

    const restoreMatch = (id: string) => {
        const matchToRestore = deletedHistoryRef.current.find(m => m.id === id);
        if (matchToRestore) {
            const restoredMatch = { ...matchToRestore, lastUpdated: Date.now() };
            if ('deleted' in restoredMatch) delete (restoredMatch as any).deleted;
            
            const nextHistory = [restoredMatch, ...historyRef.current].sort((a, b) => b.timestamp - a.timestamp);
            const nextDeletedHistory = deletedHistoryRef.current.filter(m => m.id !== id);
            const nextDeletedIds = new Set(deletedIdsRef.current);
            nextDeletedIds.delete(id);

            historyRef.current = nextHistory;
            deletedHistoryRef.current = nextDeletedHistory;
            deletedIdsRef.current = nextDeletedIds;

            setHistory(nextHistory);
            setDeletedHistory(nextDeletedHistory);
            setDeletedIds(nextDeletedIds);
            addToast("Матч восстановлен", "success", 2000);
        }
    };

    const permanentDeleteMatch = (id: string) => {
        const nextHistory = historyRef.current.filter(m => m.id !== id);
        const nextDeletedHistory = deletedHistoryRef.current.filter(m => m.id !== id);
        const nextDeletedIds = new Set(deletedIdsRef.current).add(id);

        historyRef.current = nextHistory;
        deletedHistoryRef.current = nextDeletedHistory;
        deletedIdsRef.current = nextDeletedIds;

        setHistory(nextHistory);
        setDeletedHistory(nextDeletedHistory);
        setDeletedIds(nextDeletedIds);
        addToast("Матч удален навсегда", "info", 2000);
    };

    const clearTrash = () => {
        if (deletedHistoryRef.current.length === 0) return;
        const ids = deletedHistoryRef.current.map(m => m.id);
        const nextDeletedIds = new Set(deletedIdsRef.current);
        ids.forEach(id => nextDeletedIds.add(id));

        deletedIdsRef.current = nextDeletedIds;
        deletedHistoryRef.current = [];

        setDeletedIds(nextDeletedIds);
        setDeletedHistory([]);
        addToast("Корзина очищена", "info", 2000);
    };

    const renamePlayer = (oldName: string, newName: string) => {
        if (!oldName.trim() || !newName.trim() || oldName === newName) return;

        const nextHistory = historyRef.current.map(match => {
            let changed = false;
            const newTeam1 = match.team1.map(p => {
                if (p.name === oldName) { changed = true; return { ...p, name: newName }; }
                return p;
            });
            const newTeam2 = match.team2.map(p => {
                if (p.name === oldName) { changed = true; return { ...p, name: newName }; }
                return p;
            });

            if (changed) {
                return { ...match, team1: newTeam1, team2: newTeam2, lastUpdated: Date.now() };
            }
            return match;
        });

        historyRef.current = nextHistory;
        setHistory(nextHistory);
        addToast(`Игрок "${oldName}" переименован`, 'success', 2000);
    };


    const renameHero = (oldName: string, newName: string) => {
        if (!oldName.trim() || !newName.trim() || oldName === newName) return;

        setHistory(prev => prev.map(match => {
            let changed = false;
            const updateHero = (p: MatchPlayer) => {
                if (p.heroName === oldName) {
                    changed = true;
                    return { ...p, heroName: newName };
                }
                return p;
            };

            const newTeam1 = match.team1.map(updateHero);
            const newTeam2 = match.team2.map(updateHero);

            if (changed) {
                return { ...match, team1: newTeam1, team2: newTeam2, lastUpdated: Date.now() };
            }
            return match;
        }));
        addToast(`Герой "${oldName}" переименован`, 'success', 2000);
    };

    const batchMergeHeroes = async (targetHeroName: string, sourceHeroNames: string[]) => {
        const cleanTarget = targetHeroName.trim();
        const cleanSources = sourceHeroNames.map(s => s.trim()).filter(s => s && s !== cleanTarget);
        if (!cleanTarget || cleanSources.length === 0) return;

        const sourceKeys = new Set(cleanSources.map(s => s.toLowerCase()));

        let affectedMatches = 0;
        setHistory(prev => prev.map(match => {
            let changed = false;
            const updateHero = (p: MatchPlayer) => {
                if (p.heroName && sourceKeys.has(p.heroName.trim().toLowerCase())) {
                    changed = true;
                    return { ...p, heroName: cleanTarget };
                }
                return p;
            };

            const newTeam1 = match.team1.map(updateHero);
            const newTeam2 = match.team2.map(updateHero);

            if (changed) {
                affectedMatches++;
                return { ...match, team1: newTeam1, team2: newTeam2, lastUpdated: Date.now() };
            }
            return match;
        }));

        // Check and copy avatar if target doesn't have one
        try {
            const targetAvatar = await getAvatarFromStorage('hero', cleanTarget);
            if (!targetAvatar) {
                for (const src of cleanSources) {
                    const srcAvatar = await getAvatarFromStorage('hero', src);
                    if (srcAvatar) {
                        await saveAvatarToStorage('hero', cleanTarget, srcAvatar);
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn('[useMatchHistory] Error migrating avatars during hero merge', e);
        }

        addToast(`Объединено ${cleanSources.length} дубликат(ов) в «${cleanTarget}» (${affectedMatches} матчей)`, 'success', 3000);
    };

    const cleanupPermanentDeletes = async () => {
        try {
            const snapshot = await db.collection('match_history')
                .where('permanent', '==', true)
                .get();

            if (snapshot.empty) return;

            const batch = db.batch();
            let count = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // If it already has ONLY these fields, skip to save write ops
                const keys = Object.keys(data);
                if (keys.length <= 4 && data.deleted && data.permanent && data.id) {
                    return;
                }

                batch.set(doc.ref, {
                    id: doc.id,
                    deleted: true,
                    permanent: true,
                    lastUpdated: Date.now()
                });
                count++;
            });

            if (count > 0) {
                await batch.commit();
                console.log(`Cleaned up (minimized) ${count} permanently deleted docs`);
            }
        } catch (error) {
            console.error("Cleanup failed", error);
        }
    };

    const syncHistory = async (options?: { silentIfNoChanges?: boolean; silentErrors?: boolean }): Promise<boolean> => {
        const { silentIfNoChanges = false, silentErrors = false } = options || {};

        if (!isOnline && !(await checkConnectivity())) {
            if (!silentIfNoChanges && !silentErrors) {
                addToast("Нет подключения к интернету", "error", 2000);
            }
            return false;
        }

        setIsSyncingHistory(true);
        try {
            const batch = db.batch();
            let opsCount = 0;

            const currentDeletedIds = deletedIdsRef.current;
            const currentDeletedHistory = deletedHistoryRef.current;
            const currentHistory = historyRef.current;

            // Capture all IDs known at the start of sync to properly identify matches added *during* sync
            const initialKnownIds = new Set([
                ...currentHistory.map(m => m.id),
                ...currentDeletedHistory.map(m => m.id),
                ...Array.from(currentDeletedIds)
            ]);

            // 1. Process Pending Deletions (Push Tombstones with Data)
            if (currentDeletedIds.size > 0) {
                const currentDeletedMap = new Map(currentDeletedHistory.map(m => [m.id, m]));
                const currentActiveMap = new Map(currentHistory.map(m => [m.id, m]));

                for (const id of currentDeletedIds) {
                    const ref = db.collection('match_history').doc(id);
                    // Try to find data to preserve it in cloud trash
                    const trashData = currentDeletedMap.get(id);
                    const activeData = currentActiveMap.get(id);

                    if (trashData) {
                        // Soft delete (In Trash) -> Write full data + deleted flag
                        batch.set(ref, { ...trashData, deleted: true, permanent: false, lastUpdated: Date.now() }, { merge: true });
                        opsCount++;
                    } else if (activeData) {
                        // Should technically not happen if it's in deletedIds, but safety first
                        // Treat as Soft Delete
                        batch.set(ref, { ...activeData, deleted: true, permanent: false, lastUpdated: Date.now() }, { merge: true });
                        opsCount++;
                    } else {
                        // Hard Delete (Not in Trash, Not Active) -> Push Permanent Tombstone
                        // We strictly don't have data, just id.
                        batch.set(ref, { id, deleted: true, permanent: true, lastUpdated: Date.now() }, { merge: true });
                        opsCount++;
                    }
                }
            }

            // 2. Fetch all matches from Cloud (with timeout protection against Lie-Fi)
            const snapshot = await withTimeout<any>(db.collection('match_history').get(), 6000);
            const cloudMatchesMap = new Map<string, any>();
            snapshot.forEach((doc: any) => {
                cloudMatchesMap.set(doc.id, doc.data());
            });

            const mergedMap = new Map<string, MatchRecord>();
            const newDeletedMap = new Map<string, MatchRecord>();

            // Allow tracking of what we have processed to avoid duplication
            // Initialize with current deleted history
            currentDeletedHistory.forEach(m => newDeletedMap.set(m.id, m));

            let newFromCloud = 0;
            let updatedFromCloud = 0;
            let pushedToCloud = 0;
            let deletedFromCloud = 0;

            // Helper to get effective timestamp for conflict resolution
            const getTimestamp = (item: any) => item?.lastUpdated || item?.timestamp || 0;

            // 3. Sync LOCAL ACTIVE -> CLOUD
            const currentLocalHistory = currentHistory.filter(m => !currentDeletedIds.has(m.id));

            for (const localMatch of currentLocalHistory) {
                const cloudMatch = cloudMatchesMap.get(localMatch.id);

                if (!cloudMatch) {
                    // Not in cloud -> Push to cloud
                    const ref = db.collection('match_history').doc(localMatch.id);
                    batch.set(ref, localMatch);
                    mergedMap.set(localMatch.id, localMatch);
                    opsCount++;
                    pushedToCloud++;
                } else {
                    // Exists in cloud
                    const localTime = getTimestamp(localMatch);
                    const cloudTime = getTimestamp(cloudMatch);

                    if (cloudMatch.deleted) {
                        if (cloudMatch.permanent) {
                            // Cloud says PERMANENTLY deleted.
                            if (localTime > cloudTime) {
                                // Local is newer (Re-created/Restored AFTER perm delete?) -> Undelete
                                const ref = db.collection('match_history').doc(localMatch.id);
                                const toWrite = { ...localMatch, deleted: false, permanent: false };
                                batch.set(ref, toWrite);
                                mergedMap.set(localMatch.id, localMatch);
                                opsCount++;
                                pushedToCloud++;
                            } else {
                                // Cloud wins -> Accept Permanent Deletion (Drop from active)
                                deletedFromCloud++;
                            }
                        } else {
                            // Cloud is Soft Deleted.
                            if (localTime > cloudTime) {
                                // Local is newer (Restored?) -> Push to cloud (Undelete)
                                const ref = db.collection('match_history').doc(localMatch.id);
                                const toWrite = { ...localMatch, deleted: false, permanent: false };
                                batch.set(ref, toWrite);
                                mergedMap.set(localMatch.id, localMatch);
                                opsCount++;
                                pushedToCloud++;
                            } else {
                                // Cloud deletion is newer -> Move to Trash Locally
                                newDeletedMap.set(localMatch.id, { ...localMatch, ...cloudMatch } as MatchRecord);
                                deletedFromCloud++; // Moved to trash
                            }
                        }
                    } else {
                        // Cloud is Active
                        if (localTime > cloudTime) {
                            // Local newer -> Push
                            const ref = db.collection('match_history').doc(localMatch.id);
                            batch.set(ref, localMatch);
                            mergedMap.set(localMatch.id, localMatch);
                            opsCount++;
                            pushedToCloud++;
                        } else if (cloudTime > localTime) {
                            // Cloud newer -> Update local
                            mergedMap.set(localMatch.id, cloudMatch as MatchRecord);
                            updatedFromCloud++;
                        } else {
                            // Same
                            mergedMap.set(localMatch.id, localMatch);
                        }
                    }
                }
            }

            // 4. Sync LOCAL TRASH -> CLOUD (Protect Trash)
            for (const trashMatch of currentDeletedHistory) {
                if (currentDeletedIds.has(trashMatch.id)) continue; // Already pushed in step 1

                const cloudMatch = cloudMatchesMap.get(trashMatch.id);
                if (!cloudMatch) {
                    // Missing in cloud -> Push to cloud as deleted (Protect data)
                    const ref = db.collection('match_history').doc(trashMatch.id);
                    batch.set(ref, { ...trashMatch, deleted: true, permanent: false });
                    opsCount++;
                    pushedToCloud++;
                } else {
                    const trashTime = getTimestamp(trashMatch);
                    const cloudTime = getTimestamp(cloudMatch);

                    // Exists in cloud
                    if (cloudMatch.deleted) {
                        if (cloudMatch.permanent) {
                            // Cloud is PERMANENTLY deleted.
                            if (trashTime > cloudTime) {
                                // Local trash update is newer?
                                newDeletedMap.delete(trashMatch.id);
                                deletedFromCloud++;
                            } else {
                                // Cloud Permanent wins -> Drop from trash
                                newDeletedMap.delete(trashMatch.id);
                                deletedFromCloud++;
                            }
                        } else {
                            // Both Soft Deleted. Update if local newer.
                            if (trashTime > cloudTime) {
                                const ref = db.collection('match_history').doc(trashMatch.id);
                                batch.set(ref, { ...trashMatch, deleted: true, permanent: false });
                                opsCount++;
                            } else if (cloudTime > trashTime) {
                                newDeletedMap.set(trashMatch.id, cloudMatch as MatchRecord);
                            }
                        }
                    } else {
                        // Cloud is Active.
                        if (trashTime > cloudTime) {
                            // Local Trash newer -> Push Soft Delete
                            const ref = db.collection('match_history').doc(trashMatch.id);
                            batch.set(ref, { ...trashMatch, deleted: true, permanent: false });
                            opsCount++;
                        } else {
                            // Cloud Active newer -> Restore locally
                            mergedMap.set(trashMatch.id, cloudMatch as MatchRecord);
                            newDeletedMap.delete(trashMatch.id);
                            updatedFromCloud++;
                        }
                    }
                }
            }

            // 5. Sync CLOUD -> LOCAL (New items from cloud)
            for (const [id, cloudMatch] of cloudMatchesMap.entries()) {
                // If we are currently deleting this ID locally, IGNORE cloud version (even if soft deleted)
                if (currentDeletedIds.has(id)) continue;

                const inActive = mergedMap.has(id);
                const inTrash = newDeletedMap.has(id);

                if (!inActive && !inTrash) {
                    // New from cloud
                    if (cloudMatch.deleted) {
                        if (!cloudMatch.permanent) {
                            // Only import if Soft Deleted
                            newDeletedMap.set(id, cloudMatch as MatchRecord);
                        }
                        // If permanent, we ignore it (effectively deleting it locally if it existed, which we handled above)
                    } else {
                        mergedMap.set(id, cloudMatch as MatchRecord);
                        newFromCloud++;
                    }
                }
            }

            // 6. Final Cleanup
            for (const activeId of mergedMap.keys()) {
                if (newDeletedMap.has(activeId)) {
                    newDeletedMap.delete(activeId);
                }
            }

            // Commit (with timeout protection)
            if (opsCount > 0) {
                await withTimeout(batch.commit(), 6000);
            }

            // Preserve ONLY matches TRULY newly created locally while sync was running in background
            const newlyAddedLocalMatches = historyRef.current.filter(m => !initialKnownIds.has(m.id));
            newlyAddedLocalMatches.forEach(m => mergedMap.set(m.id, m));

            // Update Local
            const finalHistory = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            historyRef.current = finalHistory;
            setHistory(finalHistory);

            const finalDeletedHistory = Array.from(newDeletedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            deletedHistoryRef.current = finalDeletedHistory;
            setDeletedHistory(finalDeletedHistory);

            deletedIdsRef.current = new Set();
            setDeletedIds(new Set());

            const msg = [];
            if (newFromCloud > 0) msg.push(`Скачано: ${newFromCloud}`);
            if (updatedFromCloud > 0) msg.push(`Обновлено: ${updatedFromCloud}`);
            if (pushedToCloud > 0) msg.push(`Отправлено: ${pushedToCloud}`);
            if (deletedFromCloud > 0) msg.push(`Удалено: ${deletedFromCloud}`);

            if (msg.length > 0) {
                addToast(`Синхронизация: ${msg.join(', ')}`, 'success', 2500);
            } else {
                if (!silentIfNoChanges) {
                    addToast("Данные актуальны", "info", 1500);
                }
            }

            // Cleanup permanently deleted docs in background
            cleanupPermanentDeletes().catch(e => console.warn("Cleanup permanent deletes failed", e));

            return true;
        } catch (e) {
            console.error("Sync history failed", e);
            if (!silentIfNoChanges && !silentErrors) {
                addToast("Ошибка синхронизации истории", "error", 2000);
            }
            return false;
        } finally {
            setIsSyncingHistory(false);
        }
    };

    const importData = (data: { history: MatchRecord[], deletedHistory: MatchRecord[] }) => {
        try {
            if (!Array.isArray(data.history) || !Array.isArray(data.deletedHistory)) {
                throw new Error("Invalid data format");
            }
            historyRef.current = data.history;
            deletedHistoryRef.current = data.deletedHistory;
            deletedIdsRef.current = new Set();

            setHistory(data.history);
            setDeletedHistory(data.deletedHistory);
            setDeletedIds(new Set());
            addToast("Данные успешно импортированы", "success", 2000);
            return true;
        } catch (e) {
            console.error("Import failed", e);
            addToast("Ошибка импорта данных", "error", 2000);
            return false;
        }
    };


    // === Облачный бэкап ===
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [isRestoringBackup, setIsRestoringBackup] = useState(false);
    const [cloudBackups, setCloudBackups] = useState<Array<{ id: string; createdAt: number; matchCount: number }>>([]);



    // Создание бэкапа в облаке
    const createCloudBackup = async () => {
        if (!isOnline && !(await checkConnectivity())) {
            addToast("Нет подключения к интернету", "error", 2000);
            return null;
        }

        setIsCreatingBackup(true);
        try {
            const backupId = generateUUID();
            const now = Date.now();
            const avatarsMap = await getAllAvatarsFromStorage();

            const backupData: CloudBackup = {
                id: backupId,
                createdAt: now,
                matchCount: history.length,
                history: history,
                deletedHistory: deletedHistory,
                avatars: avatarsMap,
            };

            await db.collection('backups').doc(backupId).set(backupData);

            addToast("Бэкап успешно создан", "success", 2000);


            // Обновляем локальный список бэкапов
            setCloudBackups(prev => [{
                id: backupId,
                createdAt: now,
                matchCount: history.length
            }, ...prev]);

            return backupId;
        } catch (e) {
            console.error("Create backup failed", e);
            addToast("Ошибка создания бэкапа", "error", 2000);
            return null;
        } finally {
            setIsCreatingBackup(false);
        }
    };

    // Получение списка бэкапов из облака
    const listCloudBackups = async () => {
        if (!isOnline && !(await checkConnectivity())) {
            addToast("Нет подключения к интернету", "error", 2000);
            return [];
        }

        setIsLoadingBackups(true);
        try {
            const snapshot = await db.collection('backups')
                .orderBy('createdAt', 'desc')
                .get();

            const backups = snapshot.docs.map((doc: any) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    createdAt: data.createdAt,
                    matchCount: data.matchCount || 0
                };
            });

            setCloudBackups(backups);
            return backups;
        } catch (e) {
            console.error("List backups failed", e);
            addToast("Ошибка загрузки списка бэкапов", "error", 2000);
            return [];
        } finally {
            setIsLoadingBackups(false);
        }
    };

    // Восстановление из бэкапа
    const restoreFromCloudBackup = async (backupId: string) => {
        if (!isOnline && !(await checkConnectivity())) {
            addToast("Нет подключения к интернету", "error", 2000);
            return false; // Changed from null/empty array to match respective return type logically or handle upstream
        }

        setIsRestoringBackup(true);
        try {
            const doc = await db.collection('backups').doc(backupId).get();

            if (!doc.exists) {
                addToast("Бэкап не найден", "error", 2000);
                return false;
            }

            const data = doc.data() as CloudBackup;
            const now = Date.now();

            // Обновляем lastUpdated для всех матчей, чтобы при синхронизации они перезаписали данные в БД
            const restoredHistory = data.history.map(match => ({
                ...match,
                lastUpdated: now
            }));

            const restoredDeletedHistory = data.deletedHistory.map(match => ({
                ...match,
                lastUpdated: now
            }));

            setHistory(restoredHistory);
            setDeletedHistory(restoredDeletedHistory);
            setDeletedIds(new Set());

            if (data.avatars && typeof data.avatars === 'object') {
                await saveAllAvatarsToStorage(data.avatars);
            }

            addToast("Данные из бэкапа успешно восстановлены", "success", 2000);

            return true;
        } catch (e) {
            console.error("Restore backup failed", e);
            addToast("Ошибка восстановления из бэкапа", "error", 2000);
            return false;
        } finally {
            setIsRestoringBackup(false);
        }
    };

    // Удаление бэкапа из облака
    const deleteCloudBackup = async (backupId: string) => {
        if (!isOnline && !(await checkConnectivity())) {
            addToast("Нет подключения к интернету", "error", 2000);
            return false;
        }

        try {
            await db.collection('backups').doc(backupId).delete();
            setCloudBackups(prev => prev.filter(b => b.id !== backupId));
            addToast("Бэкап удален", "success", 2000);
            return true;
        } catch (e) {
            console.error("Delete backup failed", e);
            addToast("Ошибка удаления бэкапа", "error", 2000);
            return false;
        }
    };

    // Получение деталей бэкапа (для просмотра)
    const getCloudBackupDetails = async (backupId: string): Promise<CloudBackup | null> => {
        if (!isOnline && !(await checkConnectivity())) {
            addToast("Нет подключения к интернету", "error", 2000);
            return null;
        }

        try {
            const doc = await db.collection('backups').doc(backupId).get();
            if (!doc.exists) {
                addToast("Бэкап не найден", "error", 2000);
                return null;
            }
            return doc.data() as CloudBackup;
        } catch (e) {
            console.error("Get backup details failed", e);
            addToast("Ошибка получения данных бэкапа", "error", 2000);
            return null;
        }
    };

    return {
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
        // Облачный бэкап
        createCloudBackup,
        listCloudBackups,
        restoreFromCloudBackup,
        cloudBackups,
        isCreatingBackup,
        isLoadingBackups,
        isRestoringBackup,
        deleteCloudBackup,
        getCloudBackupDetails,

        isLoaded
    };
};

