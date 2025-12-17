import { useState, useEffect } from 'react';
import { HeroList } from '../types';
import { PRESET_LISTS } from '../constants';

const STORAGE_KEY = 'randomatched_lists_v1';

export const useHeroLists = () => {
  const [lists, setLists] = useState<HeroList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedLists = JSON.parse(stored);
        // Ensure we don't load an empty array if something went wrong, unless user explicitly deleted everything.
        // For now, if valid array, use it.
        if (Array.isArray(parsedLists)) {
           setLists(parsedLists);
        } else {
           setLists(PRESET_LISTS);
        }
      } else {
        setLists(PRESET_LISTS);
      }
    } catch (e) {
      console.error("Failed to parse lists", e);
      setLists(PRESET_LISTS);
    }
    setIsLoaded(true);
  }, []);

  // Save to storage whenever lists change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    }
  }, [lists, isLoaded]);

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

  const updateList = (id: string, updates: Partial<HeroList>) => {
    setLists(prev => prev.map(list => 
      list.id === id 
        ? { ...list, ...updates, lastModified: Date.now() } 
        : list
    ));
  };

  const deleteList = (id: string) => {
    setLists(prev => prev.filter(list => list.id !== id));
  };

  return {
    lists,
    addList,
    updateList,
    deleteList,
    isLoaded
  };
};