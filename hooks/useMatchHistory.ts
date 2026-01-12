
import { useState, useEffect, useCallback } from 'react';
import { MatchRecord, AssignedPlayer, ToastType, MatchPlayer } from '../types';
import { db } from '../firebase';

const STORAGE_KEY_HISTORY = 'randomatched_match_history_v1';
const STORAGE_KEY_DELETED = 'randomatched_deleted_matches_v1';
const STORAGE_KEY_DELETED_HISTORY = 'randomatched_deleted_history_content_v1';

export const useMatchHistory = (
    addToast: (message: string, type: ToastType, duration?: number) => void
) => {
    const [history, setHistory] = useState<MatchRecord[]>([]);
    const [deletedHistory, setDeletedHistory] = useState<MatchRecord[]>([]);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [isSyncingHistory, setIsSyncingHistory] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isAutoSyncStatsEnabled, setIsAutoSyncStatsEnabled] = useState(() => {
        try {
            const saved = localStorage.getItem('randomatched_auto_sync_stats');
            return saved !== null ? JSON.parse(saved) : true;
        } catch {
            return true;
        }
    });

    const toggleAutoSyncStats = () => {
        setIsAutoSyncStatsEnabled(prev => {
            const newVal = !prev;
            localStorage.setItem('randomatched_auto_sync_stats', JSON.stringify(newVal));
            return newVal;
        });
    };

    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
            const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED);
            if (savedDeleted) {
                setDeletedIds(new Set(JSON.parse(savedDeleted)));
            }
            const savedDeletedHistory = localStorage.getItem(STORAGE_KEY_DELETED_HISTORY);
            if (savedDeletedHistory) {
                setDeletedHistory(JSON.parse(savedDeletedHistory));
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

    const addMatch = (assignments: AssignedPlayer[], winner: 'team1' | 'team2', playerNames: string[]) => {
        const team1Raw = assignments.filter(a => a.team === 'Odd').map(a => {
            const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
            const idx = positionToIndex[a.position];
            return {
                name: (playerNames[idx] || '').trim(),
                heroId: a.hero?.id || 'unknown',
                heroName: a.hero?.name || 'Unknown'
            };
        });

        const team2Raw = assignments.filter(a => a.team === 'Even').map(a => {
            const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
            const idx = positionToIndex[a.position];
            return {
                name: (playerNames[idx] || '').trim(),
                heroId: a.hero?.id || 'unknown',
                heroName: a.hero?.name || 'Unknown'
            };
        });

        // Filter out players with empty names
        const team1 = team1Raw.filter(p => p.name !== '');
        const team2 = team2Raw.filter(p => p.name !== '');

        const newMatch: MatchRecord = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            team1,
            team2,
            winner
        };

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
            id: crypto.randomUUID(),
            timestamp,
            lastUpdated: Date.now(),
            team1,
            team2,
            winner
        };
        setHistory(prev => [newMatch, ...prev]);
        addToast("Матч добавлен вручную", "success", 2000);
    };

    const updateMatch = (id: string, updates: Partial<MatchRecord>) => {
        setHistory(prev => prev.map(m => m.id === id ? { ...m, ...updates, lastUpdated: Date.now() } : m));
        addToast("Матч обновлен", "success", 2000);
    };

    const deleteMatch = (id: string) => {
        const matchToDelete = history.find(m => m.id === id);
        if (matchToDelete) {
            setDeletedHistory(prev => [matchToDelete, ...prev]);
            setHistory(prev => prev.filter(m => m.id !== id));
            setDeletedIds(prev => new Set(prev).add(id));
            addToast("Матч перемещен в корзину", "info", 2000);
        }
    };

    const restoreMatch = (id: string) => {
        const matchToRestore = deletedHistory.find(m => m.id === id);
        if (matchToRestore) {
            const restoredMatch = { ...matchToRestore, lastUpdated: Date.now() }; // Update timestamp for sync
            if ('deleted' in restoredMatch) delete (restoredMatch as any).deleted;
            setHistory(prev => [restoredMatch, ...prev].sort((a, b) => b.timestamp - a.timestamp));
            setDeletedHistory(prev => prev.filter(m => m.id !== id));
            setDeletedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            addToast("Матч восстановлен", "success", 2000);
        }
    };

    const permanentDeleteMatch = (id: string) => {
        setDeletedHistory(prev => prev.filter(m => m.id !== id));
        // Ensure it's in deletedIds for sync (should already be there)
        setDeletedIds(prev => new Set(prev).add(id));
        addToast("Матч удален навсегда", "info", 2000);
    };

    const clearTrash = () => {
        if (deletedHistory.length === 0) return;
        const ids = deletedHistory.map(m => m.id);
        setDeletedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.add(id));
            return next;
        });
        setDeletedHistory([]);
        addToast("Корзина очищена", "info", 2000);
    };

    const renamePlayer = (oldName: string, newName: string) => {
        if (!oldName.trim() || !newName.trim() || oldName === newName) return;

        setHistory(prev => prev.map(match => {
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
        }));
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

    const syncHistory = async (options?: { silentIfNoChanges?: boolean }) => {
        const { silentIfNoChanges = false } = options || {};

        if (!navigator.onLine) {
            if (!silentIfNoChanges) {
                addToast("Нет подключения к интернету", "error", 2000);
            }
            return;
        }

        setIsSyncingHistory(true);
        try {
            const batch = db.batch();
            let opsCount = 0;

            // 1. Process Pending Deletions (Push Tombstones with Data)
            if (deletedIds.size > 0) {
                const currentDeletedMap = new Map(deletedHistory.map(m => [m.id, m]));
                const currentActiveMap = new Map(history.map(m => [m.id, m]));

                for (const id of deletedIds) {
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

            // 2. Fetch all matches from Cloud
            const snapshot = await db.collection('match_history').get();
            const cloudMatchesMap = new Map<string, any>();
            snapshot.forEach((doc: any) => {
                cloudMatchesMap.set(doc.id, doc.data());
            });

            const mergedMap = new Map<string, MatchRecord>();
            const newDeletedMap = new Map<string, MatchRecord>();

            // Allow tracking of what we have processed to avoid duplication
            // Initialize with current deleted history
            deletedHistory.forEach(m => newDeletedMap.set(m.id, m));

            let newFromCloud = 0;
            let updatedFromCloud = 0;
            let pushedToCloud = 0;
            let deletedFromCloud = 0;

            // 3. Sync LOCAL ACTIVE -> CLOUD
            const currentLocalHistory = history.filter(m => !deletedIds.has(m.id));

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
                    if (cloudMatch.deleted) {
                        if (cloudMatch.permanent) {
                            // Cloud says PERMANENTLY deleted.
                            if (localMatch.lastUpdated > cloudMatch.lastUpdated) {
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
                            if (localMatch.lastUpdated > cloudMatch.lastUpdated) {
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
                        if (localMatch.lastUpdated > cloudMatch.lastUpdated) {
                            // Local newer -> Push
                            const ref = db.collection('match_history').doc(localMatch.id);
                            batch.set(ref, localMatch);
                            mergedMap.set(localMatch.id, localMatch);
                            opsCount++;
                            pushedToCloud++;
                        } else if (cloudMatch.lastUpdated > localMatch.lastUpdated) {
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
            for (const trashMatch of deletedHistory) {
                if (deletedIds.has(trashMatch.id)) continue; // Already pushed in step 1

                const cloudMatch = cloudMatchesMap.get(trashMatch.id);
                if (!cloudMatch) {
                    // Missing in cloud -> Push to cloud as deleted (Protect data)
                    const ref = db.collection('match_history').doc(trashMatch.id);
                    batch.set(ref, { ...trashMatch, deleted: true, permanent: false });
                    opsCount++;
                    pushedToCloud++;
                } else {
                    // Exists in cloud
                    if (cloudMatch.deleted) {
                        if (cloudMatch.permanent) {
                            // Cloud is PERMANENTLY deleted.
                            if (trashMatch.lastUpdated > cloudMatch.lastUpdated) {
                                // Local trash update is newer? (Maybe just renamed in trash?)
                                // If it was restored, it would be in Active loop.
                                // If it's still in trash locally but newer than permanent delete...
                                // Maybe force push soft delete? Or respect permanent?
                                // Let's respect permanent unless local is significantly newer?
                                // Actually, if we are here, we are in TRASH.
                                // If cloud says "Hard Delete", we should probably drop it from trash.
                                newDeletedMap.delete(trashMatch.id);
                                deletedFromCloud++;
                            } else {
                                // Cloud Permanent wins -> Drop from trash
                                newDeletedMap.delete(trashMatch.id);
                                deletedFromCloud++;
                            }
                        } else {
                            // Both Soft Deleted. Update if local newer.
                            if (trashMatch.lastUpdated > cloudMatch.lastUpdated) {
                                const ref = db.collection('match_history').doc(trashMatch.id);
                                batch.set(ref, { ...trashMatch, deleted: true, permanent: false });
                                opsCount++;
                            } else if (cloudMatch.lastUpdated > trashMatch.lastUpdated) {
                                newDeletedMap.set(trashMatch.id, cloudMatch as MatchRecord);
                            }
                        }
                    } else {
                        // Cloud is Active.
                        if (trashMatch.lastUpdated > cloudMatch.lastUpdated) {
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
                if (deletedIds.has(id)) continue;

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

            // Commit
            if (opsCount > 0) {
                await batch.commit();
            }

            // Update Local
            const finalHistory = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            setHistory(finalHistory);

            const finalDeletedHistory = Array.from(newDeletedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            setDeletedHistory(finalDeletedHistory);

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

            // Cleanup permanently deleted docs
            await cleanupPermanentDeletes();

        } catch (e) {
            console.error("Sync history failed", e);
            if (!silentIfNoChanges) {
                addToast("Ошибка синхронизации истории", "error", 2000);
            }
        } finally {
            setIsSyncingHistory(false);
        }
    };

    const importData = (data: { history: MatchRecord[], deletedHistory: MatchRecord[] }) => {
        try {
            if (!Array.isArray(data.history) || !Array.isArray(data.deletedHistory)) {
                throw new Error("Invalid data format");
            }
            setHistory(data.history);
            setDeletedHistory(data.deletedHistory);
            // Optionally clear pending deletions since we just did a full state replace
            setDeletedIds(new Set());
            addToast("Данные успешно импортированы", "success", 2000);
            return true;
        } catch (e) {
            console.error("Import failed", e);
            addToast("Ошибка импорта данных", "error", 2000);
            return false;
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
        syncHistory,
        isSyncingHistory,
        isAutoSyncStatsEnabled,
        toggleAutoSyncStats,
        importData
    };
};
