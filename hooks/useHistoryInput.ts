import { useState, useEffect, useRef } from 'react';
import { STORAGE_KEYS, getStorageJSON, setStorageJSON } from '../utils/storage';

export const useHistoryInput = () => {
    const [playerNames, setPlayerNames] = useState<string[]>(() => {
        const saved = getStorageJSON<unknown>(STORAGE_KEYS.PLAYER_NAMES, null);
        return Array.isArray(saved) ? saved : ['', '', '', ''];
    });

    const [savedTeams, setSavedTeams] = useState<string[][]>(() => {
        const saved = getStorageJSON<unknown>(STORAGE_KEYS.SAVED_TEAMS, null);
        return Array.isArray(saved) ? saved : [];
    });

    const [deleteHistoryConfirm, setDeleteHistoryConfirm] = useState<number | null>(null);
    const [isNamesOpen, setIsNamesOpen] = useState(false);

    // Drag scroll state
    const historyScrollRef = useRef<HTMLDivElement>(null);
    const [isHistoryDragging, setIsHistoryDragging] = useState(false);
    const [historyStartX, setHistoryStartX] = useState(0);
    const [historyScrollLeft, setHistoryScrollLeft] = useState(0);
    const [isHistoryDragScroll, setIsHistoryDragScroll] = useState(false);

    useEffect(() => {
        setStorageJSON(STORAGE_KEYS.PLAYER_NAMES, playerNames);
    }, [playerNames]);

    useEffect(() => {
        setStorageJSON(STORAGE_KEYS.SAVED_TEAMS, savedTeams);
    }, [savedTeams]);

    // Click outside listener for History Delete Confirmation
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (deleteHistoryConfirm !== null && historyScrollRef.current && !historyScrollRef.current.contains(e.target as Node)) {
                setDeleteHistoryConfirm(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [deleteHistoryConfirm]);

    const handleNameChange = (index: number, value: string) => {
        const newNames = [...playerNames];
        newNames[index] = value;
        setPlayerNames(newNames);
    };

    const saveTeamHistory = () => {
        if (playerNames.every(n => !n.trim())) return;

        const currentTeamStr = JSON.stringify(playerNames);

        setSavedTeams(prev => {
            const filtered = prev.filter(team => JSON.stringify(team) !== currentTeamStr);
            return [playerNames, ...filtered].slice(0, 10);
        });
    };

    const handleSelectSavedTeam = (team: string[]) => {
        setPlayerNames(team);
    };

    const handleDeleteHistoryItem = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();

        if (deleteHistoryConfirm === index) {
            setSavedTeams(prev => prev.filter((_, i) => i !== index));
            setDeleteHistoryConfirm(null);
            return true; // Indicate deleted
        } else {
            setDeleteHistoryConfirm(index);
            return false; // Indicate confirmation requested
        }
    };

    // Drag handlers
    const handleHistoryMouseDown = (e: React.MouseEvent) => {
        const el = historyScrollRef.current;
        if (!el) return;
        setIsHistoryDragging(true);
        setIsHistoryDragScroll(false);
        setHistoryStartX(e.pageX - el.offsetLeft);
        setHistoryScrollLeft(el.scrollLeft);
    };

    const handleHistoryMouseLeave = () => {
        setIsHistoryDragging(false);
        setIsHistoryDragScroll(false);
    };

    const handleHistoryMouseUp = () => {
        setIsHistoryDragging(false);
        setTimeout(() => setIsHistoryDragScroll(false), 50);
    };

    const handleHistoryMouseMove = (e: React.MouseEvent) => {
        if (!isHistoryDragging || !historyScrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - historyScrollRef.current.offsetLeft;
        const walk = (x - historyStartX) * 2;
        if (Math.abs(x - historyStartX) > 5) {
            setIsHistoryDragScroll(true);
        }
        historyScrollRef.current.scrollLeft = historyScrollLeft - walk;
    };

    return {
        playerNames,
        setPlayerNames,
        savedTeams,
        setSavedTeams,
        deleteHistoryConfirm,
        setDeleteHistoryConfirm,
        isNamesOpen,
        setIsNamesOpen,
        handleNameChange,
        saveTeamHistory,
        handleSelectSavedTeam,
        handleDeleteHistoryItem,
        historyScrollRef,
        isHistoryDragging,
        handleHistoryMouseDown,
        handleHistoryMouseLeave,
        handleHistoryMouseUp,
        handleHistoryMouseMove,
        isHistoryDragScroll
    };
};
