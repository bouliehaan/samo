import { z } from 'zod';
export declare enum NDAlbumArtistListSort {
    ALBUM_COUNT = "albumCount",
    FAVORITED = "starred_at",
    NAME = "name",
    PLAY_COUNT = "playCount",
    RATING = "rating",
    SONG_COUNT = "songCount"
}
export declare enum NDAlbumListSort {
    ALBUM_ARTIST = "album_artist",
    ARTIST = "artist",
    DURATION = "duration",
    EXPLICIT_STATUS = "explicitStatus",
    NAME = "name",
    PLAY_COUNT = "play_count",
    PLAY_DATE = "play_date",
    RANDOM = "random",
    RATING = "rating",
    RECENTLY_ADDED = "recently_added",
    SONG_COUNT = "songCount",
    STARRED = "starred_at",
    YEAR = "max_year"
}
export declare enum NDGenreListSort {
    NAME = "name"
}
export declare enum NDPlaylistListSort {
    DURATION = "duration",
    NAME = "name",
    OWNER = "owner_name",
    PUBLIC = "public",
    SONG_COUNT = "songCount",
    UPDATED_AT = "updatedAt"
}
export declare enum NDSongListSort {
    ALBUM = "album",
    ALBUM_ARTIST = "order_album_artist_name",
    ALBUM_SONGS = "album",
    ARTIST = "artist",
    BPM = "bpm",
    CHANNELS = "channels",
    COMMENT = "comment",
    DURATION = "duration",
    EXPLICIT_STATUS = "explicitStatus",
    FAVORITED = "starred_at",
    GENRE = "genre",
    ID = "id",
    PLAY_COUNT = "playCount",
    PLAY_DATE = "playDate",
    RANDOM = "random",
    RATING = "rating",
    RECENTLY_ADDED = "createdAt",
    TITLE = "title",
    TRACK = "track",
    YEAR = "year"
}
export declare enum NDSortOrder {
    ASC = "ASC",
    DESC = "DESC"
}
export declare const NDSongQueryFields: {
    label: string;
    type: string;
    value: string;
}[];
export declare const NDSongQueryFieldsLabelMap: Record<string, string>;
export declare const NDSongQueryPlaylistOperators: {
    label: string;
    value: string;
}[];
export declare const NDSongQueryDateOperators: {
    label: string;
    value: string;
}[];
export declare const NDSongQueryStringOperators: {
    label: string;
    value: string;
}[];
export declare const NDSongQueryBooleanOperators: {
    label: string;
    value: string;
}[];
export declare const NDSongQueryNumberOperators: {
    label: string;
    value: string;
}[];
export declare enum NDUserListSort {
    NAME = "name"
}
export declare enum NDTagListSort {
    TAG_VALUE = "tagValue"
}
export declare enum NDRadioListSort {
    NAME = "name"
}
export declare const ndType: {
    _enum: {
        albumArtistList: typeof NDAlbumArtistListSort;
        albumList: typeof NDAlbumListSort;
        genreList: {
            readonly NAME: "name";
            readonly SONG_COUNT: "songCount";
        };
        playlistList: typeof NDPlaylistListSort;
        radioList: typeof NDRadioListSort;
        songList: typeof NDSongListSort;
        tagList: typeof NDTagListSort;
        userList: {
            readonly NAME: "name";
        };
    };
    _parameters: {
        addToPlaylist: z.ZodObject<{
            ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            ids: string[];
        }, {
            ids: string[];
        }>;
        albumArtistList: z.ZodObject<{
            _end: z.ZodOptional<z.ZodNumber>;
            _order: z.ZodEnum<["ASC", "DESC"]>;
            _start: z.ZodOptional<z.ZodNumber>;
        } & {
            _sort: z.ZodOptional<z.ZodNativeEnum<typeof NDAlbumArtistListSort>>;
            genre_id: z.ZodOptional<z.ZodString>;
            library_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            missing: z.ZodOptional<z.ZodBoolean>;
            name: z.ZodOptional<z.ZodString>;
            role: z.ZodOptional<z.ZodString>;
            starred: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            _order: "ASC" | "DESC";
            name?: string | undefined;
            library_id?: string[] | undefined;
            missing?: boolean | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: NDAlbumArtistListSort | undefined;
            genre_id?: string | undefined;
            role?: string | undefined;
            starred?: boolean | undefined;
        }, {
            _order: "ASC" | "DESC";
            name?: string | undefined;
            library_id?: string[] | undefined;
            missing?: boolean | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: NDAlbumArtistListSort | undefined;
            genre_id?: string | undefined;
            role?: string | undefined;
            starred?: boolean | undefined;
        }>;
        albumList: z.ZodObject<{
            _end: z.ZodOptional<z.ZodNumber>;
            _order: z.ZodEnum<["ASC", "DESC"]>;
            _start: z.ZodOptional<z.ZodNumber>;
        } & {
            _sort: z.ZodOptional<z.ZodNativeEnum<typeof NDAlbumListSort>>;
            album_id: z.ZodOptional<z.ZodString>;
            artist_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
            compilation: z.ZodOptional<z.ZodBoolean>;
            genre_id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
            has_rating: z.ZodOptional<z.ZodBoolean>;
            id: z.ZodOptional<z.ZodString>;
            library_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            name: z.ZodOptional<z.ZodString>;
            recently_added: z.ZodOptional<z.ZodBoolean>;
            recently_played: z.ZodOptional<z.ZodBoolean>;
            starred: z.ZodOptional<z.ZodBoolean>;
            year: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            _order: "ASC" | "DESC";
            id?: string | undefined;
            name?: string | undefined;
            year?: number | undefined;
            compilation?: boolean | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: NDAlbumListSort | undefined;
            genre_id?: string | string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string | undefined;
            artist_id?: string | string[] | undefined;
            has_rating?: boolean | undefined;
            recently_added?: boolean | undefined;
            recently_played?: boolean | undefined;
        }, {
            _order: "ASC" | "DESC";
            id?: string | undefined;
            name?: string | undefined;
            year?: number | undefined;
            compilation?: boolean | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: NDAlbumListSort | undefined;
            genre_id?: string | string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string | undefined;
            artist_id?: string | string[] | undefined;
            has_rating?: boolean | undefined;
            recently_added?: boolean | undefined;
            recently_played?: boolean | undefined;
        }>;
        authenticate: z.ZodObject<{
            password: z.ZodString;
            username: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            password: string;
            username: string;
        }, {
            password: string;
            username: string;
        }>;
        createPlaylist: z.ZodObject<{
            comment: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            ownerId: z.ZodOptional<z.ZodString>;
            public: z.ZodOptional<z.ZodBoolean>;
            rules: z.ZodOptional<z.ZodObject<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodAny, z.objectOutputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">, z.objectInputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">>>;
            sync: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: z.objectOutputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        }, {
            name: string;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: z.objectInputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        }>;
        genreList: z.ZodObject<{
            _end: z.ZodOptional<z.ZodNumber>;
            _order: z.ZodEnum<["ASC", "DESC"]>;
            _start: z.ZodOptional<z.ZodNumber>;
        } & {
            _sort: z.ZodOptional<z.ZodNativeEnum<{
                readonly NAME: "name";
                readonly SONG_COUNT: "songCount";
            }>>;
            library_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            _order: "ASC" | "DESC";
            name?: string | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: "name" | "songCount" | undefined;
        }, {
            _order: "ASC" | "DESC";
            name?: string | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: "name" | "songCount" | undefined;
        }>;
        moveItem: z.ZodObject<{
            insert_before: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            insert_before: string;
        }, {
            insert_before: string;
        }>;
        playlistList: z.ZodObject<{
            _end: z.ZodOptional<z.ZodNumber>;
            _order: z.ZodEnum<["ASC", "DESC"]>;
            _start: z.ZodOptional<z.ZodNumber>;
        } & {
            _sort: z.ZodOptional<z.ZodNativeEnum<typeof NDPlaylistListSort>>;
            owner_id: z.ZodOptional<z.ZodString>;
            q: z.ZodOptional<z.ZodString>;
            smart: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            _order: "ASC" | "DESC";
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: NDPlaylistListSort | undefined;
            owner_id?: string | undefined;
            q?: string | undefined;
            smart?: boolean | undefined;
        }, {
            _order: "ASC" | "DESC";
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: NDPlaylistListSort | undefined;
            owner_id?: string | undefined;
            q?: string | undefined;
            smart?: boolean | undefined;
        }>;
        radioList: z.ZodObject<{
            _end: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
            _order: z.ZodOptional<z.ZodEnum<["ASC", "DESC"]>>;
            _start: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        } & {
            _sort: z.ZodOptional<z.ZodNativeEnum<typeof NDRadioListSort>>;
        }, "strip", z.ZodTypeAny, {
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: NDRadioListSort | undefined;
        }, {
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: NDRadioListSort | undefined;
        }>;
        removeFromPlaylist: z.ZodObject<{
            id: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string[];
        }, {
            id: string[];
        }>;
        saveQueue: z.ZodObject<{
            current: z.ZodOptional<z.ZodNumber>;
            ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            position: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            position?: number | undefined;
            ids?: string[] | undefined;
            current?: number | undefined;
        }, {
            position?: number | undefined;
            ids?: string[] | undefined;
            current?: number | undefined;
        }>;
        shareItem: z.ZodObject<{
            description: z.ZodString;
            downloadable: z.ZodBoolean;
            expires: z.ZodNumber;
            resourceIds: z.ZodString;
            resourceType: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            description: string;
            downloadable: boolean;
            expires: number;
            resourceIds: string;
            resourceType: string;
        }, {
            description: string;
            downloadable: boolean;
            expires: number;
            resourceIds: string;
            resourceType: string;
        }>;
        songList: z.ZodObject<{
            _end: z.ZodOptional<z.ZodNumber>;
            _order: z.ZodEnum<["ASC", "DESC"]>;
            _start: z.ZodOptional<z.ZodNumber>;
        } & {
            _sort: z.ZodOptional<z.ZodNativeEnum<typeof NDSongListSort>>;
            album_artist_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            album_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            artist_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            artists_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            genre_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            has_rating: z.ZodOptional<z.ZodBoolean>;
            library_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            path: z.ZodOptional<z.ZodString>;
            starred: z.ZodOptional<z.ZodBoolean>;
            title: z.ZodOptional<z.ZodString>;
            year: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            _order: "ASC" | "DESC";
            path?: string | undefined;
            title?: string | undefined;
            year?: number | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: NDSongListSort | undefined;
            genre_id?: string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string[] | undefined;
            artist_id?: string[] | undefined;
            has_rating?: boolean | undefined;
            album_artist_id?: string[] | undefined;
            artists_id?: string[] | undefined;
        }, {
            _order: "ASC" | "DESC";
            path?: string | undefined;
            title?: string | undefined;
            year?: number | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: NDSongListSort | undefined;
            genre_id?: string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string[] | undefined;
            artist_id?: string[] | undefined;
            has_rating?: boolean | undefined;
            album_artist_id?: string[] | undefined;
            artists_id?: string[] | undefined;
        }>;
        tagList: z.ZodObject<{
            _end: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
            _order: z.ZodOptional<z.ZodEnum<["ASC", "DESC"]>>;
            _start: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        } & {
            _sort: z.ZodOptional<z.ZodNativeEnum<typeof NDTagListSort>>;
            library_id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            tag_name: z.ZodOptional<z.ZodString>;
            tag_value: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: NDTagListSort | undefined;
            tag_name?: string | undefined;
            tag_value?: string | undefined;
        }, {
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: NDTagListSort | undefined;
            tag_name?: string | undefined;
            tag_value?: string | undefined;
        }>;
        updateInternetRadioStation: z.ZodObject<{
            homePageUrl: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            streamUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            streamUrl: string;
            homePageUrl?: string | undefined;
        }, {
            name: string;
            streamUrl: string;
            homePageUrl?: string | undefined;
        }>;
        updatePlaylist: z.ZodObject<{
            comment: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            name: z.ZodOptional<z.ZodString>;
            ownerId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            public: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
            rules: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodAny, z.objectOutputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">, z.objectInputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">>>>;
            sync: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            name?: string | undefined;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: z.objectOutputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        }, {
            name?: string | undefined;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: z.objectInputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        }>;
        uploadArtistImage: z.ZodObject<{
            image: z.ZodType<Uint8Array<ArrayBuffer>, z.ZodTypeDef, Uint8Array<ArrayBuffer>>;
        }, "strip", z.ZodTypeAny, {
            image: Uint8Array<ArrayBuffer>;
        }, {
            image: Uint8Array<ArrayBuffer>;
        }>;
        uploadInternetRadioStationImage: z.ZodObject<{
            image: z.ZodType<Uint8Array<ArrayBuffer>, z.ZodTypeDef, Uint8Array<ArrayBuffer>>;
        }, "strip", z.ZodTypeAny, {
            image: Uint8Array<ArrayBuffer>;
        }, {
            image: Uint8Array<ArrayBuffer>;
        }>;
        uploadPlaylistImage: z.ZodObject<{
            image: z.ZodType<Uint8Array<ArrayBuffer>, z.ZodTypeDef, Uint8Array<ArrayBuffer>>;
        }, "strip", z.ZodTypeAny, {
            image: Uint8Array<ArrayBuffer>;
        }, {
            image: Uint8Array<ArrayBuffer>;
        }>;
        userList: z.ZodObject<{
            _end: z.ZodOptional<z.ZodNumber>;
            _order: z.ZodEnum<["ASC", "DESC"]>;
            _start: z.ZodOptional<z.ZodNumber>;
        } & {
            _sort: z.ZodOptional<z.ZodNativeEnum<{
                readonly NAME: "name";
            }>>;
        }, "strip", z.ZodTypeAny, {
            _order: "ASC" | "DESC";
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: "name" | undefined;
        }, {
            _order: "ASC" | "DESC";
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: "name" | undefined;
        }>;
    };
    _response: {
        addToPlaylist: z.ZodObject<{
            added: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            added: number;
        }, {
            added: number;
        }>;
        album: z.ZodObject<{
            albumArtist: z.ZodString;
            albumArtistId: z.ZodString;
            allArtistIds: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodString;
            catalogNum: z.ZodOptional<z.ZodString>;
            comment: z.ZodOptional<z.ZodString>;
            compilation: z.ZodBoolean;
            coverArtId: z.ZodOptional<z.ZodString>;
            coverArtPath: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodString;
            duration: z.ZodOptional<z.ZodNumber>;
            explicitStatus: z.ZodOptional<z.ZodString>;
            externalInfoUpdatedAt: z.ZodOptional<z.ZodString>;
            externalUrl: z.ZodOptional<z.ZodString>;
            fullText: z.ZodString;
            genre: z.ZodString;
            genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">>;
            id: z.ZodString;
            importedAt: z.ZodOptional<z.ZodString>;
            libraryId: z.ZodNumber;
            libraryName: z.ZodString;
            libraryPath: z.ZodString;
            maxOriginalYear: z.ZodOptional<z.ZodNumber>;
            maxYear: z.ZodNumber;
            mbzAlbumArtistId: z.ZodOptional<z.ZodString>;
            mbzAlbumId: z.ZodOptional<z.ZodString>;
            mbzAlbumType: z.ZodOptional<z.ZodString>;
            mbzReleaseGroupId: z.ZodOptional<z.ZodString>;
            minOriginalYear: z.ZodOptional<z.ZodNumber>;
            minYear: z.ZodNumber;
            name: z.ZodString;
            orderAlbumArtistName: z.ZodString;
            orderAlbumName: z.ZodString;
            originalDate: z.ZodOptional<z.ZodString>;
            participants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }>, "many">>>;
            playCount: z.ZodOptional<z.ZodNumber>;
            playDate: z.ZodOptional<z.ZodString>;
            rating: z.ZodOptional<z.ZodNumber>;
            releaseDate: z.ZodOptional<z.ZodString>;
            size: z.ZodNumber;
            songCount: z.ZodNumber;
            sortAlbumArtistName: z.ZodString;
            sortArtistName: z.ZodString;
            starred: z.ZodBoolean;
            starredAt: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
            updatedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            size: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            songCount: number;
            starred: boolean;
            albumArtistId: string;
            allArtistIds: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            libraryId: number;
            libraryName: string;
            libraryPath: string;
            maxYear: number;
            minYear: number;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            tags?: Record<string, string[]> | undefined;
            duration?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            catalogNum?: string | undefined;
            coverArtId?: string | undefined;
            coverArtPath?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            importedAt?: string | undefined;
            maxOriginalYear?: number | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            mbzAlbumType?: string | undefined;
            mbzReleaseGroupId?: string | undefined;
            minOriginalYear?: number | undefined;
            originalDate?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
        }, {
            id: string;
            name: string;
            size: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            songCount: number;
            starred: boolean;
            albumArtistId: string;
            allArtistIds: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            libraryId: number;
            libraryName: string;
            libraryPath: string;
            maxYear: number;
            minYear: number;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            tags?: Record<string, string[]> | undefined;
            duration?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            catalogNum?: string | undefined;
            coverArtId?: string | undefined;
            coverArtPath?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            importedAt?: string | undefined;
            maxOriginalYear?: number | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            mbzAlbumType?: string | undefined;
            mbzReleaseGroupId?: string | undefined;
            minOriginalYear?: number | undefined;
            originalDate?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
        }>;
        albumArtist: z.ZodObject<{
            albumCount: z.ZodNumber;
            biography: z.ZodString;
            createdAt: z.ZodOptional<z.ZodString>;
            externalInfoUpdatedAt: z.ZodString;
            externalUrl: z.ZodString;
            fullText: z.ZodString;
            genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">>;
            id: z.ZodString;
            largeImageUrl: z.ZodOptional<z.ZodString>;
            mbzArtistId: z.ZodOptional<z.ZodString>;
            mediumImageUrl: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            orderArtistName: z.ZodString;
            playCount: z.ZodOptional<z.ZodNumber>;
            playDate: z.ZodOptional<z.ZodString>;
            rating: z.ZodNumber;
            size: z.ZodNumber;
            smallImageUrl: z.ZodOptional<z.ZodString>;
            songCount: z.ZodNumber;
            starred: z.ZodBoolean;
            starredAt: z.ZodString;
            stats: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
                albumCount: z.ZodNumber;
                size: z.ZodNumber;
                songCount: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                size: number;
                songCount: number;
                albumCount: number;
            }, {
                size: number;
                songCount: number;
                albumCount: number;
            }>>>;
            updatedAt: z.ZodOptional<z.ZodString>;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            biography: string;
            name: string;
            rating: number;
            size: number;
            genres: {
                id: string;
                name: string;
            }[] | null;
            songCount: number;
            starred: boolean;
            externalInfoUpdatedAt: string;
            externalUrl: string;
            fullText: string;
            starredAt: string;
            albumCount: number;
            orderArtistName: string;
            createdAt?: string | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            updatedAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            stats?: Record<string, {
                size: number;
                songCount: number;
                albumCount: number;
            }> | undefined;
            uploadedImage?: string | undefined;
        }, {
            id: string;
            biography: string;
            name: string;
            rating: number;
            size: number;
            genres: {
                id: string;
                name: string;
            }[] | null;
            songCount: number;
            starred: boolean;
            externalInfoUpdatedAt: string;
            externalUrl: string;
            fullText: string;
            starredAt: string;
            albumCount: number;
            orderArtistName: string;
            createdAt?: string | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            updatedAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            stats?: Record<string, {
                size: number;
                songCount: number;
                albumCount: number;
            }> | undefined;
            uploadedImage?: string | undefined;
        }>;
        albumArtistList: z.ZodArray<z.ZodObject<{
            albumCount: z.ZodNumber;
            biography: z.ZodString;
            createdAt: z.ZodOptional<z.ZodString>;
            externalInfoUpdatedAt: z.ZodString;
            externalUrl: z.ZodString;
            fullText: z.ZodString;
            genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">>;
            id: z.ZodString;
            largeImageUrl: z.ZodOptional<z.ZodString>;
            mbzArtistId: z.ZodOptional<z.ZodString>;
            mediumImageUrl: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            orderArtistName: z.ZodString;
            playCount: z.ZodOptional<z.ZodNumber>;
            playDate: z.ZodOptional<z.ZodString>;
            rating: z.ZodNumber;
            size: z.ZodNumber;
            smallImageUrl: z.ZodOptional<z.ZodString>;
            songCount: z.ZodNumber;
            starred: z.ZodBoolean;
            starredAt: z.ZodString;
            stats: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
                albumCount: z.ZodNumber;
                size: z.ZodNumber;
                songCount: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                size: number;
                songCount: number;
                albumCount: number;
            }, {
                size: number;
                songCount: number;
                albumCount: number;
            }>>>;
            updatedAt: z.ZodOptional<z.ZodString>;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            biography: string;
            name: string;
            rating: number;
            size: number;
            genres: {
                id: string;
                name: string;
            }[] | null;
            songCount: number;
            starred: boolean;
            externalInfoUpdatedAt: string;
            externalUrl: string;
            fullText: string;
            starredAt: string;
            albumCount: number;
            orderArtistName: string;
            createdAt?: string | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            updatedAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            stats?: Record<string, {
                size: number;
                songCount: number;
                albumCount: number;
            }> | undefined;
            uploadedImage?: string | undefined;
        }, {
            id: string;
            biography: string;
            name: string;
            rating: number;
            size: number;
            genres: {
                id: string;
                name: string;
            }[] | null;
            songCount: number;
            starred: boolean;
            externalInfoUpdatedAt: string;
            externalUrl: string;
            fullText: string;
            starredAt: string;
            albumCount: number;
            orderArtistName: string;
            createdAt?: string | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            updatedAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            stats?: Record<string, {
                size: number;
                songCount: number;
                albumCount: number;
            }> | undefined;
            uploadedImage?: string | undefined;
        }>, "many">;
        albumList: z.ZodArray<z.ZodObject<{
            albumArtist: z.ZodString;
            albumArtistId: z.ZodString;
            allArtistIds: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodString;
            catalogNum: z.ZodOptional<z.ZodString>;
            comment: z.ZodOptional<z.ZodString>;
            compilation: z.ZodBoolean;
            coverArtId: z.ZodOptional<z.ZodString>;
            coverArtPath: z.ZodOptional<z.ZodString>;
            createdAt: z.ZodString;
            duration: z.ZodOptional<z.ZodNumber>;
            explicitStatus: z.ZodOptional<z.ZodString>;
            externalInfoUpdatedAt: z.ZodOptional<z.ZodString>;
            externalUrl: z.ZodOptional<z.ZodString>;
            fullText: z.ZodString;
            genre: z.ZodString;
            genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">>;
            id: z.ZodString;
            importedAt: z.ZodOptional<z.ZodString>;
            libraryId: z.ZodNumber;
            libraryName: z.ZodString;
            libraryPath: z.ZodString;
            maxOriginalYear: z.ZodOptional<z.ZodNumber>;
            maxYear: z.ZodNumber;
            mbzAlbumArtistId: z.ZodOptional<z.ZodString>;
            mbzAlbumId: z.ZodOptional<z.ZodString>;
            mbzAlbumType: z.ZodOptional<z.ZodString>;
            mbzReleaseGroupId: z.ZodOptional<z.ZodString>;
            minOriginalYear: z.ZodOptional<z.ZodNumber>;
            minYear: z.ZodNumber;
            name: z.ZodString;
            orderAlbumArtistName: z.ZodString;
            orderAlbumName: z.ZodString;
            originalDate: z.ZodOptional<z.ZodString>;
            participants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }>, "many">>>;
            playCount: z.ZodOptional<z.ZodNumber>;
            playDate: z.ZodOptional<z.ZodString>;
            rating: z.ZodOptional<z.ZodNumber>;
            releaseDate: z.ZodOptional<z.ZodString>;
            size: z.ZodNumber;
            songCount: z.ZodNumber;
            sortAlbumArtistName: z.ZodString;
            sortArtistName: z.ZodString;
            starred: z.ZodBoolean;
            starredAt: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
            updatedAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            size: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            songCount: number;
            starred: boolean;
            albumArtistId: string;
            allArtistIds: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            libraryId: number;
            libraryName: string;
            libraryPath: string;
            maxYear: number;
            minYear: number;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            tags?: Record<string, string[]> | undefined;
            duration?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            catalogNum?: string | undefined;
            coverArtId?: string | undefined;
            coverArtPath?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            importedAt?: string | undefined;
            maxOriginalYear?: number | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            mbzAlbumType?: string | undefined;
            mbzReleaseGroupId?: string | undefined;
            minOriginalYear?: number | undefined;
            originalDate?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
        }, {
            id: string;
            name: string;
            size: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            songCount: number;
            starred: boolean;
            albumArtistId: string;
            allArtistIds: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            libraryId: number;
            libraryName: string;
            libraryPath: string;
            maxYear: number;
            minYear: number;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            tags?: Record<string, string[]> | undefined;
            duration?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            catalogNum?: string | undefined;
            coverArtId?: string | undefined;
            coverArtPath?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            importedAt?: string | undefined;
            maxOriginalYear?: number | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            mbzAlbumType?: string | undefined;
            mbzReleaseGroupId?: string | undefined;
            minOriginalYear?: number | undefined;
            originalDate?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
        }>, "many">;
        authenticate: z.ZodObject<{
            id: z.ZodString;
            isAdmin: z.ZodBoolean;
            name: z.ZodString;
            subsonicSalt: z.ZodString;
            subsonicToken: z.ZodString;
            token: z.ZodString;
            username: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            username: string;
            token: string;
            isAdmin: boolean;
            subsonicSalt: string;
            subsonicToken: string;
        }, {
            id: string;
            name: string;
            username: string;
            token: string;
            isAdmin: boolean;
            subsonicSalt: string;
            subsonicToken: string;
        }>;
        createPlaylist: z.ZodObject<Pick<{
            comment: z.ZodString;
            createdAt: z.ZodString;
            duration: z.ZodNumber;
            evaluatedAt: z.ZodString;
            id: z.ZodString;
            name: z.ZodString;
            ownerId: z.ZodString;
            ownerName: z.ZodString;
            path: z.ZodString;
            public: z.ZodBoolean;
            rules: z.ZodObject<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodAny, z.objectOutputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">, z.objectInputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">>;
            size: z.ZodNumber;
            songCount: z.ZodNumber;
            sync: z.ZodBoolean;
            updatedAt: z.ZodString;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "id">, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        deleteArtistImage: z.ZodObject<{
            status: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: string;
        }, {
            status: string;
        }>;
        deleteInternetRadioStation: z.ZodNull;
        deleteInternetRadioStationImage: z.ZodObject<{
            status: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: string;
        }, {
            status: string;
        }>;
        deletePlaylist: z.ZodNull;
        deletePlaylistImage: z.ZodObject<{
            status: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: string;
        }, {
            status: string;
        }>;
        error: z.ZodString;
        genre: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>;
        genreList: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>, "many">;
        moveItem: z.ZodNull;
        playlist: z.ZodObject<{
            comment: z.ZodString;
            createdAt: z.ZodString;
            duration: z.ZodNumber;
            evaluatedAt: z.ZodString;
            id: z.ZodString;
            name: z.ZodString;
            ownerId: z.ZodString;
            ownerName: z.ZodString;
            path: z.ZodString;
            public: z.ZodBoolean;
            rules: z.ZodObject<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodAny, z.objectOutputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">, z.objectInputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">>;
            size: z.ZodNumber;
            songCount: z.ZodNumber;
            sync: z.ZodBoolean;
            updatedAt: z.ZodString;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            duration: number;
            name: string;
            path: string;
            public: boolean;
            size: number;
            comment: string;
            songCount: number;
            ownerId: string;
            rules: {
                limit?: number | undefined;
                sort?: string | undefined;
                limitPercent?: number | undefined;
            } & {
                [k: string]: any;
            };
            sync: boolean;
            createdAt: string;
            updatedAt: string;
            evaluatedAt: string;
            ownerName: string;
            uploadedImage?: string | undefined;
        }, {
            id: string;
            duration: number;
            name: string;
            path: string;
            public: boolean;
            size: number;
            comment: string;
            songCount: number;
            ownerId: string;
            rules: {
                limit?: number | undefined;
                sort?: string | undefined;
                limitPercent?: number | undefined;
            } & {
                [k: string]: any;
            };
            sync: boolean;
            createdAt: string;
            updatedAt: string;
            evaluatedAt: string;
            ownerName: string;
            uploadedImage?: string | undefined;
        }>;
        playlistList: z.ZodArray<z.ZodObject<{
            comment: z.ZodString;
            createdAt: z.ZodString;
            duration: z.ZodNumber;
            evaluatedAt: z.ZodString;
            id: z.ZodString;
            name: z.ZodString;
            ownerId: z.ZodString;
            ownerName: z.ZodString;
            path: z.ZodString;
            public: z.ZodBoolean;
            rules: z.ZodObject<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodAny, z.objectOutputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">, z.objectInputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">>;
            size: z.ZodNumber;
            songCount: z.ZodNumber;
            sync: z.ZodBoolean;
            updatedAt: z.ZodString;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            duration: number;
            name: string;
            path: string;
            public: boolean;
            size: number;
            comment: string;
            songCount: number;
            ownerId: string;
            rules: {
                limit?: number | undefined;
                sort?: string | undefined;
                limitPercent?: number | undefined;
            } & {
                [k: string]: any;
            };
            sync: boolean;
            createdAt: string;
            updatedAt: string;
            evaluatedAt: string;
            ownerName: string;
            uploadedImage?: string | undefined;
        }, {
            id: string;
            duration: number;
            name: string;
            path: string;
            public: boolean;
            size: number;
            comment: string;
            songCount: number;
            ownerId: string;
            rules: {
                limit?: number | undefined;
                sort?: string | undefined;
                limitPercent?: number | undefined;
            } & {
                [k: string]: any;
            };
            sync: boolean;
            createdAt: string;
            updatedAt: string;
            evaluatedAt: string;
            ownerName: string;
            uploadedImage?: string | undefined;
        }>, "many">;
        playlistSong: z.ZodObject<{
            album: z.ZodString;
            albumArtist: z.ZodString;
            albumArtistId: z.ZodString;
            albumId: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodString;
            bitDepth: z.ZodOptional<z.ZodNumber>;
            bitRate: z.ZodNumber;
            bookmarkPosition: z.ZodNumber;
            bpm: z.ZodOptional<z.ZodNumber>;
            catalogNum: z.ZodOptional<z.ZodString>;
            channels: z.ZodOptional<z.ZodNumber>;
            comment: z.ZodOptional<z.ZodString>;
            compilation: z.ZodBoolean;
            createdAt: z.ZodString;
            discNumber: z.ZodNumber;
            discSubtitle: z.ZodOptional<z.ZodString>;
            duration: z.ZodNumber;
            embedArtPath: z.ZodOptional<z.ZodString>;
            explicitStatus: z.ZodOptional<z.ZodString>;
            externalInfoUpdatedAt: z.ZodOptional<z.ZodString>;
            externalUrl: z.ZodOptional<z.ZodString>;
            fullText: z.ZodString;
            genre: z.ZodString;
            genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">>;
            hasCoverArt: z.ZodBoolean;
            id: z.ZodString;
            imageFiles: z.ZodOptional<z.ZodString>;
            largeImageUrl: z.ZodOptional<z.ZodString>;
            libraryPath: z.ZodOptional<z.ZodString>;
            lyrics: z.ZodOptional<z.ZodString>;
            mbzAlbumArtistId: z.ZodOptional<z.ZodString>;
            mbzAlbumId: z.ZodOptional<z.ZodString>;
            mbzArtistId: z.ZodOptional<z.ZodString>;
            mbzReleaseTrackId: z.ZodOptional<z.ZodString>;
            mediumImageUrl: z.ZodOptional<z.ZodString>;
            orderAlbumArtistName: z.ZodString;
            orderAlbumName: z.ZodString;
            orderArtistName: z.ZodString;
            orderTitle: z.ZodString;
            participants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }>, "many">>>;
            path: z.ZodString;
            playCount: z.ZodOptional<z.ZodNumber>;
            playDate: z.ZodOptional<z.ZodString>;
            rating: z.ZodOptional<z.ZodNumber>;
            releaseDate: z.ZodOptional<z.ZodString>;
            rgAlbumGain: z.ZodOptional<z.ZodNumber>;
            rgAlbumPeak: z.ZodOptional<z.ZodNumber>;
            rgTrackGain: z.ZodOptional<z.ZodNumber>;
            rgTrackPeak: z.ZodOptional<z.ZodNumber>;
            sampleRate: z.ZodNumber;
            size: z.ZodNumber;
            smallImageUrl: z.ZodOptional<z.ZodString>;
            sortAlbumArtistName: z.ZodString;
            sortArtistName: z.ZodString;
            starred: z.ZodBoolean;
            starredAt: z.ZodOptional<z.ZodString>;
            suffix: z.ZodString;
            tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
            title: z.ZodString;
            trackNumber: z.ZodNumber;
            updatedAt: z.ZodString;
            year: z.ZodNumber;
        } & {
            mediaFileId: z.ZodString;
            playlistId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            album: string;
            id: string;
            duration: number;
            path: string;
            size: number;
            title: string;
            year: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            sampleRate: number;
            starred: boolean;
            albumArtistId: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            orderArtistName: string;
            albumId: string;
            bitRate: number;
            bookmarkPosition: number;
            discNumber: number;
            hasCoverArt: boolean;
            orderTitle: string;
            suffix: string;
            trackNumber: number;
            mediaFileId: string;
            playlistId: string;
            bpm?: number | undefined;
            tags?: Record<string, string[]> | undefined;
            channels?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            lyrics?: string | undefined;
            catalogNum?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            libraryPath?: string | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            bitDepth?: number | undefined;
            discSubtitle?: string | undefined;
            embedArtPath?: string | undefined;
            imageFiles?: string | undefined;
            mbzReleaseTrackId?: string | undefined;
            rgAlbumGain?: number | undefined;
            rgAlbumPeak?: number | undefined;
            rgTrackGain?: number | undefined;
            rgTrackPeak?: number | undefined;
        }, {
            album: string;
            id: string;
            duration: number;
            path: string;
            size: number;
            title: string;
            year: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            sampleRate: number;
            starred: boolean;
            albumArtistId: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            orderArtistName: string;
            albumId: string;
            bitRate: number;
            bookmarkPosition: number;
            discNumber: number;
            hasCoverArt: boolean;
            orderTitle: string;
            suffix: string;
            trackNumber: number;
            mediaFileId: string;
            playlistId: string;
            bpm?: number | undefined;
            tags?: Record<string, string[]> | undefined;
            channels?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            lyrics?: string | undefined;
            catalogNum?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            libraryPath?: string | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            bitDepth?: number | undefined;
            discSubtitle?: string | undefined;
            embedArtPath?: string | undefined;
            imageFiles?: string | undefined;
            mbzReleaseTrackId?: string | undefined;
            rgAlbumGain?: number | undefined;
            rgAlbumPeak?: number | undefined;
            rgTrackGain?: number | undefined;
            rgTrackPeak?: number | undefined;
        }>;
        playlistSongList: z.ZodArray<z.ZodObject<{
            album: z.ZodString;
            albumArtist: z.ZodString;
            albumArtistId: z.ZodString;
            albumId: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodString;
            bitDepth: z.ZodOptional<z.ZodNumber>;
            bitRate: z.ZodNumber;
            bookmarkPosition: z.ZodNumber;
            bpm: z.ZodOptional<z.ZodNumber>;
            catalogNum: z.ZodOptional<z.ZodString>;
            channels: z.ZodOptional<z.ZodNumber>;
            comment: z.ZodOptional<z.ZodString>;
            compilation: z.ZodBoolean;
            createdAt: z.ZodString;
            discNumber: z.ZodNumber;
            discSubtitle: z.ZodOptional<z.ZodString>;
            duration: z.ZodNumber;
            embedArtPath: z.ZodOptional<z.ZodString>;
            explicitStatus: z.ZodOptional<z.ZodString>;
            externalInfoUpdatedAt: z.ZodOptional<z.ZodString>;
            externalUrl: z.ZodOptional<z.ZodString>;
            fullText: z.ZodString;
            genre: z.ZodString;
            genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">>;
            hasCoverArt: z.ZodBoolean;
            id: z.ZodString;
            imageFiles: z.ZodOptional<z.ZodString>;
            largeImageUrl: z.ZodOptional<z.ZodString>;
            libraryPath: z.ZodOptional<z.ZodString>;
            lyrics: z.ZodOptional<z.ZodString>;
            mbzAlbumArtistId: z.ZodOptional<z.ZodString>;
            mbzAlbumId: z.ZodOptional<z.ZodString>;
            mbzArtistId: z.ZodOptional<z.ZodString>;
            mbzReleaseTrackId: z.ZodOptional<z.ZodString>;
            mediumImageUrl: z.ZodOptional<z.ZodString>;
            orderAlbumArtistName: z.ZodString;
            orderAlbumName: z.ZodString;
            orderArtistName: z.ZodString;
            orderTitle: z.ZodString;
            participants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }>, "many">>>;
            path: z.ZodString;
            playCount: z.ZodOptional<z.ZodNumber>;
            playDate: z.ZodOptional<z.ZodString>;
            rating: z.ZodOptional<z.ZodNumber>;
            releaseDate: z.ZodOptional<z.ZodString>;
            rgAlbumGain: z.ZodOptional<z.ZodNumber>;
            rgAlbumPeak: z.ZodOptional<z.ZodNumber>;
            rgTrackGain: z.ZodOptional<z.ZodNumber>;
            rgTrackPeak: z.ZodOptional<z.ZodNumber>;
            sampleRate: z.ZodNumber;
            size: z.ZodNumber;
            smallImageUrl: z.ZodOptional<z.ZodString>;
            sortAlbumArtistName: z.ZodString;
            sortArtistName: z.ZodString;
            starred: z.ZodBoolean;
            starredAt: z.ZodOptional<z.ZodString>;
            suffix: z.ZodString;
            tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
            title: z.ZodString;
            trackNumber: z.ZodNumber;
            updatedAt: z.ZodString;
            year: z.ZodNumber;
        } & {
            mediaFileId: z.ZodString;
            playlistId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            album: string;
            id: string;
            duration: number;
            path: string;
            size: number;
            title: string;
            year: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            sampleRate: number;
            starred: boolean;
            albumArtistId: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            orderArtistName: string;
            albumId: string;
            bitRate: number;
            bookmarkPosition: number;
            discNumber: number;
            hasCoverArt: boolean;
            orderTitle: string;
            suffix: string;
            trackNumber: number;
            mediaFileId: string;
            playlistId: string;
            bpm?: number | undefined;
            tags?: Record<string, string[]> | undefined;
            channels?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            lyrics?: string | undefined;
            catalogNum?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            libraryPath?: string | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            bitDepth?: number | undefined;
            discSubtitle?: string | undefined;
            embedArtPath?: string | undefined;
            imageFiles?: string | undefined;
            mbzReleaseTrackId?: string | undefined;
            rgAlbumGain?: number | undefined;
            rgAlbumPeak?: number | undefined;
            rgTrackGain?: number | undefined;
            rgTrackPeak?: number | undefined;
        }, {
            album: string;
            id: string;
            duration: number;
            path: string;
            size: number;
            title: string;
            year: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            sampleRate: number;
            starred: boolean;
            albumArtistId: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            orderArtistName: string;
            albumId: string;
            bitRate: number;
            bookmarkPosition: number;
            discNumber: number;
            hasCoverArt: boolean;
            orderTitle: string;
            suffix: string;
            trackNumber: number;
            mediaFileId: string;
            playlistId: string;
            bpm?: number | undefined;
            tags?: Record<string, string[]> | undefined;
            channels?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            lyrics?: string | undefined;
            catalogNum?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            libraryPath?: string | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            bitDepth?: number | undefined;
            discSubtitle?: string | undefined;
            embedArtPath?: string | undefined;
            imageFiles?: string | undefined;
            mbzReleaseTrackId?: string | undefined;
            rgAlbumGain?: number | undefined;
            rgAlbumPeak?: number | undefined;
            rgTrackGain?: number | undefined;
            rgTrackPeak?: number | undefined;
        }>, "many">;
        queue: z.ZodObject<{
            changedBy: z.ZodString;
            createdAt: z.ZodString;
            current: z.ZodNumber;
            id: z.ZodString;
            items: z.ZodOptional<z.ZodArray<z.ZodObject<{
                album: z.ZodString;
                albumArtist: z.ZodString;
                albumArtistId: z.ZodString;
                albumId: z.ZodString;
                artist: z.ZodString;
                artistId: z.ZodString;
                bitDepth: z.ZodOptional<z.ZodNumber>;
                bitRate: z.ZodNumber;
                bookmarkPosition: z.ZodNumber;
                bpm: z.ZodOptional<z.ZodNumber>;
                catalogNum: z.ZodOptional<z.ZodString>;
                channels: z.ZodOptional<z.ZodNumber>;
                comment: z.ZodOptional<z.ZodString>;
                compilation: z.ZodBoolean;
                createdAt: z.ZodString;
                discNumber: z.ZodNumber;
                discSubtitle: z.ZodOptional<z.ZodString>;
                duration: z.ZodNumber;
                embedArtPath: z.ZodOptional<z.ZodString>;
                explicitStatus: z.ZodOptional<z.ZodString>;
                externalInfoUpdatedAt: z.ZodOptional<z.ZodString>;
                externalUrl: z.ZodOptional<z.ZodString>;
                fullText: z.ZodString;
                genre: z.ZodString;
                genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">>;
                hasCoverArt: z.ZodBoolean;
                id: z.ZodString;
                imageFiles: z.ZodOptional<z.ZodString>;
                largeImageUrl: z.ZodOptional<z.ZodString>;
                libraryPath: z.ZodOptional<z.ZodString>;
                lyrics: z.ZodOptional<z.ZodString>;
                mbzAlbumArtistId: z.ZodOptional<z.ZodString>;
                mbzAlbumId: z.ZodOptional<z.ZodString>;
                mbzArtistId: z.ZodOptional<z.ZodString>;
                mbzReleaseTrackId: z.ZodOptional<z.ZodString>;
                mediumImageUrl: z.ZodOptional<z.ZodString>;
                orderAlbumArtistName: z.ZodString;
                orderAlbumName: z.ZodString;
                orderArtistName: z.ZodString;
                orderTitle: z.ZodString;
                participants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                    subRole?: string | undefined;
                }, {
                    id: string;
                    name: string;
                    subRole?: string | undefined;
                }>, "many">>>;
                path: z.ZodString;
                playCount: z.ZodOptional<z.ZodNumber>;
                playDate: z.ZodOptional<z.ZodString>;
                rating: z.ZodOptional<z.ZodNumber>;
                releaseDate: z.ZodOptional<z.ZodString>;
                rgAlbumGain: z.ZodOptional<z.ZodNumber>;
                rgAlbumPeak: z.ZodOptional<z.ZodNumber>;
                rgTrackGain: z.ZodOptional<z.ZodNumber>;
                rgTrackPeak: z.ZodOptional<z.ZodNumber>;
                sampleRate: z.ZodNumber;
                size: z.ZodNumber;
                smallImageUrl: z.ZodOptional<z.ZodString>;
                sortAlbumArtistName: z.ZodString;
                sortArtistName: z.ZodString;
                starred: z.ZodBoolean;
                starredAt: z.ZodOptional<z.ZodString>;
                suffix: z.ZodString;
                tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
                title: z.ZodString;
                trackNumber: z.ZodNumber;
                updatedAt: z.ZodString;
                year: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                album: string;
                id: string;
                duration: number;
                path: string;
                size: number;
                title: string;
                year: number;
                artist: string;
                genre: string;
                genres: {
                    id: string;
                    name: string;
                }[] | null;
                compilation: boolean;
                albumArtist: string;
                sampleRate: number;
                starred: boolean;
                albumArtistId: string;
                artistId: string;
                createdAt: string;
                fullText: string;
                orderAlbumArtistName: string;
                orderAlbumName: string;
                sortAlbumArtistName: string;
                sortArtistName: string;
                updatedAt: string;
                orderArtistName: string;
                albumId: string;
                bitRate: number;
                bookmarkPosition: number;
                discNumber: number;
                hasCoverArt: boolean;
                orderTitle: string;
                suffix: string;
                trackNumber: number;
                bpm?: number | undefined;
                tags?: Record<string, string[]> | undefined;
                channels?: number | undefined;
                rating?: number | undefined;
                comment?: string | undefined;
                lyrics?: string | undefined;
                catalogNum?: string | undefined;
                explicitStatus?: string | undefined;
                externalInfoUpdatedAt?: string | undefined;
                externalUrl?: string | undefined;
                libraryPath?: string | undefined;
                mbzAlbumArtistId?: string | undefined;
                mbzAlbumId?: string | undefined;
                participants?: Record<string, {
                    id: string;
                    name: string;
                    subRole?: string | undefined;
                }[]> | undefined;
                playCount?: number | undefined;
                playDate?: string | undefined;
                releaseDate?: string | undefined;
                starredAt?: string | undefined;
                largeImageUrl?: string | undefined;
                mbzArtistId?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                bitDepth?: number | undefined;
                discSubtitle?: string | undefined;
                embedArtPath?: string | undefined;
                imageFiles?: string | undefined;
                mbzReleaseTrackId?: string | undefined;
                rgAlbumGain?: number | undefined;
                rgAlbumPeak?: number | undefined;
                rgTrackGain?: number | undefined;
                rgTrackPeak?: number | undefined;
            }, {
                album: string;
                id: string;
                duration: number;
                path: string;
                size: number;
                title: string;
                year: number;
                artist: string;
                genre: string;
                genres: {
                    id: string;
                    name: string;
                }[] | null;
                compilation: boolean;
                albumArtist: string;
                sampleRate: number;
                starred: boolean;
                albumArtistId: string;
                artistId: string;
                createdAt: string;
                fullText: string;
                orderAlbumArtistName: string;
                orderAlbumName: string;
                sortAlbumArtistName: string;
                sortArtistName: string;
                updatedAt: string;
                orderArtistName: string;
                albumId: string;
                bitRate: number;
                bookmarkPosition: number;
                discNumber: number;
                hasCoverArt: boolean;
                orderTitle: string;
                suffix: string;
                trackNumber: number;
                bpm?: number | undefined;
                tags?: Record<string, string[]> | undefined;
                channels?: number | undefined;
                rating?: number | undefined;
                comment?: string | undefined;
                lyrics?: string | undefined;
                catalogNum?: string | undefined;
                explicitStatus?: string | undefined;
                externalInfoUpdatedAt?: string | undefined;
                externalUrl?: string | undefined;
                libraryPath?: string | undefined;
                mbzAlbumArtistId?: string | undefined;
                mbzAlbumId?: string | undefined;
                participants?: Record<string, {
                    id: string;
                    name: string;
                    subRole?: string | undefined;
                }[]> | undefined;
                playCount?: number | undefined;
                playDate?: string | undefined;
                releaseDate?: string | undefined;
                starredAt?: string | undefined;
                largeImageUrl?: string | undefined;
                mbzArtistId?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                bitDepth?: number | undefined;
                discSubtitle?: string | undefined;
                embedArtPath?: string | undefined;
                imageFiles?: string | undefined;
                mbzReleaseTrackId?: string | undefined;
                rgAlbumGain?: number | undefined;
                rgAlbumPeak?: number | undefined;
                rgTrackGain?: number | undefined;
                rgTrackPeak?: number | undefined;
            }>, "many">>;
            position: z.ZodNumber;
            updatedAt: z.ZodString;
            userId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            position: number;
            userId: string;
            current: number;
            createdAt: string;
            updatedAt: string;
            changedBy: string;
            items?: {
                album: string;
                id: string;
                duration: number;
                path: string;
                size: number;
                title: string;
                year: number;
                artist: string;
                genre: string;
                genres: {
                    id: string;
                    name: string;
                }[] | null;
                compilation: boolean;
                albumArtist: string;
                sampleRate: number;
                starred: boolean;
                albumArtistId: string;
                artistId: string;
                createdAt: string;
                fullText: string;
                orderAlbumArtistName: string;
                orderAlbumName: string;
                sortAlbumArtistName: string;
                sortArtistName: string;
                updatedAt: string;
                orderArtistName: string;
                albumId: string;
                bitRate: number;
                bookmarkPosition: number;
                discNumber: number;
                hasCoverArt: boolean;
                orderTitle: string;
                suffix: string;
                trackNumber: number;
                bpm?: number | undefined;
                tags?: Record<string, string[]> | undefined;
                channels?: number | undefined;
                rating?: number | undefined;
                comment?: string | undefined;
                lyrics?: string | undefined;
                catalogNum?: string | undefined;
                explicitStatus?: string | undefined;
                externalInfoUpdatedAt?: string | undefined;
                externalUrl?: string | undefined;
                libraryPath?: string | undefined;
                mbzAlbumArtistId?: string | undefined;
                mbzAlbumId?: string | undefined;
                participants?: Record<string, {
                    id: string;
                    name: string;
                    subRole?: string | undefined;
                }[]> | undefined;
                playCount?: number | undefined;
                playDate?: string | undefined;
                releaseDate?: string | undefined;
                starredAt?: string | undefined;
                largeImageUrl?: string | undefined;
                mbzArtistId?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                bitDepth?: number | undefined;
                discSubtitle?: string | undefined;
                embedArtPath?: string | undefined;
                imageFiles?: string | undefined;
                mbzReleaseTrackId?: string | undefined;
                rgAlbumGain?: number | undefined;
                rgAlbumPeak?: number | undefined;
                rgTrackGain?: number | undefined;
                rgTrackPeak?: number | undefined;
            }[] | undefined;
        }, {
            id: string;
            position: number;
            userId: string;
            current: number;
            createdAt: string;
            updatedAt: string;
            changedBy: string;
            items?: {
                album: string;
                id: string;
                duration: number;
                path: string;
                size: number;
                title: string;
                year: number;
                artist: string;
                genre: string;
                genres: {
                    id: string;
                    name: string;
                }[] | null;
                compilation: boolean;
                albumArtist: string;
                sampleRate: number;
                starred: boolean;
                albumArtistId: string;
                artistId: string;
                createdAt: string;
                fullText: string;
                orderAlbumArtistName: string;
                orderAlbumName: string;
                sortAlbumArtistName: string;
                sortArtistName: string;
                updatedAt: string;
                orderArtistName: string;
                albumId: string;
                bitRate: number;
                bookmarkPosition: number;
                discNumber: number;
                hasCoverArt: boolean;
                orderTitle: string;
                suffix: string;
                trackNumber: number;
                bpm?: number | undefined;
                tags?: Record<string, string[]> | undefined;
                channels?: number | undefined;
                rating?: number | undefined;
                comment?: string | undefined;
                lyrics?: string | undefined;
                catalogNum?: string | undefined;
                explicitStatus?: string | undefined;
                externalInfoUpdatedAt?: string | undefined;
                externalUrl?: string | undefined;
                libraryPath?: string | undefined;
                mbzAlbumArtistId?: string | undefined;
                mbzAlbumId?: string | undefined;
                participants?: Record<string, {
                    id: string;
                    name: string;
                    subRole?: string | undefined;
                }[]> | undefined;
                playCount?: number | undefined;
                playDate?: string | undefined;
                releaseDate?: string | undefined;
                starredAt?: string | undefined;
                largeImageUrl?: string | undefined;
                mbzArtistId?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                bitDepth?: number | undefined;
                discSubtitle?: string | undefined;
                embedArtPath?: string | undefined;
                imageFiles?: string | undefined;
                mbzReleaseTrackId?: string | undefined;
                rgAlbumGain?: number | undefined;
                rgAlbumPeak?: number | undefined;
                rgTrackGain?: number | undefined;
                rgTrackPeak?: number | undefined;
            }[] | undefined;
        }>;
        radioList: z.ZodArray<z.ZodObject<{
            createdAt: z.ZodString;
            homePageUrl: z.ZodOptional<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            streamUrl: z.ZodString;
            updatedAt: z.ZodString;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            streamUrl: string;
            createdAt: string;
            updatedAt: string;
            homePageUrl?: string | undefined;
            uploadedImage?: string | undefined;
        }, {
            id: string;
            name: string;
            streamUrl: string;
            createdAt: string;
            updatedAt: string;
            homePageUrl?: string | undefined;
            uploadedImage?: string | undefined;
        }>, "many">;
        radioStation: z.ZodObject<{
            createdAt: z.ZodString;
            homePageUrl: z.ZodOptional<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            streamUrl: z.ZodString;
            updatedAt: z.ZodString;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            streamUrl: string;
            createdAt: string;
            updatedAt: string;
            homePageUrl?: string | undefined;
            uploadedImage?: string | undefined;
        }, {
            id: string;
            name: string;
            streamUrl: string;
            createdAt: string;
            updatedAt: string;
            homePageUrl?: string | undefined;
            uploadedImage?: string | undefined;
        }>;
        removeFromPlaylist: z.ZodObject<{
            ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            ids: string[];
        }, {
            ids: string[];
        }>;
        saveQueue: z.ZodNull;
        shareItem: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        song: z.ZodObject<{
            album: z.ZodString;
            albumArtist: z.ZodString;
            albumArtistId: z.ZodString;
            albumId: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodString;
            bitDepth: z.ZodOptional<z.ZodNumber>;
            bitRate: z.ZodNumber;
            bookmarkPosition: z.ZodNumber;
            bpm: z.ZodOptional<z.ZodNumber>;
            catalogNum: z.ZodOptional<z.ZodString>;
            channels: z.ZodOptional<z.ZodNumber>;
            comment: z.ZodOptional<z.ZodString>;
            compilation: z.ZodBoolean;
            createdAt: z.ZodString;
            discNumber: z.ZodNumber;
            discSubtitle: z.ZodOptional<z.ZodString>;
            duration: z.ZodNumber;
            embedArtPath: z.ZodOptional<z.ZodString>;
            explicitStatus: z.ZodOptional<z.ZodString>;
            externalInfoUpdatedAt: z.ZodOptional<z.ZodString>;
            externalUrl: z.ZodOptional<z.ZodString>;
            fullText: z.ZodString;
            genre: z.ZodString;
            genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">>;
            hasCoverArt: z.ZodBoolean;
            id: z.ZodString;
            imageFiles: z.ZodOptional<z.ZodString>;
            largeImageUrl: z.ZodOptional<z.ZodString>;
            libraryPath: z.ZodOptional<z.ZodString>;
            lyrics: z.ZodOptional<z.ZodString>;
            mbzAlbumArtistId: z.ZodOptional<z.ZodString>;
            mbzAlbumId: z.ZodOptional<z.ZodString>;
            mbzArtistId: z.ZodOptional<z.ZodString>;
            mbzReleaseTrackId: z.ZodOptional<z.ZodString>;
            mediumImageUrl: z.ZodOptional<z.ZodString>;
            orderAlbumArtistName: z.ZodString;
            orderAlbumName: z.ZodString;
            orderArtistName: z.ZodString;
            orderTitle: z.ZodString;
            participants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }>, "many">>>;
            path: z.ZodString;
            playCount: z.ZodOptional<z.ZodNumber>;
            playDate: z.ZodOptional<z.ZodString>;
            rating: z.ZodOptional<z.ZodNumber>;
            releaseDate: z.ZodOptional<z.ZodString>;
            rgAlbumGain: z.ZodOptional<z.ZodNumber>;
            rgAlbumPeak: z.ZodOptional<z.ZodNumber>;
            rgTrackGain: z.ZodOptional<z.ZodNumber>;
            rgTrackPeak: z.ZodOptional<z.ZodNumber>;
            sampleRate: z.ZodNumber;
            size: z.ZodNumber;
            smallImageUrl: z.ZodOptional<z.ZodString>;
            sortAlbumArtistName: z.ZodString;
            sortArtistName: z.ZodString;
            starred: z.ZodBoolean;
            starredAt: z.ZodOptional<z.ZodString>;
            suffix: z.ZodString;
            tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
            title: z.ZodString;
            trackNumber: z.ZodNumber;
            updatedAt: z.ZodString;
            year: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            album: string;
            id: string;
            duration: number;
            path: string;
            size: number;
            title: string;
            year: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            sampleRate: number;
            starred: boolean;
            albumArtistId: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            orderArtistName: string;
            albumId: string;
            bitRate: number;
            bookmarkPosition: number;
            discNumber: number;
            hasCoverArt: boolean;
            orderTitle: string;
            suffix: string;
            trackNumber: number;
            bpm?: number | undefined;
            tags?: Record<string, string[]> | undefined;
            channels?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            lyrics?: string | undefined;
            catalogNum?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            libraryPath?: string | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            bitDepth?: number | undefined;
            discSubtitle?: string | undefined;
            embedArtPath?: string | undefined;
            imageFiles?: string | undefined;
            mbzReleaseTrackId?: string | undefined;
            rgAlbumGain?: number | undefined;
            rgAlbumPeak?: number | undefined;
            rgTrackGain?: number | undefined;
            rgTrackPeak?: number | undefined;
        }, {
            album: string;
            id: string;
            duration: number;
            path: string;
            size: number;
            title: string;
            year: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            sampleRate: number;
            starred: boolean;
            albumArtistId: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            orderArtistName: string;
            albumId: string;
            bitRate: number;
            bookmarkPosition: number;
            discNumber: number;
            hasCoverArt: boolean;
            orderTitle: string;
            suffix: string;
            trackNumber: number;
            bpm?: number | undefined;
            tags?: Record<string, string[]> | undefined;
            channels?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            lyrics?: string | undefined;
            catalogNum?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            libraryPath?: string | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            bitDepth?: number | undefined;
            discSubtitle?: string | undefined;
            embedArtPath?: string | undefined;
            imageFiles?: string | undefined;
            mbzReleaseTrackId?: string | undefined;
            rgAlbumGain?: number | undefined;
            rgAlbumPeak?: number | undefined;
            rgTrackGain?: number | undefined;
            rgTrackPeak?: number | undefined;
        }>;
        songList: z.ZodArray<z.ZodObject<{
            album: z.ZodString;
            albumArtist: z.ZodString;
            albumArtistId: z.ZodString;
            albumId: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodString;
            bitDepth: z.ZodOptional<z.ZodNumber>;
            bitRate: z.ZodNumber;
            bookmarkPosition: z.ZodNumber;
            bpm: z.ZodOptional<z.ZodNumber>;
            catalogNum: z.ZodOptional<z.ZodString>;
            channels: z.ZodOptional<z.ZodNumber>;
            comment: z.ZodOptional<z.ZodString>;
            compilation: z.ZodBoolean;
            createdAt: z.ZodString;
            discNumber: z.ZodNumber;
            discSubtitle: z.ZodOptional<z.ZodString>;
            duration: z.ZodNumber;
            embedArtPath: z.ZodOptional<z.ZodString>;
            explicitStatus: z.ZodOptional<z.ZodString>;
            externalInfoUpdatedAt: z.ZodOptional<z.ZodString>;
            externalUrl: z.ZodOptional<z.ZodString>;
            fullText: z.ZodString;
            genre: z.ZodString;
            genres: z.ZodNullable<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">>;
            hasCoverArt: z.ZodBoolean;
            id: z.ZodString;
            imageFiles: z.ZodOptional<z.ZodString>;
            largeImageUrl: z.ZodOptional<z.ZodString>;
            libraryPath: z.ZodOptional<z.ZodString>;
            lyrics: z.ZodOptional<z.ZodString>;
            mbzAlbumArtistId: z.ZodOptional<z.ZodString>;
            mbzAlbumId: z.ZodOptional<z.ZodString>;
            mbzArtistId: z.ZodOptional<z.ZodString>;
            mbzReleaseTrackId: z.ZodOptional<z.ZodString>;
            mediumImageUrl: z.ZodOptional<z.ZodString>;
            orderAlbumArtistName: z.ZodString;
            orderAlbumName: z.ZodString;
            orderArtistName: z.ZodString;
            orderTitle: z.ZodString;
            participants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }>, "many">>>;
            path: z.ZodString;
            playCount: z.ZodOptional<z.ZodNumber>;
            playDate: z.ZodOptional<z.ZodString>;
            rating: z.ZodOptional<z.ZodNumber>;
            releaseDate: z.ZodOptional<z.ZodString>;
            rgAlbumGain: z.ZodOptional<z.ZodNumber>;
            rgAlbumPeak: z.ZodOptional<z.ZodNumber>;
            rgTrackGain: z.ZodOptional<z.ZodNumber>;
            rgTrackPeak: z.ZodOptional<z.ZodNumber>;
            sampleRate: z.ZodNumber;
            size: z.ZodNumber;
            smallImageUrl: z.ZodOptional<z.ZodString>;
            sortAlbumArtistName: z.ZodString;
            sortArtistName: z.ZodString;
            starred: z.ZodBoolean;
            starredAt: z.ZodOptional<z.ZodString>;
            suffix: z.ZodString;
            tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
            title: z.ZodString;
            trackNumber: z.ZodNumber;
            updatedAt: z.ZodString;
            year: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            album: string;
            id: string;
            duration: number;
            path: string;
            size: number;
            title: string;
            year: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            sampleRate: number;
            starred: boolean;
            albumArtistId: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            orderArtistName: string;
            albumId: string;
            bitRate: number;
            bookmarkPosition: number;
            discNumber: number;
            hasCoverArt: boolean;
            orderTitle: string;
            suffix: string;
            trackNumber: number;
            bpm?: number | undefined;
            tags?: Record<string, string[]> | undefined;
            channels?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            lyrics?: string | undefined;
            catalogNum?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            libraryPath?: string | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            bitDepth?: number | undefined;
            discSubtitle?: string | undefined;
            embedArtPath?: string | undefined;
            imageFiles?: string | undefined;
            mbzReleaseTrackId?: string | undefined;
            rgAlbumGain?: number | undefined;
            rgAlbumPeak?: number | undefined;
            rgTrackGain?: number | undefined;
            rgTrackPeak?: number | undefined;
        }, {
            album: string;
            id: string;
            duration: number;
            path: string;
            size: number;
            title: string;
            year: number;
            artist: string;
            genre: string;
            genres: {
                id: string;
                name: string;
            }[] | null;
            compilation: boolean;
            albumArtist: string;
            sampleRate: number;
            starred: boolean;
            albumArtistId: string;
            artistId: string;
            createdAt: string;
            fullText: string;
            orderAlbumArtistName: string;
            orderAlbumName: string;
            sortAlbumArtistName: string;
            sortArtistName: string;
            updatedAt: string;
            orderArtistName: string;
            albumId: string;
            bitRate: number;
            bookmarkPosition: number;
            discNumber: number;
            hasCoverArt: boolean;
            orderTitle: string;
            suffix: string;
            trackNumber: number;
            bpm?: number | undefined;
            tags?: Record<string, string[]> | undefined;
            channels?: number | undefined;
            rating?: number | undefined;
            comment?: string | undefined;
            lyrics?: string | undefined;
            catalogNum?: string | undefined;
            explicitStatus?: string | undefined;
            externalInfoUpdatedAt?: string | undefined;
            externalUrl?: string | undefined;
            libraryPath?: string | undefined;
            mbzAlbumArtistId?: string | undefined;
            mbzAlbumId?: string | undefined;
            participants?: Record<string, {
                id: string;
                name: string;
                subRole?: string | undefined;
            }[]> | undefined;
            playCount?: number | undefined;
            playDate?: string | undefined;
            releaseDate?: string | undefined;
            starredAt?: string | undefined;
            largeImageUrl?: string | undefined;
            mbzArtistId?: string | undefined;
            mediumImageUrl?: string | undefined;
            smallImageUrl?: string | undefined;
            bitDepth?: number | undefined;
            discSubtitle?: string | undefined;
            embedArtPath?: string | undefined;
            imageFiles?: string | undefined;
            mbzReleaseTrackId?: string | undefined;
            rgAlbumGain?: number | undefined;
            rgAlbumPeak?: number | undefined;
            rgTrackGain?: number | undefined;
            rgTrackPeak?: number | undefined;
        }>, "many">;
        tagList: z.ZodArray<z.ZodObject<{
            albumCount: z.ZodOptional<z.ZodNumber>;
            id: z.ZodString;
            songCount: z.ZodOptional<z.ZodNumber>;
            tagName: z.ZodString;
            tagValue: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            tagName: string;
            tagValue: string;
            songCount?: number | undefined;
            albumCount?: number | undefined;
        }, {
            id: string;
            tagName: string;
            tagValue: string;
            songCount?: number | undefined;
            albumCount?: number | undefined;
        }>, "many">;
        updateInternetRadioStation: z.ZodObject<{
            createdAt: z.ZodString;
            homePageUrl: z.ZodOptional<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            streamUrl: z.ZodString;
            updatedAt: z.ZodString;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            streamUrl: string;
            createdAt: string;
            updatedAt: string;
            homePageUrl?: string | undefined;
            uploadedImage?: string | undefined;
        }, {
            id: string;
            name: string;
            streamUrl: string;
            createdAt: string;
            updatedAt: string;
            homePageUrl?: string | undefined;
            uploadedImage?: string | undefined;
        }>;
        updatePlaylist: z.ZodObject<{
            comment: z.ZodString;
            createdAt: z.ZodString;
            duration: z.ZodNumber;
            evaluatedAt: z.ZodString;
            id: z.ZodString;
            name: z.ZodString;
            ownerId: z.ZodString;
            ownerName: z.ZodString;
            path: z.ZodString;
            public: z.ZodBoolean;
            rules: z.ZodObject<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodAny, z.objectOutputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">, z.objectInputType<{
                limit: z.ZodOptional<z.ZodNumber>;
                limitPercent: z.ZodOptional<z.ZodNumber>;
                sort: z.ZodOptional<z.ZodString>;
            }, z.ZodAny, "strip">>;
            size: z.ZodNumber;
            songCount: z.ZodNumber;
            sync: z.ZodBoolean;
            updatedAt: z.ZodString;
            uploadedImage: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            duration: number;
            name: string;
            path: string;
            public: boolean;
            size: number;
            comment: string;
            songCount: number;
            ownerId: string;
            rules: {
                limit?: number | undefined;
                sort?: string | undefined;
                limitPercent?: number | undefined;
            } & {
                [k: string]: any;
            };
            sync: boolean;
            createdAt: string;
            updatedAt: string;
            evaluatedAt: string;
            ownerName: string;
            uploadedImage?: string | undefined;
        }, {
            id: string;
            duration: number;
            name: string;
            path: string;
            public: boolean;
            size: number;
            comment: string;
            songCount: number;
            ownerId: string;
            rules: {
                limit?: number | undefined;
                sort?: string | undefined;
                limitPercent?: number | undefined;
            } & {
                [k: string]: any;
            };
            sync: boolean;
            createdAt: string;
            updatedAt: string;
            evaluatedAt: string;
            ownerName: string;
            uploadedImage?: string | undefined;
        }>;
        uploadArtistImage: z.ZodObject<{
            status: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: string;
        }, {
            status: string;
        }>;
        uploadInternetRadioStationImage: z.ZodObject<{
            status: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: string;
        }, {
            status: string;
        }>;
        uploadPlaylistImage: z.ZodObject<{
            status: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            status: string;
        }, {
            status: string;
        }>;
        user: z.ZodObject<{
            createdAt: z.ZodString;
            email: z.ZodOptional<z.ZodString>;
            id: z.ZodString;
            isAdmin: z.ZodBoolean;
            lastAccessAt: z.ZodString;
            lastLoginAt: z.ZodString;
            name: z.ZodString;
            updatedAt: z.ZodString;
            userName: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            isAdmin: boolean;
            createdAt: string;
            updatedAt: string;
            lastAccessAt: string;
            lastLoginAt: string;
            userName: string;
            email?: string | undefined;
        }, {
            id: string;
            name: string;
            isAdmin: boolean;
            createdAt: string;
            updatedAt: string;
            lastAccessAt: string;
            lastLoginAt: string;
            userName: string;
            email?: string | undefined;
        }>;
        userList: z.ZodArray<z.ZodObject<{
            createdAt: z.ZodString;
            email: z.ZodOptional<z.ZodString>;
            id: z.ZodString;
            isAdmin: z.ZodBoolean;
            lastAccessAt: z.ZodString;
            lastLoginAt: z.ZodString;
            name: z.ZodString;
            updatedAt: z.ZodString;
            userName: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            isAdmin: boolean;
            createdAt: string;
            updatedAt: string;
            lastAccessAt: string;
            lastLoginAt: string;
            userName: string;
            email?: string | undefined;
        }, {
            id: string;
            name: string;
            isAdmin: boolean;
            createdAt: string;
            updatedAt: string;
            lastAccessAt: string;
            lastLoginAt: string;
            userName: string;
            email?: string | undefined;
        }>, "many">;
    };
};
