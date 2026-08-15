import { forwardRef, Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './audiobook-detail-header.module.css';

import { useLongFormMediaServer } from '/@/renderer/api/samo/samo-long-form';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import {
    LibraryHeader,
    LibraryHeaderMenu,
} from '/@/renderer/features/shared/components/library-header';
import { AppRoute } from '/@/renderer/router/routes';
import {
    useIsLibraryFavorite,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { formatDurationString } from '/@/renderer/utils';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { Group } from '/@/shared/components/group/group';
import { Separator } from '/@/shared/components/separator/separator';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

interface AudiobookDetailHeaderProps {
    coverUrl?: string;
    item: LongFormLibraryItem;
    onPlay: (startSeconds?: number) => void;
    /** Resolved resume position in seconds, or 0 when the book is unstarted. */
    resumePosition: number;
}

export const AudiobookDetailHeader = forwardRef<HTMLDivElement, AudiobookDetailHeaderProps>(
    ({ coverUrl, item, onPlay, resumePosition }, ref) => {
        const { t } = useTranslation();
        const server = useLongFormMediaServer();
        const isFavorite = useIsLibraryFavorite('audiobook', server?.id, item.id);
        const { toggle: toggleFavorite } = useLibraryFavoritesActions();

        const metadata = item.media?.metadata;
        const duration = item.media?.duration ?? 0;
        const chapterCount = item.media?.chapters?.length ?? 0;

        const metadataItems = useMemo(() => {
            const items: Array<{ id: string; value: string | undefined }> = [
                {
                    id: 'narrator',
                    value: metadata?.narratorName
                        ? t('entity.narratedBy', {
                              name: metadata.narratorName,
                              postProcess: 'sentenceCase',
                          })
                        : undefined,
                },
                { id: 'publishedYear', value: metadata?.publishedYear },
                { id: 'publisher', value: metadata?.publisher },
                {
                    id: 'chapters',
                    value:
                        chapterCount > 1
                            ? t('entity.chapterWithCount', { count: chapterCount })
                            : undefined,
                },
                {
                    id: 'duration',
                    value: duration > 0 ? formatDurationString(duration * 1000) : undefined,
                },
            ];

            return items.filter((entry) => Boolean(entry.value));
        }, [chapterCount, duration, metadata, t]);

        const handleMoreOptions = (event: React.MouseEvent<HTMLButtonElement>) => {
            if (!server) return;
            ContextMenuController.call({
                cmd: { items: [item], server, type: 'audiobook' },
                event,
            });
        };

        return (
            <Stack ref={ref}>
                <LibraryHeader
                    imageUrl={coverUrl}
                    item={{
                        children: (
                            <Text
                                className={styles.itemType}
                                component="span"
                                fw={600}
                                size="md"
                                tt="uppercase"
                            >
                                {t('entity.audiobook', { count: 1 })}
                            </Text>
                        ),
                        imageUrl: coverUrl,
                        route: AppRoute.AUDIOBOOKS,
                    }}
                    title={metadata?.title || item.name || ''}
                >
                    <Stack gap="md" w="100%">
                        {metadata?.subtitle ? (
                            <Text fw={500} isMuted size="lg">
                                {metadata.subtitle}
                            </Text>
                        ) : null}
                        {metadata?.author ? (
                            <Text fw={600} size="lg">
                                {metadata.author}
                            </Text>
                        ) : null}
                        <Group className={styles.metadataGroup} gap="xs">
                            {metadataItems.map((entry, index) => (
                                <Fragment key={entry.id}>
                                    {index > 0 && (
                                        <Text isMuted isNoSelect>
                                            <Separator />
                                        </Text>
                                    )}
                                    <Text fw={400}>{entry.value}</Text>
                                </Fragment>
                            ))}
                        </Group>
                        <LibraryHeaderMenu
                            favorite={isFavorite}
                            onFavorite={() => {
                                if (!server?.id) return;
                                toggleFavorite('audiobook', server.id, item.id);
                            }}
                            onMore={handleMoreOptions}
                            onPlay={() => onPlay(resumePosition > 0 ? resumePosition : undefined)}
                        />
                    </Stack>
                </LibraryHeader>
            </Stack>
        );
    },
);
