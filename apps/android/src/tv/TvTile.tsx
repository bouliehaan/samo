import { MobileHomeItemType } from '@samo/core/mobile';
import { memo, useCallback, useRef } from 'react';
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
import { tvStyles as s } from './tv-styles';

/**
 * Keep focus feedback on the artwork itself. A transformed tile changes its
 * hit geometry and is clipped at shelf edges on inexpensive TV hardware;
 * the phone app's quiet border is clearer and does not make neighboring art
 * jump when the D-pad moves.
 */
const useFocusLift = (onFocus?: () => void) => {
    const onFocusChange = useCallback(
        (focused: boolean) => {
            if (focused) onFocus?.();
        },
        [onFocus],
    );
    return { onFocusChange };
};

const END_OF_ROW: TvFocusPin = { right: true };

const openMenuFor = (item: AndroidRecentContentSourceItem, allowRemoveFromHome?: boolean) =>
    mediaContextMenuApi.openForItem(item, { allowRemoveFromHome });

/**
 * One item on a shelf or in a grid: the phone's tile, at TV size. OK does what
 * a tap does on the phone; a held OK opens the same long-press menu.
 */
export const TvTile = memo(function TvTile({
    allowRemoveFromHome,
    focusId,
    item,
    last = false,
    onFocus,
    variant,
}: {
    allowRemoveFromHome?: boolean;
    focusId: string;
    item: AndroidRecentContentSourceItem;
    /** The end of its row: Right stops here rather than finding a cover in
     *  another row further over. */
    last?: boolean;
    /** Beyond the lift: what focus arriving here should also do. */
    onFocus?: () => void;
    variant: HomeDisplaySection['variant'];
}) {
    const { onFocusChange } = useFocusLift(onFocus);
    const isWide = variant === 'wide' || variant === 'continue';
    const isArtist = item.type === MobileHomeItemType.ARTIST;
    const isRadio = variant === 'radio';
    const centered = isArtist || isRadio;
    const subtitle = getHomeItemSubtitle(item, variant);
    const progress =
        variant === 'continue' || variant === 'podcast-feed' || variant === 'book'
            ? getContentItemProgress(item)
            : undefined;
    return (
        <TvPressable
            id={focusId}
            label={subtitle ? `${item.title}, ${subtitle}` : item.title}
            onFocusChange={onFocusChange}
            onLongPress={() => openMenuFor(item, allowRemoveFromHome)}
            onPress={() => selectTvItem(item)}
            pin={last ? END_OF_ROW : undefined}
            style={isWide ? s.tileWide : s.tile}
            focusedStyle={isWide ? s.tileWideFocused : undefined}
        >
            {(focused) => (
                <>
                    <ArtworkImage
                        artworkImageId={item.artworkImageId}
                        contentSource={item.source}
                        letter={item.title.slice(0, 1)}
                        style={[
                            s.tileArt,
                            isWide && s.tileArtWide,
                            isArtist && s.tileArtRound,
                            focused && s.tileArtFocused,
                        ]}
                        uri={item.artworkUrl}
                    />
                    <View style={[s.tileMeta, isWide ? s.tileTextWide : s.tileText]}>
                        <View style={s.tileMetaText}>
                            <Text
                                numberOfLines={isWide ? 2 : 1}
                                style={[
                                    s.tileTitle,
                                    centered && s.centered,
                                    focused && s.tileTitleFocused,
                                ]}
                            >
                                {item.title}
                            </Text>
                            {subtitle ? (
                                <Text
                                    numberOfLines={isWide ? 2 : 1}
                                    style={[s.tileSubtitle, centered && s.centered]}
                                >
                                    {subtitle}
                                </Text>
                            ) : null}
                            {progress !== undefined ? (
                                <View style={s.tileProgressTrack}>
                                    <View
                                        style={[
                                            s.tileProgressFill,
                                            { width: `${progress * 100}%` },
                                        ]}
                                    />
                                </View>
                            ) : null}
                        </View>
                    </View>
                </>
            )}
        </TvPressable>
    );
});

/** The last tile of a shelf that has more behind it: the phone's "View All". */
export const TvViewAllTile = memo(function TvViewAllTile({
    focusId,
    section,
}: {
    focusId: string;
    section: HomeDisplaySection;
}) {
    const { onFocusChange } = useFocusLift();
    return (
        <TvPressable
            id={focusId}
            label={`View all ${section.title}`}
            onFocusChange={onFocusChange}
            onPress={() => handleOpenViewAll(section)}
            pin={END_OF_ROW}
            style={s.tile}
        >
            {(focused) => (
                <View style={[s.viewAllArt, focused && s.viewAllArtFocused]}>
                    <Text style={s.viewAllText}>View All</Text>
                    <ChevronRightGlyph color={focused ? colors.text : colors.muted} />
                </View>
            )}
        </TvPressable>
    );
});
