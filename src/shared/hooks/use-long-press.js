import { useCallback, useRef } from 'react';
export const useLongPress = ({ delay = 500, onClick, onFinish, onLongPress, onStart, }) => {
    const timeoutRef = useRef(null);
    const targetRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const eventRef = useRef(null);
    const start = useCallback((event) => {
        longPressTriggeredRef.current = false;
        targetRef.current = event.target;
        eventRef.current = event;
        onStart?.(event);
        timeoutRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            if (eventRef.current) {
                onLongPress?.(eventRef.current);
            }
        }, delay);
    }, [onLongPress, onStart, delay]);
    const clear = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);
    const handleMouseDown = useCallback((event) => {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        start(event);
    }, [start]);
    const handleMouseUp = useCallback(() => {
        const event = eventRef.current;
        clear();
        if (!longPressTriggeredRef.current && onClick && event) {
            onClick(event);
        }
        onFinish?.(event || null);
        longPressTriggeredRef.current = false;
        eventRef.current = null;
    }, [clear, onClick, onFinish]);
    const handleMouseLeave = useCallback(() => {
        const event = eventRef.current;
        clear();
        onFinish?.(event || null);
        longPressTriggeredRef.current = false;
        eventRef.current = null;
    }, [clear, onFinish]);
    const handleTouchStart = useCallback((event) => {
        start(event);
    }, [start]);
    const handleTouchEnd = useCallback(() => {
        const event = eventRef.current;
        clear();
        if (!longPressTriggeredRef.current && onClick && event) {
            onClick(event);
        }
        onFinish?.(event || null);
        longPressTriggeredRef.current = false;
        eventRef.current = null;
    }, [clear, onClick, onFinish]);
    const handleTouchCancel = useCallback(() => {
        const event = eventRef.current;
        clear();
        onFinish?.(event || null);
        longPressTriggeredRef.current = false;
        eventRef.current = null;
    }, [clear, onFinish]);
    return {
        onMouseDown: handleMouseDown,
        onMouseLeave: handleMouseLeave,
        onMouseUp: handleMouseUp,
        onTouchCancel: handleTouchCancel,
        onTouchEnd: handleTouchEnd,
        onTouchStart: handleTouchStart,
    };
};
