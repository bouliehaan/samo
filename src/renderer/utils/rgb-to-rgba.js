export const rgbToRgba = (rgb, alpha) => {
    if (!rgb) {
        return undefined;
    }
    return rgb.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
};
