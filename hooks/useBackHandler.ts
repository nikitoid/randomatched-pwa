import { useEffect, useId, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';

interface UseBackHandlerOptions {
    id?: string;
    priority?: number;
    isBlocking?: boolean;
}

export const useBackHandler = (
    isOpen: boolean,
    onBack: () => void,
    options: UseBackHandlerOptions = {}
) => {
    const { register, unregister } = useNavigation();
    // Generate a unique ID if not provided, to ensure every hook instance is tracked
    const generatedId = useId();
    const id = options.id || generatedId;
    const priority = options.priority ?? 10;
    const isBlocking = options.isBlocking ?? false;

    // Use a ref to store the latest onBack callback.
    // This allows the callback to change (e.g., inline function) without triggering
    // the main useEffect to re-register, avoiding infinite update loops.
    const onBackRef = useRef(onBack);

    // Update the ref whenever onBack changes
    useEffect(() => {
        onBackRef.current = onBack;
    }, [onBack]);

    useEffect(() => {
        if (isOpen) {
            // Register a stable proxy function that calls the current ref value
            register(id, () => {
                if (onBackRef.current) {
                    onBackRef.current();
                }
            }, priority, isBlocking);
        } else {
            unregister(id);
        }

        // Cleanup on unmount or when isOpen becomes false
        return () => {
            unregister(id);
        };
        // Removed 'onBack' from dependencies to prevent re-registration loop
    }, [isOpen, id, priority, isBlocking, register, unregister]);
};
