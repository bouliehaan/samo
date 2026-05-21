import { openContextModal } from '@mantine/modals';
import i18n from '/@/i18n/i18n';
import { getActiveMusicServer, useAuthStore } from '/@/renderer/store';
import { hasFeature } from '/@/shared/api/utils';
import { ServerFeature } from '/@/shared/types/features-types';
export const openUpdatePlaylistModal = async (args) => {
    const { playlist } = args;
    const server = getActiveMusicServer(useAuthStore.getState());
    const hasImageUpload = hasFeature(server, ServerFeature.PLAYLIST_IMAGE_UPLOAD);
    openContextModal({
        innerProps: {
            body: {
                comment: playlist?.description || undefined,
                genres: playlist?.genres,
                name: playlist?.name,
                ownerId: playlist?.ownerId || undefined,
                public: playlist?.public || false,
                queryBuilderRules: playlist?.rules || undefined,
                sync: playlist?.sync || undefined,
            },
            playlistImage: {
                imageId: playlist.imageId,
                imageUrl: playlist.imageUrl,
                uploadedImage: playlist.uploadedImage,
            },
            query: { id: playlist?.id },
        },
        modal: 'updatePlaylist',
        size: hasImageUpload ? 'lg' : 'md',
        title: i18n.t('form.editPlaylist.title', { postProcess: 'titleCase' }),
    });
};
