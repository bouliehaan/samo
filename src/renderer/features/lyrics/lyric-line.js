import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import { memo, useMemo } from 'react';
import styles from './lyric-line.module.css';
import { Box } from '/@/shared/components/box/box';
import { Stack } from '/@/shared/components/stack/stack';
export const LyricLine = memo(({ alignment, className, fontSize, text, ...props }) => {
    const lines = useMemo(() => text.split('_BREAK_'), [text]);
    const style = useMemo(() => ({
        fontSize,
        textAlign: alignment,
    }), [fontSize, alignment]);
    return (_jsx(Box, { className: clsx(styles.lyricLine, className), style: style, ...props, children: _jsx(Stack, { gap: 0, children: lines.map((line, index) => (_jsx("span", { children: line }, index))) }) }));
});
LyricLine.displayName = 'LyricLine';
