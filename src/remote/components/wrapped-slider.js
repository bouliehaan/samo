import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { rem, Slider } from '@mantine/core';
import { useState } from 'react';
import { Group } from '/@/shared/components/group/group';
import { Text } from '/@/shared/components/text/text';
const PlayerbarSlider = ({ ...props }) => {
    return (_jsx(Slider, { styles: {
            bar: {
                transition: 'background-color 0.2s ease',
            },
            label: {
                fontSize: '1.1rem',
                fontWeight: 600,
                padding: '0 1rem',
            },
            root: {
                '&:hover': {
                    '& .mantine-Slider-bar': {
                        backgroundColor: 'var(--primary-color)',
                    },
                    '& .mantine-Slider-thumb': {
                        opacity: 1,
                    },
                },
            },
            thumb: {
                backgroundColor: 'var(--slider-thumb-bg)',
                borderColor: 'var(--primary-color)',
                borderWidth: rem(1),
                height: '1rem',
                opacity: 0,
                width: '1rem',
            },
            track: {
                '&::before': {
                    right: 'calc(0.1rem * -1)',
                },
                height: '1rem',
            },
        }, ...props, onClick: (e) => {
            e?.stopPropagation();
        } }));
};
export const WrappedSlider = ({ leftLabel, rightLabel, value, ...props }) => {
    const [isSeeking, setIsSeeking] = useState(false);
    const [seek, setSeek] = useState(0);
    return (_jsxs(Group, { align: "center", wrap: "nowrap", children: [leftLabel && _jsx(Text, { size: "sm", children: leftLabel }), _jsx(PlayerbarSlider, { ...props, min: 0, onChange: (e) => {
                    setIsSeeking(true);
                    setSeek(e);
                }, onChangeEnd: (e) => {
                    props.onChangeEnd(e);
                    setIsSeeking(false);
                }, size: 6, value: !isSeeking ? (value ?? 0) : seek, w: "100%" }), rightLabel && _jsx(Text, { size: "sm", children: rightLabel })] }));
};
