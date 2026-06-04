import {
    deleteMobilePlaylist,
    isMobilePlaylistDetailEditable,
    replaceMobilePlaylistTracks,
    updateMobilePlaylistMetadata,
    uploadMobilePlaylistCover,
    type MobileMediaDetail,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { File } from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';

import { PlusGlyph } from './Glyphs';
import { triggerImpact } from '../services/haptics';
import { styles } from '../theme/styles';
import { colors, spacing } from '../theme/tokens';

export const EditPlaylistSheet = ({
    detail,
    onClose,
    onDeleted,
    onManageTracks,
    onSaved,
    serverConnections,
    visible,
}: {
    detail: MobileMediaDetail;
    onClose: () => void;
    onDeleted: () => void;
    onManageTracks: () => void;
    onSaved: () => void;
    serverConnections: ServerAuthenticationResult[];
    visible: boolean;
}) => {
    const authentication = findServerAuthenticationForSource(serverConnections, detail.source);
    const canEdit = isMobilePlaylistDetailEditable(detail);
    const supportsPublic = authentication?.type === ServerType.SAMO;

    const [name, setName] = useState(detail.title);
    const [description, setDescription] = useState(detail.playlistMeta?.description ?? '');
    const [isPublic, setIsPublic] = useState(detail.playlistMeta?.public ?? false);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const supportsCoverUpload = authentication?.type === ServerType.SAMO;

    useEffect(() => {
        if (!visible) return;
        setName(detail.title);
        setDescription(detail.playlistMeta?.description ?? '');
        setIsPublic(detail.playlistMeta?.public ?? false);
        setCoverFile(null);
    }, [detail.playlistMeta?.description, detail.playlistMeta?.public, detail.title, visible]);

    if (!visible || !canEdit || !authentication) {
        return null;
    }

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            Alert.alert('Edit playlist', 'Playlist name is required.');
            return;
        }

        setIsSaving(true);
        try {
            await updateMobilePlaylistMetadata({
                authentication,
                description,
                name: trimmedName,
                playlistId: detail.id,
                ...(supportsPublic ? { public: isPublic } : {}),
            });
            if (coverFile && supportsCoverUpload) {
                await uploadMobilePlaylistCover({
                    authentication,
                    file: coverFile,
                    filename: coverFile.name,
                    playlistId: detail.id,
                });
            }
            onSaved();
            onClose();
        } catch (error) {
            Alert.alert(
                'Edit playlist',
                error instanceof Error ? error.message : 'Failed to save playlist',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Delete playlist', `Delete "${detail.title}"? This cannot be undone.`, [
            { style: 'cancel', text: 'Cancel' },
            {
                style: 'destructive',
                text: 'Delete',
                onPress: () => {
                    void (async () => {
                        setIsSaving(true);
                        try {
                            await deleteMobilePlaylist({
                                authentication,
                                playlistId: detail.id,
                            });
                            onDeleted();
                            onClose();
                        } catch (error) {
                            Alert.alert(
                                'Delete playlist',
                                error instanceof Error
                                    ? error.message
                                    : 'Failed to delete playlist',
                            );
                        } finally {
                            setIsSaving(false);
                        }
                    })();
                },
            },
        ]);
    };

    const handlePickCover = async () => {
        try {
            triggerImpact('light');
            const picked = (await File.pickFileAsync(undefined, 'image/*')) as File | File[];
            const nextFile = Array.isArray(picked) ? picked[0] : picked;
            if (!nextFile) {
                return;
            }
            setCoverFile(nextFile);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Could not select a cover image.';
            if (message.toLowerCase().includes('cancel')) {
                return;
            }
            Alert.alert('Edit playlist', message);
        }
    };

    const coverPreviewUri = coverFile?.uri ?? detail.artworkUrl ?? null;
    const coverSourceLabel = coverFile?.name ?? (detail.artworkUrl ? 'Current cover' : 'No cover');

    return (
        <Modal animationType="slide" onRequestClose={onClose} transparent visible>
            <Pressable onPress={onClose} style={styles.bookInfoBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.editPlaylistSheet}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                    <Text style={styles.editPlaylistTitle}>Edit playlist</Text>
                    {supportsCoverUpload ? (
                        <>
                            <Text style={styles.editPlaylistLabel}>Cover</Text>
                            <View style={styles.addRadioThumbnailPicker}>
                                <View style={styles.addRadioThumbnailPreview}>
                                    {coverPreviewUri ? (
                                        <ExpoImage
                                            contentFit="cover"
                                            source={{ uri: coverPreviewUri }}
                                            style={styles.addRadioThumbnailImage}
                                        />
                                    ) : (
                                        <PlusGlyph color={colors.muted} size={18} />
                                    )}
                                </View>
                                <View style={styles.addRadioThumbnailMeta}>
                                    <Text numberOfLines={1} style={styles.addRadioThumbnailTitle}>
                                        Playlist cover
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        style={styles.addRadioThumbnailSubtitle}
                                    >
                                        {coverSourceLabel}
                                    </Text>
                                </View>
                                <Pressable
                                    accessibilityLabel="Choose playlist cover"
                                    accessibilityRole="button"
                                    disabled={isSaving}
                                    onPress={() => void handlePickCover()}
                                    style={styles.addRadioThumbnailButton}
                                >
                                    <Text style={styles.addRadioThumbnailButtonText}>
                                        Choose
                                    </Text>
                                </Pressable>
                            </View>
                        </>
                    ) : null}
                    <Text style={styles.editPlaylistLabel}>Name</Text>
                    <TextInput
                        autoCapitalize="words"
                        editable={!isSaving}
                        onChangeText={setName}
                        placeholder="Playlist name"
                        placeholderTextColor={colors.muted}
                        style={styles.editPlaylistInput}
                        value={name}
                    />
                    <Text style={styles.editPlaylistLabel}>Description</Text>
                    <TextInput
                        editable={!isSaving}
                        multiline
                        onChangeText={setDescription}
                        placeholder="Optional description"
                        placeholderTextColor={colors.muted}
                        style={[styles.editPlaylistInput, styles.editPlaylistTextArea]}
                        value={description}
                    />
                    {supportsPublic ? (
                        <View style={styles.editPlaylistSwitchRow}>
                            <Text style={styles.editPlaylistLabel}>Public</Text>
                            <Switch
                                disabled={isSaving}
                                onValueChange={setIsPublic}
                                thumbColor={colors.text}
                                trackColor={{ false: colors.border, true: colors.accent }}
                                value={isPublic}
                            />
                        </View>
                    ) : null}
                    <Pressable
                        accessibilityRole="button"
                        disabled={isSaving}
                        onPress={() => {
                            onClose();
                            onManageTracks();
                        }}
                        style={styles.editPlaylistSecondaryAction}
                    >
                        <Text style={styles.editPlaylistSecondaryActionText}>Manage tracks</Text>
                    </Pressable>
                    <View style={styles.editPlaylistActions}>
                        <Pressable
                            accessibilityRole="button"
                            disabled={isSaving}
                            onPress={handleDelete}
                            style={styles.editPlaylistDangerButton}
                        >
                            <Text style={styles.editPlaylistDangerButtonText}>Delete</Text>
                        </Pressable>
                        <View style={styles.editPlaylistFooterRow}>
                            <Pressable
                                accessibilityRole="button"
                                disabled={isSaving}
                                onPress={onClose}
                                style={styles.editPlaylistGhostButton}
                            >
                                <Text style={styles.editPlaylistGhostButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                disabled={isSaving}
                                onPress={() => void handleSave()}
                                style={styles.editPlaylistSaveButton}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color={colors.background} />
                                ) : (
                                    <Text style={styles.editPlaylistSaveButtonText}>Save</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export const removeSelectedPlaylistTracks = async ({
    authentication,
    detail,
    selectedTrackIds,
}: {
    authentication: ServerAuthenticationResult;
    detail: MobileMediaDetail;
    selectedTrackIds: Set<string>;
}) => {
    const remaining = detail.tracks
        .map((track) => track.id)
        .filter((id) => id && !selectedTrackIds.has(id));

    await replaceMobilePlaylistTracks({
        authentication,
        playlistId: detail.id,
        trackIds: remaining,
    });
};
