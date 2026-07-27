import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Dice5, Check, Palette, Database, Info, SmartphoneNfc, Terminal, RefreshCw, Trash, Download, Vibrate, Grid, Circle, Sparkles, Sliders, Layers, ShieldCheck, Activity } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { HeroList, ColorScheme, MatchRecord, ThemeRoundness } from '../types';
import { COLOR_SCHEMES_DATA } from '../constants';
import { APP_VERSION, CHANGELOG, getUnreadReleasesCount } from '../utils/changelog';

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    lists: HeroList[];
    history?: MatchRecord[];
}

interface ExpandedSettingsProps extends SettingsOverlayProps {
    colorScheme?: ColorScheme;
    setColorScheme?: (scheme: ColorScheme) => void;
    roundness?: ThemeRoundness;
    setRoundness?: (val: ThemeRoundness) => void;
    bgPattern?: boolean;
    setBgPattern?: (val: boolean) => void;
    bgGradient?: boolean;
    setBgGradient?: (val: boolean) => void;
    checkForUpdate?: () => void;
    isCheckingUpdate?: boolean;
    isUpdateAvailable?: boolean;
    onUpdateApp?: () => void;
    isDebugMode?: boolean;
    onToggleDebug?: (val: boolean) => void;
    hapticsEnabled?: boolean;
    onToggleHaptics?: () => void;
    triggerHaptic: (pattern?: number | number[]) => void;
    onImportData?: (data: { history: MatchRecord[], deletedHistory: MatchRecord[] }) => boolean;
    addToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning', duration?: number) => void;
    onOpenChangelog: () => void;
    lastSeenVersion?: string | null;
    onSetLastSeenVersion?: (version: string | null) => void;
}

type TabType = 'appearance' | 'app_settings' | 'info' | 'debug';

