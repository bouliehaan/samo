import merge from 'lodash/merge';
const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
};
const fadeInUp = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};
const fadeInDown = {
    hidden: { opacity: 0, y: -10 },
    show: { opacity: 1, y: 0 },
};
const fadeInLeft = {
    hidden: { opacity: 0, x: 10 },
    show: { opacity: 1, x: 0 },
};
const fadeInRight = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
};
const zoomIn = {
    hidden: { scale: 0.5 },
    show: { scale: 1 },
};
const zoomOut = {
    hidden: { scale: 1 },
    show: { scale: 0.5 },
};
const slideInUp = {
    hidden: { y: 10 },
    show: { y: 0 },
};
const slideInDown = {
    hidden: { y: -10 },
    show: { y: 0 },
};
const slideInLeft = {
    hidden: { x: 10 },
    show: { x: 0 },
};
const slideInRight = {
    hidden: { x: 10 },
    show: { x: 0 },
};
const scaleY = {
    hidden: { height: 0, opacity: 0, overflow: 'hidden' },
    show: { height: 'auto', opacity: 1 },
};
const blurIn = {
    hidden: { filter: 'blur(4px)' },
    show: { filter: 'blur(0px)' },
};
const flipHorizontal = {
    hidden: { x: '-100%' },
    show: { x: 0 },
};
const flipVertical = {
    hidden: { y: '-100%' },
    show: { y: 0 },
};
function combine(...variants) {
    const merged = merge({}, ...variants);
    return merged;
}
function stagger(variants, delay) {
    return {
        ...variants,
        show: {
            ...variants.show,
            transition: {
                staggerChildren: delay ?? 0.1,
            },
        },
    };
}
export const animationVariants = {
    blurIn,
    combine,
    fadeIn,
    fadeInDown,
    fadeInLeft,
    fadeInRight,
    fadeInUp,
    flipHorizontal,
    flipVertical,
    scaleY,
    slideInDown,
    slideInLeft,
    slideInRight,
    slideInUp,
    stagger,
    zoomIn,
    zoomOut,
};
