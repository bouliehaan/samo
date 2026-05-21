import { jsx as _jsx } from "react/jsx-runtime";
import { Command } from 'cmdk';
import { useEffect, useRef, useState } from 'react';
export function CommandItemSelectable({ children, ...itemProps }) {
    const ref = useRef(null);
    const [isHighlighted, setIsHighlighted] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        setIsHighlighted(el.getAttribute('aria-selected') === 'true');
        const observer = new MutationObserver(() => {
            const selected = el.getAttribute('aria-selected') === 'true';
            setIsHighlighted(selected);
        });
        observer.observe(el, {
            attributeFilter: ['aria-selected'],
            attributes: true,
        });
        return () => observer.disconnect();
    }, []);
    return (_jsx(Command.Item, { ...itemProps, ref: ref, children: children({ isHighlighted }) }));
}
