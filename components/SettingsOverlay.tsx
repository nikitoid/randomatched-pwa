import React, { useState, useRef, useCallback } from 'react';
import { Palette, Info, SmartphoneNfc, Terminal, Sliders } from 'lucide-react';
import { HeroList, ColorScheme, MatchRecord, Season, ThemeRoundness } from '../types';
import { getUnreadReleasesCount } from '../utils/changelog';
import { ScreenOverlay } from './common/ScreenOverlay';
import { AppearanceTab } from './settings/AppearanceTab';
import { AppSettingsTab } from './settings/AppSettingsTab';
import { InfoTab } from './settings/InfoTab';
import { DebugTab } from './settings/DebugTab';
import { useThemeContext } from '../context/ThemeContext';
import { useHeroListsContext } from '../context/HeroListsContext';
import { useMatchHistoryContext } from '../context/MatchHistoryContext';
import { useSeasonsContext } from '../context/SeasonsContext';
import { useAvatars } from '../context/AvatarContext';
import { useHaptics } from '../hooks/useHaptics';
import { useToast } from '../hooks/useToast';

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    lists?: HeroList[];
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
    forceAudioMode?: boolean;
    onToggleForceAudioMode?: () => void;
    triggerHaptic?: (pattern?: number | number[]) => void;
    onImportData?: (data: { history: MatchRecord[]; deletedHistory: MatchRecord[]; seasons?: Season[]; avatars?: Record<string, string> }) => boolean;
    addToast?: (message: string, type: 'info' | 'success' | 'error' | 'warning', duration?: number) => void;
    onOpenChangelog: () => void;
    lastSeenVersion?: string | null;
    onSetLastSeenVersion?: (version: string | null) => void;
    clientId?: string;
    isAdmin?: boolean;
}

type TabType = 'appearance' | 'app_settings' | 'info' | 'debug';

