import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { generateColors } from '@mantine/colors-generator';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import styles from './library-background-overlay.module.css';
import { useAppThemeColors } from '/@/renderer/themes/use-app-theme';
export const LibraryBackgroundOverlay = ({ backgroundColor, headerRef, opacity = 0.7, }) => {
    const height = useHeaderHeight(headerRef);
    return (_jsx("div", { className: styles.overlay, style: {
            backgroundColor,
            height: height ? `${height + 64}px` : undefined,
            opacity,
        } }));
};
export const BackgroundOverlay = ({ backgroundColor, direction = 'to bottom', height = '100%', opacity, }) => {
    const theme = useAppThemeColors();
    const colors = generateColors(backgroundColor || theme.color['--theme-colors-background']);
    return (_jsx("div", { className: clsx(styles.backgroundOverlay), style: {
            '--color-from': colors[6],
            '--color-to': colors[9],
            '--direction-and-possibly-color-interpolation': direction,
            '--dither': 'none',
            backgroundColor: backgroundColor,
            height,
            opacity,
        } }));
};
export const LibraryBackgroundImage = ({ blur, headerRef, imageUrl }) => {
    const url = imageUrl ? `url(${imageUrl})` : undefined;
    const height = useHeaderHeight(headerRef);
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.backgroundImage, style: {
                    background: url,
                    filter: `blur(${blur ?? 0}rem)`,
                    height: height ? `${height - 64}px` : undefined,
                } }), _jsx("div", { className: styles.backgroundImageOverlay, style: {
                    height: height ? `${height + 64}px` : undefined,
                } })] }));
};
const useHeaderHeight = (headerRef) => {
    const [headerHeight, setHeaderHeight] = useState(0);
    useEffect(() => {
        if (!headerRef?.current)
            return;
        const updateHeight = () => {
            if (headerRef?.current) {
                setHeaderHeight(headerRef.current.offsetHeight);
            }
        };
        updateHeight();
        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(headerRef.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [headerRef]);
    return headerHeight;
};
