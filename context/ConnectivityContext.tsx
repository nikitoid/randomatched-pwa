import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { checkConnectivity as checkConnectivityUtil } from '../utils/connectivity';

interface ConnectivityContextType {
    isOnline: boolean;
    checkConnectivity: (timeoutMs?: number) => Promise<boolean>;
    verifyNow: (timeoutMs?: number) => Promise<boolean>;
}

const ConnectivityContext = createContext<ConnectivityContextType | null>(null);

export const ConnectivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize with false to assume offline until proven otherwise
    const [isOnline, setIsOnline] = useState(false);

    const checkStatus = useCallback(async (timeoutMs?: number) => {
        if (!navigator.onLine) {
            setIsOnline(false);
            return false;
        }

        const status = await checkConnectivityUtil(timeoutMs);
        setIsOnline(status);
        return status;
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            // When browser thinks we are online, optimistically set true for responsiveness
            // BUT immediately check to catch "Lie-Fi"
            setIsOnline(true);
            checkStatus();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check on mount
        checkStatus();

        // Periodic check (every 30 seconds) to detect silent network drops
        const intervalId = setInterval(checkStatus, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(intervalId);
        };
    }, [checkStatus]);

    return (
        <ConnectivityContext.Provider value={{ isOnline, checkConnectivity: checkStatus, verifyNow: checkStatus }}>
            {children}
        </ConnectivityContext.Provider>
    );
};

export const useConnectivityContext = () => {
    const context = useContext(ConnectivityContext);
    if (!context) {
        throw new Error('useConnectivityContext must be used within a ConnectivityProvider');
    }
    return context;
};
