import { formatRadioNowPlayingLine, isRedundantRadioStationLabel } from '@samo/core/mobile';
import clsx from 'clsx';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './radio-list-items.module.css';

import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { openEditRadioStationModal } from '/@/renderer/features/radio/components/edit-radio-station-form';
import {
    useRadioControls,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { useDeleteRadioStation } from '/@/renderer/features/radio/mutations/delete-radio-station-mutation';
import { useCurrentServer, usePermissions } from '/@/renderer/store';
import {
    useIsLibraryFavorite,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { closeAllModals, ConfirmModal, openModal } from '/@/shared/components/modal/modal';
import { Paper } from '/@/shared/components/paper/paper';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { InternetRadioStation, LibraryItem } from '/@/shared/types/domain-types';

interface RadioListItemProps {
    station: InternetRadioStation;
}

interface RadioListItemsProps {
    data: InternetRadioStation[];
    isFiltered?: boolean;
}

const stationDetail = (station: InternetRadioStation, fallback: string) => {
    const nowPlaying = formatRadioNowPlayingLine(station.nowPlaying);

    return (
        [nowPlaying, station.description?.trim()].find(
            (line) => line && !isRedundantRadioStationLabel(station.name, line),
        ) || fallback
    );
};

const RadioListItem = ({ station }: RadioListItemProps) => {
    const { t } = useTranslation();
    const { currentStreamUrl, isPlaying } = useRadioPlayer();
    const { play, stop } = useRadioControls();
    const server = useCurrentServer();
    const permissions = usePermissions();
    const deleteRadioStationMutation = useDeleteRadioStation({});
    const isFavorite = useIsLibraryFavorite('radio', server?.id, station.id);
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();

    const handleFavoriteClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (!server?.id) return;
            toggleFavorite('radio', server.id, station.id);
        },
        [server, station.id, toggleFavorite],
    );

    const isCurrentStation = currentStreamUrl === station.streamUrl;
    const stationIsPlaying = isCurrentStation && isPlaying;
    // A channel is programmed on the server, not configured here: there is no
    // upstream address to show or edit, and deleting one from a station list
    // would be deleting a station somebody built.
    const isChannel = station.kind === 'channel';
    // The relay URL is an implementation detail: it is noisy, often internal,
    // and tells a listener nothing useful. What a station is airing is the
    // useful second line; its description and kind are honest fallbacks.
    const detailLine = stationDetail(station, isChannel ? 'samo channel' : 'Internet radio');

    const handleClick = () => {
        if (stationIsPlaying) {
            stop();
        } else if (server?.id) {
            play(station.streamUrl, station.name, {
                id: station.id,
                imageId: station.imageId,
                imageUrl: station.imageUrl,
                serverId: server.id,
            });
        }
    };

    const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        openEditRadioStationModal(station, server, e);
    };

    const handleDeleteClick = useCallback(
        async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();

            if (!server) return;

            openModal({
                children: (
                    <ConfirmModal
                        labels={{
                            cancel: t('common.cancel', { postProcess: 'sentenceCase' }),
                            confirm: t('common.delete', { postProcess: 'sentenceCase' }),
                        }}
                        loading={deleteRadioStationMutation.isPending}
                        onConfirm={async () => {
                            try {
                                await deleteRadioStationMutation.mutateAsync({
                                    apiClientProps: { serverId: server.id },
                                    query: { id: station.id },
                                });

                                // Stop playback if this station is currently playing
                                if (isCurrentStation) {
                                    stop();
                                }
                            } catch (err: any) {
                                toast.error({
                                    message: err.message,
                                    title: t('error.genericError', {
                                        postProcess: 'sentenceCase',
                                    }),
                                });
                            }

                            closeAllModals();
                        }}
                    >
                        <Text>{t('common.areYouSure', { postProcess: 'sentenceCase' })}</Text>
                    </ConfirmModal>
                ),
                title: t('common.delete', { postProcess: 'titleCase' }),
            });
        },
        [deleteRadioStationMutation, isCurrentStation, server, station.id, stop, t],
    );

    return (
        <div
            onContextMenu={(event) => {
                event.preventDefault();
                if (!server?.id) return;
                ContextMenuController.call({
                    cmd: { items: [station], serverId: server.id, type: 'radio' },
                    event,
                });
            }}
        >
            <Paper
                className={clsx(styles['radio-item'], {
                    [styles['radio-item-active']]: isCurrentStation,
                })}
                p={0}
            >
                <Flex className={styles['radio-item-content']} wrap="nowrap">
                    <button
                        aria-label={
                            stationIsPlaying ? `Stop ${station.name}` : `Play ${station.name}`
                        }
                        className={styles['radio-item-button']}
                        onClick={handleClick}
                        type="button"
                    >
                        <Box className={styles.thumbnail}>
                            <ItemImage
                                alt={station.name}
                                enableViewport={false}
                                id={station.imageId ?? undefined}
                                imageContainerProps={{
                                    className: styles['image-container'],
                                }}
                                itemType={LibraryItem.RADIO_STATION}
                                serverId={server?.id}
                                src={station.imageUrl ?? ''}
                                type="itemCard"
                            />
                            <span aria-hidden="true" className={styles['play-overlay']}>
                                <Icon
                                    icon={stationIsPlaying ? 'mediaStop' : 'mediaPlay'}
                                    size="lg"
                                />
                            </span>
                        </Box>
                        <Stack className={styles.meta} gap={4}>
                            <Text className={styles.name} fw={650} size="md">
                                {station.name}
                            </Text>
                            <Text className={styles['meta-line']} isMuted size="sm">
                                {detailLine}
                            </Text>
                        </Stack>
                    </button>
                    <Group className={styles['radio-item-actions']} gap="xs">
                        <ActionIcon
                            aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                            icon="favorite"
                            iconProps={
                                isFavorite ? { color: 'primary', fill: 'primary' } : undefined
                            }
                            onClick={handleFavoriteClick}
                            size="sm"
                            tooltip={{
                                label: isFavorite ? 'Remove favorite' : 'Add favorite',
                            }}
                            variant="subtle"
                        />
                        {permissions.radio.edit && !isChannel && (
                            <ActionIcon
                                aria-label={`Edit ${station.name}`}
                                icon="edit"
                                onClick={handleEditClick}
                                size="sm"
                                tooltip={{
                                    label: t('common.edit', { postProcess: 'sentenceCase' }),
                                }}
                                variant="subtle"
                            />
                        )}
                        {permissions.radio.delete && !isChannel && (
                            <ActionIcon
                                aria-label={`Delete ${station.name}`}
                                icon="delete"
                                iconProps={{ color: 'error' }}
                                onClick={handleDeleteClick}
                                size="sm"
                                tooltip={{
                                    label: t('common.delete', { postProcess: 'sentenceCase' }),
                                }}
                                variant="subtle"
                            />
                        )}
                    </Group>
                </Flex>
            </Paper>
        </div>
    );
};

export const RadioListItems = ({ data, isFiltered }: RadioListItemsProps) => {
    const items = useMemo(
        () => data.map((station) => <RadioListItem key={station.id} station={station} />),
        [data],
    );

    if (data.length === 0) {
        return (
            <Paper className={styles['empty-state']} p="xl">
                <Stack align="center" gap="xs">
                    <Text fw={650} size="lg">
                        {isFiltered ? 'No matching stations' : 'No radio stations yet'}
                    </Text>
                    <Text isMuted style={{ textAlign: 'center' }}>
                        {isFiltered
                            ? 'Try another filter or search.'
                            : 'Add a station to start listening here.'}
                    </Text>
                </Stack>
            </Paper>
        );
    }

    return <div className={styles['radio-list']}>{items}</div>;
};
