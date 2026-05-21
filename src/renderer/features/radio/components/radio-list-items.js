import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './radio-list-items.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { openEditRadioStationModal } from '/@/renderer/features/radio/components/edit-radio-station-form';
import { useRadioControls, useRadioPlayer, } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useDeleteRadioStation } from '/@/renderer/features/radio/mutations/delete-radio-station-mutation';
import { useCurrentServer, usePermissions } from '/@/renderer/store';
import { useIsLibraryFavorite, useLibraryFavoritesActions, } from '/@/renderer/store/library-favorites.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { closeAllModals, ConfirmModal, openModal } from '/@/shared/components/modal/modal';
import { Paper } from '/@/shared/components/paper/paper';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem } from '/@/shared/types/domain-types';
const RadioListItem = ({ station }) => {
    const { t } = useTranslation();
    const { currentStreamUrl, isPlaying } = useRadioPlayer();
    const { play, stop } = useRadioControls();
    const server = useCurrentServer();
    const permissions = usePermissions();
    const deleteRadioStationMutation = useDeleteRadioStation({});
    const isFavorite = useIsLibraryFavorite('radio', server?.id, station.id);
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();
    const handleFavoriteClick = useCallback((e) => {
        e.stopPropagation();
        if (!server?.id)
            return;
        toggleFavorite('radio', server.id, station.id);
    }, [server, station.id, toggleFavorite]);
    const isCurrentStation = currentStreamUrl === station.streamUrl;
    const stationIsPlaying = isCurrentStation && isPlaying;
    const handleClick = () => {
        if (stationIsPlaying) {
            stop();
        }
        else if (server?.id) {
            play(station.streamUrl, station.name, {
                id: station.id,
                imageId: station.imageId,
                imageUrl: station.imageUrl,
                serverId: server.id,
            });
        }
    };
    const handleEditClick = (e) => {
        e.stopPropagation();
        openEditRadioStationModal(station, server, e);
    };
    const handleDeleteClick = useCallback(async (e) => {
        e.stopPropagation();
        if (!server)
            return;
        openModal({
            children: (_jsx(ConfirmModal, { labels: {
                    cancel: t('common.cancel', { postProcess: 'sentenceCase' }),
                    confirm: t('common.delete', { postProcess: 'sentenceCase' }),
                }, loading: deleteRadioStationMutation.isPending, onConfirm: async () => {
                    try {
                        await deleteRadioStationMutation.mutateAsync({
                            apiClientProps: { serverId: server.id },
                            query: { id: station.id },
                        });
                        // Stop playback if this station is currently playing
                        if (isCurrentStation) {
                            stop();
                        }
                    }
                    catch (err) {
                        toast.error({
                            message: err.message,
                            title: t('error.genericError', {
                                postProcess: 'sentenceCase',
                            }),
                        });
                    }
                    closeAllModals();
                }, children: _jsx(Text, { children: t('common.areYouSure', { postProcess: 'sentenceCase' }) }) })),
            title: t('common.delete', { postProcess: 'titleCase' }),
        });
    }, [deleteRadioStationMutation, isCurrentStation, server, station.id, stop, t]);
    return (_jsx("div", { onContextMenu: (event) => {
            event.preventDefault();
            if (!server?.id)
                return;
            ContextMenuController.call({
                cmd: { items: [station], serverId: server.id, type: 'radio' },
                event,
            });
        }, children: _jsx(Paper, { className: clsx(styles['radio-item'], {
                [styles['radio-item-active']]: isCurrentStation,
            }), p: "md", children: _jsxs(Flex, { align: "center", gap: "md", justify: "space-between", wrap: "nowrap", children: [_jsx("button", { className: styles['radio-item-button'], onClick: handleClick, type: "button", children: _jsxs(Group, { align: "center", gap: "md", wrap: "nowrap", children: [_jsx(Box, { className: styles.thumbnail, children: _jsx(ItemImage, { enableViewport: false, id: station.imageId ?? undefined, imageContainerProps: {
                                            className: styles['image-container'],
                                        }, itemType: LibraryItem.RADIO_STATION, serverId: server?.id, src: station.imageUrl ?? '', type: "table" }) }), _jsxs(Stack, { className: styles.meta, gap: 4, children: [_jsx(Text, { fw: 500, size: "md", children: station.name }), _jsx(Text, { className: styles['meta-line'], isMuted: true, size: "sm", children: station.streamUrl }), station.homepageUrl ? (_jsx(Text, { className: styles['meta-line'], isMuted: true, size: "sm", children: station.homepageUrl })) : null] })] }) }), _jsxs(Group, { className: styles['radio-item-actions'], gap: "xs", children: [_jsx(ActionIcon, { icon: "favorite", iconProps: isFavorite ? { color: 'primary', fill: 'primary' } : undefined, onClick: handleFavoriteClick, size: "sm", tooltip: {
                                    label: isFavorite ? 'Remove favorite' : 'Add favorite',
                                }, variant: "subtle" }), permissions.radio.edit && (_jsx(ActionIcon, { icon: "edit", onClick: handleEditClick, size: "sm", tooltip: {
                                    label: t('common.edit', { postProcess: 'sentenceCase' }),
                                }, variant: "subtle" })), permissions.radio.delete && (_jsx(ActionIcon, { icon: "delete", iconProps: { color: 'error' }, onClick: handleDeleteClick, size: "sm", tooltip: {
                                    label: t('common.delete', { postProcess: 'sentenceCase' }),
                                }, variant: "subtle" }))] })] }) }) }));
};
export const RadioListItems = ({ data }) => {
    const items = useMemo(() => data.map((station) => _jsx(RadioListItem, { station: station }, station.id)), [data]);
    return _jsx(Stack, { gap: "sm", children: items });
};
