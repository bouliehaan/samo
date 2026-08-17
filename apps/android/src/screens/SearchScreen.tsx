import { type MobileSearchItem, type MobileSearchSection } from '@samo/core/mobile';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import Reanimated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import samoLogo from '../../assets/samo-logo.png';
import { ClearGlyph, SearchGlyph } from '../components/Glyphs';
import { useSearchPullContext } from '../components/search-pull/SearchPullContext';
import {
    SEARCH_PULL_ARRIVAL_OPAQUE_AT,
    SEARCH_PULL_ARRIVAL_TRAVEL,
} from '../components/search-pull/search-pull-constants';
import { LibraryListRow } from '../components/LibraryListRow';
import { WarningList } from '../components/WarningList';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
} from '../services/recent-content';
import { useVisibleHomeContentState } from '../hooks/use-visible-home-content';
import { useVisibleRecentItems } from '../hooks/use-visible-recent-items';
import { type AndroidSearchState } from '../services/search-content';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { type SearchOverlayProps, type SearchScope } from '../types/search';
import {
    getAvailableSearchScopes,
    getSearchSectionsForScope,
    isItemInSearchScope,
} from '../utils/search-scopes';
import { toLibraryDisplayItem } from '../utils/library-display';

const SEARCH_SCOPE_COPY: Record<SearchScope, { accent: string; subtitle: string }> = {
    albums: { accent: colors.accent, subtitle: 'Records and releases' },
    all: { accent: colors.accent, subtitle: 'Everything connected' },
    artists: { accent: '#dfe5ec', subtitle: 'Performers and creators' },
    audiobooks: { accent: '#c3ccd8', subtitle: 'Books and chapters' },
    music: { accent: colors.accent, subtitle: 'Songs, albums, artists' },
    playlists: { accent: colors.accent, subtitle: 'Saved listening paths' },
    podcasts: { accent: '#a9b4c2', subtitle: 'Shows and episodes' },
    radio: { accent: '#8f9aa9', subtitle: 'Stations' },
};

