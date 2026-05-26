import { type MobileContentSource } from '@samo/core/mobile';

import { ArtworkImage } from './ArtworkImage';
import { styles } from '../theme/styles';
import { type LibraryMediaType } from '../types/library-display';

export const MediaArtwork = ({
    artworkImageId,
    artworkUrl,
    contentSource,
    mediaType,
    size,
    title,
}: {
    artworkImageId?: string;
    artworkUrl?: string;
    contentSource?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    mediaType: LibraryMediaType;
    size: 'card' | 'hero' | 'row';
    title: string;
}) => {
    const artworkStyle =
        size === 'hero'
            ? styles.radioHeroArtwork
            : size === 'card'
              ? styles.radioCardArtwork
              : styles.libraryRowArtwork;
    const fallbackStyle =
        size === 'hero'
            ? styles.radioHeroArtworkFallback
            : size === 'card'
              ? styles.radioCardArtworkFallback
              : styles.libraryRowArtworkFallback;
    const shouldRound = mediaType === 'artists';

    return (
        <ArtworkImage
            artworkImageId={artworkImageId}
            contentSource={contentSource}
            fallbackStyle={[fallbackStyle, shouldRound && styles.libraryArtworkRound]}
            letter={title.slice(0, 1)}
            style={[artworkStyle, shouldRound && styles.libraryArtworkRound]}
            uri={artworkUrl}
        />
    );
};
