import { MobileHomeItemType } from '@samo/core/mobile';
import { memo, useCallback, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

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
import { TvPressable } from './TvControls';
import { tvStyles as s } from './tv-styles';

/** The lift a focused cover gets: enough to read from the sofa, not a jump. */
const FOCUS_SCALE = 1.08;
const FOCUS_MS = 140;

/**
 * A cover that rises when focused. Driven natively — the scale never waits on
 * the JS thread, so the D-pad feels the same however busy the app is.
 */
const useFocusLift = () => {
    const scale = useRef(new Animated.Value(1)).current;
    const onFocusChange = useCallback(
        (focused: boolean) => {
            Animated.timing(scale, {
                duration: FOCUS_MS,
                easing: Easing.out(Easing.cubic),
                toValue: focused ? FOCUS_SCALE : 1,
                useNativeDriver: true,
            }).start();
        },
        [scale],
    );
    return { liftStyle: { transform: [{ scale }] }, onFocusChange };
};

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
    variant,
}: {
    allowRemoveFromHome?: boolean;
    focusId: string;
    item: AndroidRecentContentSourceItem;
    variant: HomeDisplaySection['variant'];
}) {
    const { liftStyle, onFocusChange } = useFocusLift();
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
            style={isWide ? s.tileWide : s.tile}
        >
            {(focused) => (
                <>
                    <Animated.View style={liftStyle}>
                        <ArtworkImage
                            artworkImageId={item.artworkImageId}
                            contentSource={item.source}
                            letter={item.title.slice(0, 1)}
                            style={[s.tileArt, isWide && s.tileArtWide, isArtist && s.tileArtRound]}
                            uri={item.artworkUrl}
                        />
                        {focused ? (
                            <View
                                pointerEvents="none"
                                style={[s.tileRing, isArtist && s.tileRingRound]}
                            />
                        ) : null}
                    </Animated.View>
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
    const { liftStyle, onFocusChange } = useFocusLift();
    return (
        <TvPressable
            id={focusId}
            label={`View all ${section.title}`}
            onFocusChange={onFocusChange}
            onPress={() => handleOpenViewAll(section)}
            style={s.tile}
        >
            {(focused) => (
                <Animated.View style={liftStyle}>
                    <View style={s.viewAllArt}>
                        <Text style={s.viewAllText}>View All</Text>
                        <ChevronRightGlyph color={colors.muted} />
                    </View>
                    {focused ? <View pointerEvents="none" style={s.tileRing} /> : null}
                </Animated.View>
            )}
        </TvPressable>
    );
});
