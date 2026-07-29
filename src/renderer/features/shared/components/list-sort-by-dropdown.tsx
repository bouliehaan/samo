import { Dispatch, SetStateAction } from 'react';

import i18n from '/@/i18n/i18n';
import { useSortByFilter } from '/@/renderer/features/shared/hooks/use-sort-by-filter';
import { Button } from '/@/shared/components/button/button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import {
    AlbumListSort,
    ArtistListSort,
    GenreListSort,
    LibraryItem,
    PlaylistListSort,
    RadioListSort,
    SongListSort,
    SortOrder,
} from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

interface ListSortByDropdownProps {
    defaultSortByValue: string;
    disabled?: boolean;
    includeId?: boolean;
    itemType: LibraryItem;
    listKey: ItemListKey;
    onChange?: (value: string) => void;
    target?: React.ReactNode;
}

export const ListSortByDropdown = ({
    defaultSortByValue,
    disabled,
    itemType,
    listKey,
    onChange,
    target,
}: ListSortByDropdownProps) => {
    const { setSortBy, sortBy } = useSortByFilter(defaultSortByValue, listKey);

    const availableFilters = (itemType && FILTERS[itemType]) || false || [];

    const sortByLabel = availableFilters.find((f) => f.value === sortBy)?.name || '—';

    const handleSortByChange = (sortBy: string) => {
        setSortBy(sortBy);
        onChange?.(sortBy);
    };

    return (
        <DropdownMenu disabled={disabled} position="bottom-start">
            <DropdownMenu.Target>
                {target ? (
                    target
                ) : (
                    <Button disabled={disabled} variant="subtle">
                        {sortByLabel}
                    </Button>
                )}
            </DropdownMenu.Target>
            <DropdownMenu.Dropdown>
                {availableFilters.map((f) => (
                    <DropdownMenu.Item
                        isSelected={f.value === sortBy}
                        key={`filter-${f.name}`}
                        onClick={() => handleSortByChange(f.value)}
                        value={f.value}
                    >
                        {f.name}
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.Dropdown>
        </DropdownMenu>
    );
};

interface ListSortByDropdownControlledProps {
    disabled?: boolean;
    filters?: Array<{ defaultOrder: SortOrder; name: string; value: string }>;
    itemType: LibraryItem;
    setSortBy: Dispatch<SetStateAction<string>>;
    sortBy: string;
    target?: React.ReactNode;
}

export const ListSortByDropdownControlled = ({
    disabled,
    filters,
    itemType,
    setSortBy,
    sortBy,
    target,
}: ListSortByDropdownControlledProps) => {
    const availableFilters = filters || (itemType && FILTERS[itemType]) || [];

    const sortByLabel = availableFilters.find((f) => f.value === sortBy)?.name || '—';

    const handleSortByChange = (sortBy: string) => {
        setSortBy(sortBy);
    };

    return (
        <DropdownMenu disabled={disabled} position="bottom-start">
            <DropdownMenu.Target>
                {target ? (
                    target
                ) : (
                    <Button disabled={disabled} variant="subtle">
                        {sortByLabel}
                    </Button>
                )}
            </DropdownMenu.Target>
            <DropdownMenu.Dropdown>
                {availableFilters.map((f) => (
                    <DropdownMenu.Item
                        isSelected={f.value === sortBy}
                        key={`filter-${f.name}`}
                        onClick={() => handleSortByChange(f.value)}
                        value={f.value}
                    >
                        {f.name}
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.Dropdown>
        </DropdownMenu>
    );
};

export const CLIENT_SIDE_SONG_FILTERS = [
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.id', { postProcess: 'titleCase' }),
        value: SongListSort.ID,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.album', { postProcess: 'titleCase' }),
        value: SongListSort.ALBUM,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.albumArtist', { postProcess: 'titleCase' }),
        value: SongListSort.ALBUM_ARTIST,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.artist', { postProcess: 'titleCase' }),
        value: SongListSort.ARTIST,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.bpm', { postProcess: 'titleCase' }),
        value: SongListSort.BPM,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('common.channel', { count: 2, postProcess: 'titleCase' }),
        value: SongListSort.CHANNELS,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.comment', { postProcess: 'titleCase' }),
        value: SongListSort.COMMENT,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.duration', { postProcess: 'titleCase' }),
        value: SongListSort.DURATION,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.isFavorited', { postProcess: 'titleCase' }),
        value: SongListSort.FAVORITED,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.genre', { postProcess: 'titleCase' }),
        value: SongListSort.GENRE,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.name', { postProcess: 'titleCase' }),
        value: SongListSort.NAME,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.sortName', { postProcess: 'titleCase' }),
        value: SongListSort.SORT_NAME,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.playCount', { postProcess: 'titleCase' }),
        value: SongListSort.PLAY_COUNT,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.recentlyAdded', { postProcess: 'titleCase' }),
        value: SongListSort.RECENTLY_ADDED,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.recentlyPlayed', { postProcess: 'titleCase' }),
        value: SongListSort.RECENTLY_PLAYED,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.releaseYear', { postProcess: 'titleCase' }),
        value: SongListSort.YEAR,
    },
];

export const CLIENT_SIDE_ALBUM_FILTERS = [
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.albumArtist', { postProcess: 'titleCase' }),
        value: AlbumListSort.ALBUM_ARTIST,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.id', { postProcess: 'titleCase' }),
        value: AlbumListSort.ID,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.duration', { postProcess: 'titleCase' }),
        value: AlbumListSort.DURATION,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.favorited', { postProcess: 'titleCase' }),
        value: AlbumListSort.FAVORITED,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.name', { postProcess: 'titleCase' }),
        value: AlbumListSort.NAME,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.sortName', { postProcess: 'titleCase' }),
        value: AlbumListSort.SORT_NAME,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.playCount', { postProcess: 'titleCase' }),
        value: AlbumListSort.PLAY_COUNT,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.random', { postProcess: 'titleCase' }),
        value: AlbumListSort.RANDOM,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.recentlyAdded', { postProcess: 'titleCase' }),
        value: AlbumListSort.RECENTLY_ADDED,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.recentlyPlayed', { postProcess: 'titleCase' }),
        value: AlbumListSort.RECENTLY_PLAYED,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.releaseDate', { postProcess: 'titleCase' }),
        value: AlbumListSort.RELEASE_DATE,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.releaseYear', { postProcess: 'titleCase' }),
        value: AlbumListSort.YEAR,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.songCount', { postProcess: 'titleCase' }),
        value: AlbumListSort.SONG_COUNT,
    },
];

const ALBUM_LIST_FILTERS: Array<{ defaultOrder: SortOrder; name: string; value: string }> = [
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.albumArtist', { postProcess: 'titleCase' }),
        value: AlbumListSort.ALBUM_ARTIST,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.id', { postProcess: 'titleCase' }),
        value: AlbumListSort.ID,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.name', { postProcess: 'titleCase' }),
        value: AlbumListSort.NAME,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.playCount', { postProcess: 'titleCase' }),
        value: AlbumListSort.PLAY_COUNT,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.random', { postProcess: 'titleCase' }),
        value: AlbumListSort.RANDOM,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.recentlyAdded', { postProcess: 'titleCase' }),
        value: AlbumListSort.RECENTLY_ADDED,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.releaseDate', { postProcess: 'titleCase' }),
        value: AlbumListSort.RELEASE_DATE,
    },
];

const SONG_LIST_FILTERS: Array<{ defaultOrder: SortOrder; name: string; value: string }> = [
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.album', { postProcess: 'titleCase' }),
        value: SongListSort.ALBUM,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.albumArtist', { postProcess: 'titleCase' }),
        value: SongListSort.ALBUM_ARTIST,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.artist', { postProcess: 'titleCase' }),
        value: SongListSort.ARTIST,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.duration', { postProcess: 'titleCase' }),
        value: SongListSort.DURATION,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.playCount', { postProcess: 'titleCase' }),
        value: SongListSort.PLAY_COUNT,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.name', { postProcess: 'titleCase' }),
        value: SongListSort.NAME,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.random', { postProcess: 'titleCase' }),
        value: SongListSort.RANDOM,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.recentlyAdded', { postProcess: 'titleCase' }),
        value: SongListSort.RECENTLY_ADDED,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.recentlyPlayed', { postProcess: 'titleCase' }),
        value: SongListSort.RECENTLY_PLAYED,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.releaseDate', { postProcess: 'titleCase' }),
        value: SongListSort.RELEASE_DATE,
    },
];

const ARTIST_LIST_FILTERS: Array<{ defaultOrder: SortOrder; name: string; value: string }> = [
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.album', { postProcess: 'titleCase' }),
        value: ArtistListSort.ALBUM,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.duration', { postProcess: 'titleCase' }),
        value: ArtistListSort.DURATION,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.name', { postProcess: 'titleCase' }),
        value: ArtistListSort.NAME,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.random', { postProcess: 'titleCase' }),
        value: ArtistListSort.RANDOM,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.recentlyAdded', { postProcess: 'titleCase' }),
        value: ArtistListSort.RECENTLY_ADDED,
    },
];

const GENRE_LIST_FILTERS: Array<{ defaultOrder: SortOrder; name: string; value: string }> = [
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.name', { postProcess: 'titleCase' }),
        value: GenreListSort.NAME,
    },
];

