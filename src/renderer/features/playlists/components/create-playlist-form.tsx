import { t } from 'i18next';
import { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useCreatePlaylist } from '/@/renderer/features/playlists/mutations/create-playlist-mutation';
import { useCurrentServer } from '/@/renderer/store';
import { Group } from '/@/shared/components/group/group';
import { closeAllModals, openModal } from '/@/shared/components/modal/modal';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
import { CreatePlaylistBody, ServerListItem } from '/@/shared/types/domain-types';

interface CreatePlaylistFormProps {
    onCancel: () => void;
}

export const CreatePlaylistForm = ({ onCancel }: CreatePlaylistFormProps) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const mutation = useCreatePlaylist({});

    const form = useForm<CreatePlaylistBody>({
        initialValues: {
            comment: '',
            name: '',
        },
    });

    const handleSubmit = form.onSubmit((values) => {
        if (!server) return;

        mutation.mutate(
            {
                apiClientProps: { serverId: server.id },
                body: values,
            },
            {
                onError: (err) => {
                    toast.error({
                        message: err.message,
                        title: t('error.genericError', { postProcess: 'sentenceCase' }),
                    });
                },
                onSuccess: () => {
                    toast.success({
                        message: t('form.createPlaylist.success', { postProcess: 'sentenceCase' }),
                    });
                    onCancel();
                },
            },
        );
    });

    const isSubmitDisabled = !form.values.name || mutation.isPending;

    return (
        <form onSubmit={handleSubmit}>
            <Stack>
                <TextInput
                    data-autofocus
                    label={t('form.createPlaylist.input', {
                        context: 'name',
                        postProcess: 'titleCase',
                    })}
                    required
                    {...form.getInputProps('name')}
                />
                <Group>
                    <Switch
                        label={t('form.createPlaylist.input', {
                            context: 'public',
                            postProcess: 'titleCase',
                        })}
                        {...form.getInputProps('public', {
                            type: 'checkbox',
                        })}
                    />
                </Group>

                <Group justify="flex-end">
                    <ModalButton onClick={onCancel} px="2xl" uppercase variant="subtle">
                        {t('common.cancel')}
                    </ModalButton>
                    <ModalButton
                        disabled={isSubmitDisabled}
                        loading={mutation.isPending}
                        type="submit"
                        variant="filled"
                    >
                        {t('common.create')}
                    </ModalButton>
                </Group>
            </Stack>
        </form>
    );
};

export const openCreatePlaylistModal = (
    _server?: ServerListItem,
    e?: MouseEvent<HTMLButtonElement>,
) => {
    e?.stopPropagation();

    openModal({
        children: <CreatePlaylistForm onCancel={() => closeAllModals()} />,
        size: 'sm',
        title: t('form.createPlaylist.title', { postProcess: 'titleCase' }),
    });
};
