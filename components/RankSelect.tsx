
import React, { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RANKS } from '../constants';
import { useHaptics } from '../hooks/useHaptics';

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
    const { trigger } = useHaptics();
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
        const letter = rank ? rank[0] : '';
        let colors = '';
        if (!rank) {
            colors = 'text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80';
        } else if (letter === 'S') {
            colors = 'text-amber-900 dark:text-amber-300 bg-amber-500/15 border-amber-300/80 dark:border-amber-500/40 font-black';
        } else if (letter === 'A') {
            colors = 'text-violet-900 dark:text-violet-300 bg-violet-500/15 border-violet-300/80 dark:border-violet-500/40 font-black';
        } else if (letter === 'B') {
            colors = 'text-blue-900 dark:text-sky-300 bg-blue-500/15 border-blue-300/80 dark:border-sky-500/40 font-extrabold';
        } else if (letter === 'C') {
            colors = 'text-emerald-900 dark:text-emerald-300 bg-emerald-500/15 border-emerald-300/80 dark:border-emerald-500/40 font-bold';
        } else if (letter === 'D') {
            colors = 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-semibold';
        } else if (letter === 'E') {
            colors = 'text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 font-medium';
        }

        if (isButton) {
           return `${colors} active:scale-95 transition-all duration-150`;
        }
        return colors;
    };

    const handleClick = () => {
        if (disabled || readOnly) return;
        trigger('light');
        if (isOpen) onClose();
        else onOpen();
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleClick}
                className={`w-full h-full flex items-center justify-center px-2 py-1 text-sm rounded-xl border transition-all duration-200 outline-none select-none shadow-2xs ${getRankStyle(value)} ${disabled ? 'opacity-50 cursor-not-allowed' : readOnly ? 'cursor-default' : 'hover:border-primary-400/60 dark:hover:border-primary-500/60 active:scale-95'}`}
            >
                {value || <span className="text-[11px] font-medium opacity-60">Ранг</span>}
            </button>

            {isOpen && !disabled && !readOnly && createPortal(
                <div 
                    className={`fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden z-[102] rank-select-menu ring-1 ring-black/5 dark:ring-white/10
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
                    <div className="grid grid-cols-2 gap-1.5 p-2 overflow-y-auto no-scrollbar max-h-[300px]">
                        {RANKS.map(rank => (
                            <button
                                key={rank}
                                onClick={() => {
                                    trigger('light');
                                    onChange(rank);
                                    onClose();
                                }}
                                className={`flex items-center justify-center py-2.5 rounded-xl text-sm border ${getRankStyle(rank, true)} ${value === rank ? 'ring-2 ring-primary-500 z-10 shadow-md scale-[0.98]' : 'hover:scale-[0.98]'}`}
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

