import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { MatchRecord, Season, ToastType } from '../../../types';

export const useMatchFilters = (
    history: MatchRecord[],
    triggerHaptic: (pattern?: number | number[]) => void,
    seasons: Season[] = [],
    isOpen: boolean = false,
    addToast?: (message: string, type: ToastType, duration?: number) => void
) => {
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

    // Track if notice for ended season was shown during current modal session
    const hasNotifiedSeasonEnded = useRef(false);

    // Calculate effective default season
    const defaultSeasonInfo = useMemo(() => {
        if (!seasons || seasons.length === 0) {
            return { defaultSeasonId: 'all', defaultSeason: null, isSeasonEnded: false };
        }

        const sorted = [...seasons].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const latest = sorted[sorted.length - 1];
        const todayStr = new Date().toLocaleDateString('en-CA');

        if (latest.endDate && todayStr > latest.endDate) {
            return {
                defaultSeasonId: 'all',
                defaultSeason: latest,
                isSeasonEnded: true,
                endedSeasonName: latest.name
            };
        }

        return {
            defaultSeasonId: latest.id,
            defaultSeason: latest,
            isSeasonEnded: false
        };
    }, [seasons]);

    // Initial state setup from defaultSeasonInfo
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>(() => defaultSeasonInfo.defaultSeasonId);
    const [filterStartDate, setFilterStartDate] = useState<string>(() => defaultSeasonInfo.defaultSeason?.startDate || '');
    const [filterEndDate, setFilterEndDate] = useState<string>(() => defaultSeasonInfo.defaultSeasonId !== 'all' ? (defaultSeasonInfo.defaultSeason?.endDate || '') : '');

    // Apply default season configuration
    const applyDefaultFilter = useCallback((notifyEnded: boolean = false) => {
        const { defaultSeasonId, defaultSeason, isSeasonEnded, endedSeasonName } = defaultSeasonInfo;

        if (defaultSeasonId === 'all') {
            setSelectedSeasonId('all');
            setFilterStartDate('');
            setFilterEndDate('');
            if (isSeasonEnded && notifyEnded && !hasNotifiedSeasonEnded.current && addToast) {
                addToast(
                    `Срок сезона "${endedSeasonName || ''}" истек. Отображается статистика за все время.`,
                    'info',
                    4000
                );
                hasNotifiedSeasonEnded.current = true;
            }
        } else if (defaultSeason) {
            setSelectedSeasonId(defaultSeason.id);
            setFilterStartDate(defaultSeason.startDate);
            setFilterEndDate(defaultSeason.endDate || '');
        }
    }, [defaultSeasonInfo, addToast]);

    // Track previous isOpen state to trigger default filter application strictly on opening transition
    const prevIsOpenRef = useRef(isOpen);

    useLayoutEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            applyDefaultFilter(true);
        } else if (!isOpen) {
            hasNotifiedSeasonEnded.current = false;
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, applyDefaultFilter]);

    // Dynamic update when active selected season parameters are edited
    useEffect(() => {
        if (selectedSeasonId !== 'all' && selectedSeasonId !== 'custom') {
            const activeSeason = seasons.find(s => s.id === selectedSeasonId);
            if (activeSeason) {
                setFilterStartDate(activeSeason.startDate);
                setFilterEndDate(activeSeason.endDate || '');
            } else {
                // If season was deleted, fallback to default
                applyDefaultFilter(false);
            }
        }
    }, [seasons, selectedSeasonId, applyDefaultFilter]);

    // Check if current filter is in default state (for hiding/showing "Reset" button)
    const isDefaultFilterState = useMemo(() => {
        const { defaultSeasonId, defaultSeason } = defaultSeasonInfo;

        if (defaultSeasonId === 'all') {
            return selectedSeasonId === 'all' && !filterStartDate && !filterEndDate;
        }

        if (defaultSeason && defaultSeasonId === defaultSeason.id) {
            return (
                selectedSeasonId === defaultSeason.id &&
                filterStartDate === defaultSeason.startDate &&
                filterEndDate === (defaultSeason.endDate || '')
            );
        }

        return false;
    }, [defaultSeasonInfo, selectedSeasonId, filterStartDate, filterEndDate]);

    const handleSelectSeason = (seasonId: string) => {
        triggerHaptic(10);
        setSelectedSeasonId(seasonId);

        if (seasonId === 'all') {
            setFilterStartDate('');
            setFilterEndDate('');
            return;
        }

        const targetSeason = seasons.find(s => s.id === seasonId);
        if (targetSeason) {
            setFilterStartDate(targetSeason.startDate);
            setFilterEndDate(targetSeason.endDate || '');
        }
    };

    const handleManualStartDateChange = (date: string) => {
        setFilterStartDate(date);
        setSelectedSeasonId('custom');
        triggerHaptic(5);
    };

    const handleManualEndDateChange = (date: string) => {
        setFilterEndDate(date);
        setSelectedSeasonId('custom');
        triggerHaptic(5);
    };

    const { todayStr, yesterdayStr, lastEveningDateStr } = useMemo(() => {
        const today = new Date().toLocaleDateString('en-CA');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

        let lastEveningStr = '';
        if (history.length > 0) {
            const maxTimestamp = history.reduce((max, m) => m.timestamp > max ? m.timestamp : max, 0);
            const adjustedTime = maxTimestamp - 6 * 60 * 60 * 1000;
            lastEveningStr = new Date(adjustedTime).toLocaleDateString('en-CA');
        }

        return { todayStr: today, yesterdayStr, lastEveningDateStr: lastEveningStr };
    }, [history]);

    const handlePresetToday = () => {
        setFilterStartDate(todayStr);
        setFilterEndDate(todayStr);
        setSelectedSeasonId('custom');
        triggerHaptic(10);
    };

    const handlePresetYesterday = () => {
        setFilterStartDate(yesterdayStr);
        setFilterEndDate(yesterdayStr);
        setSelectedSeasonId('custom');
        triggerHaptic(10);
    };

    const handlePresetLastEvening = () => {
        if (!lastEveningDateStr) return;
        setFilterStartDate(lastEveningDateStr);
        setFilterEndDate(lastEveningDateStr);
        setSelectedSeasonId('custom');
        triggerHaptic(10);
    };

    const handleResetDateFilter = () => {
        applyDefaultFilter(false);
        triggerHaptic(10);
    };

    const formatPeriodLabel = () => {
        if (selectedSeasonId !== 'all' && selectedSeasonId !== 'custom') {
            const activeSeason = seasons.find(s => s.id === selectedSeasonId);
            if (activeSeason) {
                return activeSeason.name;
            }
        }

        if (!filterStartDate && !filterEndDate) return 'Все время';

        const formatDate = (dateStr: string) => {
            if (!dateStr) return '...';
            const [y, m, d] = dateStr.split('-');
            return `${d}.${m}.${y}`;
        };

        if (filterStartDate && filterEndDate) {
            if (filterStartDate === filterEndDate) {
                return formatDate(filterStartDate);
            }
            return `с ${formatDate(filterStartDate)} по ${formatDate(filterEndDate)}`;
        }
        if (filterStartDate) {
            return `с ${formatDate(filterStartDate)}`;
        }
        return `по ${formatDate(filterEndDate)}`;
    };

    // Date Filtering Logic (with 6-hour shift to group night matches)
    const filteredHistory = useMemo(() => {
        return history.filter(match => {
            // Сдвигаем время матча на 6 часов назад
            const adjustedTime = match.timestamp - 6 * 60 * 60 * 1000;

            if (filterStartDate) {
                const [year, month, day] = filterStartDate.split('-').map(Number);
                const startLimit = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
                if (adjustedTime < startLimit) return false;
            }

            if (filterEndDate) {
                const [year, month, day] = filterEndDate.split('-').map(Number);
                const endLimit = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
                if (adjustedTime > endLimit) return false;
            }

            return true;
        });
    }, [history, filterStartDate, filterEndDate]);

    return {
        selectedSeasonId,
        handleSelectSeason,
        filterStartDate,
        setFilterStartDate: handleManualStartDateChange,
        filterEndDate,
        setFilterEndDate: handleManualEndDateChange,
        isDateFilterOpen,
        setIsDateFilterOpen,
        todayStr,
        yesterdayStr,
        lastEveningDateStr,
        handlePresetToday,
        handlePresetYesterday,
        handlePresetLastEvening,
        handleResetDateFilter,
        isDefaultFilterState,
        formatPeriodLabel,
        filteredHistory
    };
};
