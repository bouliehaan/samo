import { type MobileHomeItem, type MobileMediaTrack } from '@samo/core/mobile';
import { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { getContentItemKey } from '../utils/content-item';

export const TrackPlaylistMenu = ({
    actionState,
    canCreatePlaylist = false,
    onAddToPlaylist,
    onClose,
    onCreatePlaylist,
    playlists,
    track,
}: {
    actionState:
        | { status: 'error'; message: string }
        | { playlistId: string; status: 'loading' }
        | { message: string; status: 'success' }
        | { status: 'idle' };
    canCreatePlaylist?: boolean;
    onAddToPlaylist: (playlist: MobileHomeItem) => void;
    onClose: () => void;
    onCreatePlaylist?: (name: string) => void;
    playlists: MobileHomeItem[];
    track: MobileMediaTrack | null;
}) => {
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const isCreating =
        actionState.status === 'loading' && actionState.playlistId === '__create__';

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
                    {canCreatePlaylist && onCreatePlaylist ? (
                        <View style={styles.playlistCreateSection}>
                            <TextInput
                                autoCapitalize="words"
                                editable={actionState.status !== 'loading'}
                                onChangeText={setNewPlaylistName}
                                placeholder="New playlist name"
                                placeholderTextColor={colors.muted}
                                style={styles.input}
                                value={newPlaylistName}
                            />
                            <Pressable
                                accessibilityRole="button"
                                disabled={
                                    actionState.status === 'loading' ||
                                    newPlaylistName.trim().length === 0
                                }
                                onPress={() => onCreatePlaylist(newPlaylistName.trim())}
                                style={styles.inputActionButton}
                            >
                                {isCreating ? (
                                    <ActivityIndicator color={colors.accent} size="small" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Create playlist</Text>
                                )}
                            </Pressable>
                        </View>
                    ) : null}
                    <ScrollView style={styles.contextMenuList}>
                        {playlists.length === 0 ? (
                            <Text style={styles.mutedText}>
                                {canCreatePlaylist
                                    ? 'No playlists yet — create one above.'
                                    : 'No playlists from this music server yet.'}
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