const SearchScopePills = ({
    activeScope,
    onScopeChange,
    scopes,
}: {
    activeScope: SearchScope;
    onScopeChange: (scope: SearchScope) => void;
    scopes: Array<{ id: SearchScope; label: string }>;
}) => {
    return (
        <ScrollView
            contentContainerStyle={styles.searchScopePills}
            horizontal
            showsHorizontalScrollIndicator={false}
            // ScrollView's base style is flexGrow:1 — inside the overlay panel
            // that inflated each pill into a screen-tall capsule.
            style={styles.searchScopePillsBar}
        >
            {scopes.map((scope) => {
                const isActive = scope.id === activeScope;

                return (
                    <Pressable
                        accessibilityRole="button"
                        key={scope.id}
                        onPress={() => onScopeChange(scope.id)}
                        style={[styles.searchScopePill, isActive && styles.searchScopePillActive]}
                    >
                        <Text
                            style={[
                                styles.searchScopePillText,
                                isActive && styles.searchScopePillTextActive,
                            ]}
                        >
                            {scope.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const SearchBrowseContent = ({
    activeScope,
    availableScopes,
    onScopeChange,
    onSelectItem,
    recentItems,
}: {
    activeScope: SearchScope;
    availableScopes: Array<{ id: SearchScope; label: string }>;
    onScopeChange: (scope: SearchScope) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    recentItems: AndroidRecentContentItem[];
}) => {
    const rows = recentItems.flatMap((recentItem) => {
        if (!isItemInSearchScope(recentItem.item, activeScope)) {
            return [];
        }

        const displayItem = toLibraryDisplayItem(recentItem.item, recentItem.selectedAt);

        return displayItem ? [displayItem] : [];
    });
    const browseScopes = availableScopes.filter((scope) => scope.id !== 'all');

    // No standing "Search across your library" masthead: the field says that,
    // the keyboard is already up, and the heading pushed the only two useful
    // things here (what you played, where you can look) below the fold.
    return (
        <>
            {rows.length > 0 ? (
                <View style={styles.searchRecentSection}>
                    <Text style={styles.searchBrowseTitle}>Recent</Text>
                    <View style={[styles.libraryList, { marginTop: 0 }]}>
                        {rows.map((row) => (
                            <LibraryListRow
                                displayItem={row}
                                key={row.key}
                                onPress={() => onSelectItem(row.item)}
                            />
                        ))}
                    </View>
                </View>
            ) : null}
            {browseScopes.length > 0 ? (
                <View style={styles.searchRecentSection}>
                    <Text style={styles.searchBrowseTitle}>Browse</Text>
                    <View style={styles.searchSourceGrid}>
                        {browseScopes.map((scope) => {
                            const copy = SEARCH_SCOPE_COPY[scope.id];

                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={scope.id}
                                    onPress={() => onScopeChange(scope.id)}
                                    style={({ pressed }) => [
                                        styles.searchSourceCard,
                                        pressed && styles.searchSourcePressed,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.searchSourceAccent,
                                            { backgroundColor: copy.accent },
                                        ]}
                                    />
                                    <Text numberOfLines={1} style={styles.searchSourceTitle}>
                                        {scope.label}
                                    </Text>
                                    <Text numberOfLines={2} style={styles.searchSourceSubtitle}>
                                        {copy.subtitle}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            ) : null}
        </>
    );
};

type SearchResultSection = {
    id: string;
    title: string;
    rows: Array<{
        item: MobileSearchItem;
        displayItem: NonNullable<ReturnType<typeof toLibraryDisplayItem>>;
    }>;
};

const SearchResults = ({
    activeScope,
    onSelectItem,
    searchState,
}: {
    activeScope: SearchScope;
    onSelectItem: (item: MobileSearchItem) => void;
    searchState: AndroidSearchState;
}) => {
    const sections = useMemo(() => {
        if (searchState.status !== 'loaded') {
            return [];
        }
        const scoped = getSearchSectionsForScope(searchState.results.sections, activeScope);
        const built: SearchResultSection[] = [];
        for (const section of scoped) {
            const rows: SearchResultSection['rows'] = [];
            for (const item of section.items) {
                const displayItem = toLibraryDisplayItem(item);
                if (displayItem) {
                    rows.push({ displayItem, item });
                }
            }
            // A section whose items ALL failed to map used to still emit its
            // header — an orphan title floating over nothing.
            if (rows.length > 0) {
                built.push({ id: section.id, rows, title: section.title });
            }
        }
        return built;
    }, [searchState, activeScope]);

    if (searchState.status === 'idle' || searchState.status === 'loading') {
        return null;
    }

    if (searchState.status === 'error') {
        return (
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.searchOverlayResults}
            >
                <View style={styles.section}>
                    <Text style={styles.errorText}>{searchState.message}</Text>
                </View>
            </ScrollView>
        );
    }

    if (sections.length === 0) {
        return (
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.searchOverlayResults}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>No Results</Text>
                    <Text style={styles.mutedText}>
                        No server-backed results for {searchState.query}.
                    </Text>
                </View>
                <WarningList errors={searchState.results.errors} title="Search warnings" />
            </ScrollView>
        );
    }

    // Plain ScrollView on purpose: results are capped small (dozens of rows),
    // so virtualization buys nothing here — and the recycled FlashList inside
    // this absolute overlay drew cells at phantom offsets on device (rows
    // scattered down the page with giant voids between them). Do not put a
    // recycling list back in this overlay.
    return (
        <ScrollView
            contentContainerStyle={styles.searchOverlayResultsContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.searchOverlayResults}
        >
            {sections.map((section) => (
                <View key={section.id} style={styles.searchResultSection}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.libraryList}>
                        {section.rows.map(({ displayItem, item }) => (
                            <LibraryListRow
                                displayItem={displayItem}
                                key={displayItem.key}
                                onPress={() => onSelectItem(item)}
                            />
                        ))}
                    </View>
                </View>
            ))}
            <WarningList errors={searchState.results.errors} title="Search warnings" />
        </ScrollView>
    );
};

export const SearchOverlay = memo(
    ({
        isCommitted,
        onSearch,
        onSelectItem,
        query,
        searchState,
        serverConnection,
    }: SearchOverlayProps) => {
        const { pull } = useSearchPullContext();
        /*
         * Search ARRIVES on the same value the finger is driving (see pullReveal):
         * reveal 1 is the seated bar, 2 is search fully open, and this is the span
         * between them. Not an entrance animation played at you once a decision was
         * made elsewhere — the second half of one continuous gesture, which is why
         * easing the drag back takes it away again.
         *
         * IT SETTLES, by `SEARCH_PULL_ARRIVAL_TRAVEL`, and the smallness of that
         * distance is deliberate — see the constant. A full 1:1 slide was tried
         * and is wrong: rows moving that far vertically read as a scroll, because
         * a scroll is exactly what that looks like, and the panel then seems to
         * have been dragged rather than to have arrived.
         *
         * Down, emphatically not up. A panel rising to meet a downward drag would
         * reverse direction under the thumb at the moment the bar seated, which is
         * a worse discontinuity than any it could fix.
         */
        const arrivalStyle = useAnimatedStyle(() => ({
            opacity: interpolate(
                pull.value,
                [1, SEARCH_PULL_ARRIVAL_OPAQUE_AT],
                [0, 1],
                Extrapolation.CLAMP,
            ),
            transform: [
                {
                    translateY: interpolate(
                        pull.value,
                        [1, 2],
                        [-SEARCH_PULL_ARRIVAL_TRAVEL, 0],
                        Extrapolation.CLAMP,
                    ),
                },
            ],
        }));
        const homeContentState = useVisibleHomeContentState();
        const recentItems = useVisibleRecentItems();
        const inputRef = useRef<TextInput>(null);
        const availableScopes = useMemo(
            () => getAvailableSearchScopes(homeContentState, serverConnection, recentItems),
            [homeContentState, recentItems, serverConnection],
        );
        const [activeScope, setActiveScope] = useState<SearchScope>('all');
        const overlayRecentItems = useMemo(() => recentItems.slice(0, 8), [recentItems]);

        useEffect(() => {
            // Focus — and so the KEYBOARD — only once the gesture has actually
            // completed. The overlay mounts and becomes visible well before this,
            // while the pull is still in flight, and raising the keyboard then would
            // both commit a decision the user has not made and be impossible to undo:
            // Android gives no way to partially retract an IME. So the keyboard is
            // the last thing to happen, after the screen the user was already
            // watching arrive has finished arriving.
            if (!isCommitted) {
                return;
            }
            inputRef.current?.focus();
            // Android sometimes drops a focus request that lands mid-animation; this
            // re-asserts it once the motion has settled.
            const id = setTimeout(() => {
                if (!inputRef.current?.isFocused()) {
                    inputRef.current?.focus();
                }
            }, 250);
            return () => clearTimeout(id);
        }, [isCommitted]);

        useEffect(() => {
            if (!availableScopes.some((scope) => scope.id === activeScope)) {
                setActiveScope('all');
            }
        }, [activeScope, availableScopes]);

        // No card, no sheet: the whole screen darkens and the search field sits
        // exactly where the Home drawer's field sits (same row geometry), so
        // opening search reads as the drawer field simply coming alive — keyboard
        // up, results right there. The dim fades in rather than cutting, which is
        // what sells "came alive" over "a screen replaced the page".
        return (
            <Reanimated.View
                pointerEvents={isCommitted ? 'auto' : 'none'}
                style={[styles.searchOverlay, arrivalStyle]}
            >
                {/*
                    NO FIELD HERE. The pull surface owns the one search field in
                    the app and keeps it on screen the whole time search is open,
                    so this row only reserves its height. Drawing a second field,
                    magnifier and samo-S at these same coordinates is what made
                    all three visibly double as the two layers crossfaded.
                */}
                <View pointerEvents="none" style={styles.homeSearchDrawer}>
                    <View style={styles.searchOverlayFieldSpacer} />
                </View>
                <SearchScopePills
                    activeScope={activeScope}
                    onScopeChange={setActiveScope}
                    scopes={availableScopes}
                />
                {query.trim() ? (
                    <SearchResults
                        activeScope={activeScope}
                        onSelectItem={onSelectItem}
                        searchState={searchState}
                    />
                ) : (
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        style={styles.searchOverlayResults}
                    >
                        <SearchBrowseContent
                            activeScope={activeScope}
                            availableScopes={availableScopes}
                            onScopeChange={setActiveScope}
                            onSelectItem={onSelectItem}
                            recentItems={overlayRecentItems}
                        />
                    </ScrollView>
                )}
            </Reanimated.View>
        );
    },
);
SearchOverlay.displayName = 'SearchOverlay';
