
import { useState, useEffect, useCallback } from 'react';
import { MatchRecord, AssignedPlayer, ToastType, MatchPlayer } from '../types';
import { db } from '../firebase';

const STORAGE_KEY_HISTORY = 'randomatched_match_history_v1';

export const useMatchHistory = (
    addToast: (message: string, type: ToastType, duration?: number) => void
) => {
    const [history, setHistory] = useState<MatchRecord[]>([]);
    const [isSyncingHistory, setIsSyncingHistory] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }, [history]);

    const addMatch = (assignments: AssignedPlayer[], winner: 'team1' | 'team2' | 'draw', playerNames: string[]) => {
        const team1 = assignments.filter(a => a.team === 'Odd').map(a => {
            const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
            const idx = positionToIndex[a.position];
            return {
                name: (playerNames[idx] || `Игрок ${a.playerNumber}`).trim(),
                heroId: a.hero?.id || 'unknown',
                heroName: a.hero?.name || 'Unknown'
            };
        });

        const team2 = assignments.filter(a => a.team === 'Even').map(a => {
            const positionToIndex: Record<string, number> = { 'bottom': 0, 'top': 1, 'left': 2, 'right': 3 };
            const idx = positionToIndex[a.position];
            return {
                name: (playerNames[idx] || `Игрок ${a.playerNumber}`).trim(),
                heroId: a.hero?.id || 'unknown',
                heroName: a.hero?.name || 'Unknown'
            };
        });

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
        winner: 'team1' | 'team2' | 'draw'
    ) => {
        const newMatch: MatchRecord = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            team1,
            team2,
            winner
        };
        setHistory(prev => [newMatch, ...prev]);
        addToast("Матч добавлен вручную", "success");
    };

    const updateMatch = (id: string, updates: Partial<MatchRecord>) => {
        setHistory(prev => prev.map(m => m.id === id ? { ...m, ...updates, lastUpdated: Date.now() } : m));
        addToast("Матч обновлен", "success");
    };

    const deleteMatch = (id: string) => {
        setHistory(prev => prev.filter(m => m.id !== id));
        addToast("Матч удален", "info");
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
        addToast(`Игрок "${oldName}" переименован в "${newName}"`, 'success');
    };

    const syncHistory = async () => {
        if (!navigator.onLine) {
            addToast("Нет подключения к интернету", "error");
            return;
        }

        setIsSyncingHistory(true);
        try {
            // 1. Fetch all matches from Cloud
            const snapshot = await db.collection('match_history').get();
            const cloudMatches: MatchRecord[] = [];
            
            snapshot.forEach((doc: any) => {
                cloudMatches.push(doc.data() as MatchRecord);
            });

            // 2. Merge logic
            const mergedMap = new Map<string, MatchRecord>();
            
            // Put local first
            history.forEach(m => mergedMap.set(m.id, m));

            let newFromCloud = 0;
            let updatedFromCloud = 0;

            cloudMatches.forEach(cloudMatch => {
                const localMatch = mergedMap.get(cloudMatch.id);
                if (!localMatch) {
                    mergedMap.set(cloudMatch.id, cloudMatch);
                    newFromCloud++;
                } else {
                    // Conflict resolution: prefer newer update
                    if (cloudMatch.lastUpdated > localMatch.lastUpdated) {
                        mergedMap.set(cloudMatch.id, cloudMatch);
                        updatedFromCloud++;
                    }
                }
            });

            // 3. Identify matches that need to be pushed to cloud
            const batch = db.batch();
            let batchCount = 0;

            for (const [id, match] of mergedMap.entries()) {
                const cloudMatch = cloudMatches.find(c => c.id === id);
                // If not in cloud OR local is newer
                if (!cloudMatch || match.lastUpdated > cloudMatch.lastUpdated) {
                    const ref = db.collection('match_history').doc(id);
                    batch.set(ref, match);
                    batchCount++;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
            }

            // 4. Update local state
            // Sort by timestamp desc
            const finalHistory = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            setHistory(finalHistory);

            const msg = [];
            if (newFromCloud > 0) msg.push(`Загружено: ${newFromCloud}`);
            if (updatedFromCloud > 0) msg.push(`Обновлено: ${updatedFromCloud}`);
            if (batchCount > 0) msg.push(`Отправлено: ${batchCount}`);
            
            if (msg.length > 0) {
                addToast(`Синхронизация: ${msg.join(', ')}`, 'success', 3000);
            } else {
                addToast("Данные актуальны", "info");
            }

        } catch (e) {
            console.error("Sync history failed", e);
            addToast("Ошибка синхронизации истории", "error");
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
        syncHistory,
        isSyncingHistory
    };
};
