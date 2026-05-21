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
export declare const AbsCoverImage: ({ alt, fallbackIcon, itemId }: AbsCoverImageProps) => import("react/jsx-runtime").JSX.Element;
export {};
