import { useState, useEffect, useRef } from 'react';
import { HeroList } from '../types';

const STORAGE_KEY_GROUP_MODE = 'randomatched_group_mode_v1';
const STORAGE_KEY_SELECTED_GROUP = 'randomatched_selected_group_v1';

export const useGroupSelection = (lists: HeroList[], currentSingleId?: string) => {
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

    const prevListIds = useRef<Set<string>>(new Set());
    const prevIsGroupMode = useRef<boolean>(isGroupMode);

    // Clean up selectedGroupIds if lists change (deleted or ungroupped)
    // AND auto-select temporary lists if they are newly created
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

            // Auto-select temporary lists that are newly added to the lists array
            lists.forEach(list => {
                if (list.isTemporary && list.isGroupable && !prevListIds.current.has(list.id)) {
                    if (!next.has(list.id)) {
                        next.add(list.id);
                        changed = true;
                    }
                }
            });

            // Update the tracker for seen list IDs
            prevListIds.current = new Set(lists.map(l => l.id));

            return changed ? next : prev;
        });
    }, [lists]);

    // Handle auto-selection of active temporary list when switching from Single to Group mode
    useEffect(() => {
        if (isGroupMode && !prevIsGroupMode.current && currentSingleId) {
            const activeList = lists.find(l => l.id === currentSingleId);
            if (activeList?.isTemporary && activeList.isGroupable) {
                setSelectedGroupIds(prev => {
                    if (prev.has(currentSingleId)) return prev;
                    const next = new Set(prev);
                    next.add(currentSingleId);
                    return next;
                });
            }
        }
        prevIsGroupMode.current = isGroupMode;
    }, [isGroupMode, currentSingleId, lists]);

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
