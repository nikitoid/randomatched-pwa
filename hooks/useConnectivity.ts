import { useConnectivityContext } from '../context/ConnectivityContext';

/**
 * Хук для надежного отслеживания онлайн-статуса.
 * Теперь использует глобальный контекст.
 */
export const useConnectivity = () => {
    return useConnectivityContext();
};
