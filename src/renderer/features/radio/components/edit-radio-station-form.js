import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { useDeleteInternetRadioStationImage } from '/@/renderer/features/radio/mutations/delete-internet-radio-station-image-mutation';
import { useUpdateRadioStation } from '/@/renderer/features/radio/mutations/update-radio-station-mutation';
import { useUploadInternetRadioStationImage } from '/@/renderer/features/radio/mutations/upload-internet-radio-station-image-mutation';
import { useCurrentServer } from '/@/renderer/store';
import { logFn } from '/@/renderer/utils/logger';
import { logMsg } from '/@/renderer/utils/logger-message';
import { hasFeature } from '/@/shared/api/utils';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { DragDropZone } from '/@/shared/components/drag-drop-zone/drag-drop-zone';
import { FileButton } from '/@/shared/components/file-button/file-button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { closeAllModals, openModal } from '/@/shared/components/modal/modal';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { ServerFeature } from '/@/shared/types/features-types';
export const EditRadioStationForm = ({ onCancel, station }) => {
    const { t } = useTranslation();
    const updateMutation = useUpdateRadioStation({});
    const uploadImageMutation = useUploadInternetRadioStationImage({});
    const deleteImageMutation = useDeleteInternetRadioStationImage({});
    const server = useCurrentServer();
    const isCoverImageDisplayed = hasFeature(server, ServerFeature.INTERNET_RADIO_IMAGE_UPLOAD);
    const stationImage = {
        imageId: station.imageId ?? null,
        imageUrl: station.imageUrl ?? null,
        uploadedImage: station.uploadedImage ?? undefined,
    };
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
            homepageUrl: station.homepageUrl || '',
            name: station.name,
            streamUrl: station.streamUrl,
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
                query: { id: station.id },
            });
            if (pendingFile) {
                const buffer = await pendingFile.arrayBuffer();
                await uploadImageMutation.mutateAsync({
                    apiClientProps: { serverId: server.id },
                    body: { image: new Uint8Array(buffer) },
                    query: { id: station.id },
                });
            }
            else if (removeCustomCover && stationImage.uploadedImage) {
                await deleteImageMutation.mutateAsync({
                    apiClientProps: { serverId: server.id },
                    query: { id: station.id },
                });
            }
            toast.success({
                message: t('form.editRadioStation.success', {
                    postProcess: 'sentenceCase',
                }),
            });
            closeAllModals();
        }
        catch (err) {
            logFn.error(logMsg.other.error, {
                meta: { error: err },
            });
            toast.error({
                message: err?.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        }
        finally {
            setIsSaving(false);
        }
    });
    const isSubmitDisabled = !form.values.name || !form.values.streamUrl || isSaving;
    const hadUploadedCover = !!stationImage.uploadedImage;
    const fieldNodes = [
        _jsx(TextInput, { "data-autofocus": true, label: t('form.createRadioStation.input', {
                context: 'name',
                postProcess: 'titleCase',
            }), required: true, ...form.getInputProps('name') }, "name"),
        _jsx(TextInput, { label: t('form.createRadioStation.input', {
                context: 'streamUrl',
                postProcess: 'titleCase',
            }), required: true, ...form.getInputProps('streamUrl') }, "streamUrl"),
        _jsx(TextInput, { label: t('form.createRadioStation.input', {
                context: 'homepageUrl',
                postProcess: 'titleCase',
            }), ...form.getInputProps('homepageUrl') }, "homepageUrl"),
        _jsxs(Group, { justify: "flex-end", children: [_jsx(ModalButton, { disabled: isSaving, onClick: onCancel, children: t('common.cancel') }), _jsx(ModalButton, { disabled: isSubmitDisabled, loading: isSaving, type: "submit", variant: "filled", children: t('common.save') })] }, "actions"),
    ];
    return (_jsx("form", { onSubmit: handleSubmit, children: isCoverImageDisplayed && server?.id ? (_jsxs(Flex, { align: "flex-start", gap: "lg", wrap: "wrap", children: [_jsx(RadioStationCoverField, { hadUploadedCover: hadUploadedCover, onClearPending: () => setPendingFile(null), onFileSelect: (file) => {
                        if (!file)
                            return;
                        setRemoveCustomCover(false);
                        setPendingFile(file);
                    }, onToggleRemoveCover: () => setRemoveCustomCover((v) => !v), pendingFile: pendingFile, pendingPreviewUrl: pendingPreviewUrl, removeCustomCover: removeCustomCover, stationImage: stationImage }), _jsx(Stack, { gap: "md", style: { flex: '1 1 220px', minWidth: 0 }, children: fieldNodes })] })) : (_jsx(Stack, { gap: "md", children: fieldNodes })) }));
};
const COVER_SIZE = 240;
function RadioStationCoverField({ hadUploadedCover, onClearPending, onFileSelect, onToggleRemoveCover, pendingFile, pendingPreviewUrl, removeCustomCover, stationImage, }) {
    const server = useCurrentServer();
    const showServerCover = !pendingPreviewUrl && !removeCustomCover;
    const previewId = showServerCover ? stationImage.imageId || undefined : undefined;
    const previewSrc = pendingPreviewUrl || (showServerCover ? stationImage.imageUrl || '' : '');
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
            }, children: [_jsx(ItemImage, { enableViewport: false, id: previewId, itemType: LibraryItem.RADIO_STATION, serverId: server?.id, src: previewSrc, type: "header" }), _jsx(Group, { gap: 4, style: {
                        background: 'rgba(0, 0, 0, 0.55)',
                        bottom: 6,
                        padding: 4,
                        pointerEvents: 'none',
                        position: 'absolute',
                        right: 6,
                        zIndex: 2,
                    }, wrap: "nowrap", children: iconControls })] }) }));
}
export const openEditRadioStationModal = (station, server, e) => {
    e?.stopPropagation();
    if (!server) {
        toast.error({
            message: t('common.error.noServer', { postProcess: 'sentenceCase' }),
        });
        return;
    }
    const hasImageUpload = hasFeature(server, ServerFeature.INTERNET_RADIO_IMAGE_UPLOAD);
    openModal({
        children: _jsx(EditRadioStationForm, { onCancel: closeAllModals, station: station }),
        size: hasImageUpload ? 'lg' : 'md',
        title: t('common.edit', { postProcess: 'titleCase' }),
    });
};
