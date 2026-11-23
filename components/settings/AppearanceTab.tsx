import React, { useState, useEffect } from 'react';
import { Check, Palette, Sparkles, Grid } from 'lucide-react';
import { ColorScheme, ThemeRoundness } from '../../types';
import { COLOR_SCHEMES_DATA } from '../../constants';
import { APP_VERSION } from '../../utils/changelog';

interface AppearanceTabProps {
    colorScheme: ColorScheme;
    setColorScheme?: (scheme: ColorScheme) => void;
    roundness: ThemeRoundness;
    setRoundness?: (val: ThemeRoundness) => void;
    bgPattern: boolean;
    setBgPattern?: (val: boolean) => void;
    bgGradient: boolean;
    setBgGradient?: (val: boolean) => void;
    triggerHaptic: (pattern?: number | number[]) => void;
    isOpen: boolean;
}

/**
 * Appearance settings tab: color schemes with live preview, border roundness, and ambient effects.
 */
export const AppearanceTab: React.FC<AppearanceTabProps> = ({
    colorScheme,
    setColorScheme,
    roundness,
    setRoundness,
    bgPattern,
    setBgPattern,
    bgGradient,
    setBgGradient,
    triggerHaptic,
    isOpen
}) => {
    const [appearanceSubTab, setAppearanceSubTab] = useState<'colors' | 'effects'>('colors');

    useEffect(() => {
        if (isOpen) {
            setAppearanceSubTab('colors');
        }
    }, [isOpen]);

    return (
        <div className="flex flex-col items-center justify-start min-h-full px-4 py-4 sm:p-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="w-full max-w-sm">
                {/* Segmented Sub-Tab Switcher */}
                <div className="flex bg-slate-200/60 dark:bg-slate-900/80 p-1 rounded-2xl mb-5 border border-slate-300/40 dark:border-slate-800/60 shadow-xs touch-manipulation">
                    <button
                        onClick={() => { setAppearanceSubTab('colors'); triggerHaptic(10); }}
                        className={`flex-1 py-2.5 px-3 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ease-out active:scale-95 border ${
                            appearanceSubTab === 'colors'
                                ? 'bg-white text-slate-900 border-slate-200/80 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-700/60'
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        Цветовая схема
                    </button>
                    <button
                        onClick={() => { setAppearanceSubTab('effects'); triggerHaptic(10); }}
                        className={`flex-1 py-2.5 px-3 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ease-out active:scale-95 border ${
                            appearanceSubTab === 'effects'
                                ? 'bg-white text-slate-900 border-slate-200/80 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-700/60'
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        Оформление
                    </button>
                </div>

                {/* Sub-Tab 1: Colors */}
                {appearanceSubTab === 'colors' && (
                    <div className="animate-in fade-in duration-200">
                        {/* Preview Header */}
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Предпросмотр темы</h3>
                            <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded-full border border-primary-200/40 dark:border-primary-800/30 uppercase tracking-widest">
                                {COLOR_SCHEMES_DATA[colorScheme]?.label || colorScheme}
                            </span>
                        </div>

                        {/* Live UI Mockup Card */}
                        <div className="mb-5 bg-white/80 dark:bg-slate-900/80 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm relative overflow-hidden text-left">
                            {/* Theme Ambient Glow */}
                            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-primary-500/10 dark:bg-primary-500/15 blur-2xl pointer-events-none" />
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-secondary-500/10 dark:bg-secondary-500/15 blur-2xl pointer-events-none" />

                            {/* Mock Toolbar */}
                            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-150 dark:border-slate-800/80 relative z-10">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400/90" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
                                </div>
                                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Randomatched PWA</span>
                                <div className="w-2.5 h-2.5 rounded-full bg-primary-500/40 animate-pulse" />
                            </div>

                            {/* Mock UI Details */}
                            <div className="space-y-2.5 relative z-10">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-primary-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                            R
                                        </div>
                                        <span className="text-xs font-black text-slate-900 dark:text-white">Randomatched</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">v{APP_VERSION}</span>
                                </div>

                                {/* List Selector Pill */}
                                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/70 p-2 rounded-xl flex items-center justify-between shadow-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                                            <Palette size={11} />
                                        </div>
                                        <div>
                                            <div className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Выбранный набор</div>
                                            <div className="text-[10px] font-black text-slate-800 dark:text-slate-200">Все персонажи (12)</div>
                                        </div>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-ping" />
                                </div>

                                {/* Team Preview Cards */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-primary-500/10 border border-primary-500/30 p-2 rounded-xl relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[8px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Команда 1</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-1.5 w-3/4 bg-primary-500/40 rounded-full" />
                                            <div className="h-1.5 w-1/2 bg-primary-500/30 rounded-full" />
                                        </div>
                                    </div>

                                    <div className="bg-secondary-500/10 border border-secondary-500/30 p-2 rounded-xl relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[8px] font-black text-secondary-600 dark:text-secondary-400 uppercase tracking-widest">Команда 2</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="h-1.5 w-3/4 bg-secondary-500/40 rounded-full" />
                                            <div className="h-1.5 w-1/2 bg-secondary-500/30 rounded-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Primary CTA Mock Button */}
                                <div className="w-full bg-primary-500 text-white rounded-xl py-1.5 text-[10px] font-bold shadow-md shadow-primary-500/20 flex items-center justify-center gap-1.5 cursor-default pointer-events-none select-none">
                                    <Sparkles size={11} />
                                    <span>Сгенерировать состав</span>
                                </div>
                            </div>
                        </div>

                        {/* Color Schemes Grid */}
                        <h3 className="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-1">Выберите цветовую схему</h3>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            {Object.entries(COLOR_SCHEMES_DATA).map(([key, data]) => {
                                const isSelected = colorScheme === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => { setColorScheme?.(key as ColorScheme); triggerHaptic(10); }}
                                        className={`relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95 text-left ${
                                            isSelected
                                                ? 'border-primary-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-primary-500/20'
                                                : 'border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        {/* Color Orbs Container */}
                                        <div className="relative w-10 h-8 shrink-0 flex items-center justify-center">
                                            <div
                                                className="absolute right-0 w-6 h-6 rounded-full shadow-xs border border-white/20 dark:border-slate-900/40"
                                                style={{ backgroundColor: `rgb(${data.secondary[500]})` }}
                                            />
                                            <div
                                                className="absolute left-0 w-7 h-7 rounded-full shadow-sm flex items-center justify-center border border-white/20 dark:border-slate-900/40 z-10 transition-transform"
                                                style={{ backgroundColor: `rgb(${data.primary[500]})` }}
                                            >
                                                {isSelected && <Check size={14} className="text-white drop-shadow-md" />}
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {data.label}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Sub-Tab 2: Effects & Roundness */}
                {appearanceSubTab === 'effects' && (
                    <div className="animate-in fade-in duration-200 text-left space-y-5">
                        {/* Border Radius (Roundness) */}
                        <div className="w-full">
                            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-1">Скругление углов</h3>
                            <div className="grid grid-cols-3 gap-2 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 p-1.5 rounded-2xl shadow-xs">
                                {(['sharp', 'medium', 'full'] as ThemeRoundness[]).map((r) => {
                                    const labels: Record<ThemeRoundness, string> = {
                                        sharp: 'Острые',
                                        medium: 'Стандарт',
                                        full: 'Круглые'
                                    };
                                    const previewStyle: Record<ThemeRoundness, React.CSSProperties> = {
                                        sharp: { borderRadius: '0px' },
                                        medium: { borderRadius: '6px' },
                                        full: { borderRadius: '9999px' }
                                    };
                                    const isSelected = roundness === r;
                                    return (
                                        <button
                                            key={r}
                                            onClick={() => { setRoundness?.(r); triggerHaptic(10); }}
                                            className={`flex flex-col items-center justify-center py-2.5 px-2 text-xs font-bold rounded-xl transition-all duration-200 active:scale-95 ${
                                                isSelected
                                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <div
                                                className="w-5 h-5 mb-1 border-2 border-current"
                                                style={previewStyle[r]}
                                            />
                                            <span>{labels[r]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Visual Effects */}
                        <div className="w-full">
                            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-1">Визуальные эффекты</h3>
                            <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80">
                                {/* Background Grid Pattern Toggle */}
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${bgPattern ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                            <Grid size={20} />
                                        </div>
                                        <div className="text-left min-w-0 flex-1">
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Фоновая сетка</h4>
                                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Текстурный точечный паттерн интерфейса</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setBgPattern?.(!bgPattern); triggerHaptic(10); }}
                                        className={`shrink-0 relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out touch-manipulation ${bgPattern ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${bgPattern ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Background Gradient Toggle */}
                                <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${bgGradient ? 'bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-primary-600 dark:text-primary-300 ring-1 ring-primary-500/40 shadow-sm' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                            <Sparkles size={20} className={bgGradient ? 'animate-pulse' : ''} />
                                        </div>
                                        <div className="text-left min-w-0 flex-1">
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Эмбиент-фон</h4>
                                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Мягкое эмбиентное свечение цветовой схемы</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setBgGradient?.(!bgGradient); triggerHaptic(10); }}
                                        className={`shrink-0 relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out touch-manipulation ${bgGradient ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${bgGradient ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
