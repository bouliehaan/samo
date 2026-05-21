import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { closeModal } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { useDeletePlaylistImage } from '/@/renderer/features/playlists/mutations/delete-playlist-image-mutation';
import { useUpdatePlaylist } from '/@/renderer/features/playlists/mutations/update-playlist-mutation';
import { useUploadPlaylistImage } from '/@/renderer/features/playlists/mutations/upload-playlist-image-mutation';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { useCurrentServer, useCurrentServerId, usePermissions } from '/@/renderer/store';
import { hasFeature } from '/@/shared/api/utils';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { DragDropZone } from '/@/shared/components/drag-drop-zone/drag-drop-zone';
import { FileButton } from '/@/shared/components/file-button/file-button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Select } from '/@/shared/components/select/select';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Textarea } from '/@/shared/components/textarea/textarea';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
import { LibraryItem, ServerType, SortOrder, UserListSort, } from '/@/shared/types/domain-types';
import { ServerFeature } from '/@/shared/types/features-types';
export const UpdatePlaylistContextModal = ({ id, innerProps, }) => {
    const { t } = useTranslation();
    const updateMutation = useUpdatePlaylist({});
    const uploadImageMutation = useUploadPlaylistImage({});
    const deleteImageMutation = useDeletePlaylistImage({});
    const server = useCurrentServer();
    const { body, playlistImage, query } = innerProps;
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
    const [removeCustomCover, setRemoveCustomCover] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
        if (!pendingFile) {
            setPendingPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(pendingFile);
        setPendingPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [pendingFile]);
    const form = useForm({
        initialValues: {
            comment: body?.comment || '',
            name: body?.name || '',
            ownerId: body.ownerId,
            public: body.public,
            queryBuilderRules: body.queryBuilderRules,
            sync: body.sync,
        },
    });
    const handleSubmit = form.onSubmit(async (values) => {
        if (!server?.id)
            return;
        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                apiClientProps: { serverId: server.id },
                body: values,
                query,
            });
            if (pendingFile) {
                const buffer = await pendingFile.arrayBuffer();
                await uploadImageMutation.mutateAsync({
                    apiClientProps: { serverId: server.id },
                    body: { image: new Uint8Array(buffer) },
                    query: { id: query.id },
                });
            }
            else if (removeCustomCover && playlistImage?.uploadedImage) {
                await deleteImageMutation.mutateAsync({
                    apiClientProps: { serverId: server.id },
                    query: { id: query.id },
                });
            }
            toast.success({
                message: t('form.editPlaylist.success', { postProcess: 'sentenceCase' }),
            });
            closeModal(id);
        }
        catch (err) {
            toast.error({
                message: err?.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        }
        finally {
            setIsSaving(false);
        }
    });
    const isPublicDisplayed = hasFeature(server, ServerFeature.PUBLIC_PLAYLIST);
    const isOwnerDisplayed = server?.type === ServerType.NAVIDROME;
    const isCommentDisplayed = server?.type === ServerType.NAVIDROME;
    const isCoverImageDisplayed = hasFeature(server, ServerFeature.PLAYLIST_IMAGE_UPLOAD);
    const isSubmitDisabled = !form.values.name || isSaving;
    const hadUploadedCover = !!playlistImage?.uploadedImage;
    const fieldNodes = [
        _jsx(TextInput, { "data-autofocus": true, label: t('form.createPlaylist.input', {
                context: 'name',
                postProcess: 'titleCase',
            }), required: true, ...form.getInputProps('name') }, "name"),
    ];
    if (isCommentDisplayed) {
        fieldNodes.push(_jsx(Textarea, { autosize: true, label: t('form.createPlaylist.input', {
                context: 'description',
                postProcess: 'titleCase',
            }), minRows: 5, ...form.getInputProps('comment') }, "comment"));
    }
    if (isOwnerDisplayed) {
        fieldNodes.push(_jsx(OwnerSelect, { form: form }, "owner"));
    }
    if (isPublicDisplayed) {
        if (server?.type === ServerType.JELLYFIN) {
            fieldNodes.push(_jsx("div", { children: t('form.editPlaylist.publicJellyfinNote', {
                    postProcess: 'sentenceCase',
                }) }, "jellyfin-public-note"));
        }
        fieldNodes.push(_jsx(Switch, { label: t('form.createPlaylist.input', {
                context: 'public',
                postProcess: 'titleCase',
            }), ...form.getInputProps('public', { type: 'checkbox' }) }, "public"));
    }
    fieldNodes.push(_jsxs(Group, { justify: "flex-end", children: [_jsx(ModalButton, { disabled: isSaving, onClick: () => closeModal(id), children: t('common.cancel') }), _jsx(ModalButton, { disabled: isSubmitDisabled, loading: isSaving, type: "submit", variant: "filled", children: t('common.save') })] }, "actions"));
    return (_jsx("form", { onSubmit: handleSubmit, children: isCoverImageDisplayed ? (_jsxs(Flex, { align: "flex-start", gap: "lg", wrap: "wrap", children: [_jsx(PlaylistCoverField, { hadUploadedCover: hadUploadedCover, onClearPending: () => setPendingFile(null), onFileSelect: (file) => {
                        if (!file)
                            return;
                        setRemoveCustomCover(false);
                        setPendingFile(file);
                    }, onToggleRemoveCover: () => setRemoveCustomCover((v) => !v), pendingFile: pendingFile, pendingPreviewUrl: pendingPreviewUrl, playlistImage: playlistImage, removeCustomCover: removeCustomCover }), _jsx(Stack, { gap: "md", style: { flex: '1 1 220px', minWidth: 0 }, children: fieldNodes })] })) : (_jsx(Stack, { gap: "md", children: fieldNodes })) }));
};
const COVER_SIZE = 240;
function PlaylistCoverField({ hadUploadedCover, onClearPending, onFileSelect, onToggleRemoveCover, pendingFile, pendingPreviewUrl, playlistImage, removeCustomCover, }) {
    const server = useCurrentServer();
    const showServerCover = !pendingPreviewUrl && !removeCustomCover;
    const previewId = showServerCover ? playlistImage?.imageId || undefined : undefined;
    const previewSrc = pendingPreviewUrl || (showServerCover ? playlistImage?.imageUrl || '' : '');
    const secondaryAction = () => {
        if (pendingFile) {
            onClearPending();
            return;
        }
        if (hadUploadedCover) {
            onToggleRemoveCover();
        }
    };
    const secondaryDisabled = !pendingFile && !hadUploadedCover;
    const secondaryIcon = pendingFile ? 'x' : removeCustomCover ? 'arrowLeft' : 'delete';
    const iconControls = (_jsxs(_Fragment, { children: [_jsx(FileButton, { accept: "image/*", onChange: onFileSelect, children: (props) => {
                    const { ...triggerRest } = props;
                    return (_jsx(ActionIcon, { icon: "uploadImage", iconProps: { size: 'lg' }, radius: "xl", size: "sm", variant: "default", ...triggerRest, style: { pointerEvents: 'auto' } }));
                } }), _jsx(ActionIcon, { disabled: secondaryDisabled, icon: secondaryIcon, iconProps: { size: 'lg' }, onClick: secondaryAction, radius: "xl", size: "sm", style: { pointerEvents: 'auto' }, variant: "default" })] }));
    return (_jsx(Box, { style: {
            borderRadius: 'var(--mantine-radius-md)',
            flexShrink: 0,
            height: COVER_SIZE,
            overflow: 'hidden',
            position: 'relative',
            width: COVER_SIZE,
        }, children: _jsxs(DragDropZone, { accept: "image/*", mode: "file", onFileSelected: (file) => onFileSelect(file), style: {
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
            }, children: [_jsx(ItemImage, { enableViewport: false, id: previewId, itemType: LibraryItem.PLAYLIST, serverId: server?.id, src: previewSrc, type: "header" }), _jsx(Group, { gap: 4, style: {
                        background: 'rgba(0, 0, 0, 0.55)',
                        bottom: 6,
                        padding: 4,
                        pointerEvents: 'none',
                        position: 'absolute',
                        right: 6,
                        zIndex: 2,
                    }, wrap: "nowrap", children: iconControls })] }) }));
}
const OwnerSelect = ({ form }) => {
    const serverId = useCurrentServerId();
    const permissions = usePermissions();
    const usersQuery = useQuery(sharedQueries.users({
        options: { enabled: permissions.playlists.editOwner },
        query: { sortBy: UserListSort.NAME, sortOrder: SortOrder.ASC, startIndex: 0 },
        serverId,
    }));
    const userList = usersQuery.data?.items?.map((user) => ({
        label: user.name,
        value: user.id,
    }));
    if (!permissions.playlists.editOwner) {
        return null;
    }
    return (_jsx(Select, { data: usersQuery.isLoading ? [] : userList, disabled: usersQuery.isLoading, ...form.getInputProps('ownerId'), label: t('form.createPlaylist.input', {
            context: 'owner',
            postProcess: 'titleCase',
        }) }));
};