export const SettingsOverlay: React.FC<ExpandedSettingsProps> = ({
    isOpen,
    onClose,
    lists,
    colorScheme = 'emerald',
    setColorScheme,
    roundness = 'medium',
    setRoundness,
    bgPattern = false,
    setBgPattern,
    bgGradient = false,
    setBgGradient,
    isCheckingUpdate = false,
    isUpdateAvailable = false,
    onUpdateApp,
    isDebugMode = false,
    onToggleDebug,
    hapticsEnabled = true,
    onToggleHaptics,
    triggerHaptic,
    history = [],
    onImportData,
    addToast,
    onOpenChangelog,
    lastSeenVersion,
    onSetLastSeenVersion,
}) => {
    const unreadChangelogCount = getUnreadReleasesCount(lastSeenVersion ?? null);
    const [activeTab, setActiveTab] = useState<TabType>('appearance');
    const [appearanceSubTab, setAppearanceSubTab] = useState<'colors' | 'effects'>('colors');

    // Drag/Scroll refs for tabs
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [isDragScroll, setIsDragScroll] = useState(false);

    // Swipe State
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const touchStartY = useRef(0);
    const touchEndY = useRef(0);

    // Reset settings state on open
    React.useEffect(() => {
        if (isOpen) {
            setActiveTab('appearance');
            setAppearanceSubTab('colors');
        }
    }, [isOpen]);

    // Scroll active tab into view when activeTab or isOpen changes
    React.useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            const container = tabsContainerRef.current;
            if (!container) return;
            const activeEl = container.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
            if (activeEl) {
                activeEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [activeTab, isOpen]);

    useBackHandler(isOpen, () => {
        onClose();
    }, { id: 'settings-overlay', priority: 20 });

    const handleMouseDown = (e: React.MouseEvent) => {
        const el = tabsContainerRef.current;
        if (!el) return;
        setIsDragging(true);
        setIsDragScroll(false);
        setStartX(e.pageX - el.offsetLeft);
        setScrollLeft(el.scrollLeft);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setTimeout(() => setIsDragScroll(false), 50);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        setIsDragScroll(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !tabsContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - tabsContainerRef.current.offsetLeft;
        if (Math.abs((x - startX) * 2) > 5) setIsDragScroll(true);
        tabsContainerRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchStartY.current = e.targetTouches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        touchEndX.current = e.changedTouches[0].clientX;
        touchEndY.current = e.changedTouches[0].clientY;
        handleSwipe();
    };

    const handleSwipe = () => {
        const SWIPE_THRESHOLD = 60;
        const diffX = touchStartX.current - touchEndX.current;
        const diffY = touchStartY.current - touchEndY.current;
        if (Math.abs(diffY) > Math.abs(diffX)) return;

        const tabs: TabType[] = ['appearance', 'app_settings', 'info'];
        if (isDebugMode) {
            tabs.push('debug');
        }
        const currentIndex = tabs.indexOf(activeTab);
        if (Math.abs(diffX) > SWIPE_THRESHOLD) {
            if (diffX > 0 && currentIndex < tabs.length - 1) {
                setActiveTab(tabs[currentIndex + 1]);
            } else if (diffX < 0 && currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1]);
            }
        }
    };

    const renderTabButton = (id: TabType, label: string, icon: React.ReactNode, badge?: React.ReactNode) => {
        const isActive = activeTab === id;
        return (
            <button
                data-tab-id={id}
                onClick={(e) => {
                    if (isDragScroll) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    setActiveTab(id);
                    triggerHaptic(10);
                    e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'nearest'
                    });
                }}
                onFocus={(e) => {
                    e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'nearest'
                    });
                }}
                className={`relative shrink-0 flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 whitespace-nowrap select-none border touch-manipulation ${
                    isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md shadow-slate-900/10 dark:shadow-white/10'
                        : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                } ${isDragScroll ? 'pointer-events-none' : ''}`}
            >
                {icon}
                <span>{label}</span>
                {badge}
            </button>
        );
    };

    const handleGenerateDemoHistory = () => {
        triggerHaptic(20);
        const allHeroes = lists.flatMap(l => l.heroes).filter(h => h.name.trim());
        if (allHeroes.length < 4) {
            if (addToast) addToast("Сначала добавьте героев в списки (минимум 4)", "warning");
            return;
        }

        const players = ["Игрок 1", "Игрок 2", "Игрок 3", "Игрок 4"];
        const demoHistory: MatchRecord[] = [];
        const now = Date.now();

        for (let i = 0; i < 15; i++) {
            const shuffledHeroes = [...allHeroes].sort(() => 0.5 - Math.random());
            const selectedHeroes = shuffledHeroes.slice(0, 4);

            const team1 = [
                { name: players[0], heroId: selectedHeroes[0].id, heroName: selectedHeroes[0].name },
                { name: players[1], heroId: selectedHeroes[1].id, heroName: selectedHeroes[1].name }
            ];
            const team2 = [
                { name: players[2], heroId: selectedHeroes[2].id, heroName: selectedHeroes[2].name },
                { name: players[3], heroId: selectedHeroes[3].id, heroName: selectedHeroes[3].name }
            ];

            const winner: 'team1' | 'team2' = Math.random() > 0.5 ? 'team1' : 'team2';

            demoHistory.push({
                id: crypto.randomUUID(),
                timestamp: now - i * 3600 * 1000 * 12,
                lastUpdated: now,
                team1,
                team2,
                winner
            });
        }

        if (onImportData) {
            onImportData({ history: demoHistory, deletedHistory: [] });
            if (addToast) addToast("Сгенерировано 15 демо-матчей", "success");
        }
    };

    const handleClearAllHistory = () => {
        triggerHaptic(30);
        if (window.confirm("Вы уверены, что хотите полностью очистить всю историю матчей? Это действие перезапишет локальные данные и синхронизируется с облаком при следующем обмене.")) {
            if (onImportData) {
                onImportData({ history: [], deletedHistory: [] });
                if (addToast) addToast("История полностью очищена", "success");
            }
        }
    };

    return (
        <div className={`fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 bg-grid-pattern flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible'}`}>
            {/* Header with Safe Area */}
            <div className="bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 shadow-xs">
                <div 
                    className="px-4 py-3"
                    style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
                >
                    <div className="relative flex items-center justify-center w-full min-h-[44px] touch-manipulation">
                        <button
                            onClick={onClose}
                            aria-label="Закрыть"
                            data-testid="settings-close-btn"
                            className="absolute left-0 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all shadow-xs"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <div className="flex items-center gap-2">
                            <Sliders size={20} className="text-primary-500" />
                            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Настройки</h2>
                        </div>
                    </div>
                </div>

                {/* Tabs Bar */}
                <div className="px-4 pb-3">
                    <div 
                        ref={tabsContainerRef} 
                        onMouseDown={handleMouseDown} 
                        onMouseLeave={handleMouseLeave} 
                        onMouseUp={handleMouseUp} 
                        onMouseMove={handleMouseMove} 
                        className={`flex items-center gap-2 overflow-x-auto overscroll-contain no-scrollbar pb-0.5 touch-manipulation ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    >
                        {renderTabButton('appearance', 'Внешний вид', <Palette size={16} />)}
                        {renderTabButton('app_settings', 'Приложение', <SmartphoneNfc size={16} />)}
                        {renderTabButton(
                            'info', 
                            'Инфо', 
                            <Info size={16} />, 
                            unreadChangelogCount > 0 ? (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
                            ) : null
                        )}
                        {isDebugMode && renderTabButton('debug', 'Debug', <Terminal size={16} />)}
                    </div>
                </div>
            </div>

            {/* Scrollable Tab Content Container */}
            <div className="flex-1 relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <div className="absolute inset-0 overflow-y-auto overscroll-contain no-scrollbar">
                    <div className="pb-safe-area-bottom min-h-full">
                        {/* TAB 1: APPEARANCE */}
                        {activeTab === 'appearance' && (
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
                                                        {/* Team 1 (Primary Highlight) */}
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

                                                        {/* Team 2 (Secondary Highlight) */}
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
                                                            onClick={() => { setColorScheme && setColorScheme(key as any); triggerHaptic(10); }}
                                                            className={`relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95 text-left ${
                                                                isSelected 
                                                                    ? 'border-primary-500 bg-white dark:bg-slate-900 shadow-md ring-2 ring-primary-500/20' 
                                                                    : 'border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                                                            }`}
                                                        >
                                                            {/* Color Orbs Container */}
                                                            <div className="relative w-10 h-8 shrink-0 flex items-center justify-center">
                                                                {/* Secondary Color Circle */}
                                                                <div 
                                                                    className="absolute right-0 w-6 h-6 rounded-full shadow-xs border border-white/20 dark:border-slate-900/40" 
                                                                    style={{ backgroundColor: `rgb(${data.secondary[500]})` }}
                                                                />
                                                                {/* Primary Color Circle */}
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
                                                                onClick={() => { setRoundness && setRoundness(r); triggerHaptic(10); }}
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
                                                            onClick={() => { setBgPattern && setBgPattern(!bgPattern); triggerHaptic(10); }}
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
                                                            onClick={() => { setBgGradient && setBgGradient(!bgGradient); triggerHaptic(10); }}
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
                        )}

                        {/* TAB 2: APP SETTINGS */}
                        {activeTab === 'app_settings' && (
                            <div className="flex flex-col items-center justify-start min-h-full p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="w-full max-w-sm flex flex-col gap-3">
                                    <h3 className="text-left text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-0.5">Системные параметры</h3>

                                    {/* Haptics Setting Card */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${hapticsEnabled ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                    <Vibrate size={20} />
                                                </div>
                                                <div className="text-left min-w-0 flex-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Тактильный отклик</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Вибрация при нажатии элементов</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { onToggleHaptics && onToggleHaptics(); triggerHaptic(10); }}
                                                className={`shrink-0 relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out touch-manipulation ${hapticsEnabled ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${hapticsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Developer Mode Setting Card */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDebugMode ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                    <Terminal size={20} />
                                                </div>
                                                <div className="text-left min-w-0 flex-1">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Режим разработчика</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Отображение весов алгоритма и Debug вкладки</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { onToggleDebug && onToggleDebug(!isDebugMode); triggerHaptic(10); }}
                                                className={`shrink-0 relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out touch-manipulation ${isDebugMode ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isDebugMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: INFO */}
                        {activeTab === 'info' && (
                            <div className="flex flex-col items-center justify-center min-h-full p-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="relative mb-4">
                                    <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-primary-500/25 rotate-3 hover:rotate-0 transition-transform duration-300">
                                        <Dice5 size={48} className="drop-shadow-md" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-md">
                                        <Sparkles size={14} className="text-amber-500" />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">Randomatched</h3>
                                
                                <div className="mb-4">
                                    <span className="text-xs font-extrabold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-3 py-1 rounded-full border border-primary-200/40 dark:border-primary-800/30 select-none">
                                        v{APP_VERSION}
                                    </span>
                                </div>

                                {/* What's New Button */}
                                <button
                                    onClick={() => { onOpenChangelog(); triggerHaptic(10); }}
                                    className="relative mb-5 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 active:bg-slate-50 dark:active:bg-slate-800 text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all shadow-xs hover:border-slate-300 dark:hover:border-slate-700"
                                >
                                    <Sparkles size={15} className="text-amber-500 fill-amber-500/20" />
                                    <span>Что нового в приложении?</span>
                                    {unreadChangelogCount > 0 && (
                                        <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[9px] rounded-full shadow-md shadow-amber-500/30 animate-pulse tracking-wider">
                                            NEW
                                        </span>
                                    )}
                                </button>

                                {/* App Info Description Card */}
                                <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800/80 w-full max-w-xs text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5 text-center">
                                    <p className="mb-2.5">
                                        Генератор команд 2x2 для настольной игры <strong>Unmatched</strong>.
                                    </p>
                                    <p>
                                        Создавайте свои списки героев, синхронизируйте их между устройствами и используйте умные алгоритмы для создания идеально сбалансированных матчей.
                                    </p>
                                </div>

                                {/* Update PWA Button */}
                                {isUpdateAvailable && onUpdateApp && (
                                    <button 
                                        onClick={onUpdateApp} 
                                        className="mb-6 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
                                    >
                                        <Download size={16} />
                                        <span>Обновить и перезапустить PWA</span>
                                    </button>
                                )}

                                {/* Footer Copyright */}
                                <div className="mt-auto pt-2 pb-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex flex-col gap-1 items-center">
                                    <span>Designed for Unmatched Fans</span>
                                    <span className="text-slate-300 dark:text-slate-700">by Nikitoid</span>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: DEBUG */}
                        {activeTab === 'debug' && isDebugMode && (
                            <div className="flex flex-col items-center justify-start min-h-full p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="w-full max-w-sm flex flex-col gap-4">
                                    {/* LocalStorage Summary Card */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                                        <h3 className="font-bold mb-3 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            <Database size={15} /> Сводка LocalStorage
                                        </h3>
                                        <div className="text-xs font-mono space-y-1.5 max-h-40 overflow-y-auto no-scrollbar bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-800">
                                            {Object.keys(localStorage).map(key => {
                                                const val = localStorage.getItem(key) || '';
                                                let displaySize = `${(val.length * 2) / 1024}`;
                                                displaySize = parseFloat(displaySize).toFixed(2);
                                                return (
                                                    <div key={key} className="flex justify-between gap-4 border-b border-slate-800/80 pb-1 last:border-0 last:pb-0">
                                                        <span className="truncate text-slate-400">{key}</span>
                                                        <span className="font-bold text-emerald-400 shrink-0">{displaySize} KB</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Quick Actions Card */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5 shadow-xs">
                                        <h3 className="font-bold flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                            Быстрые действия
                                        </h3>

                                        <button
                                            onClick={handleGenerateDemoHistory}
                                            className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-violet-600/20 transition-all"
                                        >
                                            <RefreshCw size={15} />
                                            <span>Создать демо-историю (15 игр)</span>
                                        </button>

                                        <button
                                            onClick={handleClearAllHistory}
                                            className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
                                        >
                                            <Trash size={15} />
                                            <span>Полная очистка истории</span>
                                        </button>
                                    </div>

                                    {/* Changelog Debug Card */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 space-y-3 shadow-xs">
                                        <h3 className="font-bold flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                            <Sparkles size={15} /> Прочитанная версия чейнджлога
                                        </h3>
                                        
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">Сохраненная версия:</span>
                                            <span className="font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-md border border-primary-200/40 dark:border-primary-800/30">
                                                {lastSeenVersion ? `v${lastSeenVersion}` : 'null (Новый юзер)'}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <select
                                                value={lastSeenVersion || 'ALL_UNREAD'}
                                                onChange={(e) => {
                                                    onSetLastSeenVersion && onSetLastSeenVersion(e.target.value === 'ALL_UNREAD' ? null : e.target.value);
                                                    triggerHaptic(10);
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-bold rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-800 focus:outline-none truncate cursor-pointer"
                                            >
                                                <option value="ALL_UNREAD">null — (Новый юзер: ВСЁ непрочитано)</option>
                                                <option value="2.2.6">v2.2.6 — (Старый юзер: от v2.3.0 непрочитано)</option>
                                                {CHANGELOG.map(r => (
                                                    <option key={r.version} value={r.version}>
                                                        v{r.version} — {r.title ? r.title.slice(0, 26) + '...' : r.date}
                                                    </option>
                                                ))}
                                            </select>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        onSetLastSeenVersion && onSetLastSeenVersion('2.2.6');
                                                        triggerHaptic(10);
                                                    }}
                                                    className="py-2.5 px-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs text-center truncate"
                                                    title="От v2.3.0 и выше непрочитано (существующий юзер)"
                                                >
                                                    v2.2.6 (Старый)
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onSetLastSeenVersion && onSetLastSeenVersion(null);
                                                        triggerHaptic(10);
                                                    }}
                                                    className="py-2.5 px-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs text-center truncate"
                                                    title="Вся история непрочитана (новый юзер)"
                                                >
                                                    Всё новое (Новый)
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    onOpenChangelog();
                                                    triggerHaptic(10);
                                                }}
                                                className="w-full py-2.5 px-2.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs shadow-primary-500/20 truncate"
                                            >
                                                <Sparkles size={15} />
                                                <span>Протестировать чейнджлог</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

