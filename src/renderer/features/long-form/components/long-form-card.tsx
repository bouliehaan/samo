import clsx from 'clsx';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './long-form-card.module.css';

import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { useLongFormCoverRequest } from '/@/renderer/features/long-form/hooks/use-long-form-cover';
import {
    useIsLibraryFavorite,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

export type LongFormMediaKind = 'audiobook' | 'podcast';

interface LongFormCardProps {
    item: LongFormLibraryItem;
    kind: LongFormMediaKind;
    onOpen: (item: LongFormLibraryItem) => void;
    server: null | ServerListItemWithCredential | undefined;
    subtitle?: string;
    tertiary?: string;
    title: string;
}

const LongFormCardComponent = ({
    item,
    kind,
    onOpen,
    server,
    subtitle,
    tertiary,
    title,
}: LongFormCardProps) => {
    const { t } = useTranslation();
    const isFavorite = useIsLibraryFavorite(kind, server?.id, item.id);
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();

    const coverUrl = item.media?.metadata?.imageUrl ?? undefined;
    const imageRequest = useLongFormCoverRequest(server, coverUrl, `${kind}-cover`, item.id);

    const favoriteLabel = isFavorite
        ? t('action.removeFromFavorites', { postProcess: 'sentenceCase' })
        : t('action.addToFavorites', { postProcess: 'sentenceCase' });

    return (
        <div
            className={styles.card}
            onClick={() => onOpen(item)}
            onContextMenu={(event) => {
                event.preventDefault();
                if (!server) return;
                ContextMenuController.call({
                    cmd: { items: [item], server, type: kind },
                    event,
                });
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(item);
                }
            }}
            role="button"
            tabIndex={0}
        >
            <div className={styles.coverWrap}>
                <Image
                    alt={title}
                    enableAnimation
                    enableViewport
                    imageContainerProps={{ className: styles.cover }}
                    imageRequest={imageRequest}
                    src={coverUrl}
                    unloaderIcon="album"
                />
                <ActionIcon
                    aria-label={favoriteLabel}
                    className={clsx(styles.favorite, isFavorite && styles.favoriteActive)}
                    icon="favorite"
                    iconProps={isFavorite ? { color: 'primary', fill: 'primary' } : undefined}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!server?.id) return;
                        toggleFavorite(kind, server.id, item.id);
                    }}
                    size="sm"
                    tooltip={{ label: favoriteLabel }}
                    variant="subtle"
                />
            </div>
            <div className={styles.meta}>
                <Text fw={600} lineClamp={2} size="sm">
                    {title}
                </Text>
                {subtitle ? (
                    <Text isMuted lineClamp={1} size="xs">
                        {subtitle}
                    </Text>
                ) : null}
                {tertiary ? (
                    <Text isMuted size="xs">
                        {tertiary}
                    </Text>
                ) : null}
            </div>
        </div>
    );
};

export const LongFormCard = memo(LongFormCardComponent);
