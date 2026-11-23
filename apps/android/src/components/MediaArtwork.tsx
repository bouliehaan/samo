import { type MobileContentSource } from '@samo/core/mobile';

import { ArtworkImage } from './ArtworkImage';
import { HOME_EDGE_PADDING, SCREEN_WIDTH } from '../theme/layout';
import { styles } from '../theme/styles';
import { type LibraryMediaType } from '../types/library-display';

/** `styles.radioCard`'s 48.5% of the radio page's padded width. */
const RADIO_CARD_WIDTH = (SCREEN_WIDTH - HOME_EDGE_PADDING * 2) * 0.485;

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
    const width =
        size === 'hero'
            ? styles.radioHeroArtwork.width
            : size === 'card'
              ? RADIO_CARD_WIDTH
              : styles.libraryRowArtwork.width;
    const shouldRound = mediaType === 'artists';

    return (
        <ArtworkImage
            artworkImageId={artworkImageId}
            contentSource={contentSource}
            fallbackStyle={[fallbackStyle, shouldRound && styles.libraryArtworkRound]}
            letter={title.slice(0, 1)}
            style={[artworkStyle, shouldRound && styles.libraryArtworkRound]}
            uri={artworkUrl}
            width={width}
        />
    );
};
