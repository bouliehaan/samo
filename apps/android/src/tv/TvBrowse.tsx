import {
    type MobileFullCollectionVariant,
    type MobileHomeItem,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { useEffect, useState } from 'react';
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
import { getTvGridFocusId, TvGrid, TvShelf } from './TvCollections';
import { TvFocusScope, TvTextInput } from './TvControls';
import { tvStyles as s } from './tv-styles';

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
                        <Text style={s.muted}>
                            {items.length
                                ? `${items.length} in your library`
                                : state.status === 'error'
                                  ? state.message
                                  : state.status === 'loading'
                                    ? 'Loading…'
                                    : 'Nothing here yet'}
                        </Text>
                    </View>
                }
            />
        </TvFocusScope>
    );
}

export function TvSearch({ active }: { active: boolean }) {
    const query = useAppNavigationSelector((state) => state.searchOverlayQuery);
    const state = useAppNavigationSelector((state) => state.searchState);
    return (
        <TvFocusScope active={active} defaultFocus="search-query" name={tvPageScope('search')}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.pageScroll}>
                <Text style={s.pageTitle}>Search</Text>
                <TvTextInput
                    id="search-query"
                    label="Search your library"
                    value={query}
                    onChangeText={handleSearchOverlayQuery}
                    returnKeyType="search"
                    onSubmitEditing={() => runTvAction(() => handleSearch(query))}
                />
                {state.status === 'loading' ? <Text style={s.emptyText}>Searching…</Text> : null}
                {state.status === 'error' ? <Text style={s.error}>{state.message}</Text> : null}
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
            </ScrollView>
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
                        <Text style={s.muted}>
                            {state.status === 'error' ? state.message : `${items.length} items`}
                        </Text>
                    </View>
                }
            />
        </TvFocusScope>
    );
}
