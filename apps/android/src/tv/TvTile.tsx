import { MobileHomeItemType } from '@samo/core/mobile';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { ArtworkImage } from '../components/ArtworkImage';
import { ChevronRightGlyph } from '../components/Glyphs';
import { handleOpenViewAll } from '../handlers/media-detail-handlers';
import { mediaContextMenuApi } from '../hooks/use-android-context-menu';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { getHomeItemSubtitle } from '../screens/home/shared';
import { colors } from '../theme/tokens';
import { type HomeDisplaySection } from '../types/home';
import { getContentItemProgress } from '../utils/home-display';
import { selectTvItem } from './tv-actions';
import { type TvFocusPin, TvPressable } from './TvControls';
import { tvFocus, tvStyles as s } from './tv-styles';

const END_OF_ROW: TvFocusPin = { right: true };

/** Whether a row of this kind is cards (art beside text) rather than covers. */
export const isTvWideVariant = (variant: HomeDisplaySection['variant']): boolean =>
    variant === 'wide' || variant === 'continue';

/**
 * One item on a shelf or in a grid: the phone's tile, at TV size. OK does what
 * a tap does on the phone; a held OK opens the same long-press menu.
 *
 * Focus is the cover lifting inside a ring, drawn by the tile's native view:
 * nothing here re-renders for it, and nothing beside it moves.
 */
export const TvTile = memo(function TvTile({
    allowRemoveFromHome,
    anchorX,
    anchorY,
    focusId,
    item,
    last = false,
    variant,
}: {
    allowRemoveFromHome?: boolean;
    /** Where focus puts this tile in its row, and its row on the page. */
    anchorX?: number;
    anchorY?: number;
    focusId: string;
    item: AndroidRecentContentSourceItem;
    /** The end of its row: Right stops here rather than finding a cover in
     *  another row further over. */
    last?: boolean;
    variant: HomeDisplaySection['variant'];
}) {
    const isWide = isTvWideVariant(variant);
    const isArtist = item.type === MobileHomeItemType.ARTIST;
    const centered = isArtist || variant === 'radio';
    const subtitle = getHomeItemSubtitle(item, variant);
    const progress =
        variant === 'continue' || variant === 'podcast-feed' || variant === 'book'
            ? getContentItemProgress(item)
            : undefined;
    return (
        <TvPressable
            anchorX={anchorX}
            anchorY={anchorY}
            id={focusId}
            label={subtitle ? `${item.title}, ${subtitle}` : item.title}
            look={isWide ? tvFocus.card : isArtist ? tvFocus.tileRound : tvFocus.tile}
            onLongPress={() => mediaContextMenuApi.openForItem(item, { allowRemoveFromHome })}
            onPress={() => selectTvItem(item)}
            pin={last ? END_OF_ROW : undefined}
            style={isWide ? s.tileWide : s.tile}
        >
            <ArtworkImage
                artworkImageId={item.artworkImageId}
                contentSource={item.source}
                letter={item.title.slice(0, 1)}
                style={[s.tileArt, isWide && s.tileArtWide, isArtist && s.tileArtRound]}
                uri={item.artworkUrl}
                width={isWide ? s.tileArtWide.width : s.tileArt.width}
            />
            <View style={isWide ? s.tileTextWide : s.tileText}>
                <Text numberOfLines={isWide ? 2 : 1} style={[s.tileTitle, centered && s.centered]}>
                    {item.title}
                </Text>
                {subtitle ? (
                    <Text numberOfLines={1} style={[s.tileSubtitle, centered && s.centered]}>
                        {subtitle}
                    </Text>
                ) : null}
                {progress !== undefined ? (
                    <View style={s.tileProgressTrack}>
                        <View style={[s.tileProgressFill, { width: `${progress * 100}%` }]} />
                    </View>
                ) : null}
            </View>
        </TvPressable>
    );
});

/** The last tile of a shelf that has more behind it: the phone's "View All". */
export const TvViewAllTile = memo(function TvViewAllTile({
    anchorX,
    anchorY,
    focusId,
    section,
}: {
    anchorX?: number;
    anchorY?: number;
    focusId: string;
    section: HomeDisplaySection;
}) {
    return (
        <TvPressable
            anchorX={anchorX}
            anchorY={anchorY}
            id={focusId}
            label={`View all ${section.title}`}
            look={tvFocus.tile}
            onPress={() => handleOpenViewAll(section)}
            pin={END_OF_ROW}
            style={s.tile}
        >
            <View style={s.viewAllArt}>
                <View style={s.viewAllChevron}>
                    <ChevronRightGlyph color={colors.text} size={20} />
                </View>
                <Text style={s.viewAllText}>View all</Text>
            </View>
        </TvPressable>
    );
});
