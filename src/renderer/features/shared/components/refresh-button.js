import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const RefreshButton = ({ loading, onClick, ...props }) => {
    const { t } = useTranslation();
    return (_jsx(ActionIcon, { icon: "refresh", iconProps: {
            size: 'lg',
            ...props.iconProps,
        }, loading: loading, onClick: onClick, tooltip: {
            label: t('common.refresh', { postProcess: 'sentenceCase' }),
            ...props.tooltip,
        }, variant: "subtle", ...props }));
};
