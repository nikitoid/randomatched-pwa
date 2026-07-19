import { useState, useMemo } from 'react';
import { MatchRecord } from '../../../types';

export const useMatchFilters = (history: MatchRecord[], triggerHaptic: (pattern?: number | number[]) => void) => {
    // Date filter state
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

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
        triggerHaptic(10);
    };

    const handlePresetYesterday = () => {
        setFilterStartDate(yesterdayStr);
        setFilterEndDate(yesterdayStr);
        triggerHaptic(10);
    };

    const handlePresetLastEvening = () => {
        if (!lastEveningDateStr) return;
        setFilterStartDate(lastEveningDateStr);
        setFilterEndDate(lastEveningDateStr);
        triggerHaptic(10);
    };

    const handleResetDateFilter = () => {
        setFilterStartDate('');
        setFilterEndDate('');
        triggerHaptic(10);
    };

    const formatPeriodLabel = () => {
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
        filterStartDate,
        setFilterStartDate,
        filterEndDate,
        setFilterEndDate,
        isDateFilterOpen,
        setIsDateFilterOpen,
        todayStr,
        yesterdayStr,
        lastEveningDateStr,
        handlePresetToday,
        handlePresetYesterday,
        handlePresetLastEvening,
        handleResetDateFilter,
        formatPeriodLabel,
        filteredHistory
    };
};
