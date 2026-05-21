export const getHeaderColor = (rgbColor, opacity) => {
    return rgbColor.replace('rgb', 'rgba').replace(')', `, ${opacity || 0.8})`);
};
