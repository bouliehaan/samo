import {
    buildSamoAuthenticatedImageRequest,
    isSamoApiMediaUrl,
    ServerType,
} from '@samo/core/server';
import { useMemo } from 'react';

import { useLongFormMediaServer } from '/@/renderer/store';
import { Icon } from '/@/shared/components/icon/icon';
import { BaseImage } from '/@/shared/components/image/image';

interface LongFormCoverImageProps {
    alt: string;
    className?: string;
    fallbackIcon: 'metadata' | 'microphone';
    imageUrl?: string;
    itemId: string;
    /**
     * Rendered width of the slot. Without it the server has no way to know a
     * 1400px cover is headed for a 178px card, and sends the whole thing.
     */
    width?: number;
}

/**
 * Cover-art image for Samo long-form media (audiobooks + podcasts).
 * Artwork is authenticated by the bearer the main process attaches, so the URL
 * itself stays clean and cacheable; falls back to an icon when there is no art.
 */
export const LongFormCoverImage = ({
    alt,
    className,
    fallbackIcon,
    imageUrl,
    itemId,
    width,
}: LongFormCoverImageProps) => {
    const server = useLongFormMediaServer();

    const samoImageRequest = useMemo(() => {
        if (!server?.url?.trim() || !imageUrl || !isSamoApiMediaUrl(imageUrl)) {
            return undefined;
        }

        return buildSamoAuthenticatedImageRequest(
            {
                credential: server.credential,
                type: ServerType.SAMO,
                url: server.url,
            },
            imageUrl,
            ['samo', server.id, 'long-form-cover', itemId, width ?? ''].join(':'),
            width,
        );
    }, [imageUrl, itemId, server, width]);

    if (imageUrl || samoImageRequest) {
        return (
            <BaseImage
                alt={alt}
                className={className}
                imageRequest={samoImageRequest}
                includeLoader={false}
                src={imageUrl}
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
