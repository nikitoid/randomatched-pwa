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
    close: (id: string) => void;
    getStackIndex: (id: string) => number;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Stack of active handlers
    const [stack, setStack] = useState<NavigationItem[]>([]);
    const stackRef = useRef<NavigationItem[]>([]); // Ref for immediate access in event listener
    const lastBackPressTime = useRef<number>(0);
    const { addToast } = useToast();

    const pendingBackStepsRef = useRef<number>(0);
    const pendingBackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingPopStateRef = useRef<boolean>(false);

    // Unique session ID for each application load instance to isolate window.history across app updates
    const sessionIdRef = useRef<string>('');
    if (!sessionIdRef.current) {
        sessionIdRef.current = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    const currentSessionId = sessionIdRef.current;

    const getStackIndex = useCallback((id: string): number => {
        const index = stackRef.current.findIndex(item => item.id === id);
        return index !== -1 ? index : 0;
    }, []);

    // Sync ref with state
    useEffect(() => {
        stackRef.current = stack;
    }, [stack]);

    // Initialize history state on mount
    useEffect(() => {
        // Заменяем текущее состояние на exit-guard (самый первый элемент в истории текущей сессии)
        window.history.replaceState({ type: 'exit-guard', sessionId: currentSessionId }, '');
        // Добавляем root состояние, которое представляет главный экран
        window.history.pushState({ type: 'root', sessionId: currentSessionId }, '');

        return () => {
            if (pendingBackTimeoutRef.current) {
                clearTimeout(pendingBackTimeoutRef.current);
            }
        };
    }, [currentSessionId]);

    const register = useCallback((id: string, onBack: () => void, priority = 10, isBlocking = false) => {
        const alreadyExists = stackRef.current.some(item => item.id === id);
        
        // Добавляем состояние в историю браузера, только если модаль открывается в первый раз
        if (!alreadyExists) {
            if (pendingBackStepsRef.current > 0) {
                // Если был запланирован переход назад из-за закрытия предыдущей модали,
                // отменяем один шаг перехода и заменяем состояние в истории браузера
                pendingBackStepsRef.current -= 1;
                if (pendingBackStepsRef.current === 0 && pendingBackTimeoutRef.current) {
                    clearTimeout(pendingBackTimeoutRef.current);
                    pendingBackTimeoutRef.current = null;
                }
                window.history.replaceState({ type: 'modal', id, sessionId: currentSessionId }, '');
            } else {
                window.history.pushState({ type: 'modal', id, sessionId: currentSessionId }, '');
            }
        }

        const filtered = stackRef.current.filter(item => item.id !== id);
        const newItem = { id, onBack, priority, isBlocking };
        const newStack = [...filtered, newItem].sort((a, b) => a.priority - b.priority);
        
        // Синхронно обновляем реф, чтобы popstate обработчик сразу видел актуальный стек
        stackRef.current = newStack;
        setStack(newStack);
    }, [currentSessionId]);

    const unregister = useCallback((id: string) => {
        const exists = stackRef.current.some(item => item.id === id);
        
        if (exists && !isProcessingPopStateRef.current) {
            // Если модаль закрывается программно (через UI-кнопки), а не через системный "Назад",
            // то мы должны убрать ее запись из истории браузера (сделать переход назад)
            if (window.history.state?.id === id || pendingBackStepsRef.current > 0) {
                pendingBackStepsRef.current += 1;
                if (pendingBackTimeoutRef.current) {
                    clearTimeout(pendingBackTimeoutRef.current);
                }
                pendingBackTimeoutRef.current = setTimeout(() => {
                    if (pendingBackStepsRef.current > 0) {
                        const currentState = window.history.state;
                        // Защита: если история уже на 'exit-guard', предотвращаем лишний переход назад
                        if (currentState && currentState.type === 'exit-guard') {
                            pendingBackStepsRef.current = 0;
                            pendingBackTimeoutRef.current = null;
                            return;
                        }

                        window.history.go(-pendingBackStepsRef.current);
                        pendingBackStepsRef.current = 0;
                    }
                    pendingBackTimeoutRef.current = null;
                }, 0);
            }
        }

        const newStack = stackRef.current.filter(item => item.id !== id);
        stackRef.current = newStack;
        setStack(newStack);
    }, []);

    const close = useCallback((id: string) => {
        const currentStack = stackRef.current;
        const index = currentStack.findIndex(item => item.id === id);
        if (index !== -1) {
            const steps = currentStack.length - index;
            if (steps > 0) {
                window.history.go(-steps);
            }
        }
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const state = event.state;
            
            // Защита от возврата в прошлые сессии (до обновления PWA)
            if (!state || !state.type || state.sessionId !== currentSessionId) {
                window.history.forward();
                return;
            }

            isProcessingPopStateRef.current = true;
            const currentStack = stackRef.current;

            try {
                if (state.type === 'modal') {
                    const targetId = state.id;
                    const targetIndex = currentStack.findIndex(item => item.id === targetId);

                    if (targetIndex !== -1) {
                        // Закрываем все модали, которые находятся "выше" целевой модали в стеке
                        const itemsToClose = currentStack.slice(targetIndex + 1);
                        for (let i = itemsToClose.length - 1; i >= 0; i--) {
                            itemsToClose[i].onBack();
                        }
                    } else {
                        // В случае несовпадения закрываем только самую верхнюю модаль в стеке
                        if (currentStack.length > 0) {
                            const topItem = currentStack[currentStack.length - 1];
                            topItem.onBack();
                        }
                    }
                } else if (state.type === 'root') {
                    // Пользователь вернулся на главный экран. Закрываем все открытые модали
                    for (let i = currentStack.length - 1; i >= 0; i--) {
                        currentStack[i].onBack();
                    }
                } else if (state.type === 'exit-guard') {
                    if (currentStack.length > 0) {
                        // Если модали ещё в стеке, закрываем их и восстанавливаем состояние 'root' без показа тоста выхода
                        for (let i = currentStack.length - 1; i >= 0; i--) {
                            currentStack[i].onBack();
                        }
                        window.history.forward();
                    } else {
                        // Пользователь действительно нажал "Назад" на главном экране.
                        const now = Date.now();
                        if (now - lastBackPressTime.current < 3000) {
                            // Повторное нажатие в течение 3 секунд - позволяем выйти из приложения
                            window.history.go(-1);
                        } else {
                            lastBackPressTime.current = now;
                            addToast('Нажмите еще раз, чтобы выйти', 'info');
                            // Возвращаем пользователя обратно на состояние 'root'
                            window.history.forward();
                        }
                    }
                }
            } finally {
                setTimeout(() => {
                    isProcessingPopStateRef.current = false;
                }, 0);
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
    }, [addToast, currentSessionId]);

    return (
        <NavigationContext.Provider value={{ register, unregister, close, getStackIndex }}>
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
