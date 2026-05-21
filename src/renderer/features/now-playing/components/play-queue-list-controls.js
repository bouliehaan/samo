import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useIsFetching } from '@tanstack/react-query';
import { t } from 'i18next';
import { useTranslation } from 'react-i18next';
import styles from './play-queue-list-controls.module.css';
import { queryKeys } from '/@/renderer/api/query-keys';
import { SONG_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useRestoreQueue, useSaveQueue } from '/@/renderer/features/player/hooks/use-queue-restore';
import { ListConfigMenu, SONG_DISPLAY_TYPES, } from '/@/renderer/features/shared/components/list-config-menu';
import { SearchInput } from '/@/renderer/features/shared/components/search-input';
import { useCurrentServer, usePlayerStoreBase } from '/@/renderer/store';
import { hasFeature } from '/@/shared/api/utils';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { ServerFeature } from '/@/shared/types/features-types';
import { ListDisplayType } from '/@/shared/types/types';
export const PlayQueueListControls = ({ handleSearch, searchTerm, tableRef, type, }) => {
    return (_jsxs(Group, { align: "center", className: styles.toolbar, gap: "sm", justify: "flex-start", px: "md", py: "xs", style: { borderBottom: '1px solid var(--theme-colors-border)' }, w: "100%", wrap: "nowrap", children: [_jsxs(Group, { gap: "xs", style: { flexShrink: 0 }, wrap: "nowrap", children: [_jsx(QueueRestoreActions, {}), _jsx(QueuePlaybackIcons, { tableRef: tableRef })] }), _jsx(Divider, { h: "60%", orientation: "vertical", style: { alignSelf: 'center' } }), _jsx(Box, { style: { display: 'flex', flex: 1, minWidth: 0 }, children: _jsx(SearchInput, { enableHotkey: false, fillContainer: true, onChange: (e) => handleSearch(e.target.value), value: searchTerm }) }), _jsx(Divider, { h: "60%", orientation: "vertical", style: { alignSelf: 'center' } }), _jsx(Box, { style: { flexShrink: 0 }, children: _jsx(ListConfigMenu, { displayTypes: [
                        { hidden: true, value: ListDisplayType.GRID },
                        ...SONG_DISPLAY_TYPES,
                    ], listKey: type, optionsConfig: {
                        table: {
                            itemsPerPage: { hidden: true },
                            pagination: { hidden: true },
                        },
                    }, tableColumnsData: SONG_TABLE_COLUMNS }) })] }));
};
const QueuePlaybackIcons = ({ tableRef }) => {
    const { t } = useTranslation();
    const player = usePlayer();
    const handleClearQueue = () => {
        player.clearQueue();
    };
    const handleJumpToCurrent = () => {
        const index = usePlayerStoreBase.getState().player.index;
        if (index !== -1) {
            tableRef.current?.scrollToIndex(index);
        }
    };
    const handleShuffleQueue = () => {
        player.shuffleAll();
    };
    return (_jsxs(_Fragment, { children: [_jsx(ActionIcon, { icon: "mediaShuffle", iconProps: { size: 'lg' }, onClick: handleShuffleQueue, tooltip: { label: t('player.shuffle', { postProcess: 'sentenceCase' }) }, variant: "subtle" }), _jsx(ActionIcon, { icon: "x", iconProps: { size: 'lg' }, onClick: handleClearQueue, tooltip: { label: t('action.clearQueue', { postProcess: 'sentenceCase' }) }, variant: "subtle" }), _jsx(ActionIcon, { icon: "goToItem", iconProps: { size: 'lg' }, onClick: handleJumpToCurrent, tooltip: { label: t('action.goToCurrent', { postProcess: 'sentenceCase' }) }, variant: "subtle" })] }));
};
const QueueRestoreActions = () => {
    const server = useCurrentServer();
    const supportsQueue = hasFeature(server, ServerFeature.SERVER_PLAY_QUEUE);
    const isFetching = useIsFetching({ queryKey: queryKeys.player.fetch({ type: 'queue' }) });
    const { isPending: isSavingQueue, mutate: handleSaveQueue } = useSaveQueue();
    const handleRestoreQueue = useRestoreQueue();
    if (!supportsQueue) {
        return null;
    }
    return (_jsxs("span", { className: styles.restoreSection, children: [_jsx(ActionIcon, { disabled: Boolean(isFetching), icon: "upload", iconProps: { size: 'lg' }, loading: isSavingQueue, onClick: () => handleSaveQueue(), tooltip: {
                    label: t('player.saveQueueToServer', {
                        postProcess: 'sentenceCase',
                    }),
                }, variant: "subtle" }), _jsx(ActionIcon, { disabled: isSavingQueue || Boolean(isFetching), icon: "download", iconProps: { size: 'lg' }, loading: Boolean(isFetching), onClick: handleRestoreQueue, tooltip: {
                    label: t('player.restoreQueueFromServer', {
                        postProcess: 'sentenceCase',
                    }),
                }, variant: "subtle" })] }));
};
