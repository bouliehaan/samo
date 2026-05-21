import { getFetch, requestJson } from '../server/server-http';
import { ServerType } from '../server/server-types';
import { buildAudiobookshelfArtworkUrl, firstNonEmptyString, getMobileContentSource, } from './mobile-content-source';
import { buildRadioPlayback } from './mobile-playback';
import { annotateSubsonicAlbumsQuality, annotateSubsonicHiResCollections, } from './mobile-subsonic-quality';
export var MobileHomeItemType;
(function (MobileHomeItemType) {
    MobileHomeItemType["ALBUM"] = "album";
    MobileHomeItemType["ARTIST"] = "artist";
    MobileHomeItemType["AUDIOBOOK"] = "audiobook";
    MobileHomeItemType["PLAYLIST"] = "playlist";
    MobileHomeItemType["PODCAST"] = "podcast";
    MobileHomeItemType["RADIO"] = "radio";
})(MobileHomeItemType || (MobileHomeItemType = {}));
export var MobileHomeSectionId;
(function (MobileHomeSectionId) {
    MobileHomeSectionId["AUDIOBOOKS"] = "audiobooks";
    MobileHomeSectionId["FAVORITE_ALBUMS"] = "favorite-albums";
    MobileHomeSectionId["FAVORITE_ARTISTS"] = "favorite-artists";
    MobileHomeSectionId["PLAYLISTS"] = "playlists";
    MobileHomeSectionId["PODCASTS"] = "podcasts";
    MobileHomeSectionId["RADIO"] = "radio";
    MobileHomeSectionId["RECENTLY_ADDED"] = "recently-added";
})(MobileHomeSectionId || (MobileHomeSectionId = {}));
const DEFAULT_HOME_LIMIT = 12;
const getErrorMessage = (error) => {
    return error instanceof Error ? error.message : 'Request failed';
};
export const getMobileHomeContentErrorMessage = getErrorMessage;
const hasItems = (section) => section.items.length > 0;
const getAudiobookshelfTitle = (item, fallback) => {
    return firstNonEmptyString(item.media?.metadata?.title, item.media?.title, item.name, fallback);
};
const getAudiobookshelfPodcastTitle = (item) => {
    return firstNonEmptyString(item.name, item.media?.metadata?.title, item.media?.title, 'Podcast');
};
const getAudiobookshelfAuthor = (item) => {
    const metadata = item.media?.metadata;
    return firstNonEmptyString(metadata?.authorName, metadata?.authorNameLF, metadata?.author, metadata?.authors
        ?.map((author) => author.name)
        .filter(Boolean)
        .join(', '), item.media?.authorName, item.media?.authors
        ?.map((author) => author.name)
        .filter(Boolean)
        .join(', '), item.media?.narratorName);
};
const subsonicUrl = (authentication, path, query = {}) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });
    for (const [key, value] of Object.entries(query)) {
        params.set(key, String(value));
    }
    return `${authentication.url}/rest/${path}?${params.toString()}&${authentication.credential}`;
};
const subsonicCoverArtUrl = (authentication, coverArt, entityId) => {
    // Newer Navidrome populates coverArt; older Subsonic-compatible servers
    // sometimes leave it blank even when artwork exists. getCoverArt.view
    // accepts the entity id directly, so fall back to it whenever the
    // explicit coverArt field is missing — produces covers for albums/artists
    // that would otherwise render a fallback letter.
    const target = coverArt ?? (entityId != null ? entityId.toString() : undefined);
    if (!target) {
        return undefined;
    }
    return subsonicUrl(authentication, 'getCoverArt.view', { id: target, size: 320 });
};
const assertSubsonicOk = (response, fallback) => {
    if (response?.status === 'ok') {
        return;
    }
    throw new Error(response?.error?.message ?? fallback);
};
const toSectionErrors = (sectionLoads) => {
    return sectionLoads.flatMap((result) => result.status === 'rejected'
        ? [
            {
                message: getErrorMessage(result.reason),
                sectionId: MobileHomeSectionId.RECENTLY_ADDED,
            },
        ]
        : []);
};
const toHomeContent = (authentication, sectionLoads) => ({
    errors: toSectionErrors(sectionLoads),
    loadedAt: Date.now(),
    sections: sectionLoads.flatMap((result) => result.status === 'fulfilled' && hasItems(result.value) ? [result.value] : []),
    serverTitle: authentication.title,
});
const loadAudiobookshelfItems = async (authentication, fetcher, library, itemType, limit) => {
    if (!library.id) {
        return [];
    }
    const params = new URLSearchParams({ desc: '1', limit: String(limit), sort: 'addedAt' });
    const body = await requestJson(fetcher, `${authentication.url}/api/libraries/${library.id}/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authentication.credential}` },
        method: 'GET',
    });
    return (body.results ?? []).flatMap((item) => {
        if (!item.id) {
            return [];
        }
        const title = itemType === MobileHomeItemType.PODCAST
            ? getAudiobookshelfPodcastTitle(item)
            : getAudiobookshelfTitle(item, 'Untitled audiobook');
        if (!title) {
            return [];
        }
        const source = getMobileContentSource(authentication);
        return {
            addedAt: item.addedAt,
            artworkUrl: buildAudiobookshelfArtworkUrl(authentication, item.id, item.media?.metadata?.imageUrl),
            id: item.id,
            source,
            subtitle: itemType === MobileHomeItemType.AUDIOBOOK
                ? getAudiobookshelfAuthor(item)
                : item.numEpisodes
                    ? `${item.numEpisodes} episodes`
                    : library.name,
            title,
            type: itemType,
        };
    });
};
const loadAudiobookshelfHomeContent = async (authentication, fetcher, limit) => {
    const librariesBody = await requestJson(fetcher, `${authentication.url}/api/libraries`, {
        headers: { Authorization: `Bearer ${authentication.credential}` },
        method: 'GET',
    });
    const libraries = librariesBody.libraries ?? [];
    const bookLibraries = libraries.filter((library) => library.mediaType === 'book');
    const podcastLibraries = libraries.filter((library) => library.mediaType === 'podcast');
    const sectionLoads = await Promise.allSettled([
        Promise.all(bookLibraries.map((library) => loadAudiobookshelfItems(authentication, fetcher, library, MobileHomeItemType.AUDIOBOOK, limit))).then((items) => ({
            id: MobileHomeSectionId.AUDIOBOOKS,
            items: items.flat().slice(0, limit),
            title: 'Audiobooks',
        })),
        Promise.all(podcastLibraries.map((library) => loadAudiobookshelfItems(authentication, fetcher, library, MobileHomeItemType.PODCAST, limit))).then((items) => ({
            id: MobileHomeSectionId.PODCASTS,
            items: items.flat().slice(0, limit),
            title: 'Podcasts',
        })),
    ]);
    return toHomeContent(authentication, sectionLoads);
};
const loadSubsonicAlbums = async (authentication, fetcher, limit, qualityScanLimit) => {
    const body = await requestJson(fetcher, subsonicUrl(authentication, 'getAlbumList2.view', {
        size: limit,
        type: 'newest',
    }));
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load albums');
    const items = (response?.albumList2?.album ?? []).flatMap((album) => {
        const id = album.id?.toString();
        const title = album.name ?? album.title;
        if (!id || !title) {
            return [];
        }
        const createdMs = album.created ? Date.parse(album.created) : NaN;
        return {
            addedAt: Number.isFinite(createdMs) ? createdMs : undefined,
            artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt, album.id),
            id,
            source: getMobileContentSource(authentication),
            subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
            title,
            type: MobileHomeItemType.ALBUM,
        };
    });
    return {
        id: MobileHomeSectionId.RECENTLY_ADDED,
        items: await annotateSubsonicHiResCollections(authentication, fetcher, 'album', items, qualityScanLimit),
        title: 'Recently Added',
    };
};
const loadSubsonicFavoriteAlbumsAndArtists = async (authentication, fetcher, limit, qualityScanLimit) => {
    const body = await requestJson(fetcher, subsonicUrl(authentication, 'getStarred2.view'));
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load favorites');
    const source = getMobileContentSource(authentication);
    const favoriteAlbums = await annotateSubsonicHiResCollections(authentication, fetcher, 'album', (response?.starred2?.album ?? []).slice(0, limit).flatMap((album) => {
        const id = album.id?.toString();
        const title = album.name ?? album.title;
        if (!id || !title) {
            return [];
        }
        return {
            artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt, album.id),
            id,
            source,
            subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
            title,
            type: MobileHomeItemType.ALBUM,
        };
    }), qualityScanLimit);
    const favoriteArtists = (response?.starred2?.artist ?? [])
        .slice(0, limit)
        .flatMap((artist) => {
        const id = artist.id?.toString();
        if (!id || !artist.name) {
            return [];
        }
        return {
            artworkUrl: subsonicCoverArtUrl(authentication, artist.coverArt, artist.id),
            id,
            source,
            subtitle: artist.albumCount ? `${artist.albumCount} albums` : undefined,
            title: artist.name,
            type: MobileHomeItemType.ARTIST,
        };
    });
    return [
        { id: MobileHomeSectionId.FAVORITE_ALBUMS, items: favoriteAlbums, title: 'Favorite Albums' },
        {
            id: MobileHomeSectionId.FAVORITE_ARTISTS,
            items: favoriteArtists,
            title: 'Favorite Artists',
        },
    ].filter(hasItems);
};
const loadSubsonicPlaylists = async (authentication, fetcher) => {
    const body = await requestJson(fetcher, subsonicUrl(authentication, 'getPlaylists.view'));
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load playlists');
    const items = (response?.playlists?.playlist ?? []).flatMap((playlist) => {
        const id = playlist.id?.toString();
        if (!id || !playlist.name) {
            return [];
        }
        return {
            artworkUrl: subsonicCoverArtUrl(authentication, playlist.coverArt, playlist.id),
            id,
            source: getMobileContentSource(authentication),
            subtitle: playlist.songCount ? `${playlist.songCount} songs` : playlist.owner,
            title: playlist.name,
            type: MobileHomeItemType.PLAYLIST,
        };
    });
    // Playlists are mixed format by design — never run the hi-res scan or
    // stamp a collection-level badge on them. Per-track quality still shows
    // up on each row inside the playlist detail.
    return {
        id: MobileHomeSectionId.PLAYLISTS,
        items,
        title: 'Playlists',
    };
};
const loadSubsonicRadio = async (authentication, fetcher) => {
    const body = await requestJson(fetcher, subsonicUrl(authentication, 'getInternetRadioStations.view'));
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load radio stations');
    return {
        id: MobileHomeSectionId.RADIO,
        items: (response?.internetRadioStations?.internetRadioStation ?? []).flatMap((station) => {
            const artworkUrl = subsonicCoverArtUrl(authentication, station.coverArt);
            const playback = buildRadioPlayback(authentication, station, artworkUrl);
            if (!station.id || !station.name) {
                return [];
            }
            return {
                artworkUrl,
                id: station.id,
                playback: playback ?? undefined,
                source: getMobileContentSource(authentication),
                subtitle: station.homepageUrl ?? station.streamUrl,
                title: station.name,
                type: MobileHomeItemType.RADIO,
            };
        }),
        title: 'Radio',
    };
};
const loadSubsonicHomeContent = async (authentication, fetcher, limit, qualityScanLimit) => {
    const [favoritesResult, ...sectionLoads] = await Promise.allSettled([
        loadSubsonicFavoriteAlbumsAndArtists(authentication, fetcher, limit, qualityScanLimit),
        loadSubsonicAlbums(authentication, fetcher, limit, qualityScanLimit),
        loadSubsonicPlaylists(authentication, fetcher),
        loadSubsonicRadio(authentication, fetcher),
    ]);
    const favoriteLoads = favoritesResult.status === 'fulfilled'
        ? favoritesResult.value.map((section) => ({
            status: 'fulfilled',
            value: section,
        }))
        : [
            {
                reason: favoritesResult.reason,
                status: 'rejected',
            },
        ];
    return toHomeContent(authentication, [...favoriteLoads, ...sectionLoads]);
};
export const loadMobileHomeContent = async ({ authentication, fetch: fetcher, limit = DEFAULT_HOME_LIMIT, qualityScanLimit = limit, }) => {
    const request = getFetch(fetcher);
    if (authentication.type === ServerType.AUDIOBOOKSHELF) {
        return loadAudiobookshelfHomeContent(authentication, request, limit);
    }
    if (authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC) {
        return loadSubsonicHomeContent(authentication, request, limit, qualityScanLimit);
    }
    throw new Error('Home content is not wired for this server type');
};
const getHomeFailureSectionId = (authentication) => {
    return authentication.type === ServerType.AUDIOBOOKSHELF
        ? MobileHomeSectionId.AUDIOBOOKS
        : MobileHomeSectionId.RECENTLY_ADDED;
};
// Subsonic pagination is offset-based; libraries beyond ~5k albums need
// multiple round-trips. 500 hits the sweet spot where Navidrome still returns
// fast (~100ms) but we don't waste a dozen requests for the typical user.
const FULL_COLLECTION_PAGE_SIZE = 500;
// Cap iterations as a safety so a misbehaving server can't loop forever.
const FULL_COLLECTION_MAX_PAGES = 40;
const loadAllSubsonicAlbums = async (authentication, fetcher) => {
    const source = getMobileContentSource(authentication);
    const items = [];
    for (let page = 0; page < FULL_COLLECTION_MAX_PAGES; page += 1) {
        const body = await requestJson(fetcher, subsonicUrl(authentication, 'getAlbumList2.view', {
            offset: page * FULL_COLLECTION_PAGE_SIZE,
            size: FULL_COLLECTION_PAGE_SIZE,
            type: 'alphabeticalByName',
        }));
        const response = body['subsonic-response'];
        assertSubsonicOk(response, 'Failed to load albums');
        const albums = response?.albumList2?.album ?? [];
        if (albums.length === 0) {
            break;
        }
        for (const album of albums) {
            const id = album.id?.toString();
            const title = album.name ?? album.title;
            if (!id || !title)
                continue;
            const createdMs = album.created ? Date.parse(album.created) : NaN;
            items.push({
                addedAt: Number.isFinite(createdMs) ? createdMs : undefined,
                artworkUrl: subsonicCoverArtUrl(authentication, album.coverArt, album.id),
                id,
                source,
                subtitle: album.artist ?? (album.year ? String(album.year) : undefined),
                title,
                type: MobileHomeItemType.ALBUM,
            });
        }
        if (albums.length < FULL_COLLECTION_PAGE_SIZE) {
            break;
        }
    }
    return items;
};
const loadAllSubsonicArtists = async (authentication, fetcher) => {
    // getArtists.view returns ALL artists in one shot, grouped by alphabet
    // index — no pagination needed. This matches how Navidrome exposes the
    // artist library to other clients and avoids the inconsistent paging
    // semantics on getArtistList variants.
    const body = await requestJson(fetcher, subsonicUrl(authentication, 'getArtists.view'));
    const response = body['subsonic-response'];
    assertSubsonicOk(response, 'Failed to load artists');
    const source = getMobileContentSource(authentication);
    const items = [];
    for (const index of response?.artists?.index ?? []) {
        for (const artist of index.artist ?? []) {
            const id = artist.id?.toString();
            if (!id || !artist.name)
                continue;
            items.push({
                artworkUrl: subsonicCoverArtUrl(authentication, artist.coverArt, artist.id),
                id,
                source,
                subtitle: artist.albumCount ? `${artist.albumCount} albums` : undefined,
                title: artist.name,
                type: MobileHomeItemType.ARTIST,
            });
        }
    }
    return items;
};
const loadAllSubsonicPlaylists = async (authentication, fetcher) => {
    // getPlaylists.view already returns the complete list — we can reuse the
    // home-page loader unchanged, just without the home-page item cap.
    const section = await loadSubsonicPlaylists(authentication, fetcher);
    return section.items;
};
const loadAllAudiobookshelfItems = async (authentication, fetcher, itemType) => {
    const librariesBody = await requestJson(fetcher, `${authentication.url}/api/libraries`, {
        headers: { Authorization: `Bearer ${authentication.credential}` },
        method: 'GET',
    });
    const libraries = (librariesBody.libraries ?? []).filter((library) => library.mediaType === (itemType === MobileHomeItemType.PODCAST ? 'podcast' : 'book'));
    const perLibrary = await Promise.all(libraries.map((library) => loadAudiobookshelfItems(authentication, fetcher, library, itemType, FULL_COLLECTION_PAGE_SIZE * FULL_COLLECTION_MAX_PAGES)));
    return perLibrary.flat();
};
/**
 * Cap on the per-album quality scan when exploding the full library —
 * scanning every album in a 10k-track collection would be a per-album HTTP
 * fan-out we don't want to pay for at View-All open time. 200 covers the
 * top of the alphabetical sweep that the user is most likely to scroll
 * through; the rest pass through unbadged until the user opens them.
 */
