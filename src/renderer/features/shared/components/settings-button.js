import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const SettingsButton = ({ ...props }) => {
    const { t } = useTranslation();
    return (_jsx(ActionIcon, { icon: "settings", iconProps: {
            size: 'lg',
            ...props.iconProps,
        }, tooltip: {
            label: t('common.configure', { postProcess: 'sentenceCase' }),
            ...props.tooltip,
        }, variant: "subtle", ...props }));
};
