import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../hooks/useToast';

interface NavigationItem {
    id: string;
    onBack: () => void;
    priority: number;
    isBlocking: boolean;
}

interface NavigationContextType {
    register: (id: string, onBack: () => void, priority?: number, isBlocking?: boolean) => void;
    unregister: (id: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Stack of active handlers
    const [stack, setStack] = useState<NavigationItem[]>([]);
    const stackRef = useRef<NavigationItem[]>([]); // Ref for immediate access in event listener
    const lastBackPressTime = useRef<number>(0);
    const { addToast } = useToast();

    // Sync ref with state
    useEffect(() => {
        stackRef.current = stack;
    }, [stack]);

    // Initialize history state on mount
    useEffect(() => {
        // Android Back Button Trap Strategy:
        // We push a state immediately. This ensures that when the user presses "Back",
        // they land on the *previous* state (which is still our app), triggering popstate.
        // If we only used replaceState, the history length might be 1, so "Back" would exit immediately.
        window.history.pushState({ view: 'root' }, '');
    }, []);

    const register = useCallback((id: string, onBack: () => void, priority = 10, isBlocking = false) => {
        setStack(prev => {
            // Remove existing if any (update scenario)
            const filtered = prev.filter(item => item.id !== id);
            // Add new
            const newItem = { id, onBack, priority, isBlocking };
            const newStack = [...filtered, newItem].sort((a, b) => a.priority - b.priority);
            return newStack;
        });
    }, []);

    const unregister = useCallback((id: string) => {
        setStack(prev => prev.filter(item => item.id !== id));
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const currentStack = stackRef.current;

            if (currentStack.length > 0) {
                // Get the highest priority item (last one due to sort)
                const topItem = currentStack[currentStack.length - 1];

                if (topItem.isBlocking) {
                    // Blocking logic: Do NOTHING, just trap the back event (restore state)
                    // We push state again to "undo" the back navigation efficiently
                    window.history.pushState({ view: 'root' }, '');
                    return;
                }

                // Normal handler
                topItem.onBack();

                // IMPORTANT: The browser ALREADY went back in history. 
                // Checks if we need to restore the state?
                // Usually for modals we use pushState when opening. 
                // If the modal was opened WITHOUT pushState, we might be navigating back from Root to Previous Site logic.
                // But generally in SPA with "fake" history for modals:
                // If we want to stay on the "same" URL visually or logical state, we might need to handle it.
                // However, the standard pattern for "Back Button to close modal" assumes the modal *added* a history entry?
                // Or we just trap the event.
                // Let's stick to the "Trap" pattern for now:
                // If we handled it internally, we restore the history state so the user doesn't actually leave the page 
                // UNLESS the modal logic itself handles history (like SettingsOverlay currently does).
                // Refactoring: We should Standardize. 
                // OPTION A: Modals DON'T push state, we just trap 'popstate' and prevent exit.
                // OPTION B: Modals PUSH state, and 'popstate' naturally closes them.

                // Current implementation in App seems mixed. 
                // Let's trust the "Trap" approach for stability: 
                // "The user pressed back. We start an action. We Restore the history state to prevent exiting the app."
                window.history.pushState({ view: 'root' }, '');
            } else {
                // Stack is empty -> Root View
                // User Request: Completely block exit via Back Button.
                // Always trap the event by pushing state again.
                window.history.pushState({ view: 'root' }, '');

                // Optional: Notify user how to minimize if they spam
                const now = Date.now();
                if (now - lastBackPressTime.current < 2000) {
                    // If spamming, maybe show a toast hint? 
                    // Or just keep it silent as requested "reliable approach".
                    // Let's add a subtle hint just so they don't think it's broken, 
                    // or keep it silent if they just want to minimize.
                    // User said "Only can be minimized by other button".
                }
                lastBackPressTime.current = now;
            }
        };

        window.addEventListener('popstate', handlePopState);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                const currentStack = stackRef.current;
                if (currentStack.length > 0) {
                    const topItem = currentStack[currentStack.length - 1];
                    topItem.onBack();
                    e.preventDefault();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [addToast]);

    return (
        <NavigationContext.Provider value={{ register, unregister }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};
