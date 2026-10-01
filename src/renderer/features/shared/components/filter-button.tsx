import { useTranslation } from 'react-i18next';

import { ActionIcon, ActionIconProps } from '/@/shared/components/action-icon/action-icon';

interface FilterButtonProps extends ActionIconProps {
    isActive?: boolean;
}

export const FilterButton = ({ isActive, onClick, ...props }: FilterButtonProps) => {
    const { t } = useTranslation();

    return (
        <ActionIcon
            data-active={isActive || undefined}
            icon="filter"
            iconProps={{
                size: 'lg',
                ...props.iconProps,
            }}
            onClick={onClick}
            tooltip={{
                label: t('common.filters', { count: 2, postProcess: 'sentenceCase' }),
                ...props.tooltip,
            }}
            variant="toolbar"
            {...props}
        />
    );
};