export const SettingsOverlay: React.FC<ExpandedSettingsProps> = ({
    isOpen,
    onClose,
    lists: listsProp,
    colorScheme: colorSchemeProp,
    setColorScheme: setColorSchemeProp,
    roundness: roundnessProp,
    setRoundness: setRoundnessProp,
    bgPattern: bgPatternProp,
    setBgPattern: setBgPatternProp,
    bgGradient: bgGradientProp,
    setBgGradient: setBgGradientProp,
    checkForUpdate,
    isCheckingUpdate = false,
    isUpdateAvailable = false,
    onUpdateApp,
    isDebugMode = false,
    onToggleDebug,
    hapticsEnabled: hapticsEnabledProp,
    onToggleHaptics: onToggleHapticsProp,
    forceAudioMode: forceAudioModeProp,
    onToggleForceAudioMode: onToggleForceAudioModeProp,
    triggerHaptic: triggerHapticProp,
    onImportData: onImportDataProp,
    addToast: addToastProp,
    onOpenChangelog,
    lastSeenVersion,
    onSetLastSeenVersion,
    clientId,
    isAdmin = false,
}) => {
    const themeCtx = useThemeContext();
    const { lists: ctxLists } = useHeroListsContext();
    const { importData } = useMatchHistoryContext();
    const { importSeasons } = useSeasonsContext();
    const { importAvatars } = useAvatars();
    const hapticsCtx = useHaptics();
    const { addToast: ctxAddToast } = useToast();

    const defaultOnImportData = useCallback(
        (data: { history: MatchRecord[]; deletedHistory: MatchRecord[]; seasons?: Season[]; avatars?: Record<string, string> }) => {
            const success = importData(data);
            if (success && Array.isArray(data.seasons)) {
                importSeasons(data.seasons);
            }
            if (success && data.avatars && typeof data.avatars === 'object') {
                void importAvatars(data.avatars);
            }
            return success;
        },
        [importData, importSeasons, importAvatars]
    );

    const lists = listsProp ?? ctxLists;
    const colorScheme = colorSchemeProp ?? themeCtx.colorScheme;
    const setColorScheme = setColorSchemeProp ?? themeCtx.setColorScheme;
    const roundness = roundnessProp ?? themeCtx.roundness;
    const setRoundness = setRoundnessProp ?? themeCtx.setRoundness;
    const bgPattern = bgPatternProp ?? themeCtx.bgPattern;
    const setBgPattern = setBgPatternProp ?? themeCtx.setBgPattern;
    const bgGradient = bgGradientProp ?? themeCtx.bgGradient;
    const setBgGradient = setBgGradientProp ?? themeCtx.setBgGradient;
    const hapticsEnabled = hapticsEnabledProp ?? hapticsCtx.isEnabled;
    const onToggleHaptics = onToggleHapticsProp ?? hapticsCtx.toggle;
    const forceAudioMode = forceAudioModeProp ?? hapticsCtx.forceAudioMode;
    const onToggleForceAudioMode = onToggleForceAudioModeProp ?? hapticsCtx.toggleForceAudioMode;
    const triggerHaptic = triggerHapticProp ?? hapticsCtx.trigger;
    const onImportData = onImportDataProp ?? defaultOnImportData;
    const addToast = addToastProp ?? ctxAddToast;
    const unreadChangelogCount = getUnreadReleasesCount(lastSeenVersion ?? null);
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

    // Reset active tab on open
    React.useEffect(() => {
        if (isOpen) {
            setActiveTab('appearance');
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

    const settingsTitle = (
        <div className="flex items-center gap-2">
            <Sliders size={20} className="text-primary-500 shrink-0" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Настройки</h2>
        </div>
    );

    const settingsSubHeader = (
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
    );

    return (
        <ScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title={settingsTitle}
            subHeader={settingsSubHeader}
            screenId="settings-screen"
            priority={20}
            testId="settings-overlay"
            closeButtonTestId="settings-close-btn"
            closeButtonAriaLabel="Закрыть"
            bodyClassName="no-scrollbar"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="pb-safe-area-bottom min-h-full">
                {activeTab === 'appearance' && (
                    <AppearanceTab
                        colorScheme={colorScheme}
                        setColorScheme={setColorScheme}
                        roundness={roundness}
                        setRoundness={setRoundness}
                        bgPattern={bgPattern}
                        setBgPattern={setBgPattern}
                        bgGradient={bgGradient}
                        setBgGradient={setBgGradient}
                        triggerHaptic={triggerHaptic}
                        isOpen={isOpen}
                    />
                )}

                {activeTab === 'app_settings' && (
                    <AppSettingsTab
                        hapticsEnabled={hapticsEnabled}
                        onToggleHaptics={onToggleHaptics}
                        forceAudioMode={forceAudioMode}
                        onToggleForceAudioMode={onToggleForceAudioMode}
                        isDebugMode={isDebugMode}
                        onToggleDebug={onToggleDebug}
                        triggerHaptic={triggerHaptic}
                    />
                )}

                {activeTab === 'info' && (
                    <InfoTab
                        lastSeenVersion={lastSeenVersion}
                        onOpenChangelog={onOpenChangelog}
                        clientId={clientId}
                        isAdmin={isAdmin}
                        isUpdateAvailable={isUpdateAvailable}
                        isCheckingUpdate={isCheckingUpdate}
                        onUpdateApp={onUpdateApp}
                        checkForUpdate={checkForUpdate}
                        addToast={addToast}
                        triggerHaptic={triggerHaptic}
                    />
                )}

                {activeTab === 'debug' && isDebugMode && (
                    <DebugTab
                        lists={lists}
                        onImportData={onImportData}
                        addToast={addToast}
                        lastSeenVersion={lastSeenVersion}
                        onSetLastSeenVersion={onSetLastSeenVersion}
                        onOpenChangelog={onOpenChangelog}
                        triggerHaptic={triggerHaptic}
                    />
                )}
            </div>
        </ScreenOverlay>
    );
};
