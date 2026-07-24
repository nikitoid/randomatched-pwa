import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Dice5, Check, Palette, Database, Info, SmartphoneNfc, Terminal, RefreshCw, Trash, Download, Vibrate, Grid, Circle, Sparkles } from 'lucide-react';
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

    const renderTabButton = (id: TabType, label: string, icon: React.ReactNode) => (
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
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full text-sm font-bold transition-all active:scale-95 whitespace-nowrap select-none border touch-manipulation ${activeTab === id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                } ${isDragScroll ? 'pointer-events-none' : ''}`}
        >
            {icon} <span>{label}</span>
        </button>
    );

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
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800/60 transition-all duration-300">
                <div 
                    className="px-4 py-3"
                    style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
                >
                    <div className="relative flex items-center justify-center w-full min-h-[44px] touch-manipulation">
                        <button
                            onClick={onClose}
                            aria-label="Закрыть"
                            data-testid="settings-close-btn"
                            className="absolute left-0 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:scale-95 active:bg-slate-200 dark:active:bg-slate-700 transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Настройки</h2>
                    </div>
                </div>

                <div className="px-4 pb-3">
                    <div ref={tabsContainerRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} className={`flex items-center gap-2 overflow-x-auto overscroll-contain no-scrollbar pb-1 touch-manipulation ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
                        {renderTabButton('appearance', 'Внешний вид', <Palette size={16} />)}
                        {renderTabButton('app_settings', 'Приложение', <SmartphoneNfc size={16} />)}
                        {renderTabButton('info', 'Инфо', <Info size={16} />)}
                        {isDebugMode && renderTabButton('debug', 'Debug', <Terminal size={16} />)}
                    </div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <div className="absolute inset-0 overflow-y-auto overscroll-contain no-scrollbar">
                    <div className="pb-safe-area-bottom">
                        {activeTab === 'appearance' && (
                            <div className="flex flex-col items-center justify-start min-h-full px-4 py-3 sm:p-6 text-center animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-full max-w-sm">
                                    {/* Переключатель подвкладок */}
                                    <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl mb-4 border border-slate-200/20 dark:border-slate-800/50 touch-manipulation">
                                        <button
                                            onClick={() => { setAppearanceSubTab('colors'); triggerHaptic(10); }}
                                            className={`flex-1 py-2.5 px-3 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 ease-in-out active:scale-95 border ${
                                                appearanceSubTab === 'colors'
                                                    ? 'bg-white text-slate-900 border-slate-200/80 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-700/50'
                                                    : 'bg-transparent text-slate-500 border-transparent active:text-slate-800 dark:text-slate-400 dark:active:text-slate-200'
                                            }`}
                                        >
                                            Цветовая схема
                                        </button>
                                        <button
                                            onClick={() => { setAppearanceSubTab('effects'); triggerHaptic(10); }}
                                            className={`flex-1 py-2.5 px-3 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl transition-all duration-150 ease-in-out active:scale-95 border ${
                                                appearanceSubTab === 'effects'
                                                    ? 'bg-white text-slate-900 border-slate-200/80 shadow-sm dark:bg-slate-800 dark:text-white dark:border-slate-700/50'
                                                    : 'bg-transparent text-slate-500 border-transparent active:text-slate-800 dark:text-slate-400 dark:active:text-slate-200'
                                            }`}
                                        >
                                            Оформление
                                        </button>
                                    </div>

                                    {appearanceSubTab === 'colors' && (
                                        <div className="animate-in fade-in duration-200">
                                            <h3 className="text-left text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Предпросмотр темы</h3>
                                            
                                            <div className="mb-4 bg-white/60 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-150/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
                                                {/* Фоновый градиент темы */}
                                                <div className="absolute top-0 left-0 w-full h-2/3 bg-gradient-to-b from-primary-500/10 to-transparent dark:from-primary-500/5 pointer-events-none" />

                                                {/* Заголовок демо-окна */}
                                                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/50 dark:border-slate-800/50 relative z-10">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 rounded-full bg-red-400" />
                                                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                                        <div className="w-2 h-2 rounded-full bg-green-400" />
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Интерфейс</span>
                                                    <div className="w-8 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
                                                </div>

                                                {/* Имитация UI */}
                                                <div className="space-y-2.5 relative z-10 text-left">
                                                    {/* Хедер mini-интерфейса */}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-black text-slate-800 dark:text-white">RandoMatched</span>
                                                        <span className="text-[8px] font-bold text-primary-600 dark:text-primary-400 bg-primary-100/50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded-full">v2.8</span>
                                                    </div>

                                                    {/* Выбор списка */}
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-800/50 p-1.5 rounded-xl flex items-center justify-between shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-lg bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center text-primary-500">
                                                                <Palette size={10} />
                                                            </div>
                                                            <div>
                                                                <div className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">Список героев</div>
                                                                <div className="text-[9px] font-bold text-slate-800 dark:text-slate-200">Все персонажи (12)</div>
                                                            </div>
                                                        </div>
                                                        <div className="w-1 h-1 rounded-full bg-primary-500 animate-pulse" />
                                                    </div>

                                                    {/* Карточки команд с primary & secondary акцентами */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {/* Команда 1 (Primary) */}
                                                        <div className="bg-primary-50/15 dark:bg-primary-950/15 border border-primary-500/25 dark:border-primary-500/20 p-1.5 rounded-xl">
                                                            <span className="text-[7px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest block mb-0.5">Команда 1</span>
                                                            <div className="space-y-1">
                                                                <div className="w-8 h-1 bg-primary-300/40 dark:bg-primary-800/40 rounded animate-pulse" />
                                                                <div className="w-6 h-1 bg-primary-200/40 dark:bg-primary-900/40 rounded animate-pulse" />
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Команда 2 (Secondary) */}
                                                        <div className="bg-secondary-50/15 dark:bg-secondary-950/15 border border-secondary-500/25 dark:border-secondary-500/20 p-1.5 rounded-xl">
                                                            <span className="text-[7px] font-black text-secondary-600 dark:text-secondary-400 uppercase tracking-widest block mb-0.5">Команда 2</span>
                                                            <div className="space-y-1">
                                                                <div className="w-8 h-1 bg-secondary-300/40 dark:bg-secondary-800/40 rounded animate-pulse" />
                                                                <div className="w-6 h-1 bg-secondary-200/40 dark:bg-secondary-900/40 rounded animate-pulse" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Кнопка действия */}
                                                    <div className="w-full bg-primary-500 text-white rounded-xl py-1 text-[9px] font-bold shadow-md shadow-primary-500/10 flex items-center justify-center gap-1 cursor-default pointer-events-none select-none">
                                                        <span>Сгенерировать</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <h3 className="text-left text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">Выберите цветовую схему</h3>
                                            <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                                                {Object.entries(COLOR_SCHEMES_DATA).map(([key, data]) => {
                                                    const isSelected = colorScheme === key;
                                                    return (
                                                        <button
                                                            key={key}
                                                            onClick={() => { setColorScheme && setColorScheme(key as any); triggerHaptic(10); }}
                                                            className={`relative flex items-center gap-1.5 sm:gap-3 py-1.5 px-2 sm:p-3 rounded-xl border-2 transition-all duration-200 active:scale-95 ${isSelected ? 'border-primary-500 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-primary-500/20' : 'border-transparent bg-white dark:bg-slate-900'} `}
                                                        >
                                                            <div className="relative w-9 h-6 sm:w-12 sm:h-8 shrink-0 flex items-center">
                                                                {/* Вторичный цвет (secondary) */}
                                                                <div 
                                                                    className="absolute right-0.5 w-[18px] h-[18px] sm:w-6 sm:h-6 rounded-full shadow-sm border border-slate-100/20 dark:border-slate-800/50" 
                                                                    style={{ backgroundColor: `rgb(${data.secondary[500]})` }}
                                                                />
                                                                {/* Основной цвет (primary) */}
                                                                <div 
                                                                    className="absolute left-0 w-[24px] h-[24px] sm:w-8 sm:h-8 rounded-full shadow-sm flex items-center justify-center border border-slate-100/20 dark:border-slate-800/50 z-10" 
                                                                    style={{ backgroundColor: `rgb(${data.primary[500]})` }}
                                                                >
                                                                    {isSelected && <Check size={12} className="text-white drop-shadow-md sm:size-16" />}
                                                                </div>
                                                            </div>
                                                            <div className="text-left min-w-0">
                                                                <div className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                    {data.label}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {appearanceSubTab === 'effects' && (
                                        <div className="animate-in fade-in duration-200 text-left">
                                            {/* Скругление углов */}
                                            <div className="w-full">
                                                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Скругление углов</h3>
                                                <div className="flex bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 p-1 rounded-2xl shadow-sm">
                                                    {(['sharp', 'medium', 'full'] as ThemeRoundness[]).map((r) => {
                                                        const labels: Record<ThemeRoundness, string> = {
                                                            sharp: 'Острые',
                                                            medium: 'Стандарт',
                                                            full: 'Круглые'
                                                        };
                                                        const isSelected = roundness === r;
                                                        return (
                                                            <button
                                                                key={r}
                                                                onClick={() => { setRoundness && setRoundness(r); triggerHaptic(10); }}
                                                                className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                                                                    isSelected 
                                                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                                                                        : 'text-slate-500 active:text-slate-900 dark:active:text-white'
                                                                }`}
                                                            >
                                                                {labels[r]}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Визуальные эффекты */}
                                            <div className="mt-6 w-full">
                                                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Визуальные эффекты</h3>
                                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-150 dark:border-slate-800/60 flex flex-col gap-4">
                                                    {/* Фоновый узор */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${bgPattern ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                                <Grid size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Фоновая сетка</h4>
                                                                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Текстурный точечный паттерн</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => { setBgPattern && setBgPattern(!bgPattern); triggerHaptic(10); }}
                                                            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out ${bgPattern ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                        >
                                                            <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${bgPattern ? 'translate-x-6' : 'translate-x-1'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'app_settings' && (
                            <div className="flex flex-col items-center justify-start min-h-full p-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-full max-w-sm flex flex-col gap-4">
                                    {/* Haptics */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-150 dark:border-slate-800/60">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${hapticsEnabled ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                    <Vibrate size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-bold text-slate-900 dark:text-white">Тактильный отклик</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Вибрация при действиях</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { onToggleHaptics && onToggleHaptics(); triggerHaptic(10); }}
                                                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out ${hapticsEnabled ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${hapticsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Режим разработчика */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-150 dark:border-slate-800/60">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDebugMode ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                    <Terminal size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-bold text-slate-900 dark:text-white">Режим разработчика</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Отображение весов и отладка</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { onToggleDebug && onToggleDebug(!isDebugMode); triggerHaptic(10); }}
                                                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out ${isDebugMode ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${isDebugMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'info' && (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center text-primary-600 dark:text-primary-400 mb-6 shadow-xl shadow-primary-500/10 rotate-3">
                                    <Dice5 size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Randomatched</h3>
                                <div className="relative inline-block mb-4">
                                    <p className="text-sm font-bold text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full select-none">v{APP_VERSION}</p>
                                </div>
                                <button
                                    onClick={() => { onOpenChangelog(); triggerHaptic(10); }}
                                    className="relative mb-6 px-4 py-2 border border-slate-200 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-900/40 text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all"
                                >
                                    <Sparkles size={14} className="text-amber-500 fill-amber-500/20" />
                                    <span>Что нового?</span>
                                    {unreadChangelogCount > 0 && (
                                        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[9px] rounded-full shadow-md shadow-amber-500/30 animate-pulse tracking-wider">
                                            NEW
                                        </span>
                                    )}
                                </button>
                                <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-800/60 w-full max-w-xs text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                                    <p className="mb-3"> Генератор команд 2x2 для настольной игры <strong>Unmatched</strong>. </p>
                                    <p> Создавайте свои списки героев, синхронизируйте их между устройствами и используйте умные алгоритмы для создания идеально сбалансированных матчей. </p>
                                </div>
                                {isUpdateAvailable && onUpdateApp && (
                                    <button onClick={onUpdateApp} className="mb-6 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-transform">
                                        <Download size={14} /> Обновить и перезапустить
                                    </button>
                                )}
                                <div className="mt-auto pt-4 pb-4 text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest flex flex-col gap-1 items-center">
                                    <span>Designed for Unmatched Fans</span>
                                    <span>by Nikitoid</span>
                                </div>
                            </div>
                        )}

                        {activeTab === 'debug' && isDebugMode && (
                            <div className="flex flex-col items-center justify-start min-h-full p-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-full max-w-sm flex flex-col gap-4">
                                    {/* LocalStorage Summary */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-150 dark:border-slate-800/60 shadow-sm">
                                        <h3 className="font-bold mb-3 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            <Database size={16} /> Сводка LocalStorage
                                        </h3>
                                        <div className="text-xs font-mono space-y-1.5 max-h-40 overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-150 dark:border-slate-900/60">
                                            {Object.keys(localStorage).map(key => {
                                                const val = localStorage.getItem(key) || '';
                                                let displaySize = `${(val.length * 2) / 1024}`;
                                                displaySize = parseFloat(displaySize).toFixed(2);
                                                return (
                                                    <div key={key} className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-1 last:border-0 last:pb-0">
                                                        <span className="truncate text-slate-600 dark:text-slate-400">{key}</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">{displaySize} KB</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-150 dark:border-slate-800/60 space-y-3 shadow-sm">
                                        <h3 className="font-bold flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                            Быстрые действия
                                        </h3>

                                        <button
                                            onClick={handleGenerateDemoHistory}
                                            className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-violet-600 dark:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
                                        >
                                            <RefreshCw size={16} />
                                            <span>Создать демо-историю (15 игр)</span>
                                        </button>

                                        <button
                                            onClick={handleClearAllHistory}
                                            className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-red-650 dark:bg-red-750 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
                                        >
                                            <Trash size={16} />
                                            <span>Полная очистка истории</span>
                                        </button>
                                    </div>

                                    {/* Отладка чейнджлога */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-150 dark:border-slate-800/60 space-y-3 shadow-sm">
                                        <h3 className="font-bold flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                            <Sparkles size={16} /> Прочитанная версия чейнджлога
                                        </h3>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">Сохраненная версия:</span>
                                            <span className="font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-md">
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
                                                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none truncate cursor-pointer"
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
                                                    className="py-2.5 px-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-colors shadow-sm text-center truncate"
                                                    title="От v2.3.0 и выше непрочитано (существующий юзер)"
                                                >
                                                    v2.2.6 (Старый)
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onSetLastSeenVersion && onSetLastSeenVersion(null);
                                                        triggerHaptic(10);
                                                    }}
                                                    className="py-2.5 px-2 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition-colors shadow-sm text-center truncate"
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
                                                className="w-full py-2.5 px-2.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-primary-500/20 truncate"
                                            >
                                                <Sparkles size={14} />
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
