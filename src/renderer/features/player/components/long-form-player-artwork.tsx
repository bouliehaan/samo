import clsx from 'clsx';
import { memo } from 'react';

import {
    isSamoBackedLibraryItem,
    useLongFormMediaServer,
} from '/@/renderer/api/samo/samo-long-form';
import { AbsCoverImage } from '/@/renderer/features/search/components/abs-cover-image';
import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

const absCoverUrl = (
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
): string | undefined => {
    if (!item.id || !server.url || !server.credential) return undefined;
    const base = server.url.replace(/\/+$/, '');
    return `${base}/api/items/${item.id}/cover?token=${encodeURIComponent(server.credential)}`;
};

export const LongFormPlayerArtwork = memo(
    ({
        alt,
        className,
        fallbackIcon,
        item,
        server,
    }: {
        alt: string;
        className?: string;
        fallbackIcon: 'metadata' | 'microphone';
        item: AudiobookshelfLibraryItem | null | undefined;
        server: ServerListItemWithCredential | null | undefined;
    }) => {
        const longFormServer = useLongFormMediaServer();
        const activeServer = server ?? longFormServer;

        if (!item || !activeServer) {
            return null;
        }

        if (isSamoBackedLibraryItem(item)) {
            return (
                <AbsCoverImage
                    alt={alt}
                    fallbackIcon={fallbackIcon}
                    imageUrl={item.media?.metadata?.imageUrl}
                    itemId={item.id}
                />
            );
        }

        const coverUrl = absCoverUrl(activeServer, item);

        if (!coverUrl) {
            return null;
        }

        return (
            <img
                alt={alt}
                className={clsx(className)}
                src={coverUrl}
            />
        );
    },
);

LongFormPlayerArtwork.displayName = 'LongFormPlayerArtwork';

/** Warm ABS cover cache when playback starts (no-op for Samo). */
export const prefetchLongFormCover = (
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
) => {
    if (isSamoBackedLibraryItem(item)) return;
    void audiobookshelfController.getItemCoverDataUrl(server, item.id).catch(() => undefined);
};
