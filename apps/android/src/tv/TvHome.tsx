import { type MobileHomeHero, MobileHomeItemType } from '@samo/core/mobile';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { type HomeDisplaySection, type HomeFilter } from '../types/home';
import { getContentItemKey } from '../utils/content-item';
import { filterHomeDisplaySections, withoutHiddenHomeItems } from '../utils/home-display';
import { playOnTv, selectTvItem, tvPageScope } from './tv-actions';
import { TvShelf } from './TvCollections';
import { TvRadioContent } from './TvRadio';
import { mediaContextMenuApi } from '../hooks/use-android-context-menu';
import { TvButton, TvFocusScope } from './TvControls';
import { TvFocusGroup } from './TvFocusGroup';
import { didTvFocusArriveUp } from './tv-focus';
import { TV_SCROLL_EDGE, tvStyles as s } from './tv-styles';

const HERO_ACTION_ID = 'hero:action';

const HOME_FILTERS: { id: HomeFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'music', label: 'Music' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'audiobooks', label: 'Audiobooks' },
    { id: 'radio', label: 'Radio' },
];

const heroOf = (item: AndroidRecentContentSourceItem): MobileHomeHero | undefined =>
    'hero' in item ? item.hero : undefined;

/** What Home focuses until the person moves: the hero's action, else the
 *  first cover, else (while the library loads) the filters. */
const getHomeDefaultFocus = (sections: HomeDisplaySection[]): string => {
    const first = sections.find((section) => !section.pending && section.items[0]);
    if (!first) return 'home-filter:all';
    return first.variant === 'heroes'
        ? HERO_ACTION_ID
        : `${first.key}:${getContentItemKey(first.items[0])}`;
};

/**
 * The server's one card for right now — the phone's hero, with its action
 * (Shuffle for the Explore drop, Play otherwise) as the first thing focused
 * when the app opens.
 */
const TvHeroCard = memo(function TvHeroCard({
    item,
    onFocus,
}: {
    item: AndroidRecentContentSourceItem;
    /** Focus reaching the card's actions, which sit low in it. */
    onFocus: () => void;
}) {
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
                <TvFocusGroup style={s.heroActions}>
                    <TvButton
                        id={HERO_ACTION_ID}
                        label={`${actionLabel} ${title}`}
                        onFocus={onFocus}
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
                            onFocus={onFocus}
                            onPress={() => selectTvItem(item)}
                        >
                            {(focused) => (
                                <Text style={[s.buttonText, focused && s.buttonTextFocused]}>
                                    Open
                                </Text>
                            )}
                        </TvButton>
                    ) : null}
                </TvFocusGroup>
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
    const sections = useMemo(
        () => filterHomeDisplaySections(visibleSections, filter),
        [filter, visibleSections],
    );
    const defaultFocus = getHomeDefaultFocus(sections);

    const list = useRef<FlatList<HomeDisplaySection>>(null);
    // The hero's actions sit low in a tall card: a plain scroll would stop
    // with them at the edge margin and the card's top cut off.
    const revealTop = useCallback(() => {
        if (didTvFocusArriveUp()) list.current?.scrollToOffset({ animated: true, offset: 0 });
    }, []);

    const pills = (
        <TvFocusGroup style={s.pills}>
            {HOME_FILTERS.map((option) => (
                <TvButton
                    id={`home-filter:${option.id}`}
                    key={option.id}
                    label={option.label}
                    onPress={() => setFilter(option.id)}
                    selected={option.id === filter}
                    focusedStyle={s.pillFocused}
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
        </TvFocusGroup>
    );

    const { homeContentState } = home;
    let body;
    if (homeContentState.status === 'idle' || homeContentState.status === 'loading') {
        body = <Text style={[s.emptyText, s.homeMessage]}>Loading your library…</Text>;
    } else if (homeContentState.status === 'error') {
        body = <Text style={[s.error, s.homeMessage]}>{homeContentState.message}</Text>;
    } else if (filter === 'radio') {
        body = (
            <ScrollView
                contentContainerStyle={s.homeScroll}
                fadingEdgeLength={{ start: 0, end: TV_SCROLL_EDGE }}
            >
                <TvRadioContent sections={sections} />
            </ScrollView>
        );
    } else if (sections.length === 0) {
        body = (
            <Text style={[s.emptyText, s.homeMessage]}>
                {filter === 'all'
                    ? 'Nothing here yet. Your library appears as soon as it has synced.'
                    : `No ${HOME_FILTERS.find((option) => option.id === filter)?.label.toLowerCase()} on Home yet.`}
            </Text>
        );
    } else {
        body = (
            <FlatList
                contentContainerStyle={s.homeScroll}
                data={sections}
                fadingEdgeLength={{ start: 0, end: TV_SCROLL_EDGE }}
                initialNumToRender={2}
                keyExtractor={(section) => section.key}
                maxToRenderPerBatch={1}
                ref={list}
                // Keep the next shelf attached so Android can focus it before scrolling.
                removeClippedSubviews={false}
                renderItem={({ item: section }) =>
                    section.variant === 'heroes' ? (
                        section.items[0] ? (
                            <TvHeroCard item={section.items[0]} onFocus={revealTop} />
                        ) : null
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
            <View style={s.homeChrome}>
                <View style={s.homeHeader}>
                    <Text style={s.homeTitle}>Library</Text>
                    <Text style={s.homeKicker}>Samo</Text>
                </View>
                <View style={s.homeFilters}>{pills}</View>
            </View>
            {body}
        </TvFocusScope>
    );
});
