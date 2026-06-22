import { memo } from 'react';

import { LongFormCoverImage } from '/@/renderer/features/player/components/long-form-cover-image';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

export const LongFormPlayerArtwork = memo(
    ({
        alt,
        className,
        item,
    }: {
        alt: string;
        className?: string;
        item: LongFormLibraryItem | null | undefined;
        // Accepted for call-site symmetry; the cover server is resolved internally.
        server?: null | ServerListItemWithCredential;
    }) => {
        if (!item) {
            return null;
        }

        const fallbackIcon = item.mediaType === 'podcast' ? 'microphone' : 'metadata';

        return (
            <LongFormCoverImage
                alt={alt}
                className={className}
                fallbackIcon={fallbackIcon}
                imageUrl={item.media?.metadata?.imageUrl}
                itemId={item.id}
            />
        );
    },
);

LongFormPlayerArtwork.displayName = 'LongFormPlayerArtwork';
