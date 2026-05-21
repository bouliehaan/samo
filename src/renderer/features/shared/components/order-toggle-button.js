import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { SortOrder } from '/@/shared/types/domain-types';
export const OrderToggleButton = ({ buttonProps, disabled, onToggle, sortOrder, }) => {
    const { t } = useTranslation();
    return (_jsx(ActionIcon, { disabled: disabled, icon: sortOrder === SortOrder.ASC ? 'sortAsc' : 'sortDesc', iconProps: {
            size: 'lg',
        }, onClick: onToggle, tooltip: {
            label: sortOrder === SortOrder.ASC
                ? t('common.ascending', { postProcess: 'sentenceCase' })
                : t('common.descending', { postProcess: 'sentenceCase' }),
        }, variant: "subtle", ...buttonProps }));
};
