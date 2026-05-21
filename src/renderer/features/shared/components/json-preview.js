import { jsx as _jsx } from "react/jsx-runtime";
import styles from './json-preview.module.css';
import { Code } from '/@/shared/components/code/code';
export const JsonPreview = ({ value }) => {
    return (_jsx(Code, { block: true, className: styles.preview, lang: "json", p: "md", children: JSON.stringify(value, null, 2) }));
};
