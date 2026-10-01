import { useTranslation } from 'react-i18next';

import { ActionIcon, ActionIconProps } from '/@/shared/components/action-icon/action-icon';

interface MoreButtonProps extends ActionIconProps {}

export const MoreButton = ({ ...props }: MoreButtonProps) => {
    const { t } = useTranslation();

    return (
        <ActionIcon
            icon="ellipsisHorizontal"
            iconProps={{
                size: 'lg',
                ...props.iconProps,
            }}
            tooltip={{ label: t('common.menu', { postProcess: 'sentenceCase' }) }}
            variant="toolbar"
            {...props}
        />
    );
};
