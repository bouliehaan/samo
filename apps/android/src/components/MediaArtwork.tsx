import { ArtworkImage } from './ArtworkImage';
import { styles } from '../theme/styles';
import { type LibraryMediaType } from '../types/library-display';

export const MediaArtwork = ({
    artworkUrl,
    mediaType,
    size,
    title,
}: {
    artworkUrl?: string;
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
            fallbackStyle={[fallbackStyle, shouldRound && styles.libraryArtworkRound]}
            letter={title.slice(0, 1)}
            style={[artworkStyle, shouldRound && styles.libraryArtworkRound]}
            uri={artworkUrl}
        />
    );
};
