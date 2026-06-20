import {
    type MobileSearchItem,
    type MobileSearchSection,
} from '@samo/core/mobile';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { ClearGlyph, SearchGlyph } from '../components/Glyphs';
import { InlineSearchBar } from '../components/InlineSearchBar';
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
import { type SearchOverlayProps, type SearchScope, type SearchScreenProps } from '../types/search';
import {
    getAvailableSearchScopes,
    getSearchSectionsForScope,
    isItemInSearchScope,
} from '../utils/search-scopes';
import { toLibraryDisplayItem } from '../utils/library-display';
import { EmptyServerBackedScreen } from './EmptyServerBackedScreen';

const SEARCH_SCOPE_COPY: Record<SearchScope, { accent: string; subtitle: string }> = {
    albums: { accent: colors.accent, subtitle: 'Records and releases' },
    all: { accent: colors.accent, subtitle: 'Everything connected' },
    artists: { accent: '#c8aef2', subtitle: 'Performers and creators' },
    audiobooks: { accent: '#b99af0', subtitle: 'Books and chapters' },
    music: { accent: colors.accent, subtitle: 'Songs, albums, artists' },
    playlists: { accent: colors.accent, subtitle: 'Saved listening paths' },
    podcasts: { accent: '#8fb8a1', subtitle: 'Shows and episodes' },
    radio: { accent: '#7fb0d8', subtitle: 'Stations' },
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

    return (
        <>
            <View style={styles.searchBrowseSection}>
                <Text style={styles.searchSurfaceTitle}>Search across your library</Text>
                <Text style={styles.searchSurfaceSubtitle}>
                    Music, stations, books, and shows from your connected sources.
                </Text>
            </View>
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
                    <Text style={styles.searchBrowseTitle}>Available Media</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {browseScopes.map((scope) => {
                            const copy = SEARCH_SCOPE_COPY[scope.id];

                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={scope.id}
                                    onPress={() => onScopeChange(scope.id)}
                                    style={styles.searchSourceCard}
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
                    </ScrollView>
                </View>
            ) : null}
        </>
    );
};

const SearchSections = ({
    onSelectItem,
    sections,
}: {
    onSelectItem: (item: MobileSearchItem) => void;
    sections: MobileSearchSection[];
}) => {
    return (
        <>
            {sections.map((section) => (
                <View key={section.id} style={styles.searchResultSection}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.libraryList}>
                        {section.items.map((item) => {
                            const displayItem = toLibraryDisplayItem(item);

                            return displayItem ? (
                                <LibraryListRow
                                    displayItem={displayItem}
                                    key={displayItem.key}
                                    onPress={() => onSelectItem(item)}
                                />
                            ) : null;
                        })}
                    </View>
                </View>
            ))}
        </>
    );
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
    if (searchState.status === 'idle' || searchState.status === 'loading') {
        return null;
    }

    if (searchState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{searchState.message}</Text>
            </View>
        );
    }

    const sections = getSearchSectionsForScope(searchState.results.sections, activeScope);

    if (sections.length === 0) {
        return (
            <>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>No Results</Text>
                    <Text style={styles.mutedText}>
                        No server-backed results for {searchState.query}.
                    </Text>
                </View>
                <WarningList errors={searchState.results.errors} title="Search warnings" />
            </>
        );
    }

    return (
        <>
            <SearchSections onSelectItem={onSelectItem} sections={sections} />
            <WarningList errors={searchState.results.errors} title="Search warnings" />
        </>
    );
};

