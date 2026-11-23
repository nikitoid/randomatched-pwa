import { useState, useEffect, useRef, useCallback } from 'react';
import type React from 'react';

export type CardPosition = 'top' | 'bottom' | 'left' | 'right';

export interface ActiveCardDrag {
    id: CardPosition;
    offsetX: number;
    offsetY: number;
    currX: number;
    currY: number;
}

interface UseCardSwapDragParams {
    isOpen: boolean;
    onSwapPositions?: (pos1: CardPosition, pos2: CardPosition) => void;
}

/**
 * Manages drag-and-drop card swapping in cross view mode on ResultOverlay.
 */
export const useCardSwapDrag = ({ isOpen, onSwapPositions }: UseCardSwapDragParams) => {
    const [isDragMode, setIsDragMode] = useState(false);
    const [activeDrag, setActiveDrag] = useState<ActiveCardDrag | null>(null);
    const [hoveredTarget, setHoveredTarget] = useState<CardPosition | null>(null);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (!isOpen) {
            setIsDragMode(false);
            setActiveDrag(null);
            setHoveredTarget(null);
        }
    }, [isOpen]);

    const handlePointerDown = useCallback((e: React.PointerEvent, position: CardPosition) => {
        if (!isDragMode) return;
        e.preventDefault();

        const FLOATING_HALF_HEIGHT = 48;

        setActiveDrag({
            id: position,
            offsetX: 0,
            offsetY: FLOATING_HALF_HEIGHT,
            currX: e.clientX,
            currY: e.clientY - FLOATING_HALF_HEIGHT
        });
    }, [isDragMode]);

    // Global listeners attached to window to prevent sticking
    useEffect(() => {
        if (!activeDrag) return;

        const handlePointerMove = (e: PointerEvent) => {
            e.preventDefault();

            setActiveDrag(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    currX: e.clientX - prev.offsetX,
                    currY: e.clientY - prev.offsetY
                };
            });

            const targets: CardPosition[] = ['top', 'bottom', 'left', 'right'];
            let found: CardPosition | null = null;

            for (const pos of targets) {
                if (pos === activeDrag.id) continue;
                const el = cardRefs.current[pos];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    ) {
                        found = pos;
                        break;
                    }
                }
            }
            setHoveredTarget(found);
        };

        const handlePointerUp = (e: PointerEvent) => {
            e.preventDefault();

            const targets: CardPosition[] = ['top', 'bottom', 'left', 'right'];
            let finalTarget: CardPosition | null = null;

            for (const pos of targets) {
                if (pos === activeDrag.id) continue;
                const el = cardRefs.current[pos];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    ) {
                        finalTarget = pos;
                        break;
                    }
                }
            }

            if (finalTarget && onSwapPositions) {
                onSwapPositions(activeDrag.id, finalTarget);
            }

            setActiveDrag(null);
            setHoveredTarget(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [activeDrag, onSwapPositions]);

    return {
        isDragMode,
        setIsDragMode,
        activeDrag,
        hoveredTarget,
        cardRefs,
        handlePointerDown
    };
};
