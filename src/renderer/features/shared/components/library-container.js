import { jsx as _jsx } from "react/jsx-runtime";
import styles from './library-container.module.css';
export const LibraryContainer = ({ children }) => {
    return _jsx("div", { className: styles.container, children: children });
};
