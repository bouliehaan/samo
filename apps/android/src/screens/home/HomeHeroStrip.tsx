import { type MobileHomeHero, MobileHomeItemType } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { memo, useEffect } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { ArtworkImage } from '../../components/ArtworkImage';
import { PlayPauseGlyph, ShuffleGlyph } from '../../components/Glyphs';
import { PressableScale } from '../../components/PressableScale';
import { useMediaContextMenu } from '../../contexts/media-context-menu';
import { handlePlayCollectionNow } from '../../handlers/queue-handlers';
import { triggerImpact } from '../../services/haptics';
import { recordHomeHeroShown } from '../../services/home-hero-visit';
import { type AndroidRecentContentSourceItem } from '../../services/recent-content';
import { getHomeHeroHeight } from '../../theme/layout';
import { presses } from '../../theme/motion';
import { styles } from '../../theme/styles';
import { colors } from '../../theme/tokens';
import { androidTrimCaptionFont } from './shared';

const heroOf = (item: AndroidRecentContentSourceItem): MobileHomeHero | undefined =>
    'hero' in item ? item.hero : undefined;

interface HeroProps {
    items: AndroidRecentContentSourceItem[];
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    serverConnection: ServerAuthenticationResult | null;
}

/** A compact notice for a new update, shown once across visits. */
export const HomeHeroStrip = memo(({ items, ...props }: HeroProps) =>
    items[0] ? <HomeHeroCard {...props} item={items[0]} /> : null,
);
HomeHeroStrip.displayName = 'HomeHeroStrip';

const HomeHeroCard = memo(
    ({
        item,
        onPrefetchItem,
        onSelectItem,
        serverConnection,
    }: Omit<HeroProps, 'items'> & { item: AndroidRecentContentSourceItem }) => {
        const contextMenu = useMediaContextMenu();
        const { fontScale } = useWindowDimensions();
        const hero = heroOf(item);
        const title = hero?.title ?? item.title;
        const sleeve = hero?.sleeves[0] ?? item;
        const isCollection =
            item.type === MobileHomeItemType.PLAYLIST || item.type === MobileHomeItemType.ALBUM;
        const shuffled = isCollection && hero?.action === 'shuffle';
        const actionLabel = shuffled ? 'Shuffle' : hero?.kind === 'resume' ? 'Resume' : 'Play';
        useEffect(() => {
            if (serverConnection && 'hero' in item) {
                void recordHomeHeroShown(serverConnection, item).catch(() => undefined);
            }
        }, [item, serverConnection]);

        return (
            <View style={[styles.homeHero, { minHeight: getHomeHeroHeight(fontScale) }]}>
                <PressableScale
                    {...presses.hero}
                    accessibilityLabel={`${isCollection ? 'Open' : actionLabel} ${title}`}
                    accessibilityRole="button"
                    onLongPress={() => contextMenu.openForItem(item, { allowRemoveFromHome: true })}
                    onPress={() => onSelectItem(item)}
                    onPressIn={() => onPrefetchItem?.(item)}
                    style={styles.homeHeroBody}
                >
                    <ArtworkImage
                        artworkImageId={sleeve.artworkImageId}
                        contentSource={item.source}
                        letter={title.slice(0, 1)}
                        serverConnection={serverConnection}
                        style={styles.homeHeroNoticeArt}
                        uri={sleeve.artworkUrl}
                    />
                    <View style={styles.homeHeroCopy}>
                        {hero?.eyebrow ? (
                            <Text
                                numberOfLines={1}
                                style={styles.homeHeroEyebrow}
                                {...androidTrimCaptionFont}
                            >
                                {hero.eyebrow}
                            </Text>
                        ) : null}
                        <Text
                            numberOfLines={2}
                            style={styles.homeHeroTitle}
                            {...androidTrimCaptionFont}
                        >
                            {title}
                        </Text>
                        {hero?.subtitle ? (
                            <Text
                                numberOfLines={1}
                                style={styles.homeHeroSubtitle}
                                {...androidTrimCaptionFont}
                            >
                                {hero.subtitle}
                            </Text>
                        ) : null}
                    </View>
                </PressableScale>
                <PressableScale
                    {...presses.control}
                    accessibilityLabel={`${actionLabel} ${title}`}
                    accessibilityRole="button"
                    onPress={() => {
                        triggerImpact('light');
                        if (isCollection) void handlePlayCollectionNow(item, { shuffled });
                        else onSelectItem(item);
                    }}
                    style={styles.homeHeroAction}
                >
                    {shuffled ? (
                        <ShuffleGlyph color={colors.background} size={24} />
                    ) : (
                        <PlayPauseGlyph color={colors.background} isPlaying={false} size={24} />
                    )}
                </PressableScale>
            </View>
        );
    },
);
HomeHeroCard.displayName = 'HomeHeroCard';
