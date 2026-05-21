/**
 * Creates a handler that manages single and double-click events,
 * ensuring double-click doesn't trigger single-click
 */
export const createDoubleClickHandler = (options) => {
    const { delay = 200, onDoubleClick, onSingleClick } = options;
    let clickTimeout = null;
    let clickCount = 0;
    const handleClick = (event) => {
        clickCount++;
        if (clickCount === 1) {
            // First click - set a timeout to handle single click
            clickTimeout = setTimeout(() => {
                if (clickCount === 1) {
                    // Only single click occurred
                    onSingleClick?.(event);
                }
                clickCount = 0;
                clickTimeout = null;
            }, delay);
        }
        else if (clickCount === 2) {
            // Double click detected
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }
            onDoubleClick?.(event);
            clickCount = 0;
        }
    };
    return handleClick;
};
