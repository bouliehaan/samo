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
import { type HomeDisplaySection, type HomeFilter } from '../types/home';
import { getContentItemKey } from '../utils/content-item';
import { filterHomeDisplaySections, withoutHiddenHomeItems } from '../utils/home-display';
import { playOnTv, selectTvItem, tvPageScope } from './tv-actions';
import { TvShelf } from './TvCollections';
import { TvRadioContent } from './TvRadio';
import { mediaContextMenuApi } from '../hooks/use-android-context-menu';
import { TvButton, TvFocusScope, TvPressable } from './TvControls';
import { TvFocusGroup } from './TvFocusGroup';
import {
    TV_ANCHOR_TOP,
    TV_HOME_SHELF_ANCHOR_Y,
    TV_LIST_PROPS,
    tvFocus,
    tvStyles as s,
} from './tv-styles';

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
                width={s.heroArt.width}
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
                {hero?.meta ? (
                    <Text numberOfLines={1} style={[s.meta, s.heroMeta]}>
                        {hero.meta}
                    </Text>
                ) : null}
                {/* The card is the top of the page: its actions bring all of
                    it back, not just themselves. */}
                <TvFocusGroup style={s.heroActions}>
                    <TvButton
                        anchorY={TV_ANCHOR_TOP}
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
                        {shuffled ? (
                            <ShuffleGlyph color={colors.background} size={18} />
                        ) : (
                            <PlayPauseGlyph color={colors.background} isPlaying={false} size={16} />
                        )}
                        <Text style={[s.buttonText, s.buttonTextPrimary]}>{actionLabel}</Text>
                    </TvButton>
                    {isCollection ? (
                        <TvButton
                            anchorY={TV_ANCHOR_TOP}
                            id="hero:open"
                            label={`Open ${title}`}
                            onPress={() => selectTvItem(item)}
                        >
                            <Text style={s.buttonText}>Open</Text>
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
 * Rediscover), the same "Remove from Home" hides, the same filter chips —
 * which stay put at the top while the page moves beneath them.
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

    const { homeContentState } = home;
    let body;
    if (homeContentState.status === 'idle' || homeContentState.status === 'loading') {
        body = <Text style={[s.emptyText, s.homeMessage]}>Loading your library…</Text>;
    } else if (homeContentState.status === 'error') {
        body = <Text style={[s.error, s.homeMessage]}>{homeContentState.message}</Text>;
    } else if (filter === 'radio') {
        body = (
            <ScrollView contentContainerStyle={s.homeScroll} {...TV_LIST_PROPS}>
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
                initialNumToRender={2}
                keyExtractor={(section) => section.key}
                maxToRenderPerBatch={1}
                renderItem={renderHomeSection}
                // Every shelf, a shelf at a time, once Home has drawn. Home is
                // a handful of shelves of at most 20 covers, and a window that
                // mounted each as it scrolled into view did it in the frame a
                // move down was gliding in — a title and six covers in one
                // frame (28ms on an emulator) on most presses of Down.
                windowSize={21}
                {...TV_LIST_PROPS}
            />
        );
    }

    return (
        <TvFocusScope active={active} defaultFocus={defaultFocus} name={tvPageScope('home')}>
            <View style={s.homeBar}>
                <TvFocusGroup style={s.chips}>
                    {HOME_FILTERS.map((option) => (
                        <TvFilterChip
                            active={option.id === filter}
                            id={option.id}
                            key={option.id}
                            label={option.label}
                            onSelect={setFilter}
                        />
                    ))}
                </TvFocusGroup>
            </View>
            {body}
        </TvFocusScope>
    );
});

const renderHomeSection = ({ item: section }: { item: HomeDisplaySection }) =>
    section.variant === 'heroes' ? (
        section.items[0] ? (
            <TvHeroCard item={section.items[0]} />
        ) : null
    ) : (
        <TvShelf allowRemoveFromHome anchorY={TV_HOME_SHELF_ANCHOR_Y} section={section} />
    );

/** One of the phone's filter pills: silver while it is the filter in force. */
const TvFilterChip = memo(function TvFilterChip({
    active,
    id,
    label,
    onSelect,
}: {
    active: boolean;
    id: HomeFilter;
    label: string;
    onSelect: (filter: HomeFilter) => void;
}) {
    return (
        <TvPressable
            id={`home-filter:${id}`}
            label={label}
            look={tvFocus.chip}
            onPress={() => onSelect(id)}
            selected={active}
            style={[s.chip, active && s.chipActive]}
        >
            <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
        </TvPressable>
    );
});
