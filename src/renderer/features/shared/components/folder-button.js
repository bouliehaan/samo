import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const FolderButton = ({ isActive, ...props }) => {
    const { t } = useTranslation();
    return (_jsx(ActionIcon, { icon: "folder", iconProps: {
            color: isActive ? 'primary' : undefined,
            size: 'lg',
            ...props.iconProps,
        }, tooltip: {
            label: t('entity.folder', { count: 1, postProcess: 'sentenceCase' }),
            ...props.tooltip,
        }, variant: "subtle", ...props }));
};