const FULL_COLLECTION_QUALITY_SCAN_LIMIT = 200;
const loadFullCollectionForServer = async (authentication, fetcher, variant, qualityScanLimit) => {
    const subsonic = authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC;
    const audiobookshelf = authentication.type === ServerType.AUDIOBOOKSHELF;
    switch (variant) {
        case 'album': {
            if (!subsonic)
                return [];
            const albums = await loadAllSubsonicAlbums(authentication, fetcher);
            // Annotate the first chunk so the View All grid renders badges
            // alongside the badge-bearing tiles the user sees on Home. The
            // tail of huge libraries stays unbadged at this surface — opening
            // any individual album still shows the correct format.
            return annotateSubsonicAlbumsQuality(authentication, fetcher, albums, qualityScanLimit);
        }
        case 'artist':
            return subsonic ? loadAllSubsonicArtists(authentication, fetcher) : [];
        case 'audiobook':
            return audiobookshelf
                ? loadAllAudiobookshelfItems(authentication, fetcher, MobileHomeItemType.AUDIOBOOK)
                : [];
        case 'playlist':
            return subsonic ? loadAllSubsonicPlaylists(authentication, fetcher) : [];
        case 'podcast':
            return audiobookshelf
                ? loadAllAudiobookshelfItems(authentication, fetcher, MobileHomeItemType.PODCAST)
                : [];
    }
};
/**
 * Load the COMPLETE list of items for a given collection variant across every
 * connected server. Used by the "View All" screens — Home only fetches the top
 * slice of each section, but the View All grids are supposed to be exhaustive.
 *
 * Failures from individual servers are bubbled up as errors but never block
 * the items returned by other servers — partial connectivity should still
 * show whatever it can.
 */
