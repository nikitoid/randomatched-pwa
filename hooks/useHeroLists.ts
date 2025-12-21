
import { useState, useEffect, useCallback } from 'react';
import { HeroList, Hero, ToastType } from '../types';
import { db } from '../firebase';

const STORAGE_KEY = 'randomatched_lists_v1';

// Inject toast function via arguments to keep hook pure regarding UI state
export const useHeroLists = (
    addToast: (message: string, type: ToastType, duration?: number) => void
) => {
  const [lists, setLists] = useState<HeroList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [updatedListIds, setUpdatedListIds] = useState<Set<string>>(new Set());
  const [updatedHeroIds, setUpdatedHeroIds] = useState<Map<string, Set<string>>>(new Map());

  const markListAsSeen = useCallback((id: string) => {
    setUpdatedListIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
            next.delete(id);
            return next;
        }
        return prev;
    });
  }, []);

  const dismissHeroUpdates = useCallback((listId: string) => {
      setUpdatedHeroIds(prev => {
          const next = new Map(prev);
          if (next.has(listId)) {
              next.delete(listId);
              return next;
          }
          return prev;
      });
  }, []);

  const areHeroArraysEqual = (a: Hero[], b: Hero[]) => {
      if (a.length !== b.length) return false;
      return a.every((heroA, index) => {
          const heroB = b[index];
          const rankA = (heroA.rank || '').trim();
          const rankB = (heroB.rank || '').trim();
          const nameA = (heroA.name || '').trim();
          const nameB = (heroB.name || '').trim();
          const idA = heroA.id || '';
          const idB = heroB.id || '';
          
          return idA === idB && nameA === nameB && rankA === rankB;
      });
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedLists = JSON.parse(stored);
        if (Array.isArray(parsedLists)) {
           const migratedLists = parsedLists.map((list: any) => {
             if (list.heroes && list.heroes.length > 0 && typeof list.heroes[0] === 'string') {
               return {
                 ...list,
                 heroes: list.heroes.map((name: string, idx: number) => ({
                   id: `${list.id}_migrated_${idx}`, 
                   name: name,
                   rank: 'C+' 
                 }))
               };
             }
             return list;
           });
           setLists(migratedLists);
        } else {
           setLists([]);
        }
      } else {
        setLists([]);
      }
    } catch (e) {
      console.error("Failed to parse lists", e);
      setLists([]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    }
  }, [lists, isLoaded]);

  const checkConnectivity = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Short 2s timeout

    try {
        await fetch(`https://www.google.com/favicon.ico?_=${Date.now()}`, { 
            mode: 'no-cors', 
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch (e) {
        clearTimeout(timeoutId);
        return false;
    }
  };

  useEffect(() => {
    const handleOnline = () => {
        // Optimistic update immediately for better UI response
        setIsOnline(true);
        // Then verify actual internet access
        checkConnectivity().then(hasAccess => {
            if (!hasAccess) setIsOnline(false);
        });
    };
    
    const handleOffline = () => {
        // Immediate UI update
        setIsOnline(false);
        setIsSyncing(false);
    };

    // Re-check when app comes to foreground (handles wifi toggles in system tray)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            if (navigator.onLine) {
                setIsOnline(true);
                checkConnectivity().then(hasAccess => {
                    if (!hasAccess) setIsOnline(false);
                });
            } else {
                setIsOnline(false);
            }
        }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check on mount
    checkConnectivity().then(setIsOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const syncWithCloud = async () => {
    if (!isLoaded) return;
    
    if (!navigator.onLine) {
        setIsOnline(false);
        addToast("Нет подключения к сети", "error");
        return;
    }

    setIsSyncing(true);
    
    // Check real connectivity before attempting DB
    const hasInternet = await checkConnectivity();
    if (!hasInternet) {
      setIsOnline(false);
      setIsSyncing(false);
      addToast("Не удалось подключиться к серверу", "error");
      return;
    }
    
    // Ensure state is true if check passed
    setIsOnline(true);

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
      const snapshotPromise = db.collection("lists").get();
      
      const querySnapshot: any = await Promise.race([snapshotPromise, timeoutPromise]);
      
      const cloudListsMap = new Map<string, HeroList>();
      
      querySnapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        let processedHeroes: Hero[] = [];
        if (Array.isArray(data.heroes)) {
            if (data.heroes.length > 0 && typeof data.heroes[0] === 'string') {
                 processedHeroes = data.heroes.map((name: string, idx: number) => ({ 
                     id: `${docSnap.id}_legacy_${idx}`, 
                     name, 
                     rank: 'C+' 
                 }));
            } else {
                 processedHeroes = data.heroes.map((h: any, idx: number) => ({
                     ...h,
                     id: h.id || `${docSnap.id}_fallback_${idx}`
                 }));
            }
        }

        cloudListsMap.set(docSnap.id, {
           id: docSnap.id,
           name: data.name,
           heroes: processedHeroes,
           isLocal: false,
           isCloud: true,
           isGroupable: data.isGroupable ?? false,
           lastModified: Date.now()
        });
      });

      setLists(prevLists => {
        const newLists = [...prevLists];
        let hasChanges = false;
        const newUpdates = new Set(updatedListIds);
        const newHeroUpdates = new Map<string, Set<string>>(updatedHeroIds);

        cloudListsMap.forEach((cloudList, id) => {
            const existingIndex = newLists.findIndex(l => l.id === id);
            
            if (existingIndex !== -1) {
                const existingList = newLists[existingIndex];
                
                if (existingList.isCloud) {
                    const isNameChanged = (existingList.name || '').trim() !== (cloudList.name || '').trim();
                    const isGroupableChanged = existingList.isGroupable !== cloudList.isGroupable;
                    const isHeroesChanged = !areHeroArraysEqual(existingList.heroes, cloudList.heroes);

                    if (isNameChanged || isHeroesChanged || isGroupableChanged) {
                        newLists[existingIndex] = { ...existingList, ...cloudList };
                        newUpdates.add(existingList.id);
                        hasChanges = true;

                        if (isHeroesChanged) {
                            const changedIds = new Set<string>();
                            const localMap = new Map<string, Hero>(existingList.heroes.map(h => [h.id, h]));
                            
                            cloudList.heroes.forEach((cloudHero: Hero) => {
                                const localHero = localMap.get(cloudHero.id);
                                if (!localHero) {
                                    changedIds.add(`${cloudHero.id}:name`);
                                    changedIds.add(`${cloudHero.id}:rank`);
                                } else {
                                    const rA = (localHero.rank || '').trim();
                                    const rB = (cloudHero.rank || '').trim();
                                    const nA = (localHero.name || '').trim();
                                    const nB = (cloudHero.name || '').trim();
                                    
                                    if (nA !== nB) changedIds.add(`${cloudHero.id}:name`);
                                    if (rA !== rB) changedIds.add(`${cloudHero.id}:rank`);
                                }
                            });
                            
                            if (changedIds.size > 0) {
                                newHeroUpdates.set(existingList.id, changedIds);
                            }
                        }
                    }
                }
            } else {
                newLists.push(cloudList);
                hasChanges = true;
                newUpdates.add(cloudList.id);
            }
        });

        for (let i = 0; i < newLists.length; i++) {
            const list = newLists[i];
            if (list.isCloud && !cloudListsMap.has(list.id)) {
                newLists[i] = { ...list, isCloud: false, isLocal: true };
                addToast(`Облачный список "${list.name}" был удален с сервера. Сохранена локальная копия.`, 'warning');
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
             setUpdatedListIds(newUpdates);
             setUpdatedHeroIds(newHeroUpdates);
        }

        return hasChanges ? newLists : prevLists;
      });

    } catch (error) {
      console.error("Error syncing with Firestore:", error);
      if (isOnline) addToast("Ошибка синхронизации с облаком", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const addList = (name: string) => {
    const newList: HeroList = {
      id: crypto.randomUUID(),
      name,
      heroes: [],
      isLocal: true,
      lastModified: Date.now()
    };
    setLists(prev => [...prev, newList]);
    return newList.id;
  };

  const uploadToCloud = async (id: string) => {
    const listToUpload = lists.find(l => l.id === id);
    if (!listToUpload) return;

    const hasInternet = await checkConnectivity();
    if (!hasInternet) {
        addToast("Нет подключения к интернету. Операция отменена.", "error");
        setIsOnline(false);
        return;
    }

    try {
        setIsSyncing(true);
        const docRef = await db.collection("lists").add({
            name: listToUpload.name,
            heroes: listToUpload.heroes,
            isGroupable: listToUpload.isGroupable || false
        });

        const newCloudId = docRef.id;

        setLists(prev => prev.map(list => {
            if (list.id === id) {
                return { 
                    ...list, 
                    id: newCloudId, 
                    isCloud: true,
                    isLocal: false 
                };
            }
            return list;
        }));

        addToast(`Список "${listToUpload.name}" загружен в облако`, 'success');
    } catch (e) {
        console.error("Upload failed", e);
        addToast("Ошибка загрузки в облако", "error");
    } finally {
        setIsSyncing(false);
    }
  };

  const updateList = async (id: string, updates: Partial<HeroList>) => {
    setLists(prev => prev.map(list => 
      list.id === id 
        ? { ...list, ...updates, lastModified: Date.now() } 
        : list
    ));

    const currentList = lists.find(l => l.id === id);
    const updatedData = { ...currentList, ...updates };

    if (updatedData.isCloud) {
        if (navigator.onLine) {
            try {
                await db.collection("lists").doc(id).set({
                    name: updatedData.name,
                    heroes: updatedData.heroes,
                    isGroupable: updatedData.isGroupable || false
                }, { merge: true });
            } catch (e) {
                console.error("Failed to update cloud list", e);
            }
        }
    }
  };

  const deleteList = async (id: string) => {
    const listToDelete = lists.find(l => l.id === id);
    if (!listToDelete) return;

    if (listToDelete.isCloud) {
        const hasInternet = await checkConnectivity();
        if (!hasInternet) {
            addToast("Нет сети. Невозможно удалить из облака.", "error");
            setIsOnline(false);
            return;
        }

        try {
            await db.collection("lists").doc(id).delete();
            setLists(prev => prev.map(list => {
                if (list.id === id) {
                    return { ...list, isCloud: false, isLocal: true };
                }
                return list;
            }));
            addToast("Список удален из облака и сохранен локально", "success");
        } catch (e) {
            console.error("Failed to delete from cloud", e);
            addToast("Ошибка удаления из облака", "error");
        }
    } else {
        setLists(prev => prev.filter(list => list.id !== id));
    }
  };

  const resetTemporaryLists = () => {
    setLists(prev => prev.filter(list => !list.isTemporary));
  };

  const forkList = (sourceListId: string, heroesToExclude: Hero[]) => {
    const sourceList = lists.find(l => l.id === sourceListId);
    if (!sourceList) return null;

    const excludeIds = new Set(heroesToExclude.map(h => h.id));
    const newHeroes = sourceList.heroes.filter(h => !excludeIds.has(h.id));

    const newList: HeroList = {
      id: crypto.randomUUID(),
      name: sourceList.name,
      heroes: newHeroes,
      isLocal: true,
      isTemporary: true,
      isCloud: false, 
      lastModified: Date.now()
    };
    
    setLists(prev => [...prev, newList]);
    return newList.id;
  };

  const createTemporaryList = (heroes: Hero[], name: string) => {
    const newList: HeroList = {
      id: crypto.randomUUID(),
      name,
      heroes,
      isLocal: true,
      isTemporary: true,
      isCloud: false,
      lastModified: Date.now()
    };
    setLists(prev => [...prev, newList]);
    return newList.id;
  };

  const reorderLists = (newLists: HeroList[]) => {
    setLists(newLists);
  };

  const sortLists = (direction: 'asc' | 'desc') => {
      setLists(prev => [...prev].sort((a, b) => {
          return direction === 'asc' 
             ? a.name.localeCompare(b.name)
             : b.name.localeCompare(a.name);
      }));
  };

  return {
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
    checkConnectivity,
    isLoaded,
    isOnline,
    isSyncing,
    updatedListIds,
    markListAsSeen,
    updatedHeroIds,
    dismissHeroUpdates
  };
};
