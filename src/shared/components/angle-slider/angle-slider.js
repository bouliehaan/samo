import { jsx as _jsx } from "react/jsx-runtime";
import { AngleSlider as MantineAngleSlider, } from '@mantine/core';
import { forwardRef } from 'react';
export const AngleSlider = forwardRef((props, ref) => {
    return _jsx(MantineAngleSlider, { ...props, ref: ref });
});
AngleSlider.displayName = 'AngleSlider';
