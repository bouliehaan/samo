import { useEffect, useRef, useState } from 'react';
export function useDebouncedValue(value, delay, options) {
    const { waitForInitial = false } = options || {};
    const [debouncedValue, setDebouncedValue] = useState(waitForInitial ? undefined : value);
    const timeoutRef = useRef(null);
    useEffect(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        // Set up a new timeout to update the debounced value
        timeoutRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        // Cleanup function to clear the timeout if the component unmounts or value changes
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, delay]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    return [debouncedValue];
}
