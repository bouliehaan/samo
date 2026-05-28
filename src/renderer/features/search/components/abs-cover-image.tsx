import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { isSamoLongFormServer, useLongFormMediaServer } from '/@/renderer/api/samo/samo-long-form';
import {
    buildSamoAuthenticatedImageRequest,
    isSamoApiMediaUrl,
    ServerType,
} from '@samo/core/server';
import { BaseImage } from '/@/shared/components/image/image';
import { Icon } from '/@/shared/components/icon/icon';

const COVER_STALE_TIME_MS = 1000 * 60 * 60;
const COVER_GC_TIME_MS = 1000 * 60 * 60;

interface AbsCoverImageProps {
    alt: string;
    fallbackIcon: 'metadata' | 'microphone';
    imageUrl?: string;
    itemId: string;
}

/**
 * Cover-art image for long-form media. Uses Audiobookshelf cover IPC when
 * available, otherwise authenticated Samo artwork URLs from the server.
 */
export const AbsCoverImage = ({ alt, fallbackIcon, imageUrl, itemId }: AbsCoverImageProps) => {
    const server = useLongFormMediaServer();
    const isSamo = isSamoLongFormServer(server);

    const coverQuery = useQuery({
        enabled: Boolean(server?.id && itemId && !isSamo),
        gcTime: COVER_GC_TIME_MS,
        queryFn: async () => {
            try {
                const dataUrl = await audiobookshelfController.getItemCoverDataUrl(server!, itemId);
                return dataUrl ?? null;
            } catch {
                return null;
            }
        },
        queryKey: ['audiobookshelf', 'cover', server?.id, itemId],
        retry: false,
        staleTime: COVER_STALE_TIME_MS,
    });

    const samoImageRequest = useMemo(() => {
        if (!isSamo || !server?.url?.trim() || !imageUrl || !isSamoApiMediaUrl(imageUrl)) {
            return undefined;
        }

        return buildSamoAuthenticatedImageRequest(
            {
                credential: server.credential,
                ndCredential: server.ndCredential,
                type: ServerType.SAMO,
                url: server.url,
            },
            imageUrl,
            ['samo', server.id, 'long-form-cover', itemId].join(':'),
        );
    }, [imageUrl, isSamo, itemId, server]);

    const coverSrc = isSamo ? imageUrl : (coverQuery.data ?? undefined);

    if (coverSrc || samoImageRequest) {
        return (
            <BaseImage
                alt={alt}
                imageRequest={samoImageRequest}
                includeLoader={false}
                src={coverSrc}
                style={{
                    display: 'block',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    width: '100%',
                }}
            />
        );
    }

    return <Icon icon={fallbackIcon} size="lg" />;
};
