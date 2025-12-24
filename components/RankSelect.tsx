
import React, { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RANKS } from '../constants';

interface RankSelectProps {
    value: string;
    onChange: (value: string) => void;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    disabled?: boolean;
    readOnly?: boolean;
}

export const RankSelect: React.FC<RankSelectProps> = ({ value, onChange, isOpen, onOpen, onClose, disabled, readOnly }) => {
    const [menuStyle, setMenuStyle] = useState<{ top?: number, bottom?: number, left: number, width: number, origin: string }>({ left: 0, width: 0, origin: 'top' });
    const buttonRef = useRef<HTMLButtonElement>(null);

    useLayoutEffect(() => {
        if (!isOpen || !buttonRef.current) return;
        
        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = 176; 
        const screenPadding = 16;
        
        let left = rect.left;
        if (left + menuWidth > window.innerWidth - screenPadding) {
            left = window.innerWidth - menuWidth - screenPadding;
        }
        if (left < screenPadding) left = screenPadding;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const menuHeight = 310;

        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
            setMenuStyle({
                bottom: window.innerHeight - rect.top + 6,
                left: left,
                width: Math.max(rect.width, menuWidth),
                origin: 'bottom'
            });
        } else {
            setMenuStyle({
                top: rect.bottom + 6,
                left: left,
                width: Math.max(rect.width, menuWidth),
                origin: 'top'
            });
        }
    }, [isOpen]);

    const getRankStyle = (rank: string, isButton = false) => {
        const letter = rank[0];
        let colors = '';
        if (!rank) {
            colors = 'text-slate-400 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800';
        } else if (letter === 'S') {
            colors = 'text-yellow-800 bg-yellow-100 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-400/20 dark:border-yellow-500/30';
        } else if (letter === 'A') {
            colors = 'text-violet-800 bg-violet-100 border-violet-200 dark:text-violet-300 dark:bg-violet-500/20 dark:border-violet-500/30';
        } else if (letter === 'B') {
            colors = 'text-blue-800 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-500/20 dark:border-blue-500/30';
        } else if (letter === 'C') {
            colors = 'text-green-800 bg-green-100 border-green-200 dark:text-green-300 dark:bg-green-500/20 dark:border-green-500/30';
        } else if (letter === 'D') {
            colors = 'text-gray-700 bg-gray-200 border-gray-300 dark:text-gray-300 dark:bg-gray-700/50 dark:border-gray-600';
        } else if (letter === 'E') {
            colors = 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700';
        }

        if (isButton) {
           return `${colors} hover:brightness-95 dark:hover:brightness-125`;
        }
        return colors;
    };

    const handleClick = () => {
        if (disabled || readOnly) return;
        if (isOpen) onClose();
        else onOpen();
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleClick}
                className={`w-full h-full flex items-center justify-center px-2 py-1 text-sm rounded-xl border transition-all outline-none font-bold select-none ${getRankStyle(value)} ${disabled ? 'opacity-50 cursor-not-allowed' : readOnly ? 'cursor-default' : 'active:scale-95'}`}
            >
                {value || <span className="text-xs font-normal opacity-70">Ранг</span>}
            </button>

            {isOpen && !disabled && !readOnly && createPortal(
                <div 
                    className={`fixed bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[102] rank-select-menu
                        ${menuStyle.origin === 'bottom' ? 'animate-menu-in-up origin-bottom-left' : 'animate-menu-in origin-top-left'}
                    `}
                    style={{
                        top: menuStyle.top,
                        bottom: menuStyle.bottom,
                        left: menuStyle.left,
                        width: menuStyle.width,
                        maxHeight: '300px',
                        minWidth: '160px'
                    }}
                >
                    <div className="grid grid-cols-2 gap-1.5 p-1.5 overflow-y-auto no-scrollbar max-h-[300px]">
                        {RANKS.map(rank => (
                            <button
                                key={rank}
                                onClick={() => {
                                    onChange(rank);
                                    onClose();
                                }}
                                className={`flex items-center justify-center py-2.5 rounded-lg text-sm font-bold border transition-all ${getRankStyle(rank, true)} ${value === rank ? 'ring-2 ring-primary-500/50 z-10 shadow-sm scale-[0.98]' : ''}`}
                            >
                                {rank}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
