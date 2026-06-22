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
}

/**
 * Cover-art image for Samo long-form media (audiobooks + podcasts).
 * Authenticated Samo artwork URLs are loaded through an image request so the
 * stream token never leaks into the DOM; falls back to an icon when no art.
 */
export const LongFormCoverImage = ({
    alt,
    className,
    fallbackIcon,
    imageUrl,
    itemId,
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
            ['samo', server.id, 'long-form-cover', itemId].join(':'),
        );
    }, [imageUrl, itemId, server]);

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
