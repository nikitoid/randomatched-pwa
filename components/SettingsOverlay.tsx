import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Dice5, Check, Palette, Database, Info, SmartphoneNfc, Terminal, RefreshCw, Trash, Download, Vibrate, Grid, Circle } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';
import { HeroList, ColorScheme, MatchRecord, ThemeRoundness } from '../types';
import { COLOR_SCHEMES_DATA } from '../constants';

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
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('appearance');

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

    useBackHandler(isOpen, () => {
        onClose();
    }, { id: 'settings-overlay', priority: 20 });

    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ overlay: 'settings' }, '');
        }
    }, [isOpen]);

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
            }}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap select-none border ${activeTab === id
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
        <div className={`fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible'}`}>
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 transition-all duration-300">
                <div className="px-4 py-3 pt-safe-area-top">
                    <div className="relative flex items-center justify-center w-full min-h-[44px]">
                        <button
                            onClick={onClose}
                            aria-label="Закрыть"
                            data-testid="settings-close-btn"
                            className="absolute left-0 p-2 -ml-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white md:hover:bg-slate-200 dark:md:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-700 transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Настройки</h2>
                    </div>
                </div>

                <div className="px-4 pb-3">
                    <div ref={tabsContainerRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} className={`flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
                        {renderTabButton('appearance', 'Внешний вид', <Palette size={16} />)}
                        {renderTabButton('app_settings', 'Приложение', <SmartphoneNfc size={16} />)}
                        {renderTabButton('info', 'Инфо', <Info size={16} />)}
                        {isDebugMode && renderTabButton('debug', 'Debug', <Terminal size={16} />)}
                    </div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <div className="absolute inset-0 overflow-y-auto no-scrollbar">
                    <div className="pb-safe-area-bottom">
                        {activeTab === 'appearance' && (
                            <div className="flex flex-col items-center justify-start min-h-full p-6 text-center animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-full max-w-sm">
                                    <h3 className="text-left text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Цветовая схема</h3>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                        {Object.entries(COLOR_SCHEMES_DATA).map(([key, data]) => {
                                            const isSelected = colorScheme === key;
                                            const colorValue = `rgb(${data.primary[500]})`;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => { setColorScheme && setColorScheme(key as any); triggerHaptic(10); }}
                                                    className={`relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${isSelected ? 'border-primary-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-primary-500/20' : 'border-transparent bg-white dark:bg-slate-900 md:hover:bg-slate-50 dark:md:hover:bg-slate-800'} `}
                                                >
                                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 shadow-sm flex items-center justify-center" style={{ backgroundColor: colorValue }}>
                                                        {isSelected && <Check size={20} className="text-white drop-shadow-md" />}
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

                                    {/* Скругление углов */}
                                    <div className="mt-6 w-full text-left">
                                        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Скругление углов</h3>
                                        <div className="flex bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 rounded-2xl shadow-sm">
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
                                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                                        }`}
                                                    >
                                                        {labels[r]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Визуальные эффекты */}
                                    <div className="mt-6 w-full text-left">
                                        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Визуальные эффекты</h3>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
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
                            </div>
                        )}

                        {activeTab === 'app_settings' && (
                            <div className="flex flex-col items-center justify-start min-h-full p-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="w-full max-w-sm flex flex-col gap-4">
                                    {/* Haptics */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
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
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
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
                                <div className="relative inline-block mb-8">
                                    <p className="text-sm font-bold text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full select-none">v2.8.5</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 w-full max-w-xs text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                                    <p className="mb-3"> Генератор команд 2x2 для настольной игры <strong>Unmatched</strong>. </p>
                                    <p> Создавайте свои списки героев, синхронизируйте их между устройствами и используйте умные алгоритмы для создания идеально сбалансированных матчей. </p>
                                </div>
                                {isUpdateAvailable && onUpdateApp && (
                                    <button onClick={onUpdateApp} className="mb-8 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-transform">
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
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                                        <h3 className="font-bold mb-3 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            <Database size={16} /> Сводка LocalStorage
                                        </h3>
                                        <div className="text-xs font-mono space-y-1.5 max-h-40 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
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
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
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
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
