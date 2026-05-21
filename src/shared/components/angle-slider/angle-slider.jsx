import { AngleSlider as MantineAngleSlider, } from '@mantine/core';
import { forwardRef } from 'react';
export const AngleSlider = forwardRef((props, ref) => {
    return <MantineAngleSlider {...props} ref={ref}/>;
});
AngleSlider.displayName = 'AngleSlider';