const PLAYLIST_LIST_FILTERS: Array<{ defaultOrder: SortOrder; name: string; value: string }> = [
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.duration', { postProcess: 'titleCase' }),
        value: PlaylistListSort.DURATION,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.name', { postProcess: 'titleCase' }),
        value: PlaylistListSort.NAME,
    },
    {
        defaultOrder: SortOrder.DESC,
        name: i18n.t('filter.songCount', { postProcess: 'titleCase' }),
        value: PlaylistListSort.SONG_COUNT,
    },
];

const RADIO_LIST_FILTERS: Array<{ defaultOrder: SortOrder; name: string; value: string }> = [
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.id', { postProcess: 'titleCase' }),
        value: RadioListSort.ID,
    },
    {
        defaultOrder: SortOrder.ASC,
        name: i18n.t('filter.name', { postProcess: 'titleCase' }),
        value: RadioListSort.NAME,
    },
];

/** Samo list pages sort client-side today — these are the shared sort options. */
const ALBUM_ARTIST_LIST_FILTERS = ARTIST_LIST_FILTERS;
const PLAYLIST_SONG_LIST_FILTERS = CLIENT_SIDE_SONG_FILTERS;

const FILTERS: Partial<Record<LibraryItem, any>> = {
    [LibraryItem.ALBUM]: ALBUM_LIST_FILTERS,
    [LibraryItem.ALBUM_ARTIST]: ALBUM_ARTIST_LIST_FILTERS,
    [LibraryItem.ARTIST]: ARTIST_LIST_FILTERS,
    [LibraryItem.GENRE]: GENRE_LIST_FILTERS,
    [LibraryItem.PLAYLIST]: PLAYLIST_LIST_FILTERS,
    [LibraryItem.PLAYLIST_SONG]: PLAYLIST_SONG_LIST_FILTERS,
    [LibraryItem.RADIO_STATION]: RADIO_LIST_FILTERS,
    [LibraryItem.SONG]: SONG_LIST_FILTERS,
};
