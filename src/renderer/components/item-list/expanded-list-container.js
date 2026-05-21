import { jsx as _jsx } from "react/jsx-runtime";
import styles from './expanded-list-container.module.css';
const EXPANDED_HEIGHT = 300;
export const ExpandedListContainer = ({ children }) => {
    return (_jsx("div", { className: styles.listExpandedContainer, style: {
            height: EXPANDED_HEIGHT,
            overflow: 'auto',
        }, children: children }));
};
