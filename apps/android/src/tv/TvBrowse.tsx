import {
    type MobileFullCollectionVariant,
    type MobileHomeItem,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { handleSearch, handleSearchOverlayQuery } from '../handlers/search-handlers';
import { subscribeCatalogSyncCompleted } from '../services/catalog/catalog-sync-events';
import {
    loadAndroidFullCollectionLocal,
    type AndroidFullCollectionState,
} from '../services/full-collection';
import { useAppNavigationSelector } from '../state/app-navigation';
import { useAuthSessionSelector } from '../state/auth-session';
import { type HomeDisplaySection } from '../types/home';
import { runTvAction, tvPageScope } from './tv-actions';
import { getTvGridFocusId, TvGrid, TvShelf, TvTopFade } from './TvCollections';
import { TvFocusScope, TvTextInput } from './TvControls';
import { didTvFocusArriveUp } from './tv-focus';
import { TV_LIST_PROPS, tvStyles as s } from './tv-styles';

const SEARCH_RESULTS = { marginTop: 22 } as const;

export type TvMediaItem = MobileHomeItem | MobileSearchItem;
export type TvRunAction = (action: () => void | Promise<unknown>) => void;

export function TvCollectionPage({
    active,
    page,
}: {
    active: boolean;
    page: 'podcasts' | 'audiobooks' | 'playlists';
}) {
    const connection = useAuthSessionSelector((state) => state.serverConnection);
    const variant: MobileFullCollectionVariant =
        page === 'podcasts' ? 'podcast' : page === 'audiobooks' ? 'audiobook' : 'playlist';
    const [state, setState] = useState<AndroidFullCollectionState>({ status: 'loading' });
    const [revision, setRevision] = useState(0);
    useEffect(() => subscribeCatalogSyncCompleted(() => setRevision((value) => value + 1)), []);
    useEffect(() => {
        let current = true;
        void loadAndroidFullCollectionLocal(connection, variant, {
            sort: 'title',
            direction: 'asc',
        }).then(
            (items) => {
                if (current) setState({ status: 'loaded', items: items ?? [] });
            },
            (error: unknown) => {
                if (current)
                    setState({
                        status: 'error',
                        message:
                            error instanceof Error ? error.message : 'Could not load your library.',
                    });
            },
        );
        return () => {
            current = false;
        };
    }, [connection, variant, revision]);
    const items = state.status === 'loaded' ? state.items : [];
    return (
        <TvFocusScope
            active={active}
            defaultFocus={items[0] ? getTvGridFocusId(page, items[0]) : `${page}:empty`}
            name={tvPageScope(page)}
        >
            <TvGrid
                idPrefix={page}
                items={items}
                variant={
                    page === 'audiobooks' ? 'book' : (variant as HomeDisplaySection['variant'])
                }
                header={
                    <View style={s.pageHeader}>
                        <Text style={s.pageTitle}>
                            {page === 'podcasts'
                                ? 'Podcasts'
                                : page === 'audiobooks'
                                  ? 'Audiobooks'
                                  : 'Playlists'}
                        </Text>
                        {items.length ? (
                            <Text style={s.meta}>{items.length} in your library</Text>
                        ) : null}
                    </View>
                }
                footer={
                    items.length ? null : state.status === 'error' ? (
                        <Text style={s.error}>{state.message}</Text>
                    ) : (
                        <Text style={s.emptyText}>
                            {state.status === 'loading'
                                ? 'Loading…'
                                : `No ${page} in your library yet.`}
                        </Text>
                    )
                }
            />
        </TvFocusScope>
    );
}

export function TvSearch({ active }: { active: boolean }) {
    const query = useAppNavigationSelector((state) => state.searchOverlayQuery);
    const state = useAppNavigationSelector((state) => state.searchState);
    const scroll = useRef<ScrollView>(null);
    // Back up to the field from the results: the whole header, not just the
    // field at the edge margin with the title cut off above it.
    const revealTop = useCallback(() => {
        if (didTvFocusArriveUp()) scroll.current?.scrollTo({ animated: true, y: 0 });
    }, []);
    return (
        <TvFocusScope active={active} defaultFocus="search-query" name={tvPageScope('search')}>
            <ScrollView
                contentContainerStyle={s.pageScroll}
                keyboardShouldPersistTaps="handled"
                ref={scroll}
                // Results bring themselves into view; the field, which is not
                // one of the TV's own controls, is `revealTop`'s.
                {...TV_LIST_PROPS}
            >
                <View style={s.pageHeader}>
                    <Text style={s.pageTitle}>Search</Text>
                </View>
                <TvTextInput
                    id="search-query"
                    label="Search your library"
                    onFocus={revealTop}
                    placeholder="Artists, albums, songs, books, podcasts"
                    value={query}
                    onChangeText={handleSearchOverlayQuery}
                    returnKeyType="search"
                    onSubmitEditing={() => runTvAction(() => handleSearch(query))}
                />
                <View style={SEARCH_RESULTS}>
                    {state.status === 'loading' ? (
                        <Text style={s.emptyText}>Searching…</Text>
                    ) : null}
                    {state.status === 'error' ? <Text style={s.error}>{state.message}</Text> : null}
                    {state.status === 'loaded' && state.results.sections.length === 0 ? (
                        <View style={s.empty}>
                            <Text style={s.emptyTitle}>No matches</Text>
                            <Text style={s.emptyText}>
                                Nothing in your library matches “{state.query}”. Try another title,
                                artist, or album.
                            </Text>
                        </View>
                    ) : null}
                    {state.status === 'loaded'
                        ? state.results.sections.map((section) => (
                              <TvShelf
                                  key={section.id}
                                  section={{
                                      key: `search:${section.id}`,
                                      title: section.title,
                                      items: section.items,
                                      variant: 'album',
                                  }}
                              />
                          ))
                        : null}
                </View>
            </ScrollView>
            <TvTopFade />
        </TvFocusScope>
    );
}

export function TvViewAll({ active }: { active: boolean }) {
    const route = useAppNavigationSelector((state) => state.viewAllRoute);
    const state = useAppNavigationSelector((state) => state.viewAllFullState);
    if (!route) return null;
    const items = state.status === 'loaded' ? state.items : route.items;
    return (
        <TvFocusScope
            active={active}
            defaultFocus={items[0] ? getTvGridFocusId('view-all', items[0]) : 'view-all:empty'}
            name="view-all"
            forceInitialFocus
        >
            <TvGrid
                idPrefix="view-all"
                items={items}
                variant={route.variant === 'audiobook' ? 'book' : route.variant}
                header={
                    <View style={s.pageHeader}>
                        <Text style={s.pageTitle}>{route.title}</Text>
                        <Text style={s.meta}>
                            {state.status === 'error' ? state.message : `${items.length} items`}
                        </Text>
                    </View>
                }
            />
        </TvFocusScope>
    );
}
