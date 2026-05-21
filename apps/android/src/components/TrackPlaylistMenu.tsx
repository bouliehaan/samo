import { type MobileHomeItem, type MobileMediaTrack } from '@samo/core/mobile';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { getContentItemKey } from '../utils/content-item';

export const TrackPlaylistMenu = ({
    actionState,
    onAddToPlaylist,
    onClose,
    playlists,
    track,
}: {
    actionState:
        | { status: 'error'; message: string }
        | { playlistId: string; status: 'loading' }
        | { message: string; status: 'success' }
        | { status: 'idle' };
    onAddToPlaylist: (playlist: MobileHomeItem) => void;
    onClose: () => void;
    playlists: MobileHomeItem[];
    track: MobileMediaTrack | null;
}) => {
    return (
        <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(track)}>
            <Pressable onPress={onClose} style={styles.contextMenuBackdrop}>
                <Pressable onPress={(event) => event.stopPropagation()} style={styles.contextMenu}>
                    <Text numberOfLines={1} style={styles.contextMenuEyebrow}>
                        Add to playlist
                    </Text>
                    <Text numberOfLines={2} style={styles.contextMenuTitle}>
                        {track?.title ?? 'Track'}
                    </Text>
                    <ScrollView style={styles.contextMenuList}>
                        {playlists.length === 0 ? (
                            <Text style={styles.mutedText}>
                                No playlists from this music server yet.
                            </Text>
                        ) : (
                            playlists.map((playlist) => {
                                const isLoading =
                                    actionState.status === 'loading' &&
                                    actionState.playlistId === playlist.id;

                                return (
                                    <Pressable
                                        accessibilityRole="button"
                                        disabled={actionState.status === 'loading'}
                                        key={getContentItemKey(playlist)}
                                        onPress={() => onAddToPlaylist(playlist)}
                                        style={styles.contextMenuRow}
                                    >
                                        <Text numberOfLines={1} style={styles.contextMenuRowText}>
                                            {playlist.title}
                                        </Text>
                                        {isLoading ? (
                                            <ActivityIndicator color={colors.accent} size="small" />
                                        ) : null}
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>
                    {actionState.status === 'error' ? (
                        <Text style={styles.contextMenuError}>{actionState.message}</Text>
                    ) : actionState.status === 'success' ? (
                        <Text style={styles.contextMenuSuccess}>{actionState.message}</Text>
                    ) : null}
                </Pressable>
            </Pressable>
        </Modal>
    );
};
