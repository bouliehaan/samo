import { type MobileHomeItem, type MobileMediaTrack } from '@samo/core/mobile';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { MotionSheet } from './MotionSheet';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { getContentItemKey } from '../utils/content-item';

export type TrackPlaylistMenuMode = 'add' | 'create' | 'standalone';

export const TrackPlaylistMenu = ({
    actionState,
    canCreatePlaylist = false,
    mode = 'add',
    onAddToPlaylist,
    onClose,
    onCreatePlaylist,
    open,
    playlists,
    track,
}: {
    actionState:
        | { status: 'error'; message: string }
        | { playlistId: string; status: 'loading' }
        | { message: string; status: 'success' }
        | { status: 'idle' };
    canCreatePlaylist?: boolean;
    mode?: TrackPlaylistMenuMode;
    onAddToPlaylist: (playlist: MobileHomeItem) => void;
    onClose: () => void;
    onCreatePlaylist?: (name: string) => void;
    open: boolean;
    playlists: MobileHomeItem[];
    track: MobileMediaTrack | null;
}) => {
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const isCreating = actionState.status === 'loading' && actionState.playlistId === '__create__';
    const isCreateMode = mode === 'create' || mode === 'standalone';
    const showCreateSection = isCreateMode || (canCreatePlaylist && Boolean(onCreatePlaylist));
    const showExistingPlaylists = mode === 'add';

    // Auto-dismiss after a successful add/create so the sheet glides away with a
    // brief confirmation instead of forcing a manual close (Spotify-style). The
    // optimistic add flips straight to 'success'; if the background write fails
    // fast it flips to 'error' first, which cancels this timer and keeps the
    // sheet open showing why. The ref keeps the timer immune to parent
    // re-renders recreating onClose.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const isSuccess = actionState.status === 'success';
    useEffect(() => {
        if (!isSuccess) {
            return;
        }
        const timer = setTimeout(() => onCloseRef.current(), 1100);
        return () => clearTimeout(timer);
    }, [isSuccess]);

    return (
        <MotionSheet
            backdropStyle={styles.contextMenuBackdrop}
            onRequestClose={onClose}
            sheetStyle={styles.contextMenu}
            variant="bottom"
            visible={open}
        >
            <Text numberOfLines={1} style={styles.contextMenuEyebrow}>
                {isCreateMode ? 'Create playlist' : 'Add to playlist'}
            </Text>
            <Text numberOfLines={2} style={styles.contextMenuTitle}>
                {track?.title ?? (mode === 'standalone' ? 'New playlist' : 'Track')}
            </Text>
            {showCreateSection && onCreatePlaylist ? (
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
                            actionState.status === 'loading' || newPlaylistName.trim().length === 0
                        }
                        onPress={() => onCreatePlaylist(newPlaylistName.trim())}
                        style={[
                            styles.primaryButton,
                            styles.contextMenuPrimaryButton,
                            (actionState.status === 'loading' ||
                                newPlaylistName.trim().length === 0) &&
                                styles.disabledButton,
                        ]}
                    >
                        {isCreating ? (
                            <ActivityIndicator color="#050505" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Create playlist</Text>
                        )}
                    </Pressable>
                </View>
            ) : null}
            {showExistingPlaylists ? (
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
            ) : null}
            {actionState.status === 'error' ? (
                <Text style={styles.contextMenuError}>{actionState.message}</Text>
            ) : actionState.status === 'success' ? (
                <Text style={styles.contextMenuSuccess}>{actionState.message}</Text>
            ) : null}
        </MotionSheet>
    );
};
