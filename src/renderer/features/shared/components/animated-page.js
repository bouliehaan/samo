import { jsx as _jsx } from "react/jsx-runtime";
import { motion } from 'motion/react';
import { forwardRef } from 'react';
import styles from './animated-page.module.css';
import { animationProps } from '/@/shared/components/animations/animation-props';
export const AnimatedPage = forwardRef(({ children }, ref) => {
    return (_jsx(motion.main, { className: styles.animatedPage, ref: ref, ...animationProps.fadeIn, transition: { duration: 0.5, ease: 'anticipate' }, children: children }));
});
