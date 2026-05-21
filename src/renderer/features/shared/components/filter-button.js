import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const FilterButton = ({ isActive, onClick, ...props }) => {
    const { t } = useTranslation();
    return (_jsx(ActionIcon, { icon: "filter", iconProps: {
            fill: isActive ? 'primary' : undefined,
            size: 'lg',
            ...props.iconProps,
        }, onClick: onClick, tooltip: {
            label: t('common.filters', { count: 2, postProcess: 'sentenceCase' }),
            ...props.tooltip,
        }, variant: "subtle", ...props }));
};
