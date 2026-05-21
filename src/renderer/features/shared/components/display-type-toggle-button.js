import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { ListDisplayType } from '/@/shared/types/types';
export const DisplayTypeToggleButton = ({ buttonProps, displayType, onToggle, }) => {
    const { t } = useTranslation();
    const isGrid = displayType === ListDisplayType.GRID;
    const isDetail = displayType === ListDisplayType.DETAIL;
    return (_jsx(ActionIcon, { icon: isGrid ? 'layoutGrid' : isDetail ? 'layoutDetail' : 'layoutTable', iconProps: {
            size: 'lg',
        }, onClick: onToggle, tooltip: {
            label: isGrid
                ? t('table.config.view.grid', { postProcess: 'sentenceCase' })
                : isDetail
                    ? t('table.config.view.detail', { postProcess: 'sentenceCase' })
                    : t('table.config.view.table', { postProcess: 'sentenceCase' }),
        }, variant: "subtle", ...buttonProps }));
};
