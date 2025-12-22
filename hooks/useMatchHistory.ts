
import { useState, useEffect, useCallback } from 'react';
import { MatchRecord, AssignedPlayer, ToastType, MatchPlayer } from '../types';
import { db } from '../firebase';

const STORAGE_KEY_HISTORY = 'randomatched_match_history_v1';
const STORAGE_KEY_DELETED = 'randomatched_deleted_matches_v1';

export const useMatchHistory = (
    addToast: (message: string, type: ToastType, duration?: number) => void
) => {
    const [history, setHistory] = useState<MatchRecord[]>([]);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [isSyncingHistory, setIsSyncingHistory] = useState(false);

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
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }, [history]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(deletedIds)));
    }, [deletedIds]);

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
        setHistory(prev => prev.filter(m => m.id !== id));
        setDeletedIds(prev => new Set(prev).add(id));
        addToast("Матч удален", "info", 2000);
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

    const syncHistory = async () => {
        if (!navigator.onLine) {
            addToast("Нет подключения к интернету", "error", 2000);
            return;
        }

        setIsSyncingHistory(true);
        try {
            const batch = db.batch();
            let opsCount = 0;

            // 1. Process Deletions First
            if (deletedIds.size > 0) {
                for (const id of deletedIds) {
                    const ref = db.collection('match_history').doc(id);
                    // We don't check existence, just delete. If it's already gone, it's fine.
                    batch.delete(ref);
                    opsCount++;
                }
            }

            // 2. Fetch all matches from Cloud to compare
            const snapshot = await db.collection('match_history').get();
            const cloudMatchesMap = new Map<string, MatchRecord>();
            snapshot.forEach((doc: any) => {
                cloudMatchesMap.set(doc.id, doc.data() as MatchRecord);
            });

            const mergedMap = new Map<string, MatchRecord>();
            let newFromCloud = 0;
            let updatedFromCloud = 0;
            let pushedToCloud = 0;

            // 3. Compare Local vs Cloud
            // Add local history to map first (filtered by not deleted)
            const currentLocalHistory = history.filter(m => !deletedIds.has(m.id));
            
            for (const localMatch of currentLocalHistory) {
                mergedMap.set(localMatch.id, localMatch);
                
                const cloudMatch = cloudMatchesMap.get(localMatch.id);
                
                if (!cloudMatch) {
                    // Not in cloud -> Push to cloud
                    const ref = db.collection('match_history').doc(localMatch.id);
                    batch.set(ref, localMatch);
                    opsCount++;
                    pushedToCloud++;
                } else {
                    // Exists in cloud. Check timestamp.
                    if (localMatch.lastUpdated > cloudMatch.lastUpdated) {
                        // Local is newer -> Push to cloud
                        const ref = db.collection('match_history').doc(localMatch.id);
                        batch.set(ref, localMatch);
                        opsCount++;
                        pushedToCloud++;
                    } else if (cloudMatch.lastUpdated > localMatch.lastUpdated) {
                        // Cloud is newer -> Update local (in the map)
                        mergedMap.set(cloudMatch.id, cloudMatch);
                        updatedFromCloud++;
                    }
                }
            }

            // 4. Handle matches that are ONLY in cloud
            for (const [id, cloudMatch] of cloudMatchesMap.entries()) {
                if (!mergedMap.has(id) && !deletedIds.has(id)) {
                    // New from cloud
                    mergedMap.set(id, cloudMatch);
                    newFromCloud++;
                }
            }

            // Commit writes
            if (opsCount > 0) {
                await batch.commit();
            }

            // Update Local State
            const finalHistory = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            setHistory(finalHistory);
            
            // Clear deleted IDs after successful sync
            setDeletedIds(new Set());

            const msg = [];
            if (newFromCloud > 0) msg.push(`Скачано: ${newFromCloud}`);
            if (updatedFromCloud > 0) msg.push(`Обновлено: ${updatedFromCloud}`);
            if (pushedToCloud > 0) msg.push(`Отправлено: ${pushedToCloud}`);
            
            if (msg.length > 0) {
                addToast(`Синхронизация: ${msg.join(', ')}`, 'success', 2500);
            } else {
                addToast("Данные актуальны", "info", 1500);
            }

        } catch (e) {
            console.error("Sync history failed", e);
            addToast("Ошибка синхронизации истории", "error", 2000);
        } finally {
            setIsSyncingHistory(false);
        }
    };

    return {
        history,
        addMatch,
        addManualMatch,
        updateMatch,
        deleteMatch,
        renamePlayer,
        renameHero,
        syncHistory,
        isSyncingHistory
    };
};
