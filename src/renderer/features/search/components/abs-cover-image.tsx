import { useQuery } from '@tanstack/react-query';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { useAudiobookshelfServer } from '/@/renderer/store';
import { Icon } from '/@/shared/components/icon/icon';

const COVER_STALE_TIME_MS = 1000 * 60 * 60;
const COVER_GC_TIME_MS = 1000 * 60 * 60;

interface AbsCoverImageProps {
    alt: string;
    fallbackIcon: 'metadata' | 'microphone';
    itemId: string;
}

/**
 * Cover-art image for an Audiobookshelf item, sourced via the existing
 * cover IPC. Reuses the same React Query key (`['audiobookshelf', 'cover',
 * server.id, item.id]`) as the audiobooks/podcasts list pages so cached
 * data-URLs are shared across surfaces. Falls back to an icon when the
 * server returns 404 / empty.
 */
export const AbsCoverImage = ({ alt, fallbackIcon, itemId }: AbsCoverImageProps) => {
    const server = useAudiobookshelfServer();

    const coverQuery = useQuery({
        enabled: Boolean(server?.id && itemId),
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

    if (coverQuery.data) {
        return (
            <img
                alt={alt}
                loading="lazy"
                src={coverQuery.data}
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
