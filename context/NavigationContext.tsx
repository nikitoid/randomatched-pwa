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

    // Sync ref with state
    useEffect(() => {
        stackRef.current = stack;
    }, [stack]);

    // Initialize history state on mount
    useEffect(() => {
        // Заменяем текущее состояние на exit-guard (самый первый элемент в истории)
        window.history.replaceState({ type: 'exit-guard' }, '');
        // Добавляем root состояние, которое представляет главный экран
        window.history.pushState({ type: 'root' }, '');

        return () => {
            if (pendingBackTimeoutRef.current) {
                clearTimeout(pendingBackTimeoutRef.current);
            }
        };
    }, []);

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
                window.history.replaceState({ type: 'modal', id }, '');
            } else {
                window.history.pushState({ type: 'modal', id }, '');
            }
        }

        const filtered = stackRef.current.filter(item => item.id !== id);
        const newItem = { id, onBack, priority, isBlocking };
        const newStack = [...filtered, newItem].sort((a, b) => a.priority - b.priority);
        
        // Синхронно обновляем реф, чтобы popstate обработчик сразу видел актуальный стек
        stackRef.current = newStack;
        setStack(newStack);
    }, []);

    const unregister = useCallback((id: string) => {
        const exists = stackRef.current.some(item => item.id === id);
        
        if (exists) {
            // Если модаль закрывается программно (через UI-кнопки), а не через системный "Назад",
            // то мы должны убрать ее запись из истории браузера (сделать переход назад)
            if (window.history.state?.id === id || pendingBackStepsRef.current > 0) {
                pendingBackStepsRef.current += 1;
                if (pendingBackTimeoutRef.current) {
                    clearTimeout(pendingBackTimeoutRef.current);
                }
                pendingBackTimeoutRef.current = setTimeout(() => {
                    if (pendingBackStepsRef.current > 0) {
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
            if (!state) return;

            const currentStack = stackRef.current;

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
                    // В случае рассинхронизации закрываем все модали
                    for (let i = currentStack.length - 1; i >= 0; i--) {
                        currentStack[i].onBack();
                    }
                }
            } else if (state.type === 'root') {
                // Пользователь вернулся на главный экран. Закрываем все открытые модали
                for (let i = currentStack.length - 1; i >= 0; i--) {
                    currentStack[i].onBack();
                }
            } else if (state.type === 'exit-guard') {
                // Пользователь нажал "Назад" на главном экране.
                const now = Date.now();
                if (now - lastBackPressTime.current < 3000) {
                    // Повторное нажатие в течение 3 секунд - позволяем выйти из приложения
                    window.history.go(-2);
                } else {
                    lastBackPressTime.current = now;
                    addToast('Нажмите еще раз, чтобы выйти', 'info');
                    // Возвращаем пользователя обратно на состояние 'root'
                    window.history.forward();
                }
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
        <NavigationContext.Provider value={{ register, unregister, close }}>
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
