import { MouseEvent } from 'react';
interface DoubleClickHandlerOptions<T extends HTMLElement = HTMLElement> {
    delay?: number;
    onDoubleClick?: (event: MouseEvent<T>) => void;
    onSingleClick?: (event: MouseEvent<T>) => void;
}
/**
 * Creates a handler that manages single and double-click events,
 * ensuring double-click doesn't trigger single-click
 */
export declare const createDoubleClickHandler: <T extends HTMLElement = HTMLElement>(options: DoubleClickHandlerOptions<T>) => (event: MouseEvent<T>) => void;
export {};
