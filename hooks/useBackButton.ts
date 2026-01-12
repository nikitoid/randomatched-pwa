import { useEffect, useRef } from 'react';

interface UseBackButtonProps {
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    showResult: boolean;
    setShowResult: (val: boolean) => void;
    isResetConfirmOpen: boolean;
    setIsResetConfirmOpen: (val: boolean) => void;
    isGroupStatsOpen: boolean;
    setIsGroupStatsOpen: (val: boolean) => void;
    isNamesOpen: boolean;
    setIsNamesOpen: (val: boolean) => void;
    isListSelectorOpen: boolean;
    setIsListSelectorOpen: (val: boolean) => void;
    isHistoryStatsOpen: boolean;
    setIsHistoryStatsOpen: (val: boolean) => void;
    addToast: (msg: string, type?: any, duration?: number) => void;
}

export const useBackButton = ({
    isSettingsOpen,
    setIsSettingsOpen,
    showResult,
    setShowResult,
    isResetConfirmOpen,
    setIsResetConfirmOpen,
    isGroupStatsOpen,
    setIsGroupStatsOpen,
    isNamesOpen,
    setIsNamesOpen,
    isListSelectorOpen,
    setIsListSelectorOpen,
    isHistoryStatsOpen,
    setIsHistoryStatsOpen,
    addToast
}: UseBackButtonProps) => {

    // Double back press logic
    const lastBackPressTime = useRef<number>(0);

    // Initialize history state
    useEffect(() => {
        window.history.replaceState({ view: 'root' }, '');
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (isSettingsOpen) {
                // Settings handles its own history usually, but if it's open, closing it is good.
                // In App.tsx logic: "Settings handles its own history" -> return.
                // Let's keep it consistent.
                return;
            }

            const state = event.state;

            // Handle Result Overlay Back
            if (showResult) {
                setShowResult(false);
                return;
            }

            if (isResetConfirmOpen || isGroupStatsOpen || isNamesOpen || isListSelectorOpen || isHistoryStatsOpen) {
                let didCloseAny = false;

                if (isResetConfirmOpen) { setIsResetConfirmOpen(false); didCloseAny = true; }
                if (isGroupStatsOpen) { setIsGroupStatsOpen(false); didCloseAny = true; }
                if (isNamesOpen) { setIsNamesOpen(false); didCloseAny = true; }
                if (isListSelectorOpen) { setIsListSelectorOpen(false); didCloseAny = true; }
                if (isHistoryStatsOpen) {
                    // Delegate closing logic to StatsModal component which has better context (details view etc)
                    // We just trap the event here so it doesn't trigger "Exit App" logic below
                    return;
                }

                // Ensure we stay on root ONLY if we actually closed a modal
                // If we didn't close anything (e.g. we are keeping Stats open because we are in 'stats' view),
                // we should NOT overwrite the current history state.
                if (didCloseAny && window.history.state?.view !== 'root') {
                    window.history.replaceState({ view: 'root' }, '');
                }
                return;
            }

            // Handle Root Back Press (Exit app logic)
            const now = Date.now();
            if (now - lastBackPressTime.current < 2000) {
                // Allow default back (exit)
            } else {
                // Trap back button
                window.history.pushState({ view: 'root' }, '');
                lastBackPressTime.current = now;
                addToast("Нажмите еще раз для выхода", "info", 2000);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [
        isSettingsOpen, setIsSettingsOpen,
        showResult, setShowResult,
        isResetConfirmOpen, setIsResetConfirmOpen,
        isGroupStatsOpen, setIsGroupStatsOpen,
        isNamesOpen, setIsNamesOpen,
        isListSelectorOpen, setIsListSelectorOpen,
        isHistoryStatsOpen, setIsHistoryStatsOpen,
        addToast
    ]);
};