export const loadMobileFullCollection = async ({ authentications, fetch: fetcher, qualityScanLimit = FULL_COLLECTION_QUALITY_SCAN_LIMIT, variant, }) => {
    if (authentications.length === 0) {
        return { errors: [], items: [] };
    }
    const request = getFetch(fetcher);
    const results = await Promise.allSettled(authentications.map((authentication) => loadFullCollectionForServer(authentication, request, variant, qualityScanLimit)));
    const items = [];
    const errors = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            items.push(...result.value);
        }
        else {
            errors.push(`${authentications[index].title}: ${getErrorMessage(result.reason)}`);
        }
    });
    return { errors, items };
};
export const loadMobileHomeContentForServers = async ({ authentications, fetch: fetcher, limit = DEFAULT_HOME_LIMIT, qualityScanLimit = limit, }) => {
    const loadedAt = Date.now();
    if (authentications.length === 0) {
        return {
            errors: [],
            loadedAt,
            sections: [],
            serverTitle: '',
        };
    }
    const request = getFetch(fetcher);
    const contentLoads = await Promise.allSettled(authentications.map((authentication) => loadMobileHomeContent({
        authentication,
        fetch: request,
        limit,
        qualityScanLimit,
    })));
    const sectionsById = new Map();
    const errors = [];
    let fulfilledCount = 0;
    contentLoads.forEach((result, index) => {
        const authentication = authentications[index];
        if (result.status === 'rejected') {
            errors.push({
                message: `${authentication.title}: ${getErrorMessage(result.reason)}`,
                sectionId: getHomeFailureSectionId(authentication),
            });
            return;
        }
        fulfilledCount += 1;
        errors.push(...result.value.errors);
        result.value.sections.forEach((section) => {
            const existingSection = sectionsById.get(section.id);
            if (existingSection) {
                existingSection.items.push(...section.items);
                return;
            }
            sectionsById.set(section.id, { ...section, items: [...section.items] });
        });
    });
    if (fulfilledCount === 0) {
        throw new Error(errors[0]?.message ?? 'Failed to load Home content');
    }
    return {
        errors,
        loadedAt,
        sections: [...sectionsById.values()].filter(hasItems),
        serverTitle: authentications.map((authentication) => authentication.title).join(' + '),
    };
};
