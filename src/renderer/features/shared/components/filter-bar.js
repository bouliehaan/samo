import { jsx as _jsx } from "react/jsx-runtime";
import styles from './filter-bar.module.css';
export const FilterBar = ({ children, ...props }) => {
    return (_jsx("div", { className: styles.filterBar, ...props, children: children }));
};
