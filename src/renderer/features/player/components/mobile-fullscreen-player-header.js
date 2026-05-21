import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './mobile-fullscreen-player.module.css';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const MobileFullscreenPlayerHeader = memo(({ isPageHovered, onClose }) => {
    const { t } = useTranslation();
    return (_jsx("div", { className: styles.header, style: {
            background: 'rgb(var(--theme-colors-background-transparent), 0%)',
        }, children: _jsx(ActionIcon, { icon: "arrowDownS", iconProps: { size: 'lg' }, onClick: onClose, tooltip: { label: t('common.minimize', { postProcess: 'titleCase' }) }, variant: isPageHovered ? 'default' : 'subtle' }) }));
});
MobileFullscreenPlayerHeader.displayName = 'MobileFullscreenPlayerHeader';
