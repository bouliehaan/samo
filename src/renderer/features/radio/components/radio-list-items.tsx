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
}

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
    // What it is airing beats what it is: a station that says "Miles Davis —
    // So What" is doing the job a list of names cannot.
    const detailLine = isChannel
        ? [station.nowPlaying?.artist, station.nowPlaying?.title].filter(Boolean).join(' — ') ||
          station.description?.trim() ||
          'samo channel'
        : station.streamUrl;

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
                p="md"
            >
                <Flex align="center" gap="md" justify="space-between" wrap="nowrap">
                    <button
                        className={styles['radio-item-button']}
                        onClick={handleClick}
                        type="button"
                    >
                        <Group align="center" gap="md" wrap="nowrap">
                            <Box className={styles.thumbnail}>
                                <ItemImage
                                    enableViewport={false}
                                    id={station.imageId ?? undefined}
                                    imageContainerProps={{
                                        className: styles['image-container'],
                                    }}
                                    itemType={LibraryItem.RADIO_STATION}
                                    serverId={server?.id}
                                    src={station.imageUrl ?? ''}
                                    type="table"
                                />
                            </Box>
                            <Stack className={styles.meta} gap={4}>
                                <Text fw={500} size="md">
                                    {station.name}
                                </Text>
                                <Text className={styles['meta-line']} isMuted size="sm">
                                    {detailLine}
                                </Text>
                                {station.homepageUrl ? (
                                    <Text className={styles['meta-line']} isMuted size="sm">
                                        {station.homepageUrl}
                                    </Text>
                                ) : null}
                            </Stack>
                        </Group>
                    </button>
                    <Group className={styles['radio-item-actions']} gap="xs">
                        <ActionIcon
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

export const RadioListItems = ({ data }: RadioListItemsProps) => {
    const items = useMemo(
        () => data.map((station) => <RadioListItem key={station.id} station={station} />),
        [data],
    );

    return <Stack gap="sm">{items}</Stack>;
};