export const SearchScreen = memo(({
    hasServerConnections,
    onSearch,
    onSelectItem,
    onSelectRecentItem,
    searchState,
    serverConnection,
}: SearchScreenProps) => {
    const homeContentState = useVisibleHomeContentState();
    const recentItems = useVisibleRecentItems();
    const [query, setQuery] = useState(searchState.status === 'loaded' ? searchState.query : '');
    const availableScopes = useMemo(
        () => getAvailableSearchScopes(homeContentState, serverConnection, recentItems),
        [homeContentState, recentItems, serverConnection],
    );
    const [activeScope, setActiveScope] = useState<SearchScope>('all');
    const browseRecentItems = useMemo(() => recentItems.slice(0, 6), [recentItems]);

    useEffect(() => {
        if (searchState.status === 'idle') {
            setQuery('');
        }
    }, [searchState.status]);

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            onSearch('');
            return;
        }

        const timeoutId = setTimeout(() => onSearch(trimmedQuery), 280);

        return () => clearTimeout(timeoutId);
    }, [onSearch, query]);

    useEffect(() => {
        if (!availableScopes.some((scope) => scope.id === activeScope)) {
            setActiveScope('all');
        }
    }, [activeScope, availableScopes]);

    if (!hasServerConnections) {
        return <EmptyServerBackedScreen tabTitle="Search" />;
    }

    return (
        <>
            <View style={styles.searchPanel}>
                <InlineSearchBar
                    elevated
                    isLoading={searchState.status === 'loading'}
                    onChange={setQuery}
                    onClear={() => {
                        setQuery('');
                    }}
                    placeholder="Find anything in Samo"
                    value={query}
                />
            </View>
            <SearchScopePills
                activeScope={activeScope}
                onScopeChange={setActiveScope}
                scopes={availableScopes}
            />
            {query.trim() ? null : (
                <SearchBrowseContent
                    activeScope={activeScope}
                    availableScopes={availableScopes}
                    onScopeChange={setActiveScope}
                    onSelectItem={onSelectRecentItem}
                    recentItems={browseRecentItems}
                />
            )}
            {query.trim() ? (
                <SearchResults
                    activeScope={activeScope}
                    onSelectItem={onSelectItem}
                    searchState={searchState}
                />
            ) : null}
        </>
    );
});
SearchScreen.displayName = 'SearchScreen';

export const SearchOverlay = memo(({
    onClose,
    onSearch,
    onSelectItem,
    query,
    searchState,
    serverConnection,
}: SearchOverlayProps) => {
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
        const id = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(id);
    }, []);

    useEffect(() => {
        if (!availableScopes.some((scope) => scope.id === activeScope)) {
            setActiveScope('all');
        }
    }, [activeScope, availableScopes]);

    return (
        <View style={styles.searchOverlay}>
            <Pressable
                accessibilityLabel="Close search"
                onPress={onClose}
                style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.searchOverlayPanel}>
                <View style={styles.searchOverlayBar}>
                    <SearchGlyph color={colors.muted} />
                    <TextInput
                        autoCapitalize="none"
                        onChangeText={onSearch}
                        placeholder="Find anything in Samo"
                        placeholderTextColor={colors.muted}
                        ref={inputRef}
                        returnKeyType="search"
                        style={styles.searchOverlayInput}
                        value={query}
                    />
                    {searchState.status === 'loading' ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                    ) : query.length > 0 ? (
                        <Pressable
                            accessibilityLabel="Clear"
                            onPress={() => onSearch('')}
                            style={styles.searchOverlayClear}
                        >
                            <ClearGlyph color={colors.muted} />
                        </Pressable>
                    ) : null}
                </View>
                <SearchScopePills
                    activeScope={activeScope}
                    onScopeChange={setActiveScope}
                    scopes={availableScopes}
                />
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={styles.searchOverlayResults}
                >
                    {query.trim() ? (
                        <SearchResults
                            activeScope={activeScope}
                            onSelectItem={onSelectItem}
                            searchState={searchState}
                        />
                    ) : (
                        <SearchBrowseContent
                            activeScope={activeScope}
                            availableScopes={availableScopes}
                            onScopeChange={setActiveScope}
                            onSelectItem={onSelectItem}
                            recentItems={overlayRecentItems}
                        />
                    )}
                </ScrollView>
            </View>
        </View>
    );
});
SearchOverlay.displayName = 'SearchOverlay';
