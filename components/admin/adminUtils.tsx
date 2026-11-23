import React from 'react';
import { Smartphone, Tablet, Laptop, Monitor } from 'lucide-react';

/**
 * Checks whether a client was seen within the last 2 minutes.
 */
export const isClientOnline = (lastSeen?: number): boolean => {
    if (!lastSeen) return false;
    return Date.now() - lastSeen < 120000;
};

/**
 * Formats a relative last-seen timestamp in Russian.
 */
export const formatLastSeen = (timestamp?: number): string => {
    if (!timestamp) return 'Неизвестно';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Только что';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} мин. назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Formats a full registration/connection date timestamp.
 */
export const formatFullDate = (timestamp?: number): string => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Renders the platform icon corresponding to the client's OS.
 */
export const renderDeviceIcon = (os?: string): React.ReactNode => {
    const osLower = (os || '').toLowerCase();
    if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('android')) {
        return <Smartphone size={18} className="text-primary-500 dark:text-primary-400" />;
    }
    if (osLower.includes('ipad') || osLower.includes('tablet')) {
        return <Tablet size={18} className="text-sky-500 dark:text-sky-400" />;
    }
    if (osLower.includes('mac') || osLower.includes('darwin')) {
        return <Laptop size={18} className="text-indigo-500 dark:text-indigo-400" />;
    }
    if (osLower.includes('win') || osLower.includes('linux')) {
        return <Monitor size={18} className="text-cyan-500 dark:text-cyan-400" />;
    }
    return <Smartphone size={18} className="text-slate-400" />;
};
