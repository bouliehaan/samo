import { isLightColor as isLightColorMantine } from '@mantine/core';
export const isLightColor = (color) => {
    return isLightColorMantine(color);
};
