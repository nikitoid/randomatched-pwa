import React, { useState, useEffect, useCallback, useRef } from 'react';

interface CustomScrollbarProps {
    containerRef: React.RefObject<HTMLDivElement>;
    className?: string; // For positioning adjustment if needed
}

export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({ containerRef, className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [thumbHeight, setThumbHeight] = useState(0);
    const [thumbTop, setThumbTop] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    // Refs for drag calculations
    const trackRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dragStartY = useRef(0);
    const startScrollTop = useRef(0);

    const show = useCallback(() => {
        setIsVisible(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
            if (!isDragging) setIsVisible(false);
        }, 1500); // Hide after 1.5s idle
    }, [isDragging]);

    const updateMetrics = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const { clientHeight, scrollHeight, scrollTop } = container;

        // Only show if content overflows
        if (scrollHeight <= clientHeight) {
            setThumbHeight(0);
            return;
        }

        const heightPercentage = clientHeight / scrollHeight;
        // Min thumb height 40px for touchability
        const newThumbHeight = Math.max(clientHeight * heightPercentage, 40);

        // Calculate top position
        // Available space for the thumb to move
        const availableSpace = clientHeight - newThumbHeight;
        // Scroll percentage
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

        setThumbTop(scrollPercentage * availableSpace);
        setThumbHeight(newThumbHeight);
    }, [containerRef]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            updateMetrics();
            show();
        };

        // ResizeObserver to handle content changes
        const resizeObserver = new ResizeObserver(() => {
            updateMetrics();
        });

        container.addEventListener('scroll', handleScroll);
        resizeObserver.observe(container);

        // Initial check
        updateMetrics();

        return () => {
            container.removeEventListener('scroll', handleScroll);
            resizeObserver.disconnect();
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [containerRef, updateMetrics, show]);

    // Keep visible while dragging
    useEffect(() => {
        if (isDragging) {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            setIsVisible(true);
        } else {
            show();
        }
    }, [isDragging, show]);

    const startThumbTop = useRef(0);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const container = containerRef.current;
        if (!container) return;

        setIsDragging(true);
        dragStartY.current = e.clientY;
        startScrollTop.current = container.scrollTop;
        startThumbTop.current = thumbTop;

        // CRITICAL: process pointer capture to handle "sliding finger away"
        (e.target as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !containerRef.current) return;
        e.preventDefault();

        const container = containerRef.current;
        const deltaY = e.clientY - dragStartY.current;

        // Calculate how much content moves per pixel of thumb movement
        const { clientHeight, scrollHeight } = container;
        const availableThumbSpace = clientHeight - thumbHeight;
        const availableScrollSpace = scrollHeight - clientHeight;

        // Ratio: Scrollable Content / Scrollable Thumb Track
        const ratio = availableScrollSpace / availableThumbSpace;

        // Update Scroll
        container.scrollTop = startScrollTop.current + (deltaY * ratio);

        // Update Visual Thumb instantly (don't wait for scroll event)
        const newThumbTop = Math.min(Math.max(0, startThumbTop.current + deltaY), availableThumbSpace);
        setThumbTop(newThumbTop);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as Element).releasePointerCapture(e.pointerId);
        // Sync final position accurately
        updateMetrics();
    };

    if (thumbHeight === 0) return null;

    return (
        <div
            className={`absolute right-1 top-0 bottom-0 w-3 pointer-events-none transition-opacity duration-300 z-50 ${className}`}
            style={{ opacity: isVisible ? 1 : 0 }}
        >
            <div
                ref={trackRef}
                className="absolute w-1.5 right-0.5 rounded-full bg-slate-300/80 dark:bg-slate-500/80 hover:bg-slate-400 active:bg-slate-500 backdrop-blur-sm transition-colors cursor-pointer touch-none pointer-events-auto"
                style={{
                    height: thumbHeight,
                    top: thumbTop,
                    // Expand touch area invisibly with a pseudo-element or border logic if needed, 
                    // or just make this element wide enough. 
                    // Let's make the visible part styled, but the hit target manageable.
                    // Actually, we can use a border trick or a wrapper. 
                    // Here I'll effectively make the visible bar.
                    // To increase touch target without specific CSS hacks here, 
                    // we can rely on the 6px + padding.
                    // Let's add a large transparent border for hit testing if padding/background-clip works
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            />
        </div>
    );
};
