const fadeIn = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { opacity: 0 },
        show: { opacity: 1 },
    },
};
const fadeOut = {
    animate: 'hidden',
    exit: 'show',
    initial: 'show',
    transition: { duration: 0.3 },
    variants: {
        hidden: { opacity: 0 },
        show: { opacity: 1 },
    },
};
const slideInLeft = {
    animate: 'show',
    exit: 'hidden',
    initial: 'initial',
    transition: { duration: 0.3 },
    variants: {
        hidden: { x: -100 },
        initial: { x: -100 },
        show: { x: 0 },
    },
};
const slideOutLeft = {
    animate: 'hidden',
    exit: 'show',
    initial: 'initial',
    transition: { duration: 0.3 },
    variants: {
        hidden: { x: -100 },
        initial: { x: 0 },
        show: { x: 0 },
    },
};
const slideInRight = {
    animate: 'show',
    exit: 'hidden',
    initial: 'initial',
    transition: { duration: 0.3 },
    variants: {
        hidden: { x: 100 },
        initial: { x: 100 },
        show: { x: 0 },
    },
};
const slideOutRight = {
    animate: 'hidden',
    exit: 'show',
    initial: 'show',
    transition: { duration: 0.3 },
    variants: {
        hidden: { x: 100 },
        initial: { x: 0 },
        show: { x: 0 },
    },
};
const slideInUp = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { y: 100 },
        show: { y: 0 },
    },
};
const slideOutUp = {
    animate: 'hidden',
    exit: 'show',
    initial: 'initial',
    transition: { duration: 0.3 },
    variants: {
        hidden: { y: 100 },
        initial: { y: 0 },
        show: { y: 0 },
    },
};
const slideInDown = {
    animate: 'show',
    exit: 'hidden',
    initial: 'initial',
    transition: { duration: 0.3 },
    variants: {
        hidden: { y: -100 },
        initial: { y: -100 },
        show: { y: 0 },
    },
};
const slideOutDown = {
    animate: 'hidden',
    exit: 'show',
    initial: 'show',
    transition: { duration: 0.3 },
    variants: {
        hidden: { y: -10 },
        show: { y: 0 },
    },
};
const scale = {
    animate: { scale: 1 },
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { scale: 0 },
        show: { scale: 1 },
    },
};
const rotate = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { rotate: 0 },
        show: { rotate: 360 },
    },
};
const bounce = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3, times: [0, 0.5, 1] },
    variants: {
        hidden: { y: [0, -30, 0] },
        show: { y: 0 },
    },
};
const pulse = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 1, repeat: Infinity },
    variants: {
        hidden: { scale: [1, 1.1, 1] },
        show: { scale: 1 },
    },
};
const shake = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { x: [-10, 10, -10, 10, 0] },
        show: { x: 0 },
    },
};
const flip = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { rotateY: 0 },
        show: { rotateY: 360 },
    },
};
const zoomIn = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { opacity: 0, scale: 0.5 },
        show: { opacity: 1, scale: 1 },
    },
};
const zoomOut = {
    animate: { opacity: 0, scale: 0.5 },
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { opacity: 0, scale: 0.5 },
        show: { opacity: 1, scale: 1 },
    },
};
const rotateIn = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { opacity: 0, rotate: -180 },
        show: { opacity: 1, rotate: 0 },
    },
};
const swing = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 1, repeat: Infinity },
    variants: {
        hidden: { rotate: [0, 15, -15, 0] },
        show: { rotate: 0 },
    },
};
const rubberBand = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.8 },
    variants: {
        hidden: { scaleX: [1, 1.25, 0.75, 1.15, 0.95, 1] },
        show: { scaleX: 1 },
    },
};
const fadeInUp = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { opacity: 0, y: 50 },
        show: { opacity: 1, y: 0 },
    },
};
const fadeInDown = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.3 },
    variants: {
        hidden: { opacity: 0, y: -50 },
        show: { opacity: 1, y: 0 },
    },
};
const rotateScale = {
    animate: 'show',
    exit: 'hidden',
    initial: 'hidden',
    transition: { duration: 0.7 },
    variants: {
        hidden: { rotate: 0, scale: 1 },
        show: { rotate: 360, scale: 1.5 },
    },
};
export const animationProps = {
    bounce,
    fadeIn,
    fadeInDown,
    fadeInUp,
    fadeOut,
    flip,
    pulse,
    rotate,
    rotateIn,
    rotateScale,
    rubberBand,
    scale,
    shake,
    slideInDown,
    slideInLeft,
    slideInRight,
    slideInUp,
    slideOutDown,
    slideOutLeft,
    slideOutRight,
    slideOutUp,
    swing,
    zoomIn,
    zoomOut,
};
