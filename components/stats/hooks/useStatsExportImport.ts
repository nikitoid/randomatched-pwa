import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MatchRecord, Season } from '../../../types';

interface UseStatsExportImportParams {
    history: MatchRecord[];
    deletedHistory: MatchRecord[];
    seasons: Season[];
    isOnline: boolean;
    isDebugMode: boolean;
    onImportData: (data: { history: MatchRecord[]; deletedHistory: MatchRecord[]; seasons?: Season[] }) => boolean;
    onListCloudBackups: () => Promise<Array<{ id: string; createdAt: number; matchCount: number }>>;
    triggerHaptic: (pattern?: number | number[]) => void;
    onLocalMutation?: () => void;
}

/**
 * Manages stats backup menu state, triple-click title trigger, JSON export/import, and cloud backup loading.
 */
export const useStatsExportImport = ({
    history,
    deletedHistory,
    seasons,
    isOnline,
    isDebugMode,
    onImportData,
    onListCloudBackups,
    triggerHaptic,
    onLocalMutation
}: UseStatsExportImportParams) => {
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
    const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false);

    const titleClickCount = useRef(0);
    const titleClickTimeout = useRef<NodeJS.Timeout | null>(null);
    const onListCloudBackupsRef = useRef(onListCloudBackups);

    useEffect(() => {
        onListCloudBackupsRef.current = onListCloudBackups;
    }, [onListCloudBackups]);

    useEffect(() => {
        return () => {
            if (titleClickTimeout.current) {
                clearTimeout(titleClickTimeout.current);
            }
        };
    }, []);

    // Load cloud backups list when backup menu opens
    useEffect(() => {
        if (isDataMenuOpen && isOnline && !isDebugMode) {
            onListCloudBackupsRef.current();
        }
    }, [isDataMenuOpen, isOnline, isDebugMode]);

    const handleTitleClick = useCallback(() => {
        titleClickCount.current += 1;

        if (titleClickTimeout.current) clearTimeout(titleClickTimeout.current);

        if (titleClickCount.current >= 3) {
            setIsDataMenuOpen(true);
            triggerHaptic([10, 50, 10]);
            titleClickCount.current = 0;
            return;
        }

        titleClickTimeout.current = setTimeout(() => {
            titleClickCount.current = 0;
        }, 500);
    }, [triggerHaptic]);

    const handleExport = useCallback(() => {
        const data = {
            history,
            deletedHistory,
            seasons
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `randomatched_stats_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDataMenuOpen(false);
    }, [history, deletedHistory, seasons]);

    const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const success = onImportData(json);
                if (success) {
                    onLocalMutation?.();
                    setIsDataMenuOpen(false);
                }
            } catch (err) {
                console.error('Import error', err);
                alert('Ошибка чтения файла');
            }
        };
        reader.readAsText(file);
    }, [onImportData, onLocalMutation]);

    return {
        isDataMenuOpen,
        setIsDataMenuOpen,
        isBackupManagerOpen,
        setIsBackupManagerOpen,
        handleTitleClick,
        handleExport,
        handleImport
    };
};
