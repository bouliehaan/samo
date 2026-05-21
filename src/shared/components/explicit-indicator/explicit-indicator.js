import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './explicit-indicator.module.css';
import { ExplicitStatus } from '/@/shared/types/domain-types';
const EXPLICIT_SYMBOL = '🅴';
const CLEAN_SYMBOL = '🅲';
export const ExplicitIndicator = ({ className, explicitStatus, size = 'lg', withSpace = true, ...rest }) => {
    if (explicitStatus !== ExplicitStatus.EXPLICIT && explicitStatus !== ExplicitStatus.CLEAN) {
        return null;
    }
    const symbol = explicitStatus === ExplicitStatus.EXPLICIT ? EXPLICIT_SYMBOL : CLEAN_SYMBOL;
    return (_jsx("span", { "aria-label": explicitStatus === ExplicitStatus.EXPLICIT ? 'Explicit' : 'Clean', className: clsx(styles.root, styles[`size-${size}`], className, {
            [styles.withSpace]: withSpace,
        }), ...rest, children: symbol }));
};
