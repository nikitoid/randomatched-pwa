import { useState, useEffect, useCallback } from 'react';
import { checkConnectivity } from '../utils/connectivity';

/**
 * Хук для надежного отслеживания онлайн-статуса.
 * Комбинирует стандартные события окна с активными проверками подключения.
 */
export const useConnectivity = () => {
    // Инициализируем с navigator.onLine как первое предположение
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const checkStatus = useCallback(async () => {
        if (!navigator.onLine) {
            setIsOnline(false);
            return false;
        }

        const status = await checkConnectivity();
        setIsOnline(status);
        return status;
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            // Когда браузер считает, что мы онлайн, оптимистично ставим true для отзывчивости
            // НО сразу же проверяем, чтобы отловить "Lie-Fi" (формальное подключение без интернета)
            setIsOnline(true);
            checkStatus();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Начальная проверка при монтировании
        checkStatus();

        // Опционально: Периодическая проверка
        // Пока полагаемся на события + ручные проверки перед критическими действиями (синхронизация).
        // Если "Lie-Fi" случится без событий, пользователь может визуально видеть "Онлайн", пока не попробует действие.
        // Добавим медленную периодическую проверку (например, каждые 30 сек), чтобы обнаружить тихое падение сети.
        const intervalId = setInterval(checkStatus, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(intervalId);
        };
    }, [checkStatus]);

    return { isOnline, checkConnectivity: checkStatus, verifyNow: checkConnectivity };
};
