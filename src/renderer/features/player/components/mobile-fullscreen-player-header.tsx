import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './mobile-fullscreen-player.module.css';

import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { QueueSong } from '/@/shared/types/domain-types';

interface MobileFullscreenPlayerHeaderProps {
    currentSong?: QueueSong;
    isPageHovered: boolean;
    onClose: () => void;
}

export const MobileFullscreenPlayerHeader = memo(
    ({ isPageHovered, onClose }: MobileFullscreenPlayerHeaderProps) => {
        const { t } = useTranslation();

        return (
            <div
                className={styles.header}
                style={{
                    background: 'rgb(var(--theme-colors-background-transparent), 0%)',
                }}
            >
                <ActionIcon
                    icon="arrowDownS"
                    iconProps={{ size: 'lg' }}
                    onClick={onClose}
                    tooltip={{ label: t('common.minimize', { postProcess: 'titleCase' }) }}
                    variant={isPageHovered ? 'default' : 'subtle'}
                />
            </div>
        );
    },
);

MobileFullscreenPlayerHeader.displayName = 'MobileFullscreenPlayerHeader';
