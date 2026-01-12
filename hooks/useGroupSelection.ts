import { useState, useEffect } from 'react';
import { HeroList } from '../types';

const STORAGE_KEY_GROUP_MODE = 'randomatched_group_mode_v1';
const STORAGE_KEY_SELECTED_GROUP = 'randomatched_selected_group_v1';

export const useGroupSelection = (lists: HeroList[]) => {
    const [isGroupMode, setIsGroupMode] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_GROUP_MODE) === 'true';
        } catch { return false; }
    });

    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SELECTED_GROUP);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });

    // Clean up selectedGroupIds if lists change (deleted or ungroupped)
    useEffect(() => {
        setSelectedGroupIds(prev => {
            const next = new Set(prev);
            let changed = false;
            // Filter out IDs that no longer exist in lists or are not groupable
            const validGroupIds = new Set(lists.filter(l => l.isGroupable).map(l => l.id));

            for (const id of next) {
                if (!validGroupIds.has(id)) {
                    next.delete(id);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [lists]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_GROUP_MODE, String(isGroupMode));
    }, [isGroupMode]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_SELECTED_GROUP, JSON.stringify(Array.from(selectedGroupIds)));
    }, [selectedGroupIds]);

    const handleToggleGroupItem = (id: string) => {
        setSelectedGroupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
        // Note: Haptics should be triggered by the consumer of this hook
    };

    return {
        isGroupMode,
        setIsGroupMode,
        selectedGroupIds,
        setSelectedGroupIds,
        handleToggleGroupItem
    };
};
