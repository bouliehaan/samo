import { jsx as _jsx } from "react/jsx-runtime";
import styles from './player-image.module.css';
import { useSend } from '/@/remote/store';
export const PlayerImage = ({ src }) => {
    const send = useSend();
    return (_jsx("img", { className: styles.container, onError: () => send({ event: 'proxy' }), src: src?.replaceAll(/&(size|width|height)=\d+/g, '') }));
};
