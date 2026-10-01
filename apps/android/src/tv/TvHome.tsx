import { type MobileHomeHero, MobileHomeItemType } from '@samo/core/mobile';
import { memo, useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';

import { ArtworkImage } from '../components/ArtworkImage';
import { PlayPauseGlyph, ShuffleGlyph } from '../components/Glyphs';
import { handlePlayCollectionNow } from '../handlers/queue-handlers';
import { type HomeDisplaySectionsResult } from '../hooks/use-home-display-sections';
import { recordHomeHeroShown } from '../services/home-hero-visit';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { useAuthSessionSelector } from '../state/auth-session';
import { useHiddenHomeKeys } from '../state/hidden-home';
import { colors } from '../theme/tokens';
import { type HomeFilter } from '../types/home';
import { filterHomeDisplaySections, withoutHiddenHomeItems } from '../utils/home-display';
import { playOnTv, selectTvItem, tvPageScope } from './tv-actions';
import { TvShelf } from './TvCollections';
import { TvRadioContent } from './TvRadio';
import { mediaContextMenuApi } from '../hooks/use-android-context-menu';
import { TvButton, TvFocusScope } from './TvControls';
import { tvStyles as s } from './tv-styles';

const HERO_ACTION_ID = 'hero:action';

const heroOf = (item: AndroidRecentContentSourceItem): MobileHomeHero | undefined =>
    'hero' in item ? item.hero : undefined;

/**
 * The server's one card for right now — the phone's hero, with its action
 * (Shuffle for the Explore drop, Play otherwise) as the first thing focused
 * when the app opens.
 */
const TvHeroCard = memo(function TvHeroCard({ item }: { item: AndroidRecentContentSourceItem }) {
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
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
        <View style={s.hero}>
            <ArtworkImage
                artworkImageId={sleeve.artworkImageId}
                contentSource={item.source}
                letter={title.slice(0, 1)}
                style={s.heroArt}
                uri={sleeve.artworkUrl}
            />
            <View style={s.heroCopy}>
                {hero?.eyebrow ? (
                    <Text numberOfLines={1} style={s.eyebrow}>
                        {hero.eyebrow}
                    </Text>
                ) : null}
                <Text numberOfLines={2} style={s.heroTitle}>
                    {title}
                </Text>
                {hero?.subtitle ? (
                    <Text numberOfLines={1} style={s.heroSubtitle}>
                        {hero.subtitle}
                    </Text>
                ) : null}
                <View style={s.heroActions}>
                    <TvButton
                        id={HERO_ACTION_ID}
                        label={`${actionLabel} ${title}`}
                        onLongPress={() => mediaContextMenuApi.openForItem(item)}
                        onPress={() =>
                            isCollection
                                ? playOnTv(() => handlePlayCollectionNow(item, { shuffled }))
                                : selectTvItem(item)
                        }
                        primary
                    >
                        {(focused) => (
                            <>
                                {shuffled ? (
                                    <ShuffleGlyph
                                        color={focused ? colors.background : colors.text}
                                        size={18}
                                    />
                                ) : (
                                    <PlayPauseGlyph
                                        color={focused ? colors.background : colors.text}
                                        isPlaying={false}
                                        size={16}
                                    />
                                )}
                                <Text style={[s.buttonText, focused && s.buttonTextFocused]}>
                                    {actionLabel}
                                </Text>
                            </>
                        )}
                    </TvButton>
                    {isCollection ? (
                        <TvButton
                            id="hero:open"
                            label={`Open ${title}`}
                            onPress={() => selectTvItem(item)}
                        >
                            {(focused) => (
                                <Text style={[s.buttonText, focused && s.buttonTextFocused]}>
                                    Open
                                </Text>
                            )}
                        </TvButton>
                    ) : null}
                </View>
            </View>
        </View>
    );
});

/**
 * Home, as the phone composes it: the same derive (heroes, Recents, Podcast
 * Feed, Recently Added, Albums, Audiobooks, Podcasts, Artists, Playlists,
 * Rediscover), the same "Remove from Home" hides, the same filters.
 */
export const TvHomePage = memo(function TvHomePage({
    active,
    home,
}: {
    active: boolean;
    home: HomeDisplaySectionsResult;
}) {
    const hiddenKeys = useHiddenHomeKeys();
    const visibleSections = useMemo(
        () => withoutHiddenHomeItems(home.sections, hiddenKeys),
        [hiddenKeys, home.sections],
    );
    const [filter, setFilter] = useState<HomeFilter>('all');
    const availableFilters: { id: HomeFilter; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'music', label: 'Music' },
        { id: 'podcasts', label: 'Podcasts' },
        { id: 'audiobooks', label: 'Audiobooks' },
        { id: 'radio', label: 'Radio' },
    ];
    const sections = useMemo(
        () => filterHomeDisplaySections(visibleSections, filter),
        [filter, visibleSections],
    );
    const defaultFocus = 'home-filter:all';

    const pills =
        availableFilters.length > 2 ? (
            <View style={s.pills}>
                {availableFilters.map((option) => (
                    <TvButton
                        id={`home-filter:${option.id}`}
                        key={option.id}
                        label={option.label}
                        onPress={() => setFilter(option.id)}
                        selected={option.id === filter}
                        style={[s.pill, option.id === filter && s.pillActive]}
                    >
                        {(focused) => (
                            <Text
                                style={[
                                    s.pillText,
                                    option.id === filter && s.pillTextActive,
                                    focused && s.buttonTextFocused,
                                ]}
                            >
                                {option.label}
                            </Text>
                        )}
                    </TvButton>
                ))}
            </View>
        ) : null;

    const { homeContentState } = home;
    let body;
    if (homeContentState.status === 'idle' || homeContentState.status === 'loading') {
        body = (
            <ScrollView contentContainerStyle={s.homeScroll}>
                <Text style={s.pageTitle}>Home</Text>
                <Text style={s.emptyText}>Loading your library…</Text>
            </ScrollView>
        );
    } else if (homeContentState.status === 'error') {
        body = (
            <ScrollView contentContainerStyle={s.homeScroll}>
                <Text style={s.pageTitle}>Home</Text>
                <Text style={s.error}>{homeContentState.message}</Text>
            </ScrollView>
        );
    } else if (filter === 'radio') {
        body = (
            <ScrollView contentContainerStyle={s.homeScroll}>
                <TvRadioContent sections={sections} />
            </ScrollView>
        );
    } else if (sections.length === 0) {
        body = (
            <ScrollView contentContainerStyle={s.homeScroll}>
                <Text style={s.pageTitle}>Home</Text>
                <Text style={s.emptyText}>
                    Nothing here yet. Your library appears as the first sync finishes.
                </Text>
            </ScrollView>
        );
    } else {
        body = (
            <FlatList
                contentContainerStyle={s.homeScroll}
                data={sections}
                initialNumToRender={2}
                keyExtractor={(section) => section.key}
                maxToRenderPerBatch={1}
                // Keep the next shelf attached so Android can focus it before scrolling.
                removeClippedSubviews={false}
                renderItem={({ item: section }) =>
                    section.variant === 'heroes' ? (
                        section.items[0] ? <TvHeroCard item={section.items[0]} /> : null
                    ) : (
                        <TvShelf allowRemoveFromHome section={section} />
                    )
                }
                showsVerticalScrollIndicator={false}
                windowSize={3}
            />
        );
    }

    return (
        <TvFocusScope active={active} defaultFocus={defaultFocus} name={tvPageScope('home')}>
            <View style={s.homeFilters}>{pills}</View>
            {body}
        </TvFocusScope>
    );
});
