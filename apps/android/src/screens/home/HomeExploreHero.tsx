import { type ServerAuthenticationResult } from '@samo/core/server';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { ArtworkImage } from '../../components/ArtworkImage';
import { ChevronRightGlyph } from '../../components/Glyphs';
import { useMediaContextMenu } from '../../contexts/media-context-menu';
import { type AndroidRecentContentSourceItem } from '../../services/recent-content';
import { styles } from '../../theme/styles';
import { colors } from '../../theme/tokens';
import { androidTrimCaptionFont, getHomeItemSubtitle } from './shared';

/**
 * Blur strength for the backdrop copy of the cover. High enough that no detail
 * of the artwork survives as an image — it reads purely as the card's colour —
 * but not so high that a dark cover flattens to a single tone.
 */
const EXPLORE_HERO_BLUR = 34;

/**
 * Dims the blurred cover to a legible bed, densest on the right where the copy
 * sits so a bright cover can't wash out the title. Diagonal rather than a flat
 * scrim so the card keeps some of the artwork's light in its top-left corner.
 */
const EXPLORE_HERO_SCRIM = [
    'rgba(14, 15, 19, 0.55)',
    'rgba(14, 15, 19, 0.84)',
    'rgba(14, 15, 19, 0.96)',
];
const EXPLORE_HERO_SCRIM_START = { x: 0, y: 0 };
const EXPLORE_HERO_SCRIM_END = { x: 1, y: 1 };

/**
 * The featured card for the server's Explore drop — the one home shelf that is
 * a SINGLE item. It used to render through the generic 320pt "wide" tile
 * inside a horizontal carousel, which left it stranded in the middle of a
 * full-width row with nothing beside it and nowhere to scroll: the shelf read
 * as a layout bug. It is a hero now: it spans the content width, and takes its
 * colour from the drop's own cover.
 */
export const HomeExploreHero = memo(({
    item,
    onPrefetchItem,
    onSelectItem,
    serverConnection,
}: {
    item: AndroidRecentContentSourceItem;
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    serverConnection: ServerAuthenticationResult | null;
}) => {
    const contextMenu = useMediaContextMenu();
    const subtitle = getHomeItemSubtitle(item, 'explo');

    return (
        <Pressable
            accessibilityLabel={`Open ${item.title}`}
            accessibilityRole="button"
            onLongPress={() => contextMenu.openForItem(item, { allowRemoveFromHome: true })}
            onPress={() => onSelectItem(item)}
            onPressIn={() => onPrefetchItem?.(item)}
            style={({ pressed }) => [styles.exploreHero, pressed && styles.exploreHeroPressed]}
            unstable_pressDelay={60}
        >
            <ArtworkImage
                artworkImageId={item.artworkImageId}
                blurRadius={EXPLORE_HERO_BLUR}
                contentSource={item.source}
                // No letter fallback behind the scrim — a cover-less drop just
                // leaves the panel colour, never a giant ghost initial.
                letter=""
                serverConnection={serverConnection}
                style={styles.exploreHeroBackdrop}
                uri={item.artworkUrl}
            />
            <LinearGradient
                colors={EXPLORE_HERO_SCRIM}
                end={EXPLORE_HERO_SCRIM_END}
                pointerEvents="none"
                start={EXPLORE_HERO_SCRIM_START}
                style={styles.exploreHeroScrim}
            />
            <View style={styles.exploreHeroRow}>
                <ArtworkImage
                    artworkImageId={item.artworkImageId}
                    contentSource={item.source}
                    letter={item.title.slice(0, 1)}
                    serverConnection={serverConnection}
                    style={styles.exploreHeroArtwork}
                    uri={item.artworkUrl}
                />
                <View style={styles.exploreHeroText}>
                    <Text style={styles.exploreHeroEyebrow} {...androidTrimCaptionFont}>
                        Fresh drop
                    </Text>
                    <Text
                        numberOfLines={2}
                        style={styles.exploreHeroTitle}
                        {...androidTrimCaptionFont}
                    >
                        {item.title}
                    </Text>
                    {subtitle ? (
                        <Text
                            numberOfLines={1}
                            style={styles.exploreHeroSubtitle}
                            {...androidTrimCaptionFont}
                        >
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                <ChevronRightGlyph color={colors.faint} />
            </View>
        </Pressable>
    );
});

HomeExploreHero.displayName = 'HomeExploreHero';
