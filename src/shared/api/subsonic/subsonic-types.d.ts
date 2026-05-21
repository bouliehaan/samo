import { z } from 'zod';
export declare enum SubsonicExtensions {
    FORM_POST = "formPost",
    INDEX_BASED_QUEUE = "indexBasedQueue",
    SONG_LYRICS = "songLyrics",
    TRANSCODE_OFFSET = "transcodeOffset",
    TRANSCODING = "transcoding"
}
export declare enum AlbumListSortType {
    ALPHABETICAL_BY_ARTIST = "alphabeticalByArtist",
    ALPHABETICAL_BY_NAME = "alphabeticalByName",
    BY_GENRE = "byGenre",
    BY_YEAR = "byYear",
    FREQUENT = "frequent",
    NEWEST = "newest",
    RANDOM = "random",
    RECENT = "recent",
    STARRED = "starred"
}
export declare const ssType: {
    _body: {
        getTranscodeDecision: z.ZodObject<{
            codecProfiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                limitations: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    comparison: z.ZodString;
                    name: z.ZodString;
                    required: z.ZodOptional<z.ZodBoolean>;
                    values: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                    values: string[];
                    comparison: string;
                    required?: boolean | undefined;
                }, {
                    name: string;
                    values: string[];
                    comparison: string;
                    required?: boolean | undefined;
                }>, "many">>;
                name: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                type: string;
                limitations?: {
                    name: string;
                    values: string[];
                    comparison: string;
                    required?: boolean | undefined;
                }[] | undefined;
            }, {
                name: string;
                type: string;
                limitations?: {
                    name: string;
                    values: string[];
                    comparison: string;
                    required?: boolean | undefined;
                }[] | undefined;
            }>, "many">>;
            directPlayProfiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                audioCodecs: z.ZodArray<z.ZodString, "many">;
                containers: z.ZodArray<z.ZodString, "many">;
                maxAudioChannels: z.ZodOptional<z.ZodNumber>;
                protocols: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                audioCodecs: string[];
                containers: string[];
                protocols: string[];
                maxAudioChannels?: number | undefined;
            }, {
                audioCodecs: string[];
                containers: string[];
                protocols: string[];
                maxAudioChannels?: number | undefined;
            }>, "many">>;
            maxAudioBitrate: z.ZodOptional<z.ZodNumber>;
            maxTranscodingAudioBitrate: z.ZodOptional<z.ZodNumber>;
            name: z.ZodString;
            platform: z.ZodString;
            transcodingProfiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                audioCodec: z.ZodString;
                container: z.ZodString;
                maxAudioChannels: z.ZodOptional<z.ZodNumber>;
                protocol: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                container: string;
                audioCodec: string;
                protocol: string;
                maxAudioChannels?: number | undefined;
            }, {
                container: string;
                audioCodec: string;
                protocol: string;
                maxAudioChannels?: number | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            platform: string;
            codecProfiles?: {
                name: string;
                type: string;
                limitations?: {
                    name: string;
                    values: string[];
                    comparison: string;
                    required?: boolean | undefined;
                }[] | undefined;
            }[] | undefined;
            directPlayProfiles?: {
                audioCodecs: string[];
                containers: string[];
                protocols: string[];
                maxAudioChannels?: number | undefined;
            }[] | undefined;
            maxAudioBitrate?: number | undefined;
            maxTranscodingAudioBitrate?: number | undefined;
            transcodingProfiles?: {
                container: string;
                audioCodec: string;
                protocol: string;
                maxAudioChannels?: number | undefined;
            }[] | undefined;
        }, {
            name: string;
            platform: string;
            codecProfiles?: {
                name: string;
                type: string;
                limitations?: {
                    name: string;
                    values: string[];
                    comparison: string;
                    required?: boolean | undefined;
                }[] | undefined;
            }[] | undefined;
            directPlayProfiles?: {
                audioCodecs: string[];
                containers: string[];
                protocols: string[];
                maxAudioChannels?: number | undefined;
            }[] | undefined;
            maxAudioBitrate?: number | undefined;
            maxTranscodingAudioBitrate?: number | undefined;
            transcodingProfiles?: {
                container: string;
                audioCodec: string;
                protocol: string;
                maxAudioChannels?: number | undefined;
            }[] | undefined;
        }>;
    };
    _parameters: {
        albumInfo: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        albumList: z.ZodObject<{
            fromYear: z.ZodOptional<z.ZodNumber>;
            genre: z.ZodOptional<z.ZodString>;
            musicFolderId: z.ZodOptional<z.ZodString>;
            offset: z.ZodOptional<z.ZodNumber>;
            size: z.ZodOptional<z.ZodNumber>;
            toYear: z.ZodOptional<z.ZodNumber>;
            type: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            size?: number | undefined;
            genre?: string | undefined;
            type?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            offset?: number | undefined;
            toYear?: number | undefined;
        }, {
            size?: number | undefined;
            genre?: string | undefined;
            type?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            offset?: number | undefined;
            toYear?: number | undefined;
        }>;
        artistInfo: z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            id: z.ZodString;
            includeNotPresent: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            count?: number | undefined;
            includeNotPresent?: boolean | undefined;
        }, {
            id: string;
            count?: number | undefined;
            includeNotPresent?: boolean | undefined;
        }>;
        authenticate: z.ZodObject<{
            c: z.ZodString;
            f: z.ZodString;
            p: z.ZodOptional<z.ZodString>;
            s: z.ZodOptional<z.ZodString>;
            t: z.ZodOptional<z.ZodString>;
            u: z.ZodString;
            username: z.ZodString;
            v: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            username: string;
            c: string;
            f: string;
            v: string;
            u: string;
            s?: string | undefined;
            t?: string | undefined;
            p?: string | undefined;
        }, {
            username: string;
            c: string;
            f: string;
            v: string;
            u: string;
            s?: string | undefined;
            t?: string | undefined;
            p?: string | undefined;
        }>;
        createFavorite: z.ZodObject<{
            albumId: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            artistId: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            id?: string[] | undefined;
            artistId?: string[] | undefined;
            albumId?: string[] | undefined;
        }, {
            id?: string[] | undefined;
            artistId?: string[] | undefined;
            albumId?: string[] | undefined;
        }>;
        createInternetRadioStation: z.ZodObject<{
            homepageUrl: z.ZodOptional<z.ZodString>;
            name: z.ZodString;
            streamUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            streamUrl: string;
            homepageUrl?: string | undefined;
        }, {
            name: string;
            streamUrl: string;
            homepageUrl?: string | undefined;
        }>;
        createPlaylist: z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            playlistId: z.ZodOptional<z.ZodString>;
            songId: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name?: string | undefined;
            playlistId?: string | undefined;
            songId?: string[] | undefined;
        }, {
            name?: string | undefined;
            playlistId?: string | undefined;
            songId?: string[] | undefined;
        }>;
        deleteInternetRadioStation: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        deletePlaylist: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        getAlbum: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        getAlbumList2: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            fromYear: z.ZodOptional<z.ZodNumber>;
            genre: z.ZodOptional<z.ZodString>;
            musicFolderId: z.ZodOptional<z.ZodString>;
            offset: z.ZodOptional<z.ZodNumber>;
            size: z.ZodOptional<z.ZodNumber>;
            toYear: z.ZodOptional<z.ZodNumber>;
            type: z.ZodNativeEnum<typeof AlbumListSortType>;
        }, "strip", z.ZodTypeAny, {
            type: AlbumListSortType;
            size?: number | undefined;
            genre?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            offset?: number | undefined;
            toYear?: number | undefined;
        }, {
            type: AlbumListSortType;
            size?: number | undefined;
            genre?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            offset?: number | undefined;
            toYear?: number | undefined;
        }>, {
            type: AlbumListSortType;
            size?: number | undefined;
            genre?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            offset?: number | undefined;
            toYear?: number | undefined;
        }, {
            type: AlbumListSortType;
            size?: number | undefined;
            genre?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            offset?: number | undefined;
            toYear?: number | undefined;
        }>, {
            type: AlbumListSortType;
            size?: number | undefined;
            genre?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            offset?: number | undefined;
            toYear?: number | undefined;
        }, {
            type: AlbumListSortType;
            size?: number | undefined;
            genre?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            offset?: number | undefined;
            toYear?: number | undefined;
        }>;
        getArtist: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        getArtists: z.ZodObject<{
            musicFolderId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            musicFolderId?: string | undefined;
        }, {
            musicFolderId?: string | undefined;
        }>;
        getGenre: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        getGenres: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
        getIndexes: z.ZodObject<{
            musicFolderId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            musicFolderId?: string | undefined;
        }, {
            musicFolderId?: string | undefined;
        }>;
        getMusicDirectory: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        getPlaylist: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        getPlaylists: z.ZodObject<{
            username: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username?: string | undefined;
        }, {
            username?: string | undefined;
        }>;
        getSong: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        getSongsByGenre: z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            genre: z.ZodString;
            musicFolderId: z.ZodOptional<z.ZodString>;
            offset: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            genre: string;
            count?: number | undefined;
            musicFolderId?: string | undefined;
            offset?: number | undefined;
        }, {
            genre: string;
            count?: number | undefined;
            musicFolderId?: string | undefined;
            offset?: number | undefined;
        }>;
        getStarred: z.ZodObject<{
            musicFolderId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            musicFolderId?: string | undefined;
        }, {
            musicFolderId?: string | undefined;
        }>;
        getTranscodeDecision: z.ZodObject<{
            mediaId: z.ZodString;
            mediaType: z.ZodEnum<["song", "podcast"]>;
        }, "strip", z.ZodTypeAny, {
            mediaType: "song" | "podcast";
            mediaId: string;
        }, {
            mediaType: "song" | "podcast";
            mediaId: string;
        }>;
        getTranscodeStream: z.ZodObject<{
            mediaId: z.ZodString;
            mediaType: z.ZodEnum<["song", "podcast"]>;
            offset: z.ZodOptional<z.ZodNumber>;
            transcodeParams: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            mediaType: "song" | "podcast";
            mediaId: string;
            transcodeParams: string;
            offset?: number | undefined;
        }, {
            mediaType: "song" | "podcast";
            mediaId: string;
            transcodeParams: string;
            offset?: number | undefined;
        }>;
        randomSongList: z.ZodObject<{
            fromYear: z.ZodOptional<z.ZodNumber>;
            genre: z.ZodOptional<z.ZodString>;
            musicFolderId: z.ZodOptional<z.ZodString>;
            size: z.ZodOptional<z.ZodNumber>;
            toYear: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            size?: number | undefined;
            genre?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            toYear?: number | undefined;
        }, {
            size?: number | undefined;
            genre?: string | undefined;
            musicFolderId?: string | undefined;
            fromYear?: number | undefined;
            toYear?: number | undefined;
        }>;
        removeFavorite: z.ZodObject<{
            albumId: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            artistId: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            id?: string[] | undefined;
            artistId?: string[] | undefined;
            albumId?: string[] | undefined;
        }, {
            id?: string[] | undefined;
            artistId?: string[] | undefined;
            albumId?: string[] | undefined;
        }>;
        savePlayQueueByIndex: z.ZodObject<{
            currentIndex: z.ZodOptional<z.ZodNumber>;
            id: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            position: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id?: string[] | undefined;
            position?: number | undefined;
            currentIndex?: number | undefined;
        }, {
            id?: string[] | undefined;
            position?: number | undefined;
            currentIndex?: number | undefined;
        }>;
        saveQueue: z.ZodObject<{
            current: z.ZodOptional<z.ZodString>;
            id: z.ZodArray<z.ZodString, "many">;
            position: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string[];
            position?: number | undefined;
            current?: string | undefined;
        }, {
            id: string[];
            position?: number | undefined;
            current?: string | undefined;
        }>;
        scrobble: z.ZodObject<{
            id: z.ZodString;
            submission: z.ZodOptional<z.ZodBoolean>;
            time: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            time?: number | undefined;
            submission?: boolean | undefined;
        }, {
            id: string;
            time?: number | undefined;
            submission?: boolean | undefined;
        }>;
        search3: z.ZodObject<{
            albumCount: z.ZodOptional<z.ZodNumber>;
            albumOffset: z.ZodOptional<z.ZodNumber>;
            artistCount: z.ZodOptional<z.ZodNumber>;
            artistOffset: z.ZodOptional<z.ZodNumber>;
            musicFolderId: z.ZodOptional<z.ZodString>;
            query: z.ZodOptional<z.ZodString>;
            songCount: z.ZodOptional<z.ZodNumber>;
            songOffset: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            songCount?: number | undefined;
            albumCount?: number | undefined;
            musicFolderId?: string | undefined;
            query?: string | undefined;
            albumOffset?: number | undefined;
            artistCount?: number | undefined;
            artistOffset?: number | undefined;
            songOffset?: number | undefined;
        }, {
            songCount?: number | undefined;
            albumCount?: number | undefined;
            musicFolderId?: string | undefined;
            query?: string | undefined;
            albumOffset?: number | undefined;
            artistCount?: number | undefined;
            artistOffset?: number | undefined;
            songOffset?: number | undefined;
        }>;
        setRating: z.ZodObject<{
            id: z.ZodString;
            rating: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            rating: number;
        }, {
            id: string;
            rating: number;
        }>;
        similarSongs: z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            count?: number | undefined;
        }, {
            id: string;
            count?: number | undefined;
        }>;
        similarSongs2: z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            count?: number | undefined;
        }, {
            id: string;
            count?: number | undefined;
        }>;
        structuredLyrics: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        topSongsList: z.ZodObject<{
            artist: z.ZodString;
            count: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            artist: string;
            count?: number | undefined;
        }, {
            artist: string;
            count?: number | undefined;
        }>;
        updateInternetRadioStation: z.ZodObject<{
            homepageUrl: z.ZodOptional<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            streamUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            streamUrl: string;
            homepageUrl?: string | undefined;
        }, {
            id: string;
            name: string;
            streamUrl: string;
            homepageUrl?: string | undefined;
        }>;
        updatePlaylist: z.ZodObject<{
            comment: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            playlistId: z.ZodString;
            public: z.ZodOptional<z.ZodBoolean>;
            songIdToAdd: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            songIndexToRemove: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            playlistId: string;
            name?: string | undefined;
            public?: boolean | undefined;
            comment?: string | undefined;
            songIdToAdd?: string[] | undefined;
            songIndexToRemove?: string[] | undefined;
        }, {
            playlistId: string;
            name?: string | undefined;
            public?: boolean | undefined;
            comment?: string | undefined;
            songIdToAdd?: string[] | undefined;
            songIndexToRemove?: string[] | undefined;
        }>;
        user: z.ZodObject<{
            username: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            username: string;
        }, {
            username: string;
        }>;
    };
    _response: {
        album: z.ZodObject<{
            album: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            artists: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">;
            contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                artist: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>;
                role: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }, {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }>, "many">>;
            coverArt: z.ZodString;
            created: z.ZodString;
            discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                disc: z.ZodNumber;
                title: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                disc: number;
                title: string;
            }, {
                disc: number;
                title: string;
            }>, "many">>;
            duration: z.ZodNumber;
            explicitStatus: z.ZodOptional<z.ZodString>;
            genre: z.ZodOptional<z.ZodString>;
            genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
            }, {
                name: string;
            }>, "many">>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            isCompilation: z.ZodOptional<z.ZodBoolean>;
            isDir: z.ZodBoolean;
            isVideo: z.ZodBoolean;
            name: z.ZodString;
            parent: z.ZodString;
            played: z.ZodOptional<z.ZodString>;
            recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
            }, {
                name: string;
            }>, "many">>;
            releaseDate: z.ZodOptional<z.ZodObject<{
                day: z.ZodNumber;
                month: z.ZodNumber;
                year: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                year: number;
                month: number;
                day: number;
            }, {
                year: number;
                month: number;
                day: number;
            }>>;
            releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            song: z.ZodArray<z.ZodObject<{
                album: z.ZodOptional<z.ZodString>;
                albumArtists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artist: z.ZodOptional<z.ZodString>;
                artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                averageRating: z.ZodOptional<z.ZodNumber>;
                bitDepth: z.ZodOptional<z.ZodNumber>;
                bitRate: z.ZodOptional<z.ZodNumber>;
                bpm: z.ZodOptional<z.ZodNumber>;
                channelCount: z.ZodOptional<z.ZodNumber>;
                contentType: z.ZodString;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                discNumber: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                parent: z.ZodString;
                path: z.ZodString;
                playCount: z.ZodOptional<z.ZodNumber>;
                played: z.ZodOptional<z.ZodString>;
                replayGain: z.ZodOptional<z.ZodObject<{
                    albumGain: z.ZodOptional<z.ZodNumber>;
                    albumPeak: z.ZodOptional<z.ZodNumber>;
                    trackGain: z.ZodOptional<z.ZodNumber>;
                    trackPeak: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }>>;
                samplingRate: z.ZodOptional<z.ZodNumber>;
                size: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                suffix: z.ZodString;
                title: z.ZodString;
                track: z.ZodOptional<z.ZodNumber>;
                type: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }>, "many">;
            songCount: z.ZodNumber;
            starred: z.ZodOptional<z.ZodBoolean>;
            title: z.ZodString;
            userRating: z.ZodOptional<z.ZodNumber>;
            version: z.ZodOptional<z.ZodString>;
            year: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            album: string;
            id: string | number;
            duration: number;
            name: string;
            title: string;
            artist: string;
            artists: {
                id: string;
                name: string;
            }[];
            song: {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }[];
            songCount: number;
            artistId: string | number;
            parent: string;
            coverArt: string;
            created: string;
            isDir: boolean;
            isVideo: boolean;
            version?: string | undefined;
            year?: number | undefined;
            genre?: string | undefined;
            genres?: {
                name: string;
            }[] | undefined;
            starred?: boolean | undefined;
            explicitStatus?: string | undefined;
            releaseDate?: {
                year: number;
                month: number;
                day: number;
            } | undefined;
            userRating?: number | undefined;
            played?: string | undefined;
            isCompilation?: boolean | undefined;
            recordLabels?: {
                name: string;
            }[] | undefined;
            releaseTypes?: string[] | undefined;
            contributors?: {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }[] | undefined;
            discTitles?: {
                disc: number;
                title: string;
            }[] | undefined;
        }, {
            album: string;
            id: string | number;
            duration: number;
            name: string;
            title: string;
            artist: string;
            artists: {
                id: string;
                name: string;
            }[];
            song: {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }[];
            songCount: number;
            artistId: string | number;
            parent: string;
            coverArt: string;
            created: string;
            isDir: boolean;
            isVideo: boolean;
            version?: string | undefined;
            year?: number | undefined;
            genre?: string | undefined;
            genres?: {
                name: string;
            }[] | undefined;
            starred?: boolean | undefined;
            explicitStatus?: string | undefined;
            releaseDate?: {
                year: number;
                month: number;
                day: number;
            } | undefined;
            userRating?: number | undefined;
            played?: string | undefined;
            isCompilation?: boolean | undefined;
            recordLabels?: {
                name: string;
            }[] | undefined;
            releaseTypes?: string[] | undefined;
            contributors?: {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }[] | undefined;
            discTitles?: {
                disc: number;
                title: string;
            }[] | undefined;
        }>;
        albumArtist: z.ZodObject<{
            album: z.ZodOptional<z.ZodArray<z.ZodObject<{
                album: z.ZodString;
                artist: z.ZodString;
                artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodString;
                created: z.ZodString;
                discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    disc: z.ZodNumber;
                    title: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    disc: number;
                    title: string;
                }, {
                    disc: number;
                    title: string;
                }>, "many">>;
                duration: z.ZodNumber;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isCompilation: z.ZodOptional<z.ZodBoolean>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                name: z.ZodString;
                parent: z.ZodString;
                played: z.ZodOptional<z.ZodString>;
                recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                releaseDate: z.ZodOptional<z.ZodObject<{
                    day: z.ZodNumber;
                    month: z.ZodNumber;
                    year: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    year: number;
                    month: number;
                    day: number;
                }, {
                    year: number;
                    month: number;
                    day: number;
                }>>;
                releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
                songCount: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                title: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                version: z.ZodOptional<z.ZodString>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            }, {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            }>, "many">>;
            albumCount: z.ZodString;
            artistImageUrl: z.ZodOptional<z.ZodString>;
            coverArt: z.ZodOptional<z.ZodString>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            name: z.ZodString;
            roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            starred: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string | number;
            name: string;
            albumCount: string;
            album?: {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            }[] | undefined;
            starred?: string | undefined;
            coverArt?: string | undefined;
            artistImageUrl?: string | undefined;
            roles?: string[] | undefined;
        }, {
            id: string | number;
            name: string;
            albumCount: string;
            album?: {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            }[] | undefined;
            starred?: string | undefined;
            coverArt?: string | undefined;
            artistImageUrl?: string | undefined;
            roles?: string[] | undefined;
        }>;
        albumArtistList: z.ZodObject<{
            artist: z.ZodArray<z.ZodObject<{
                album: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodString;
                    artist: z.ZodString;
                    artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodString;
                    created: z.ZodString;
                    discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        disc: z.ZodNumber;
                        title: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        disc: number;
                        title: string;
                    }, {
                        disc: number;
                        title: string;
                    }>, "many">>;
                    duration: z.ZodNumber;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isCompilation: z.ZodOptional<z.ZodBoolean>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    name: z.ZodString;
                    parent: z.ZodString;
                    played: z.ZodOptional<z.ZodString>;
                    recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    releaseDate: z.ZodOptional<z.ZodObject<{
                        day: z.ZodNumber;
                        month: z.ZodNumber;
                        year: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        year: number;
                        month: number;
                        day: number;
                    }, {
                        year: number;
                        month: number;
                        day: number;
                    }>>;
                    releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    song: z.ZodArray<z.ZodObject<{
                        album: z.ZodOptional<z.ZodString>;
                        albumArtists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artist: z.ZodOptional<z.ZodString>;
                        artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        averageRating: z.ZodOptional<z.ZodNumber>;
                        bitDepth: z.ZodOptional<z.ZodNumber>;
                        bitRate: z.ZodOptional<z.ZodNumber>;
                        bpm: z.ZodOptional<z.ZodNumber>;
                        channelCount: z.ZodOptional<z.ZodNumber>;
                        contentType: z.ZodString;
                        contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            artist: z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>;
                            role: z.ZodString;
                            subRole: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }>, "many">>;
                        coverArt: z.ZodOptional<z.ZodString>;
                        created: z.ZodString;
                        discNumber: z.ZodNumber;
                        duration: z.ZodOptional<z.ZodNumber>;
                        explicitStatus: z.ZodOptional<z.ZodString>;
                        genre: z.ZodOptional<z.ZodString>;
                        genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        isDir: z.ZodBoolean;
                        isVideo: z.ZodBoolean;
                        musicBrainzId: z.ZodOptional<z.ZodString>;
                        parent: z.ZodString;
                        path: z.ZodString;
                        playCount: z.ZodOptional<z.ZodNumber>;
                        played: z.ZodOptional<z.ZodString>;
                        replayGain: z.ZodOptional<z.ZodObject<{
                            albumGain: z.ZodOptional<z.ZodNumber>;
                            albumPeak: z.ZodOptional<z.ZodNumber>;
                            trackGain: z.ZodOptional<z.ZodNumber>;
                            trackPeak: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }>>;
                        samplingRate: z.ZodOptional<z.ZodNumber>;
                        size: z.ZodNumber;
                        starred: z.ZodOptional<z.ZodBoolean>;
                        suffix: z.ZodString;
                        title: z.ZodString;
                        track: z.ZodOptional<z.ZodNumber>;
                        type: z.ZodString;
                        userRating: z.ZodOptional<z.ZodNumber>;
                        year: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }>, "many">;
                    songCount: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    title: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    version: z.ZodOptional<z.ZodString>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }>, "many">>;
                albumCount: z.ZodString;
                artistImageUrl: z.ZodOptional<z.ZodString>;
                coverArt: z.ZodOptional<z.ZodString>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                name: z.ZodString;
                roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                starred: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                name: string;
                albumCount: string;
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                starred?: string | undefined;
                coverArt?: string | undefined;
                artistImageUrl?: string | undefined;
                roles?: string[] | undefined;
            }, {
                id: string | number;
                name: string;
                albumCount: string;
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                starred?: string | undefined;
                coverArt?: string | undefined;
                artistImageUrl?: string | undefined;
                roles?: string[] | undefined;
            }>, "many">;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            artist: {
                id: string | number;
                name: string;
                albumCount: string;
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                starred?: string | undefined;
                coverArt?: string | undefined;
                artistImageUrl?: string | undefined;
                roles?: string[] | undefined;
            }[];
        }, {
            name: string;
            artist: {
                id: string | number;
                name: string;
                albumCount: string;
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                starred?: string | undefined;
                coverArt?: string | undefined;
                artistImageUrl?: string | undefined;
                roles?: string[] | undefined;
            }[];
        }>;
        albumInfo: z.ZodObject<{
            albumInfo: z.ZodObject<{
                largeImageUrl: z.ZodOptional<z.ZodString>;
                lastFmUrl: z.ZodOptional<z.ZodString>;
                mediumImageUrl: z.ZodOptional<z.ZodString>;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                notes: z.ZodOptional<z.ZodString>;
                smallImageUrl: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                largeImageUrl?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                musicBrainzId?: string | undefined;
                lastFmUrl?: string | undefined;
                notes?: string | undefined;
            }, {
                largeImageUrl?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                musicBrainzId?: string | undefined;
                lastFmUrl?: string | undefined;
                notes?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            albumInfo: {
                largeImageUrl?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                musicBrainzId?: string | undefined;
                lastFmUrl?: string | undefined;
                notes?: string | undefined;
            };
        }, {
            albumInfo: {
                largeImageUrl?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                musicBrainzId?: string | undefined;
                lastFmUrl?: string | undefined;
                notes?: string | undefined;
            };
        }>;
        albumList: z.ZodArray<z.ZodObject<Omit<{
            album: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            artists: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">;
            contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                artist: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>;
                role: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }, {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }>, "many">>;
            coverArt: z.ZodString;
            created: z.ZodString;
            discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                disc: z.ZodNumber;
                title: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                disc: number;
                title: string;
            }, {
                disc: number;
                title: string;
            }>, "many">>;
            duration: z.ZodNumber;
            explicitStatus: z.ZodOptional<z.ZodString>;
            genre: z.ZodOptional<z.ZodString>;
            genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
            }, {
                name: string;
            }>, "many">>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            isCompilation: z.ZodOptional<z.ZodBoolean>;
            isDir: z.ZodBoolean;
            isVideo: z.ZodBoolean;
            name: z.ZodString;
            parent: z.ZodString;
            played: z.ZodOptional<z.ZodString>;
            recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
            }, {
                name: string;
            }>, "many">>;
            releaseDate: z.ZodOptional<z.ZodObject<{
                day: z.ZodNumber;
                month: z.ZodNumber;
                year: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                year: number;
                month: number;
                day: number;
            }, {
                year: number;
                month: number;
                day: number;
            }>>;
            releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            song: z.ZodArray<z.ZodObject<{
                album: z.ZodOptional<z.ZodString>;
                albumArtists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artist: z.ZodOptional<z.ZodString>;
                artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                averageRating: z.ZodOptional<z.ZodNumber>;
                bitDepth: z.ZodOptional<z.ZodNumber>;
                bitRate: z.ZodOptional<z.ZodNumber>;
                bpm: z.ZodOptional<z.ZodNumber>;
                channelCount: z.ZodOptional<z.ZodNumber>;
                contentType: z.ZodString;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                discNumber: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                parent: z.ZodString;
                path: z.ZodString;
                playCount: z.ZodOptional<z.ZodNumber>;
                played: z.ZodOptional<z.ZodString>;
                replayGain: z.ZodOptional<z.ZodObject<{
                    albumGain: z.ZodOptional<z.ZodNumber>;
                    albumPeak: z.ZodOptional<z.ZodNumber>;
                    trackGain: z.ZodOptional<z.ZodNumber>;
                    trackPeak: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }>>;
                samplingRate: z.ZodOptional<z.ZodNumber>;
                size: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                suffix: z.ZodString;
                title: z.ZodString;
                track: z.ZodOptional<z.ZodNumber>;
                type: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }>, "many">;
            songCount: z.ZodNumber;
            starred: z.ZodOptional<z.ZodBoolean>;
            title: z.ZodString;
            userRating: z.ZodOptional<z.ZodNumber>;
            version: z.ZodOptional<z.ZodString>;
            year: z.ZodOptional<z.ZodNumber>;
        }, "song">, "strip", z.ZodTypeAny, {
            album: string;
            id: string | number;
            duration: number;
            name: string;
            title: string;
            artist: string;
            artists: {
                id: string;
                name: string;
            }[];
            songCount: number;
            artistId: string | number;
            parent: string;
            coverArt: string;
            created: string;
            isDir: boolean;
            isVideo: boolean;
            version?: string | undefined;
            year?: number | undefined;
            genre?: string | undefined;
            genres?: {
                name: string;
            }[] | undefined;
            starred?: boolean | undefined;
            explicitStatus?: string | undefined;
            releaseDate?: {
                year: number;
                month: number;
                day: number;
            } | undefined;
            userRating?: number | undefined;
            played?: string | undefined;
            isCompilation?: boolean | undefined;
            recordLabels?: {
                name: string;
            }[] | undefined;
            releaseTypes?: string[] | undefined;
            contributors?: {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }[] | undefined;
            discTitles?: {
                disc: number;
                title: string;
            }[] | undefined;
        }, {
            album: string;
            id: string | number;
            duration: number;
            name: string;
            title: string;
            artist: string;
            artists: {
                id: string;
                name: string;
            }[];
            songCount: number;
            artistId: string | number;
            parent: string;
            coverArt: string;
            created: string;
            isDir: boolean;
            isVideo: boolean;
            version?: string | undefined;
            year?: number | undefined;
            genre?: string | undefined;
            genres?: {
                name: string;
            }[] | undefined;
            starred?: boolean | undefined;
            explicitStatus?: string | undefined;
            releaseDate?: {
                year: number;
                month: number;
                day: number;
            } | undefined;
            userRating?: number | undefined;
            played?: string | undefined;
            isCompilation?: boolean | undefined;
            recordLabels?: {
                name: string;
            }[] | undefined;
            releaseTypes?: string[] | undefined;
            contributors?: {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }[] | undefined;
            discTitles?: {
                disc: number;
                title: string;
            }[] | undefined;
        }>, "many">;
        albumListEntry: z.ZodObject<Omit<{
            album: z.ZodString;
            artist: z.ZodString;
            artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            artists: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">;
            contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                artist: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>;
                role: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }, {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }>, "many">>;
            coverArt: z.ZodString;
            created: z.ZodString;
            discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                disc: z.ZodNumber;
                title: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                disc: number;
                title: string;
            }, {
                disc: number;
                title: string;
            }>, "many">>;
            duration: z.ZodNumber;
            explicitStatus: z.ZodOptional<z.ZodString>;
            genre: z.ZodOptional<z.ZodString>;
            genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
            }, {
                name: string;
            }>, "many">>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            isCompilation: z.ZodOptional<z.ZodBoolean>;
            isDir: z.ZodBoolean;
            isVideo: z.ZodBoolean;
            name: z.ZodString;
            parent: z.ZodString;
            played: z.ZodOptional<z.ZodString>;
            recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
            }, {
                name: string;
            }>, "many">>;
            releaseDate: z.ZodOptional<z.ZodObject<{
                day: z.ZodNumber;
                month: z.ZodNumber;
                year: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                year: number;
                month: number;
                day: number;
            }, {
                year: number;
                month: number;
                day: number;
            }>>;
            releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            song: z.ZodArray<z.ZodObject<{
                album: z.ZodOptional<z.ZodString>;
                albumArtists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artist: z.ZodOptional<z.ZodString>;
                artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                averageRating: z.ZodOptional<z.ZodNumber>;
                bitDepth: z.ZodOptional<z.ZodNumber>;
                bitRate: z.ZodOptional<z.ZodNumber>;
                bpm: z.ZodOptional<z.ZodNumber>;
                channelCount: z.ZodOptional<z.ZodNumber>;
                contentType: z.ZodString;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                discNumber: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                parent: z.ZodString;
                path: z.ZodString;
                playCount: z.ZodOptional<z.ZodNumber>;
                played: z.ZodOptional<z.ZodString>;
                replayGain: z.ZodOptional<z.ZodObject<{
                    albumGain: z.ZodOptional<z.ZodNumber>;
                    albumPeak: z.ZodOptional<z.ZodNumber>;
                    trackGain: z.ZodOptional<z.ZodNumber>;
                    trackPeak: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }>>;
                samplingRate: z.ZodOptional<z.ZodNumber>;
                size: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                suffix: z.ZodString;
                title: z.ZodString;
                track: z.ZodOptional<z.ZodNumber>;
                type: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }>, "many">;
            songCount: z.ZodNumber;
            starred: z.ZodOptional<z.ZodBoolean>;
            title: z.ZodString;
            userRating: z.ZodOptional<z.ZodNumber>;
            version: z.ZodOptional<z.ZodString>;
            year: z.ZodOptional<z.ZodNumber>;
        }, "song">, "strip", z.ZodTypeAny, {
            album: string;
            id: string | number;
            duration: number;
            name: string;
            title: string;
            artist: string;
            artists: {
                id: string;
                name: string;
            }[];
            songCount: number;
            artistId: string | number;
            parent: string;
            coverArt: string;
            created: string;
            isDir: boolean;
            isVideo: boolean;
            version?: string | undefined;
            year?: number | undefined;
            genre?: string | undefined;
            genres?: {
                name: string;
            }[] | undefined;
            starred?: boolean | undefined;
            explicitStatus?: string | undefined;
            releaseDate?: {
                year: number;
                month: number;
                day: number;
            } | undefined;
            userRating?: number | undefined;
            played?: string | undefined;
            isCompilation?: boolean | undefined;
            recordLabels?: {
                name: string;
            }[] | undefined;
            releaseTypes?: string[] | undefined;
            contributors?: {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }[] | undefined;
            discTitles?: {
                disc: number;
                title: string;
            }[] | undefined;
        }, {
            album: string;
            id: string | number;
            duration: number;
            name: string;
            title: string;
            artist: string;
            artists: {
                id: string;
                name: string;
            }[];
            songCount: number;
            artistId: string | number;
            parent: string;
            coverArt: string;
            created: string;
            isDir: boolean;
            isVideo: boolean;
            version?: string | undefined;
            year?: number | undefined;
            genre?: string | undefined;
            genres?: {
                name: string;
            }[] | undefined;
            starred?: boolean | undefined;
            explicitStatus?: string | undefined;
            releaseDate?: {
                year: number;
                month: number;
                day: number;
            } | undefined;
            userRating?: number | undefined;
            played?: string | undefined;
            isCompilation?: boolean | undefined;
            recordLabels?: {
                name: string;
            }[] | undefined;
            releaseTypes?: string[] | undefined;
            contributors?: {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }[] | undefined;
            discTitles?: {
                disc: number;
                title: string;
            }[] | undefined;
        }>;
        artistInfo: z.ZodObject<{
            artistInfo: z.ZodObject<{
                biography: z.ZodOptional<z.ZodString>;
                largeImageUrl: z.ZodOptional<z.ZodString>;
                lastFmUrl: z.ZodOptional<z.ZodString>;
                mediumImageUrl: z.ZodOptional<z.ZodString>;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                similarArtist: z.ZodArray<z.ZodObject<{
                    albumCount: z.ZodString;
                    artistImageUrl: z.ZodOptional<z.ZodString>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    id: z.ZodString;
                    name: z.ZodString;
                    starred: z.ZodOptional<z.ZodString>;
                    userRating: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    userRating?: number | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                }, {
                    id: string;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    userRating?: number | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                }>, "many">;
                smallImageUrl: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                similarArtist: {
                    id: string;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    userRating?: number | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                }[];
                biography?: string | undefined;
                largeImageUrl?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                musicBrainzId?: string | undefined;
                lastFmUrl?: string | undefined;
            }, {
                similarArtist: {
                    id: string;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    userRating?: number | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                }[];
                biography?: string | undefined;
                largeImageUrl?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                musicBrainzId?: string | undefined;
                lastFmUrl?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            artistInfo: {
                similarArtist: {
                    id: string;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    userRating?: number | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                }[];
                biography?: string | undefined;
                largeImageUrl?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                musicBrainzId?: string | undefined;
                lastFmUrl?: string | undefined;
            };
        }, {
            artistInfo: {
                similarArtist: {
                    id: string;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    userRating?: number | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                }[];
                biography?: string | undefined;
                largeImageUrl?: string | undefined;
                mediumImageUrl?: string | undefined;
                smallImageUrl?: string | undefined;
                musicBrainzId?: string | undefined;
                lastFmUrl?: string | undefined;
            };
        }>;
        artistListEntry: z.ZodObject<Pick<{
            album: z.ZodOptional<z.ZodArray<z.ZodObject<{
                album: z.ZodString;
                artist: z.ZodString;
                artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodString;
                created: z.ZodString;
                discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    disc: z.ZodNumber;
                    title: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    disc: number;
                    title: string;
                }, {
                    disc: number;
                    title: string;
                }>, "many">>;
                duration: z.ZodNumber;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isCompilation: z.ZodOptional<z.ZodBoolean>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                name: z.ZodString;
                parent: z.ZodString;
                played: z.ZodOptional<z.ZodString>;
                recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                releaseDate: z.ZodOptional<z.ZodObject<{
                    day: z.ZodNumber;
                    month: z.ZodNumber;
                    year: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    year: number;
                    month: number;
                    day: number;
                }, {
                    year: number;
                    month: number;
                    day: number;
                }>>;
                releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
                songCount: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                title: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                version: z.ZodOptional<z.ZodString>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            }, {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            }>, "many">>;
            albumCount: z.ZodString;
            artistImageUrl: z.ZodOptional<z.ZodString>;
            coverArt: z.ZodOptional<z.ZodString>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            name: z.ZodString;
            roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            starred: z.ZodOptional<z.ZodString>;
        }, "id" | "name" | "starred" | "albumCount" | "coverArt" | "roles">, "strip", z.ZodTypeAny, {
            id: string | number;
            name: string;
            albumCount: string;
            starred?: string | undefined;
            coverArt?: string | undefined;
            roles?: string[] | undefined;
        }, {
            id: string | number;
            name: string;
            albumCount: string;
            starred?: string | undefined;
            coverArt?: string | undefined;
            roles?: string[] | undefined;
        }>;
        authenticate: z.ZodObject<{
            user: z.ZodObject<{
                adminRole: z.ZodBoolean;
                commentRole: z.ZodBoolean;
                coverArtRole: z.ZodBoolean;
                downloadRole: z.ZodBoolean;
                folder: z.ZodArray<z.ZodString, "many">;
                jukeboxRole: z.ZodBoolean;
                playlistRole: z.ZodBoolean;
                podcastRole: z.ZodBoolean;
                scrobblingEnabled: z.ZodBoolean;
                settingsRole: z.ZodBoolean;
                shareRole: z.ZodBoolean;
                streamRole: z.ZodBoolean;
                uploadRole: z.ZodBoolean;
                username: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                folder: string[];
                username: string;
                adminRole: boolean;
                commentRole: boolean;
                coverArtRole: boolean;
                downloadRole: boolean;
                jukeboxRole: boolean;
                playlistRole: boolean;
                podcastRole: boolean;
                scrobblingEnabled: boolean;
                settingsRole: boolean;
                shareRole: boolean;
                streamRole: boolean;
                uploadRole: boolean;
            }, {
                folder: string[];
                username: string;
                adminRole: boolean;
                commentRole: boolean;
                coverArtRole: boolean;
                downloadRole: boolean;
                jukeboxRole: boolean;
                playlistRole: boolean;
                podcastRole: boolean;
                scrobblingEnabled: boolean;
                settingsRole: boolean;
                shareRole: boolean;
                streamRole: boolean;
                uploadRole: boolean;
            }>;
        }, "strip", z.ZodTypeAny, {
            user: {
                folder: string[];
                username: string;
                adminRole: boolean;
                commentRole: boolean;
                coverArtRole: boolean;
                downloadRole: boolean;
                jukeboxRole: boolean;
                playlistRole: boolean;
                podcastRole: boolean;
                scrobblingEnabled: boolean;
                settingsRole: boolean;
                shareRole: boolean;
                streamRole: boolean;
                uploadRole: boolean;
            };
        }, {
            user: {
                folder: string[];
                username: string;
                adminRole: boolean;
                commentRole: boolean;
                coverArtRole: boolean;
                downloadRole: boolean;
                jukeboxRole: boolean;
                playlistRole: boolean;
                podcastRole: boolean;
                scrobblingEnabled: boolean;
                settingsRole: boolean;
                shareRole: boolean;
                streamRole: boolean;
                uploadRole: boolean;
            };
        }>;
        baseResponse: z.ZodObject<{
            'subsonic-response': z.ZodObject<{
                status: z.ZodString;
                version: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                version: string;
                status: string;
            }, {
                version: string;
                status: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            'subsonic-response': {
                version: string;
                status: string;
            };
        }, {
            'subsonic-response': {
                version: string;
                status: string;
            };
        }>;
        createFavorite: z.ZodNull;
        createInternetRadioStation: z.ZodNull;
        createPlaylist: z.ZodObject<{
            playlist: z.ZodObject<{
                changed: z.ZodOptional<z.ZodString>;
                comment: z.ZodOptional<z.ZodString>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                duration: z.ZodNumber;
                entry: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                name: z.ZodString;
                owner: z.ZodString;
                public: z.ZodBoolean;
                songCount: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                duration: number;
                name: string;
                owner: string;
                public: boolean;
                songCount: number;
                created: string;
                comment?: string | undefined;
                coverArt?: string | undefined;
                changed?: string | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }, {
                id: string | number;
                duration: number;
                name: string;
                owner: string;
                public: boolean;
                songCount: number;
                created: string;
                comment?: string | undefined;
                coverArt?: string | undefined;
                changed?: string | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            playlist: {
                id: string | number;
                duration: number;
                name: string;
                owner: string;
                public: boolean;
                songCount: number;
                created: string;
                comment?: string | undefined;
                coverArt?: string | undefined;
                changed?: string | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            };
        }, {
            playlist: {
                id: string | number;
                duration: number;
                name: string;
                owner: string;
                public: boolean;
                songCount: number;
                created: string;
                comment?: string | undefined;
                coverArt?: string | undefined;
                changed?: string | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            };
        }>;
        deleteInternetRadioStation: z.ZodNull;
        directory: z.ZodObject<{
            artist: z.ZodOptional<z.ZodString>;
            child: z.ZodOptional<z.ZodArray<z.ZodObject<{
                album: z.ZodOptional<z.ZodString>;
                albumArtists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artist: z.ZodOptional<z.ZodString>;
                artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                averageRating: z.ZodOptional<z.ZodNumber>;
                bitDepth: z.ZodOptional<z.ZodNumber>;
                bitRate: z.ZodOptional<z.ZodNumber>;
                bpm: z.ZodOptional<z.ZodNumber>;
                channelCount: z.ZodOptional<z.ZodNumber>;
                contentType: z.ZodString;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                discNumber: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                parent: z.ZodString;
                path: z.ZodString;
                playCount: z.ZodOptional<z.ZodNumber>;
                played: z.ZodOptional<z.ZodString>;
                replayGain: z.ZodOptional<z.ZodObject<{
                    albumGain: z.ZodOptional<z.ZodNumber>;
                    albumPeak: z.ZodOptional<z.ZodNumber>;
                    trackGain: z.ZodOptional<z.ZodNumber>;
                    trackPeak: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }>>;
                samplingRate: z.ZodOptional<z.ZodNumber>;
                size: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                suffix: z.ZodString;
                title: z.ZodString;
                track: z.ZodOptional<z.ZodNumber>;
                type: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }>, "many">>;
            coverArt: z.ZodOptional<z.ZodString>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            isDir: z.ZodBoolean;
            parent: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string | number;
            title: string;
            isDir: boolean;
            artist?: string | undefined;
            parent?: string | undefined;
            coverArt?: string | undefined;
            child?: {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }[] | undefined;
        }, {
            id: string | number;
            title: string;
            isDir: boolean;
            artist?: string | undefined;
            parent?: string | undefined;
            coverArt?: string | undefined;
            child?: {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }[] | undefined;
        }>;
        genre: z.ZodObject<{
            albumCount: z.ZodNumber;
            songCount: z.ZodNumber;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value: string;
            songCount: number;
            albumCount: number;
        }, {
            value: string;
            songCount: number;
            albumCount: number;
        }>;
        getAlbum: z.ZodObject<{
            album: z.ZodObject<{
                album: z.ZodString;
                artist: z.ZodString;
                artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodString;
                created: z.ZodString;
                discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    disc: z.ZodNumber;
                    title: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    disc: number;
                    title: string;
                }, {
                    disc: number;
                    title: string;
                }>, "many">>;
                duration: z.ZodNumber;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isCompilation: z.ZodOptional<z.ZodBoolean>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                name: z.ZodString;
                parent: z.ZodString;
                played: z.ZodOptional<z.ZodString>;
                recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                releaseDate: z.ZodOptional<z.ZodObject<{
                    day: z.ZodNumber;
                    month: z.ZodNumber;
                    year: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    year: number;
                    month: number;
                    day: number;
                }, {
                    year: number;
                    month: number;
                    day: number;
                }>>;
                releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
                songCount: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                title: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                version: z.ZodOptional<z.ZodString>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            }, {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            album: {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            };
        }, {
            album: {
                album: string;
                id: string | number;
                duration: number;
                name: string;
                title: string;
                artist: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                songCount: number;
                artistId: string | number;
                parent: string;
                coverArt: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                version?: string | undefined;
                year?: number | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                explicitStatus?: string | undefined;
                releaseDate?: {
                    year: number;
                    month: number;
                    day: number;
                } | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                isCompilation?: boolean | undefined;
                recordLabels?: {
                    name: string;
                }[] | undefined;
                releaseTypes?: string[] | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                discTitles?: {
                    disc: number;
                    title: string;
                }[] | undefined;
            };
        }>;
        getAlbumList2: z.ZodObject<{
            albumList2: z.ZodObject<{
                album: z.ZodArray<z.ZodObject<Omit<{
                    album: z.ZodString;
                    artist: z.ZodString;
                    artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodString;
                    created: z.ZodString;
                    discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        disc: z.ZodNumber;
                        title: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        disc: number;
                        title: string;
                    }, {
                        disc: number;
                        title: string;
                    }>, "many">>;
                    duration: z.ZodNumber;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isCompilation: z.ZodOptional<z.ZodBoolean>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    name: z.ZodString;
                    parent: z.ZodString;
                    played: z.ZodOptional<z.ZodString>;
                    recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    releaseDate: z.ZodOptional<z.ZodObject<{
                        day: z.ZodNumber;
                        month: z.ZodNumber;
                        year: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        year: number;
                        month: number;
                        day: number;
                    }, {
                        year: number;
                        month: number;
                        day: number;
                    }>>;
                    releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    song: z.ZodArray<z.ZodObject<{
                        album: z.ZodOptional<z.ZodString>;
                        albumArtists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artist: z.ZodOptional<z.ZodString>;
                        artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        averageRating: z.ZodOptional<z.ZodNumber>;
                        bitDepth: z.ZodOptional<z.ZodNumber>;
                        bitRate: z.ZodOptional<z.ZodNumber>;
                        bpm: z.ZodOptional<z.ZodNumber>;
                        channelCount: z.ZodOptional<z.ZodNumber>;
                        contentType: z.ZodString;
                        contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            artist: z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>;
                            role: z.ZodString;
                            subRole: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }>, "many">>;
                        coverArt: z.ZodOptional<z.ZodString>;
                        created: z.ZodString;
                        discNumber: z.ZodNumber;
                        duration: z.ZodOptional<z.ZodNumber>;
                        explicitStatus: z.ZodOptional<z.ZodString>;
                        genre: z.ZodOptional<z.ZodString>;
                        genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        isDir: z.ZodBoolean;
                        isVideo: z.ZodBoolean;
                        musicBrainzId: z.ZodOptional<z.ZodString>;
                        parent: z.ZodString;
                        path: z.ZodString;
                        playCount: z.ZodOptional<z.ZodNumber>;
                        played: z.ZodOptional<z.ZodString>;
                        replayGain: z.ZodOptional<z.ZodObject<{
                            albumGain: z.ZodOptional<z.ZodNumber>;
                            albumPeak: z.ZodOptional<z.ZodNumber>;
                            trackGain: z.ZodOptional<z.ZodNumber>;
                            trackPeak: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }>>;
                        samplingRate: z.ZodOptional<z.ZodNumber>;
                        size: z.ZodNumber;
                        starred: z.ZodOptional<z.ZodBoolean>;
                        suffix: z.ZodString;
                        title: z.ZodString;
                        track: z.ZodOptional<z.ZodNumber>;
                        type: z.ZodString;
                        userRating: z.ZodOptional<z.ZodNumber>;
                        year: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }>, "many">;
                    songCount: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    title: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    version: z.ZodOptional<z.ZodString>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "song">, "strip", z.ZodTypeAny, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                album: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[];
            }, {
                album: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[];
            }>;
        }, "strip", z.ZodTypeAny, {
            albumList2: {
                album: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[];
            };
        }, {
            albumList2: {
                album: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[];
            };
        }>;
        getArtist: z.ZodObject<{
            artist: z.ZodObject<{
                album: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodString;
                    artist: z.ZodString;
                    artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodString;
                    created: z.ZodString;
                    discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        disc: z.ZodNumber;
                        title: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        disc: number;
                        title: string;
                    }, {
                        disc: number;
                        title: string;
                    }>, "many">>;
                    duration: z.ZodNumber;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isCompilation: z.ZodOptional<z.ZodBoolean>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    name: z.ZodString;
                    parent: z.ZodString;
                    played: z.ZodOptional<z.ZodString>;
                    recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    releaseDate: z.ZodOptional<z.ZodObject<{
                        day: z.ZodNumber;
                        month: z.ZodNumber;
                        year: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        year: number;
                        month: number;
                        day: number;
                    }, {
                        year: number;
                        month: number;
                        day: number;
                    }>>;
                    releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    song: z.ZodArray<z.ZodObject<{
                        album: z.ZodOptional<z.ZodString>;
                        albumArtists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artist: z.ZodOptional<z.ZodString>;
                        artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        averageRating: z.ZodOptional<z.ZodNumber>;
                        bitDepth: z.ZodOptional<z.ZodNumber>;
                        bitRate: z.ZodOptional<z.ZodNumber>;
                        bpm: z.ZodOptional<z.ZodNumber>;
                        channelCount: z.ZodOptional<z.ZodNumber>;
                        contentType: z.ZodString;
                        contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            artist: z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>;
                            role: z.ZodString;
                            subRole: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }>, "many">>;
                        coverArt: z.ZodOptional<z.ZodString>;
                        created: z.ZodString;
                        discNumber: z.ZodNumber;
                        duration: z.ZodOptional<z.ZodNumber>;
                        explicitStatus: z.ZodOptional<z.ZodString>;
                        genre: z.ZodOptional<z.ZodString>;
                        genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        isDir: z.ZodBoolean;
                        isVideo: z.ZodBoolean;
                        musicBrainzId: z.ZodOptional<z.ZodString>;
                        parent: z.ZodString;
                        path: z.ZodString;
                        playCount: z.ZodOptional<z.ZodNumber>;
                        played: z.ZodOptional<z.ZodString>;
                        replayGain: z.ZodOptional<z.ZodObject<{
                            albumGain: z.ZodOptional<z.ZodNumber>;
                            albumPeak: z.ZodOptional<z.ZodNumber>;
                            trackGain: z.ZodOptional<z.ZodNumber>;
                            trackPeak: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }>>;
                        samplingRate: z.ZodOptional<z.ZodNumber>;
                        size: z.ZodNumber;
                        starred: z.ZodOptional<z.ZodBoolean>;
                        suffix: z.ZodString;
                        title: z.ZodString;
                        track: z.ZodOptional<z.ZodNumber>;
                        type: z.ZodString;
                        userRating: z.ZodOptional<z.ZodNumber>;
                        year: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }>, "many">;
                    songCount: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    title: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    version: z.ZodOptional<z.ZodString>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }>, "many">>;
                albumCount: z.ZodString;
                artistImageUrl: z.ZodOptional<z.ZodString>;
                coverArt: z.ZodOptional<z.ZodString>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                name: z.ZodString;
                roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                starred: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                name: string;
                albumCount: string;
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                starred?: string | undefined;
                coverArt?: string | undefined;
                artistImageUrl?: string | undefined;
                roles?: string[] | undefined;
            }, {
                id: string | number;
                name: string;
                albumCount: string;
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                starred?: string | undefined;
                coverArt?: string | undefined;
                artistImageUrl?: string | undefined;
                roles?: string[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            artist: {
                id: string | number;
                name: string;
                albumCount: string;
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                starred?: string | undefined;
                coverArt?: string | undefined;
                artistImageUrl?: string | undefined;
                roles?: string[] | undefined;
            };
        }, {
            artist: {
                id: string | number;
                name: string;
                albumCount: string;
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                starred?: string | undefined;
                coverArt?: string | undefined;
                artistImageUrl?: string | undefined;
                roles?: string[] | undefined;
            };
        }>;
        getArtists: z.ZodObject<{
            artists: z.ZodObject<{
                ignoredArticles: z.ZodString;
                index: z.ZodArray<z.ZodObject<{
                    artist: z.ZodArray<z.ZodObject<Pick<{
                        album: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            album: z.ZodString;
                            artist: z.ZodString;
                            artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                            artists: z.ZodArray<z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>, "many">;
                            contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                artist: z.ZodObject<{
                                    id: z.ZodString;
                                    name: z.ZodString;
                                }, "strip", z.ZodTypeAny, {
                                    id: string;
                                    name: string;
                                }, {
                                    id: string;
                                    name: string;
                                }>;
                                role: z.ZodString;
                                subRole: z.ZodOptional<z.ZodString>;
                            }, "strip", z.ZodTypeAny, {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }, {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }>, "many">>;
                            coverArt: z.ZodString;
                            created: z.ZodString;
                            discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                disc: z.ZodNumber;
                                title: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                disc: number;
                                title: string;
                            }, {
                                disc: number;
                                title: string;
                            }>, "many">>;
                            duration: z.ZodNumber;
                            explicitStatus: z.ZodOptional<z.ZodString>;
                            genre: z.ZodOptional<z.ZodString>;
                            genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                name: string;
                            }, {
                                name: string;
                            }>, "many">>;
                            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                            isCompilation: z.ZodOptional<z.ZodBoolean>;
                            isDir: z.ZodBoolean;
                            isVideo: z.ZodBoolean;
                            name: z.ZodString;
                            parent: z.ZodString;
                            played: z.ZodOptional<z.ZodString>;
                            recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                name: string;
                            }, {
                                name: string;
                            }>, "many">>;
                            releaseDate: z.ZodOptional<z.ZodObject<{
                                day: z.ZodNumber;
                                month: z.ZodNumber;
                                year: z.ZodNumber;
                            }, "strip", z.ZodTypeAny, {
                                year: number;
                                month: number;
                                day: number;
                            }, {
                                year: number;
                                month: number;
                                day: number;
                            }>>;
                            releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                            song: z.ZodArray<z.ZodObject<{
                                album: z.ZodOptional<z.ZodString>;
                                albumArtists: z.ZodArray<z.ZodObject<{
                                    id: z.ZodString;
                                    name: z.ZodString;
                                }, "strip", z.ZodTypeAny, {
                                    id: string;
                                    name: string;
                                }, {
                                    id: string;
                                    name: string;
                                }>, "many">;
                                albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                                artist: z.ZodOptional<z.ZodString>;
                                artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                                artists: z.ZodArray<z.ZodObject<{
                                    id: z.ZodString;
                                    name: z.ZodString;
                                }, "strip", z.ZodTypeAny, {
                                    id: string;
                                    name: string;
                                }, {
                                    id: string;
                                    name: string;
                                }>, "many">;
                                averageRating: z.ZodOptional<z.ZodNumber>;
                                bitDepth: z.ZodOptional<z.ZodNumber>;
                                bitRate: z.ZodOptional<z.ZodNumber>;
                                bpm: z.ZodOptional<z.ZodNumber>;
                                channelCount: z.ZodOptional<z.ZodNumber>;
                                contentType: z.ZodString;
                                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                    artist: z.ZodObject<{
                                        id: z.ZodString;
                                        name: z.ZodString;
                                    }, "strip", z.ZodTypeAny, {
                                        id: string;
                                        name: string;
                                    }, {
                                        id: string;
                                        name: string;
                                    }>;
                                    role: z.ZodString;
                                    subRole: z.ZodOptional<z.ZodString>;
                                }, "strip", z.ZodTypeAny, {
                                    artist: {
                                        id: string;
                                        name: string;
                                    };
                                    role: string;
                                    subRole?: string | undefined;
                                }, {
                                    artist: {
                                        id: string;
                                        name: string;
                                    };
                                    role: string;
                                    subRole?: string | undefined;
                                }>, "many">>;
                                coverArt: z.ZodOptional<z.ZodString>;
                                created: z.ZodString;
                                discNumber: z.ZodNumber;
                                duration: z.ZodOptional<z.ZodNumber>;
                                explicitStatus: z.ZodOptional<z.ZodString>;
                                genre: z.ZodOptional<z.ZodString>;
                                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                    name: z.ZodString;
                                }, "strip", z.ZodTypeAny, {
                                    name: string;
                                }, {
                                    name: string;
                                }>, "many">>;
                                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                                isDir: z.ZodBoolean;
                                isVideo: z.ZodBoolean;
                                musicBrainzId: z.ZodOptional<z.ZodString>;
                                parent: z.ZodString;
                                path: z.ZodString;
                                playCount: z.ZodOptional<z.ZodNumber>;
                                played: z.ZodOptional<z.ZodString>;
                                replayGain: z.ZodOptional<z.ZodObject<{
                                    albumGain: z.ZodOptional<z.ZodNumber>;
                                    albumPeak: z.ZodOptional<z.ZodNumber>;
                                    trackGain: z.ZodOptional<z.ZodNumber>;
                                    trackPeak: z.ZodOptional<z.ZodNumber>;
                                }, "strip", z.ZodTypeAny, {
                                    albumGain?: number | undefined;
                                    albumPeak?: number | undefined;
                                    trackGain?: number | undefined;
                                    trackPeak?: number | undefined;
                                }, {
                                    albumGain?: number | undefined;
                                    albumPeak?: number | undefined;
                                    trackGain?: number | undefined;
                                    trackPeak?: number | undefined;
                                }>>;
                                samplingRate: z.ZodOptional<z.ZodNumber>;
                                size: z.ZodNumber;
                                starred: z.ZodOptional<z.ZodBoolean>;
                                suffix: z.ZodString;
                                title: z.ZodString;
                                track: z.ZodOptional<z.ZodNumber>;
                                type: z.ZodString;
                                userRating: z.ZodOptional<z.ZodNumber>;
                                year: z.ZodOptional<z.ZodNumber>;
                            }, "strip", z.ZodTypeAny, {
                                id: string | number;
                                path: string;
                                size: number;
                                title: string;
                                artists: {
                                    id: string;
                                    name: string;
                                }[];
                                type: string;
                                discNumber: number;
                                suffix: string;
                                albumArtists: {
                                    id: string;
                                    name: string;
                                }[];
                                parent: string;
                                contentType: string;
                                created: string;
                                isDir: boolean;
                                isVideo: boolean;
                                bpm?: number | undefined;
                                album?: string | undefined;
                                duration?: number | undefined;
                                track?: number | undefined;
                                year?: number | undefined;
                                artist?: string | undefined;
                                genre?: string | undefined;
                                genres?: {
                                    name: string;
                                }[] | undefined;
                                starred?: boolean | undefined;
                                artistId?: string | number | undefined;
                                explicitStatus?: string | undefined;
                                playCount?: number | undefined;
                                albumId?: string | number | undefined;
                                bitDepth?: number | undefined;
                                bitRate?: number | undefined;
                                userRating?: number | undefined;
                                played?: string | undefined;
                                contributors?: {
                                    artist: {
                                        id: string;
                                        name: string;
                                    };
                                    role: string;
                                    subRole?: string | undefined;
                                }[] | undefined;
                                coverArt?: string | undefined;
                                averageRating?: number | undefined;
                                channelCount?: number | undefined;
                                musicBrainzId?: string | undefined;
                                replayGain?: {
                                    albumGain?: number | undefined;
                                    albumPeak?: number | undefined;
                                    trackGain?: number | undefined;
                                    trackPeak?: number | undefined;
                                } | undefined;
                                samplingRate?: number | undefined;
                            }, {
                                id: string | number;
                                path: string;
                                size: number;
                                title: string;
                                artists: {
                                    id: string;
                                    name: string;
                                }[];
                                type: string;
                                discNumber: number;
                                suffix: string;
                                albumArtists: {
                                    id: string;
                                    name: string;
                                }[];
                                parent: string;
                                contentType: string;
                                created: string;
                                isDir: boolean;
                                isVideo: boolean;
                                bpm?: number | undefined;
                                album?: string | undefined;
                                duration?: number | undefined;
                                track?: number | undefined;
                                year?: number | undefined;
                                artist?: string | undefined;
                                genre?: string | undefined;
                                genres?: {
                                    name: string;
                                }[] | undefined;
                                starred?: boolean | undefined;
                                artistId?: string | number | undefined;
                                explicitStatus?: string | undefined;
                                playCount?: number | undefined;
                                albumId?: string | number | undefined;
                                bitDepth?: number | undefined;
                                bitRate?: number | undefined;
                                userRating?: number | undefined;
                                played?: string | undefined;
                                contributors?: {
                                    artist: {
                                        id: string;
                                        name: string;
                                    };
                                    role: string;
                                    subRole?: string | undefined;
                                }[] | undefined;
                                coverArt?: string | undefined;
                                averageRating?: number | undefined;
                                channelCount?: number | undefined;
                                musicBrainzId?: string | undefined;
                                replayGain?: {
                                    albumGain?: number | undefined;
                                    albumPeak?: number | undefined;
                                    trackGain?: number | undefined;
                                    trackPeak?: number | undefined;
                                } | undefined;
                                samplingRate?: number | undefined;
                            }>, "many">;
                            songCount: z.ZodNumber;
                            starred: z.ZodOptional<z.ZodBoolean>;
                            title: z.ZodString;
                            userRating: z.ZodOptional<z.ZodNumber>;
                            version: z.ZodOptional<z.ZodString>;
                            year: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            album: string;
                            id: string | number;
                            duration: number;
                            name: string;
                            title: string;
                            artist: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            song: {
                                id: string | number;
                                path: string;
                                size: number;
                                title: string;
                                artists: {
                                    id: string;
                                    name: string;
                                }[];
                                type: string;
                                discNumber: number;
                                suffix: string;
                                albumArtists: {
                                    id: string;
                                    name: string;
                                }[];
                                parent: string;
                                contentType: string;
                                created: string;
                                isDir: boolean;
                                isVideo: boolean;
                                bpm?: number | undefined;
                                album?: string | undefined;
                                duration?: number | undefined;
                                track?: number | undefined;
                                year?: number | undefined;
                                artist?: string | undefined;
                                genre?: string | undefined;
                                genres?: {
                                    name: string;
                                }[] | undefined;
                                starred?: boolean | undefined;
                                artistId?: string | number | undefined;
                                explicitStatus?: string | undefined;
                                playCount?: number | undefined;
                                albumId?: string | number | undefined;
                                bitDepth?: number | undefined;
                                bitRate?: number | undefined;
                                userRating?: number | undefined;
                                played?: string | undefined;
                                contributors?: {
                                    artist: {
                                        id: string;
                                        name: string;
                                    };
                                    role: string;
                                    subRole?: string | undefined;
                                }[] | undefined;
                                coverArt?: string | undefined;
                                averageRating?: number | undefined;
                                channelCount?: number | undefined;
                                musicBrainzId?: string | undefined;
                                replayGain?: {
                                    albumGain?: number | undefined;
                                    albumPeak?: number | undefined;
                                    trackGain?: number | undefined;
                                    trackPeak?: number | undefined;
                                } | undefined;
                                samplingRate?: number | undefined;
                            }[];
                            songCount: number;
                            artistId: string | number;
                            parent: string;
                            coverArt: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            version?: string | undefined;
                            year?: number | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            explicitStatus?: string | undefined;
                            releaseDate?: {
                                year: number;
                                month: number;
                                day: number;
                            } | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            isCompilation?: boolean | undefined;
                            recordLabels?: {
                                name: string;
                            }[] | undefined;
                            releaseTypes?: string[] | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            discTitles?: {
                                disc: number;
                                title: string;
                            }[] | undefined;
                        }, {
                            album: string;
                            id: string | number;
                            duration: number;
                            name: string;
                            title: string;
                            artist: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            song: {
                                id: string | number;
                                path: string;
                                size: number;
                                title: string;
                                artists: {
                                    id: string;
                                    name: string;
                                }[];
                                type: string;
                                discNumber: number;
                                suffix: string;
                                albumArtists: {
                                    id: string;
                                    name: string;
                                }[];
                                parent: string;
                                contentType: string;
                                created: string;
                                isDir: boolean;
                                isVideo: boolean;
                                bpm?: number | undefined;
                                album?: string | undefined;
                                duration?: number | undefined;
                                track?: number | undefined;
                                year?: number | undefined;
                                artist?: string | undefined;
                                genre?: string | undefined;
                                genres?: {
                                    name: string;
                                }[] | undefined;
                                starred?: boolean | undefined;
                                artistId?: string | number | undefined;
                                explicitStatus?: string | undefined;
                                playCount?: number | undefined;
                                albumId?: string | number | undefined;
                                bitDepth?: number | undefined;
                                bitRate?: number | undefined;
                                userRating?: number | undefined;
                                played?: string | undefined;
                                contributors?: {
                                    artist: {
                                        id: string;
                                        name: string;
                                    };
                                    role: string;
                                    subRole?: string | undefined;
                                }[] | undefined;
                                coverArt?: string | undefined;
                                averageRating?: number | undefined;
                                channelCount?: number | undefined;
                                musicBrainzId?: string | undefined;
                                replayGain?: {
                                    albumGain?: number | undefined;
                                    albumPeak?: number | undefined;
                                    trackGain?: number | undefined;
                                    trackPeak?: number | undefined;
                                } | undefined;
                                samplingRate?: number | undefined;
                            }[];
                            songCount: number;
                            artistId: string | number;
                            parent: string;
                            coverArt: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            version?: string | undefined;
                            year?: number | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            explicitStatus?: string | undefined;
                            releaseDate?: {
                                year: number;
                                month: number;
                                day: number;
                            } | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            isCompilation?: boolean | undefined;
                            recordLabels?: {
                                name: string;
                            }[] | undefined;
                            releaseTypes?: string[] | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            discTitles?: {
                                disc: number;
                                title: string;
                            }[] | undefined;
                        }>, "many">>;
                        albumCount: z.ZodString;
                        artistImageUrl: z.ZodOptional<z.ZodString>;
                        coverArt: z.ZodOptional<z.ZodString>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        name: z.ZodString;
                        roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        starred: z.ZodOptional<z.ZodString>;
                    }, "id" | "name" | "starred" | "albumCount" | "coverArt" | "roles">, "strip", z.ZodTypeAny, {
                        id: string | number;
                        name: string;
                        albumCount: string;
                        starred?: string | undefined;
                        coverArt?: string | undefined;
                        roles?: string[] | undefined;
                    }, {
                        id: string | number;
                        name: string;
                        albumCount: string;
                        starred?: string | undefined;
                        coverArt?: string | undefined;
                        roles?: string[] | undefined;
                    }>, "many">;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                    artist: {
                        id: string | number;
                        name: string;
                        albumCount: string;
                        starred?: string | undefined;
                        coverArt?: string | undefined;
                        roles?: string[] | undefined;
                    }[];
                }, {
                    name: string;
                    artist: {
                        id: string | number;
                        name: string;
                        albumCount: string;
                        starred?: string | undefined;
                        coverArt?: string | undefined;
                        roles?: string[] | undefined;
                    }[];
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                index: {
                    name: string;
                    artist: {
                        id: string | number;
                        name: string;
                        albumCount: string;
                        starred?: string | undefined;
                        coverArt?: string | undefined;
                        roles?: string[] | undefined;
                    }[];
                }[];
                ignoredArticles: string;
            }, {
                index: {
                    name: string;
                    artist: {
                        id: string | number;
                        name: string;
                        albumCount: string;
                        starred?: string | undefined;
                        coverArt?: string | undefined;
                        roles?: string[] | undefined;
                    }[];
                }[];
                ignoredArticles: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            artists: {
                index: {
                    name: string;
                    artist: {
                        id: string | number;
                        name: string;
                        albumCount: string;
                        starred?: string | undefined;
                        coverArt?: string | undefined;
                        roles?: string[] | undefined;
                    }[];
                }[];
                ignoredArticles: string;
            };
        }, {
            artists: {
                index: {
                    name: string;
                    artist: {
                        id: string | number;
                        name: string;
                        albumCount: string;
                        starred?: string | undefined;
                        coverArt?: string | undefined;
                        roles?: string[] | undefined;
                    }[];
                }[];
                ignoredArticles: string;
            };
        }>;
        getGenres: z.ZodObject<{
            genres: z.ZodOptional<z.ZodObject<{
                genre: z.ZodArray<z.ZodObject<{
                    albumCount: z.ZodNumber;
                    songCount: z.ZodNumber;
                    value: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    value: string;
                    songCount: number;
                    albumCount: number;
                }, {
                    value: string;
                    songCount: number;
                    albumCount: number;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                genre: {
                    value: string;
                    songCount: number;
                    albumCount: number;
                }[];
            }, {
                genre: {
                    value: string;
                    songCount: number;
                    albumCount: number;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            genres?: {
                genre: {
                    value: string;
                    songCount: number;
                    albumCount: number;
                }[];
            } | undefined;
        }, {
            genres?: {
                genre: {
                    value: string;
                    songCount: number;
                    albumCount: number;
                }[];
            } | undefined;
        }>;
        getIndexes: z.ZodObject<{
            indexes: z.ZodObject<{
                child: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
                index: z.ZodArray<z.ZodObject<{
                    artist: z.ZodArray<z.ZodObject<{
                        coverArt: z.ZodOptional<z.ZodString>;
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                        coverArt?: string | undefined;
                    }, {
                        id: string;
                        name: string;
                        coverArt?: string | undefined;
                    }>, "many">;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                        coverArt?: string | undefined;
                    }[];
                }, {
                    artist: {
                        id: string;
                        name: string;
                        coverArt?: string | undefined;
                    }[];
                }>, "many">;
                shortcut: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                index: {
                    artist: {
                        id: string;
                        name: string;
                        coverArt?: string | undefined;
                    }[];
                }[];
                child: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                shortcut: {
                    id: string;
                    name: string;
                }[];
            }, {
                index: {
                    artist: {
                        id: string;
                        name: string;
                        coverArt?: string | undefined;
                    }[];
                }[];
                child: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                shortcut: {
                    id: string;
                    name: string;
                }[];
            }>;
        }, "strip", z.ZodTypeAny, {
            indexes: {
                index: {
                    artist: {
                        id: string;
                        name: string;
                        coverArt?: string | undefined;
                    }[];
                }[];
                child: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                shortcut: {
                    id: string;
                    name: string;
                }[];
            };
        }, {
            indexes: {
                index: {
                    artist: {
                        id: string;
                        name: string;
                        coverArt?: string | undefined;
                    }[];
                }[];
                child: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                shortcut: {
                    id: string;
                    name: string;
                }[];
            };
        }>;
        getInternetRadioStations: z.ZodObject<{
            internetRadioStations: z.ZodOptional<z.ZodObject<{
                internetRadioStation: z.ZodArray<z.ZodObject<{
                    coverArt: z.ZodOptional<z.ZodString>;
                    homepageUrl: z.ZodOptional<z.ZodString>;
                    id: z.ZodString;
                    name: z.ZodString;
                    streamUrl: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                    streamUrl: string;
                    homepageUrl?: string | undefined;
                    coverArt?: string | undefined;
                }, {
                    id: string;
                    name: string;
                    streamUrl: string;
                    homepageUrl?: string | undefined;
                    coverArt?: string | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                internetRadioStation: {
                    id: string;
                    name: string;
                    streamUrl: string;
                    homepageUrl?: string | undefined;
                    coverArt?: string | undefined;
                }[];
            }, {
                internetRadioStation: {
                    id: string;
                    name: string;
                    streamUrl: string;
                    homepageUrl?: string | undefined;
                    coverArt?: string | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            internetRadioStations?: {
                internetRadioStation: {
                    id: string;
                    name: string;
                    streamUrl: string;
                    homepageUrl?: string | undefined;
                    coverArt?: string | undefined;
                }[];
            } | undefined;
        }, {
            internetRadioStations?: {
                internetRadioStation: {
                    id: string;
                    name: string;
                    streamUrl: string;
                    homepageUrl?: string | undefined;
                    coverArt?: string | undefined;
                }[];
            } | undefined;
        }>;
        getMusicDirectory: z.ZodObject<{
            directory: z.ZodObject<{
                artist: z.ZodOptional<z.ZodString>;
                child: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">>;
                coverArt: z.ZodOptional<z.ZodString>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isDir: z.ZodBoolean;
                parent: z.ZodOptional<z.ZodString>;
                title: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                title: string;
                isDir: boolean;
                artist?: string | undefined;
                parent?: string | undefined;
                coverArt?: string | undefined;
                child?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }, {
                id: string | number;
                title: string;
                isDir: boolean;
                artist?: string | undefined;
                parent?: string | undefined;
                coverArt?: string | undefined;
                child?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            directory: {
                id: string | number;
                title: string;
                isDir: boolean;
                artist?: string | undefined;
                parent?: string | undefined;
                coverArt?: string | undefined;
                child?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            };
        }, {
            directory: {
                id: string | number;
                title: string;
                isDir: boolean;
                artist?: string | undefined;
                parent?: string | undefined;
                coverArt?: string | undefined;
                child?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            };
        }>;
        getPlaylist: z.ZodObject<{
            playlist: z.ZodObject<{
                changed: z.ZodOptional<z.ZodString>;
                comment: z.ZodOptional<z.ZodString>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                duration: z.ZodNumber;
                entry: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                name: z.ZodString;
                owner: z.ZodString;
                public: z.ZodBoolean;
                songCount: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                duration: number;
                name: string;
                owner: string;
                public: boolean;
                songCount: number;
                created: string;
                comment?: string | undefined;
                coverArt?: string | undefined;
                changed?: string | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }, {
                id: string | number;
                duration: number;
                name: string;
                owner: string;
                public: boolean;
                songCount: number;
                created: string;
                comment?: string | undefined;
                coverArt?: string | undefined;
                changed?: string | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            playlist: {
                id: string | number;
                duration: number;
                name: string;
                owner: string;
                public: boolean;
                songCount: number;
                created: string;
                comment?: string | undefined;
                coverArt?: string | undefined;
                changed?: string | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            };
        }, {
            playlist: {
                id: string | number;
                duration: number;
                name: string;
                owner: string;
                public: boolean;
                songCount: number;
                created: string;
                comment?: string | undefined;
                coverArt?: string | undefined;
                changed?: string | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            };
        }>;
        getPlaylists: z.ZodObject<{
            playlists: z.ZodOptional<z.ZodObject<{
                playlist: z.ZodArray<z.ZodObject<Omit<{
                    changed: z.ZodOptional<z.ZodString>;
                    comment: z.ZodOptional<z.ZodString>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    duration: z.ZodNumber;
                    entry: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        album: z.ZodOptional<z.ZodString>;
                        albumArtists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artist: z.ZodOptional<z.ZodString>;
                        artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        averageRating: z.ZodOptional<z.ZodNumber>;
                        bitDepth: z.ZodOptional<z.ZodNumber>;
                        bitRate: z.ZodOptional<z.ZodNumber>;
                        bpm: z.ZodOptional<z.ZodNumber>;
                        channelCount: z.ZodOptional<z.ZodNumber>;
                        contentType: z.ZodString;
                        contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            artist: z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>;
                            role: z.ZodString;
                            subRole: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }>, "many">>;
                        coverArt: z.ZodOptional<z.ZodString>;
                        created: z.ZodString;
                        discNumber: z.ZodNumber;
                        duration: z.ZodOptional<z.ZodNumber>;
                        explicitStatus: z.ZodOptional<z.ZodString>;
                        genre: z.ZodOptional<z.ZodString>;
                        genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        isDir: z.ZodBoolean;
                        isVideo: z.ZodBoolean;
                        musicBrainzId: z.ZodOptional<z.ZodString>;
                        parent: z.ZodString;
                        path: z.ZodString;
                        playCount: z.ZodOptional<z.ZodNumber>;
                        played: z.ZodOptional<z.ZodString>;
                        replayGain: z.ZodOptional<z.ZodObject<{
                            albumGain: z.ZodOptional<z.ZodNumber>;
                            albumPeak: z.ZodOptional<z.ZodNumber>;
                            trackGain: z.ZodOptional<z.ZodNumber>;
                            trackPeak: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }>>;
                        samplingRate: z.ZodOptional<z.ZodNumber>;
                        size: z.ZodNumber;
                        starred: z.ZodOptional<z.ZodBoolean>;
                        suffix: z.ZodString;
                        title: z.ZodString;
                        track: z.ZodOptional<z.ZodNumber>;
                        type: z.ZodString;
                        userRating: z.ZodOptional<z.ZodNumber>;
                        year: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    name: z.ZodString;
                    owner: z.ZodString;
                    public: z.ZodBoolean;
                    songCount: z.ZodNumber;
                }, "entry">, "strip", z.ZodTypeAny, {
                    id: string | number;
                    duration: number;
                    name: string;
                    owner: string;
                    public: boolean;
                    songCount: number;
                    created: string;
                    comment?: string | undefined;
                    coverArt?: string | undefined;
                    changed?: string | undefined;
                }, {
                    id: string | number;
                    duration: number;
                    name: string;
                    owner: string;
                    public: boolean;
                    songCount: number;
                    created: string;
                    comment?: string | undefined;
                    coverArt?: string | undefined;
                    changed?: string | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                playlist: {
                    id: string | number;
                    duration: number;
                    name: string;
                    owner: string;
                    public: boolean;
                    songCount: number;
                    created: string;
                    comment?: string | undefined;
                    coverArt?: string | undefined;
                    changed?: string | undefined;
                }[];
            }, {
                playlist: {
                    id: string | number;
                    duration: number;
                    name: string;
                    owner: string;
                    public: boolean;
                    songCount: number;
                    created: string;
                    comment?: string | undefined;
                    coverArt?: string | undefined;
                    changed?: string | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            playlists?: {
                playlist: {
                    id: string | number;
                    duration: number;
                    name: string;
                    owner: string;
                    public: boolean;
                    songCount: number;
                    created: string;
                    comment?: string | undefined;
                    coverArt?: string | undefined;
                    changed?: string | undefined;
                }[];
            } | undefined;
        }, {
            playlists?: {
                playlist: {
                    id: string | number;
                    duration: number;
                    name: string;
                    owner: string;
                    public: boolean;
                    songCount: number;
                    created: string;
                    comment?: string | undefined;
                    coverArt?: string | undefined;
                    changed?: string | undefined;
                }[];
            } | undefined;
        }>;
        getSong: z.ZodObject<{
            song: z.ZodObject<{
                album: z.ZodOptional<z.ZodString>;
                albumArtists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artist: z.ZodOptional<z.ZodString>;
                artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                averageRating: z.ZodOptional<z.ZodNumber>;
                bitDepth: z.ZodOptional<z.ZodNumber>;
                bitRate: z.ZodOptional<z.ZodNumber>;
                bpm: z.ZodOptional<z.ZodNumber>;
                channelCount: z.ZodOptional<z.ZodNumber>;
                contentType: z.ZodString;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                discNumber: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                parent: z.ZodString;
                path: z.ZodString;
                playCount: z.ZodOptional<z.ZodNumber>;
                played: z.ZodOptional<z.ZodString>;
                replayGain: z.ZodOptional<z.ZodObject<{
                    albumGain: z.ZodOptional<z.ZodNumber>;
                    albumPeak: z.ZodOptional<z.ZodNumber>;
                    trackGain: z.ZodOptional<z.ZodNumber>;
                    trackPeak: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }>>;
                samplingRate: z.ZodOptional<z.ZodNumber>;
                size: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                suffix: z.ZodString;
                title: z.ZodString;
                track: z.ZodOptional<z.ZodNumber>;
                type: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            song: {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            };
        }, {
            song: {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            };
        }>;
        getSongsByGenre: z.ZodObject<{
            songsByGenre: z.ZodOptional<z.ZodObject<{
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            songsByGenre?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }, {
            songsByGenre?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }>;
        getStarred: z.ZodObject<{
            starred: z.ZodOptional<z.ZodObject<{
                album: z.ZodArray<z.ZodObject<Omit<{
                    album: z.ZodString;
                    artist: z.ZodString;
                    artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodString;
                    created: z.ZodString;
                    discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        disc: z.ZodNumber;
                        title: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        disc: number;
                        title: string;
                    }, {
                        disc: number;
                        title: string;
                    }>, "many">>;
                    duration: z.ZodNumber;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isCompilation: z.ZodOptional<z.ZodBoolean>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    name: z.ZodString;
                    parent: z.ZodString;
                    played: z.ZodOptional<z.ZodString>;
                    recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    releaseDate: z.ZodOptional<z.ZodObject<{
                        day: z.ZodNumber;
                        month: z.ZodNumber;
                        year: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        year: number;
                        month: number;
                        day: number;
                    }, {
                        year: number;
                        month: number;
                        day: number;
                    }>>;
                    releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    song: z.ZodArray<z.ZodObject<{
                        album: z.ZodOptional<z.ZodString>;
                        albumArtists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artist: z.ZodOptional<z.ZodString>;
                        artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        averageRating: z.ZodOptional<z.ZodNumber>;
                        bitDepth: z.ZodOptional<z.ZodNumber>;
                        bitRate: z.ZodOptional<z.ZodNumber>;
                        bpm: z.ZodOptional<z.ZodNumber>;
                        channelCount: z.ZodOptional<z.ZodNumber>;
                        contentType: z.ZodString;
                        contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            artist: z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>;
                            role: z.ZodString;
                            subRole: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }>, "many">>;
                        coverArt: z.ZodOptional<z.ZodString>;
                        created: z.ZodString;
                        discNumber: z.ZodNumber;
                        duration: z.ZodOptional<z.ZodNumber>;
                        explicitStatus: z.ZodOptional<z.ZodString>;
                        genre: z.ZodOptional<z.ZodString>;
                        genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        isDir: z.ZodBoolean;
                        isVideo: z.ZodBoolean;
                        musicBrainzId: z.ZodOptional<z.ZodString>;
                        parent: z.ZodString;
                        path: z.ZodString;
                        playCount: z.ZodOptional<z.ZodNumber>;
                        played: z.ZodOptional<z.ZodString>;
                        replayGain: z.ZodOptional<z.ZodObject<{
                            albumGain: z.ZodOptional<z.ZodNumber>;
                            albumPeak: z.ZodOptional<z.ZodNumber>;
                            trackGain: z.ZodOptional<z.ZodNumber>;
                            trackPeak: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }>>;
                        samplingRate: z.ZodOptional<z.ZodNumber>;
                        size: z.ZodNumber;
                        starred: z.ZodOptional<z.ZodBoolean>;
                        suffix: z.ZodString;
                        title: z.ZodString;
                        track: z.ZodOptional<z.ZodNumber>;
                        type: z.ZodString;
                        userRating: z.ZodOptional<z.ZodNumber>;
                        year: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }>, "many">;
                    songCount: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    title: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    version: z.ZodOptional<z.ZodString>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "song">, "strip", z.ZodTypeAny, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }>, "many">;
                artist: z.ZodArray<z.ZodObject<Pick<{
                    album: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        album: z.ZodString;
                        artist: z.ZodString;
                        artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        artists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            artist: z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>;
                            role: z.ZodString;
                            subRole: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }>, "many">>;
                        coverArt: z.ZodString;
                        created: z.ZodString;
                        discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            disc: z.ZodNumber;
                            title: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            disc: number;
                            title: string;
                        }, {
                            disc: number;
                            title: string;
                        }>, "many">>;
                        duration: z.ZodNumber;
                        explicitStatus: z.ZodOptional<z.ZodString>;
                        genre: z.ZodOptional<z.ZodString>;
                        genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        isCompilation: z.ZodOptional<z.ZodBoolean>;
                        isDir: z.ZodBoolean;
                        isVideo: z.ZodBoolean;
                        name: z.ZodString;
                        parent: z.ZodString;
                        played: z.ZodOptional<z.ZodString>;
                        recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        releaseDate: z.ZodOptional<z.ZodObject<{
                            day: z.ZodNumber;
                            month: z.ZodNumber;
                            year: z.ZodNumber;
                        }, "strip", z.ZodTypeAny, {
                            year: number;
                            month: number;
                            day: number;
                        }, {
                            year: number;
                            month: number;
                            day: number;
                        }>>;
                        releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        song: z.ZodArray<z.ZodObject<{
                            album: z.ZodOptional<z.ZodString>;
                            albumArtists: z.ZodArray<z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>, "many">;
                            albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                            artist: z.ZodOptional<z.ZodString>;
                            artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                            artists: z.ZodArray<z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>, "many">;
                            averageRating: z.ZodOptional<z.ZodNumber>;
                            bitDepth: z.ZodOptional<z.ZodNumber>;
                            bitRate: z.ZodOptional<z.ZodNumber>;
                            bpm: z.ZodOptional<z.ZodNumber>;
                            channelCount: z.ZodOptional<z.ZodNumber>;
                            contentType: z.ZodString;
                            contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                artist: z.ZodObject<{
                                    id: z.ZodString;
                                    name: z.ZodString;
                                }, "strip", z.ZodTypeAny, {
                                    id: string;
                                    name: string;
                                }, {
                                    id: string;
                                    name: string;
                                }>;
                                role: z.ZodString;
                                subRole: z.ZodOptional<z.ZodString>;
                            }, "strip", z.ZodTypeAny, {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }, {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }>, "many">>;
                            coverArt: z.ZodOptional<z.ZodString>;
                            created: z.ZodString;
                            discNumber: z.ZodNumber;
                            duration: z.ZodOptional<z.ZodNumber>;
                            explicitStatus: z.ZodOptional<z.ZodString>;
                            genre: z.ZodOptional<z.ZodString>;
                            genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                name: string;
                            }, {
                                name: string;
                            }>, "many">>;
                            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                            isDir: z.ZodBoolean;
                            isVideo: z.ZodBoolean;
                            musicBrainzId: z.ZodOptional<z.ZodString>;
                            parent: z.ZodString;
                            path: z.ZodString;
                            playCount: z.ZodOptional<z.ZodNumber>;
                            played: z.ZodOptional<z.ZodString>;
                            replayGain: z.ZodOptional<z.ZodObject<{
                                albumGain: z.ZodOptional<z.ZodNumber>;
                                albumPeak: z.ZodOptional<z.ZodNumber>;
                                trackGain: z.ZodOptional<z.ZodNumber>;
                                trackPeak: z.ZodOptional<z.ZodNumber>;
                            }, "strip", z.ZodTypeAny, {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            }, {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            }>>;
                            samplingRate: z.ZodOptional<z.ZodNumber>;
                            size: z.ZodNumber;
                            starred: z.ZodOptional<z.ZodBoolean>;
                            suffix: z.ZodString;
                            title: z.ZodString;
                            track: z.ZodOptional<z.ZodNumber>;
                            type: z.ZodString;
                            userRating: z.ZodOptional<z.ZodNumber>;
                            year: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }, {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }>, "many">;
                        songCount: z.ZodNumber;
                        starred: z.ZodOptional<z.ZodBoolean>;
                        title: z.ZodString;
                        userRating: z.ZodOptional<z.ZodNumber>;
                        version: z.ZodOptional<z.ZodString>;
                        year: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }, {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }>, "many">>;
                    albumCount: z.ZodString;
                    artistImageUrl: z.ZodOptional<z.ZodString>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    name: z.ZodString;
                    roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    starred: z.ZodOptional<z.ZodString>;
                }, "id" | "name" | "starred" | "albumCount" | "coverArt" | "roles">, "strip", z.ZodTypeAny, {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    roles?: string[] | undefined;
                }, {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    roles?: string[] | undefined;
                }>, "many">;
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                album: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[];
                artist: {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    roles?: string[] | undefined;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }, {
                album: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[];
                artist: {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    roles?: string[] | undefined;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            starred?: {
                album: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[];
                artist: {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    roles?: string[] | undefined;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }, {
            starred?: {
                album: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[];
                artist: {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    roles?: string[] | undefined;
                }[];
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }>;
        getTranscodeDecision: z.ZodObject<{
            transcodeDecision: z.ZodObject<{
                canDirectPlay: z.ZodBoolean;
                canTranscode: z.ZodBoolean;
                errorReason: z.ZodOptional<z.ZodString>;
                sourceStream: z.ZodOptional<z.ZodObject<{
                    audioBitdepth: z.ZodOptional<z.ZodNumber>;
                    audioBitrate: z.ZodOptional<z.ZodNumber>;
                    audioChannels: z.ZodOptional<z.ZodNumber>;
                    audioProfile: z.ZodOptional<z.ZodString>;
                    audioSamplerate: z.ZodOptional<z.ZodNumber>;
                    codec: z.ZodOptional<z.ZodString>;
                    container: z.ZodOptional<z.ZodString>;
                    protocol: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                }, {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                }>>;
                transcodeParams: z.ZodOptional<z.ZodString>;
                transcodeReason: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                transcodeStream: z.ZodOptional<z.ZodObject<{
                    audioBitdepth: z.ZodOptional<z.ZodNumber>;
                    audioBitrate: z.ZodOptional<z.ZodNumber>;
                    audioChannels: z.ZodOptional<z.ZodNumber>;
                    audioProfile: z.ZodOptional<z.ZodString>;
                    audioSamplerate: z.ZodOptional<z.ZodNumber>;
                    codec: z.ZodOptional<z.ZodString>;
                    container: z.ZodOptional<z.ZodString>;
                    protocol: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                }, {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                canDirectPlay: boolean;
                canTranscode: boolean;
                transcodeParams?: string | undefined;
                errorReason?: string | undefined;
                sourceStream?: {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                } | undefined;
                transcodeReason?: string[] | undefined;
                transcodeStream?: {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                } | undefined;
            }, {
                canDirectPlay: boolean;
                canTranscode: boolean;
                transcodeParams?: string | undefined;
                errorReason?: string | undefined;
                sourceStream?: {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                } | undefined;
                transcodeReason?: string[] | undefined;
                transcodeStream?: {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            transcodeDecision: {
                canDirectPlay: boolean;
                canTranscode: boolean;
                transcodeParams?: string | undefined;
                errorReason?: string | undefined;
                sourceStream?: {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                } | undefined;
                transcodeReason?: string[] | undefined;
                transcodeStream?: {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                } | undefined;
            };
        }, {
            transcodeDecision: {
                canDirectPlay: boolean;
                canTranscode: boolean;
                transcodeParams?: string | undefined;
                errorReason?: string | undefined;
                sourceStream?: {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                } | undefined;
                transcodeReason?: string[] | undefined;
                transcodeStream?: {
                    codec?: string | undefined;
                    container?: string | undefined;
                    protocol?: string | undefined;
                    audioBitdepth?: number | undefined;
                    audioBitrate?: number | undefined;
                    audioChannels?: number | undefined;
                    audioProfile?: string | undefined;
                    audioSamplerate?: number | undefined;
                } | undefined;
            };
        }>;
        internetRadioStation: z.ZodObject<{
            coverArt: z.ZodOptional<z.ZodString>;
            homepageUrl: z.ZodOptional<z.ZodString>;
            id: z.ZodString;
            name: z.ZodString;
            streamUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            streamUrl: string;
            homepageUrl?: string | undefined;
            coverArt?: string | undefined;
        }, {
            id: string;
            name: string;
            streamUrl: string;
            homepageUrl?: string | undefined;
            coverArt?: string | undefined;
        }>;
        musicFolderList: z.ZodObject<{
            musicFolders: z.ZodObject<{
                musicFolder: z.ZodArray<z.ZodObject<{
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    name: string;
                }, {
                    id: string | number;
                    name: string;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                musicFolder: {
                    id: string | number;
                    name: string;
                }[];
            }, {
                musicFolder: {
                    id: string | number;
                    name: string;
                }[];
            }>;
        }, "strip", z.ZodTypeAny, {
            musicFolders: {
                musicFolder: {
                    id: string | number;
                    name: string;
                }[];
            };
        }, {
            musicFolders: {
                musicFolder: {
                    id: string | number;
                    name: string;
                }[];
            };
        }>;
        ping: z.ZodObject<{
            openSubsonic: z.ZodOptional<z.ZodBoolean>;
            serverVersion: z.ZodOptional<z.ZodString>;
            version: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            version: string;
            serverVersion?: string | undefined;
            openSubsonic?: boolean | undefined;
        }, {
            version: string;
            serverVersion?: string | undefined;
            openSubsonic?: boolean | undefined;
        }>;
        playlist: z.ZodObject<{
            changed: z.ZodOptional<z.ZodString>;
            comment: z.ZodOptional<z.ZodString>;
            coverArt: z.ZodOptional<z.ZodString>;
            created: z.ZodString;
            duration: z.ZodNumber;
            entry: z.ZodOptional<z.ZodArray<z.ZodObject<{
                album: z.ZodOptional<z.ZodString>;
                albumArtists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artist: z.ZodOptional<z.ZodString>;
                artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                averageRating: z.ZodOptional<z.ZodNumber>;
                bitDepth: z.ZodOptional<z.ZodNumber>;
                bitRate: z.ZodOptional<z.ZodNumber>;
                bpm: z.ZodOptional<z.ZodNumber>;
                channelCount: z.ZodOptional<z.ZodNumber>;
                contentType: z.ZodString;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                discNumber: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                parent: z.ZodString;
                path: z.ZodString;
                playCount: z.ZodOptional<z.ZodNumber>;
                played: z.ZodOptional<z.ZodString>;
                replayGain: z.ZodOptional<z.ZodObject<{
                    albumGain: z.ZodOptional<z.ZodNumber>;
                    albumPeak: z.ZodOptional<z.ZodNumber>;
                    trackGain: z.ZodOptional<z.ZodNumber>;
                    trackPeak: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }>>;
                samplingRate: z.ZodOptional<z.ZodNumber>;
                size: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                suffix: z.ZodString;
                title: z.ZodString;
                track: z.ZodOptional<z.ZodNumber>;
                type: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }>, "many">>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            name: z.ZodString;
            owner: z.ZodString;
            public: z.ZodBoolean;
            songCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string | number;
            duration: number;
            name: string;
            owner: string;
            public: boolean;
            songCount: number;
            created: string;
            comment?: string | undefined;
            coverArt?: string | undefined;
            changed?: string | undefined;
            entry?: {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }[] | undefined;
        }, {
            id: string | number;
            duration: number;
            name: string;
            owner: string;
            public: boolean;
            songCount: number;
            created: string;
            comment?: string | undefined;
            coverArt?: string | undefined;
            changed?: string | undefined;
            entry?: {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }[] | undefined;
        }>;
        playlistListEntry: z.ZodObject<Omit<{
            changed: z.ZodOptional<z.ZodString>;
            comment: z.ZodOptional<z.ZodString>;
            coverArt: z.ZodOptional<z.ZodString>;
            created: z.ZodString;
            duration: z.ZodNumber;
            entry: z.ZodOptional<z.ZodArray<z.ZodObject<{
                album: z.ZodOptional<z.ZodString>;
                albumArtists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artist: z.ZodOptional<z.ZodString>;
                artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                artists: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                averageRating: z.ZodOptional<z.ZodNumber>;
                bitDepth: z.ZodOptional<z.ZodNumber>;
                bitRate: z.ZodOptional<z.ZodNumber>;
                bpm: z.ZodOptional<z.ZodNumber>;
                channelCount: z.ZodOptional<z.ZodNumber>;
                contentType: z.ZodString;
                contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    artist: z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>;
                    role: z.ZodString;
                    subRole: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }, {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }>, "many">>;
                coverArt: z.ZodOptional<z.ZodString>;
                created: z.ZodString;
                discNumber: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
                explicitStatus: z.ZodOptional<z.ZodString>;
                genre: z.ZodOptional<z.ZodString>;
                genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                }, {
                    name: string;
                }>, "many">>;
                id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                isDir: z.ZodBoolean;
                isVideo: z.ZodBoolean;
                musicBrainzId: z.ZodOptional<z.ZodString>;
                parent: z.ZodString;
                path: z.ZodString;
                playCount: z.ZodOptional<z.ZodNumber>;
                played: z.ZodOptional<z.ZodString>;
                replayGain: z.ZodOptional<z.ZodObject<{
                    albumGain: z.ZodOptional<z.ZodNumber>;
                    albumPeak: z.ZodOptional<z.ZodNumber>;
                    trackGain: z.ZodOptional<z.ZodNumber>;
                    trackPeak: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }, {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                }>>;
                samplingRate: z.ZodOptional<z.ZodNumber>;
                size: z.ZodNumber;
                starred: z.ZodOptional<z.ZodBoolean>;
                suffix: z.ZodString;
                title: z.ZodString;
                track: z.ZodOptional<z.ZodNumber>;
                type: z.ZodString;
                userRating: z.ZodOptional<z.ZodNumber>;
                year: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }, {
                id: string | number;
                path: string;
                size: number;
                title: string;
                artists: {
                    id: string;
                    name: string;
                }[];
                type: string;
                discNumber: number;
                suffix: string;
                albumArtists: {
                    id: string;
                    name: string;
                }[];
                parent: string;
                contentType: string;
                created: string;
                isDir: boolean;
                isVideo: boolean;
                bpm?: number | undefined;
                album?: string | undefined;
                duration?: number | undefined;
                track?: number | undefined;
                year?: number | undefined;
                artist?: string | undefined;
                genre?: string | undefined;
                genres?: {
                    name: string;
                }[] | undefined;
                starred?: boolean | undefined;
                artistId?: string | number | undefined;
                explicitStatus?: string | undefined;
                playCount?: number | undefined;
                albumId?: string | number | undefined;
                bitDepth?: number | undefined;
                bitRate?: number | undefined;
                userRating?: number | undefined;
                played?: string | undefined;
                contributors?: {
                    artist: {
                        id: string;
                        name: string;
                    };
                    role: string;
                    subRole?: string | undefined;
                }[] | undefined;
                coverArt?: string | undefined;
                averageRating?: number | undefined;
                channelCount?: number | undefined;
                musicBrainzId?: string | undefined;
                replayGain?: {
                    albumGain?: number | undefined;
                    albumPeak?: number | undefined;
                    trackGain?: number | undefined;
                    trackPeak?: number | undefined;
                } | undefined;
                samplingRate?: number | undefined;
            }>, "many">>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            name: z.ZodString;
            owner: z.ZodString;
            public: z.ZodBoolean;
            songCount: z.ZodNumber;
        }, "entry">, "strip", z.ZodTypeAny, {
            id: string | number;
            duration: number;
            name: string;
            owner: string;
            public: boolean;
            songCount: number;
            created: string;
            comment?: string | undefined;
            coverArt?: string | undefined;
            changed?: string | undefined;
        }, {
            id: string | number;
            duration: number;
            name: string;
            owner: string;
            public: boolean;
            songCount: number;
            created: string;
            comment?: string | undefined;
            coverArt?: string | undefined;
            changed?: string | undefined;
        }>;
        playQueue: z.ZodObject<{
            playQueue: z.ZodObject<{
                changed: z.ZodString;
                changedBy: z.ZodString;
                current: z.ZodOptional<z.ZodString>;
                entry: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
                position: z.ZodOptional<z.ZodNumber>;
                username: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                username: string;
                changedBy: string;
                changed: string;
                entry: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                position?: number | undefined;
                current?: string | undefined;
            }, {
                username: string;
                changedBy: string;
                changed: string;
                entry: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                position?: number | undefined;
                current?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            playQueue: {
                username: string;
                changedBy: string;
                changed: string;
                entry: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                position?: number | undefined;
                current?: string | undefined;
            };
        }, {
            playQueue: {
                username: string;
                changedBy: string;
                changed: string;
                entry: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
                position?: number | undefined;
                current?: string | undefined;
            };
        }>;
        playQueueByIndex: z.ZodObject<{
            playQueueByIndex: z.ZodOptional<z.ZodObject<{
                changed: z.ZodString;
                changedBy: z.ZodString;
                currentIndex: z.ZodOptional<z.ZodNumber>;
                entry: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">>;
                position: z.ZodOptional<z.ZodNumber>;
                username: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                username: string;
                changedBy: string;
                changed: string;
                position?: number | undefined;
                currentIndex?: number | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }, {
                username: string;
                changedBy: string;
                changed: string;
                position?: number | undefined;
                currentIndex?: number | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            playQueueByIndex?: {
                username: string;
                changedBy: string;
                changed: string;
                position?: number | undefined;
                currentIndex?: number | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            } | undefined;
        }, {
            playQueueByIndex?: {
                username: string;
                changedBy: string;
                changed: string;
                position?: number | undefined;
                currentIndex?: number | undefined;
                entry?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            } | undefined;
        }>;
        randomSongList: z.ZodObject<{
            randomSongs: z.ZodOptional<z.ZodObject<{
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            randomSongs?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }, {
            randomSongs?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }>;
        removeFavorite: z.ZodNull;
        saveQueue: z.ZodNull;
        scrobble: z.ZodNull;
        search3: z.ZodObject<{
            searchResult3: z.ZodOptional<z.ZodObject<{
                album: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodString;
                    artist: z.ZodString;
                    artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodString;
                    created: z.ZodString;
                    discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        disc: z.ZodNumber;
                        title: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        disc: number;
                        title: string;
                    }, {
                        disc: number;
                        title: string;
                    }>, "many">>;
                    duration: z.ZodNumber;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isCompilation: z.ZodOptional<z.ZodBoolean>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    name: z.ZodString;
                    parent: z.ZodString;
                    played: z.ZodOptional<z.ZodString>;
                    recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    releaseDate: z.ZodOptional<z.ZodObject<{
                        day: z.ZodNumber;
                        month: z.ZodNumber;
                        year: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        year: number;
                        month: number;
                        day: number;
                    }, {
                        year: number;
                        month: number;
                        day: number;
                    }>>;
                    releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    song: z.ZodArray<z.ZodObject<{
                        album: z.ZodOptional<z.ZodString>;
                        albumArtists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artist: z.ZodOptional<z.ZodString>;
                        artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                        artists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        averageRating: z.ZodOptional<z.ZodNumber>;
                        bitDepth: z.ZodOptional<z.ZodNumber>;
                        bitRate: z.ZodOptional<z.ZodNumber>;
                        bpm: z.ZodOptional<z.ZodNumber>;
                        channelCount: z.ZodOptional<z.ZodNumber>;
                        contentType: z.ZodString;
                        contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            artist: z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>;
                            role: z.ZodString;
                            subRole: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }>, "many">>;
                        coverArt: z.ZodOptional<z.ZodString>;
                        created: z.ZodString;
                        discNumber: z.ZodNumber;
                        duration: z.ZodOptional<z.ZodNumber>;
                        explicitStatus: z.ZodOptional<z.ZodString>;
                        genre: z.ZodOptional<z.ZodString>;
                        genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        isDir: z.ZodBoolean;
                        isVideo: z.ZodBoolean;
                        musicBrainzId: z.ZodOptional<z.ZodString>;
                        parent: z.ZodString;
                        path: z.ZodString;
                        playCount: z.ZodOptional<z.ZodNumber>;
                        played: z.ZodOptional<z.ZodString>;
                        replayGain: z.ZodOptional<z.ZodObject<{
                            albumGain: z.ZodOptional<z.ZodNumber>;
                            albumPeak: z.ZodOptional<z.ZodNumber>;
                            trackGain: z.ZodOptional<z.ZodNumber>;
                            trackPeak: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }, {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        }>>;
                        samplingRate: z.ZodOptional<z.ZodNumber>;
                        size: z.ZodNumber;
                        starred: z.ZodOptional<z.ZodBoolean>;
                        suffix: z.ZodString;
                        title: z.ZodString;
                        track: z.ZodOptional<z.ZodNumber>;
                        type: z.ZodString;
                        userRating: z.ZodOptional<z.ZodNumber>;
                        year: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }, {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }>, "many">;
                    songCount: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    title: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    version: z.ZodOptional<z.ZodString>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }, {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }>, "many">>;
                artist: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        album: z.ZodString;
                        artist: z.ZodString;
                        artistId: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        artists: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">;
                        contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            artist: z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>;
                            role: z.ZodString;
                            subRole: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }, {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }>, "many">>;
                        coverArt: z.ZodString;
                        created: z.ZodString;
                        discTitles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            disc: z.ZodNumber;
                            title: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            disc: number;
                            title: string;
                        }, {
                            disc: number;
                            title: string;
                        }>, "many">>;
                        duration: z.ZodNumber;
                        explicitStatus: z.ZodOptional<z.ZodString>;
                        genre: z.ZodOptional<z.ZodString>;
                        genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                        isCompilation: z.ZodOptional<z.ZodBoolean>;
                        isDir: z.ZodBoolean;
                        isVideo: z.ZodBoolean;
                        name: z.ZodString;
                        parent: z.ZodString;
                        played: z.ZodOptional<z.ZodString>;
                        recordLabels: z.ZodOptional<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                        }, {
                            name: string;
                        }>, "many">>;
                        releaseDate: z.ZodOptional<z.ZodObject<{
                            day: z.ZodNumber;
                            month: z.ZodNumber;
                            year: z.ZodNumber;
                        }, "strip", z.ZodTypeAny, {
                            year: number;
                            month: number;
                            day: number;
                        }, {
                            year: number;
                            month: number;
                            day: number;
                        }>>;
                        releaseTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        song: z.ZodArray<z.ZodObject<{
                            album: z.ZodOptional<z.ZodString>;
                            albumArtists: z.ZodArray<z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>, "many">;
                            albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                            artist: z.ZodOptional<z.ZodString>;
                            artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                            artists: z.ZodArray<z.ZodObject<{
                                id: z.ZodString;
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                id: string;
                                name: string;
                            }, {
                                id: string;
                                name: string;
                            }>, "many">;
                            averageRating: z.ZodOptional<z.ZodNumber>;
                            bitDepth: z.ZodOptional<z.ZodNumber>;
                            bitRate: z.ZodOptional<z.ZodNumber>;
                            bpm: z.ZodOptional<z.ZodNumber>;
                            channelCount: z.ZodOptional<z.ZodNumber>;
                            contentType: z.ZodString;
                            contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                artist: z.ZodObject<{
                                    id: z.ZodString;
                                    name: z.ZodString;
                                }, "strip", z.ZodTypeAny, {
                                    id: string;
                                    name: string;
                                }, {
                                    id: string;
                                    name: string;
                                }>;
                                role: z.ZodString;
                                subRole: z.ZodOptional<z.ZodString>;
                            }, "strip", z.ZodTypeAny, {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }, {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }>, "many">>;
                            coverArt: z.ZodOptional<z.ZodString>;
                            created: z.ZodString;
                            discNumber: z.ZodNumber;
                            duration: z.ZodOptional<z.ZodNumber>;
                            explicitStatus: z.ZodOptional<z.ZodString>;
                            genre: z.ZodOptional<z.ZodString>;
                            genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                                name: z.ZodString;
                            }, "strip", z.ZodTypeAny, {
                                name: string;
                            }, {
                                name: string;
                            }>, "many">>;
                            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                            isDir: z.ZodBoolean;
                            isVideo: z.ZodBoolean;
                            musicBrainzId: z.ZodOptional<z.ZodString>;
                            parent: z.ZodString;
                            path: z.ZodString;
                            playCount: z.ZodOptional<z.ZodNumber>;
                            played: z.ZodOptional<z.ZodString>;
                            replayGain: z.ZodOptional<z.ZodObject<{
                                albumGain: z.ZodOptional<z.ZodNumber>;
                                albumPeak: z.ZodOptional<z.ZodNumber>;
                                trackGain: z.ZodOptional<z.ZodNumber>;
                                trackPeak: z.ZodOptional<z.ZodNumber>;
                            }, "strip", z.ZodTypeAny, {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            }, {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            }>>;
                            samplingRate: z.ZodOptional<z.ZodNumber>;
                            size: z.ZodNumber;
                            starred: z.ZodOptional<z.ZodBoolean>;
                            suffix: z.ZodString;
                            title: z.ZodString;
                            track: z.ZodOptional<z.ZodNumber>;
                            type: z.ZodString;
                            userRating: z.ZodOptional<z.ZodNumber>;
                            year: z.ZodOptional<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }, {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }>, "many">;
                        songCount: z.ZodNumber;
                        starred: z.ZodOptional<z.ZodBoolean>;
                        title: z.ZodString;
                        userRating: z.ZodOptional<z.ZodNumber>;
                        version: z.ZodOptional<z.ZodString>;
                        year: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }, {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }>, "many">>;
                    albumCount: z.ZodString;
                    artistImageUrl: z.ZodOptional<z.ZodString>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    name: z.ZodString;
                    roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    starred: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    album?: {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }[] | undefined;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                    roles?: string[] | undefined;
                }, {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    album?: {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }[] | undefined;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                    roles?: string[] | undefined;
                }>, "many">>;
                song: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                artist?: {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    album?: {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }[] | undefined;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                    roles?: string[] | undefined;
                }[] | undefined;
                song?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }, {
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                artist?: {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    album?: {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }[] | undefined;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                    roles?: string[] | undefined;
                }[] | undefined;
                song?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            searchResult3?: {
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                artist?: {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    album?: {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }[] | undefined;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                    roles?: string[] | undefined;
                }[] | undefined;
                song?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            } | undefined;
        }, {
            searchResult3?: {
                album?: {
                    album: string;
                    id: string | number;
                    duration: number;
                    name: string;
                    title: string;
                    artist: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    song: {
                        id: string | number;
                        path: string;
                        size: number;
                        title: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        type: string;
                        discNumber: number;
                        suffix: string;
                        albumArtists: {
                            id: string;
                            name: string;
                        }[];
                        parent: string;
                        contentType: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        bpm?: number | undefined;
                        album?: string | undefined;
                        duration?: number | undefined;
                        track?: number | undefined;
                        year?: number | undefined;
                        artist?: string | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        artistId?: string | number | undefined;
                        explicitStatus?: string | undefined;
                        playCount?: number | undefined;
                        albumId?: string | number | undefined;
                        bitDepth?: number | undefined;
                        bitRate?: number | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        coverArt?: string | undefined;
                        averageRating?: number | undefined;
                        channelCount?: number | undefined;
                        musicBrainzId?: string | undefined;
                        replayGain?: {
                            albumGain?: number | undefined;
                            albumPeak?: number | undefined;
                            trackGain?: number | undefined;
                            trackPeak?: number | undefined;
                        } | undefined;
                        samplingRate?: number | undefined;
                    }[];
                    songCount: number;
                    artistId: string | number;
                    parent: string;
                    coverArt: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    version?: string | undefined;
                    year?: number | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    explicitStatus?: string | undefined;
                    releaseDate?: {
                        year: number;
                        month: number;
                        day: number;
                    } | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    isCompilation?: boolean | undefined;
                    recordLabels?: {
                        name: string;
                    }[] | undefined;
                    releaseTypes?: string[] | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    discTitles?: {
                        disc: number;
                        title: string;
                    }[] | undefined;
                }[] | undefined;
                artist?: {
                    id: string | number;
                    name: string;
                    albumCount: string;
                    album?: {
                        album: string;
                        id: string | number;
                        duration: number;
                        name: string;
                        title: string;
                        artist: string;
                        artists: {
                            id: string;
                            name: string;
                        }[];
                        song: {
                            id: string | number;
                            path: string;
                            size: number;
                            title: string;
                            artists: {
                                id: string;
                                name: string;
                            }[];
                            type: string;
                            discNumber: number;
                            suffix: string;
                            albumArtists: {
                                id: string;
                                name: string;
                            }[];
                            parent: string;
                            contentType: string;
                            created: string;
                            isDir: boolean;
                            isVideo: boolean;
                            bpm?: number | undefined;
                            album?: string | undefined;
                            duration?: number | undefined;
                            track?: number | undefined;
                            year?: number | undefined;
                            artist?: string | undefined;
                            genre?: string | undefined;
                            genres?: {
                                name: string;
                            }[] | undefined;
                            starred?: boolean | undefined;
                            artistId?: string | number | undefined;
                            explicitStatus?: string | undefined;
                            playCount?: number | undefined;
                            albumId?: string | number | undefined;
                            bitDepth?: number | undefined;
                            bitRate?: number | undefined;
                            userRating?: number | undefined;
                            played?: string | undefined;
                            contributors?: {
                                artist: {
                                    id: string;
                                    name: string;
                                };
                                role: string;
                                subRole?: string | undefined;
                            }[] | undefined;
                            coverArt?: string | undefined;
                            averageRating?: number | undefined;
                            channelCount?: number | undefined;
                            musicBrainzId?: string | undefined;
                            replayGain?: {
                                albumGain?: number | undefined;
                                albumPeak?: number | undefined;
                                trackGain?: number | undefined;
                                trackPeak?: number | undefined;
                            } | undefined;
                            samplingRate?: number | undefined;
                        }[];
                        songCount: number;
                        artistId: string | number;
                        parent: string;
                        coverArt: string;
                        created: string;
                        isDir: boolean;
                        isVideo: boolean;
                        version?: string | undefined;
                        year?: number | undefined;
                        genre?: string | undefined;
                        genres?: {
                            name: string;
                        }[] | undefined;
                        starred?: boolean | undefined;
                        explicitStatus?: string | undefined;
                        releaseDate?: {
                            year: number;
                            month: number;
                            day: number;
                        } | undefined;
                        userRating?: number | undefined;
                        played?: string | undefined;
                        isCompilation?: boolean | undefined;
                        recordLabels?: {
                            name: string;
                        }[] | undefined;
                        releaseTypes?: string[] | undefined;
                        contributors?: {
                            artist: {
                                id: string;
                                name: string;
                            };
                            role: string;
                            subRole?: string | undefined;
                        }[] | undefined;
                        discTitles?: {
                            disc: number;
                            title: string;
                        }[] | undefined;
                    }[] | undefined;
                    starred?: string | undefined;
                    coverArt?: string | undefined;
                    artistImageUrl?: string | undefined;
                    roles?: string[] | undefined;
                }[] | undefined;
                song?: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[] | undefined;
            } | undefined;
        }>;
        serverInfo: z.ZodObject<{
            openSubsonicExtensions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                versions: z.ZodArray<z.ZodNumber, "many">;
            }, "strip", z.ZodTypeAny, {
                name: string;
                versions: number[];
            }, {
                name: string;
                versions: number[];
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            openSubsonicExtensions?: {
                name: string;
                versions: number[];
            }[] | undefined;
        }, {
            openSubsonicExtensions?: {
                name: string;
                versions: number[];
            }[] | undefined;
        }>;
        setRating: z.ZodNull;
        similarSongs: z.ZodObject<{
            similarSongs: z.ZodOptional<z.ZodObject<{
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            similarSongs?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }, {
            similarSongs?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }>;
        similarSongs2: z.ZodObject<{
            similarSongs2: z.ZodOptional<z.ZodObject<{
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            similarSongs2?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }, {
            similarSongs2?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }>;
        song: z.ZodObject<{
            album: z.ZodOptional<z.ZodString>;
            albumArtists: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">;
            albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
            artist: z.ZodOptional<z.ZodString>;
            artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
            artists: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                name: string;
            }, {
                id: string;
                name: string;
            }>, "many">;
            averageRating: z.ZodOptional<z.ZodNumber>;
            bitDepth: z.ZodOptional<z.ZodNumber>;
            bitRate: z.ZodOptional<z.ZodNumber>;
            bpm: z.ZodOptional<z.ZodNumber>;
            channelCount: z.ZodOptional<z.ZodNumber>;
            contentType: z.ZodString;
            contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                artist: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>;
                role: z.ZodString;
                subRole: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }, {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }>, "many">>;
            coverArt: z.ZodOptional<z.ZodString>;
            created: z.ZodString;
            discNumber: z.ZodNumber;
            duration: z.ZodOptional<z.ZodNumber>;
            explicitStatus: z.ZodOptional<z.ZodString>;
            genre: z.ZodOptional<z.ZodString>;
            genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
            }, {
                name: string;
            }>, "many">>;
            id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
            isDir: z.ZodBoolean;
            isVideo: z.ZodBoolean;
            musicBrainzId: z.ZodOptional<z.ZodString>;
            parent: z.ZodString;
            path: z.ZodString;
            playCount: z.ZodOptional<z.ZodNumber>;
            played: z.ZodOptional<z.ZodString>;
            replayGain: z.ZodOptional<z.ZodObject<{
                albumGain: z.ZodOptional<z.ZodNumber>;
                albumPeak: z.ZodOptional<z.ZodNumber>;
                trackGain: z.ZodOptional<z.ZodNumber>;
                trackPeak: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                albumGain?: number | undefined;
                albumPeak?: number | undefined;
                trackGain?: number | undefined;
                trackPeak?: number | undefined;
            }, {
                albumGain?: number | undefined;
                albumPeak?: number | undefined;
                trackGain?: number | undefined;
                trackPeak?: number | undefined;
            }>>;
            samplingRate: z.ZodOptional<z.ZodNumber>;
            size: z.ZodNumber;
            starred: z.ZodOptional<z.ZodBoolean>;
            suffix: z.ZodString;
            title: z.ZodString;
            track: z.ZodOptional<z.ZodNumber>;
            type: z.ZodString;
            userRating: z.ZodOptional<z.ZodNumber>;
            year: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string | number;
            path: string;
            size: number;
            title: string;
            artists: {
                id: string;
                name: string;
            }[];
            type: string;
            discNumber: number;
            suffix: string;
            albumArtists: {
                id: string;
                name: string;
            }[];
            parent: string;
            contentType: string;
            created: string;
            isDir: boolean;
            isVideo: boolean;
            bpm?: number | undefined;
            album?: string | undefined;
            duration?: number | undefined;
            track?: number | undefined;
            year?: number | undefined;
            artist?: string | undefined;
            genre?: string | undefined;
            genres?: {
                name: string;
            }[] | undefined;
            starred?: boolean | undefined;
            artistId?: string | number | undefined;
            explicitStatus?: string | undefined;
            playCount?: number | undefined;
            albumId?: string | number | undefined;
            bitDepth?: number | undefined;
            bitRate?: number | undefined;
            userRating?: number | undefined;
            played?: string | undefined;
            contributors?: {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }[] | undefined;
            coverArt?: string | undefined;
            averageRating?: number | undefined;
            channelCount?: number | undefined;
            musicBrainzId?: string | undefined;
            replayGain?: {
                albumGain?: number | undefined;
                albumPeak?: number | undefined;
                trackGain?: number | undefined;
                trackPeak?: number | undefined;
            } | undefined;
            samplingRate?: number | undefined;
        }, {
            id: string | number;
            path: string;
            size: number;
            title: string;
            artists: {
                id: string;
                name: string;
            }[];
            type: string;
            discNumber: number;
            suffix: string;
            albumArtists: {
                id: string;
                name: string;
            }[];
            parent: string;
            contentType: string;
            created: string;
            isDir: boolean;
            isVideo: boolean;
            bpm?: number | undefined;
            album?: string | undefined;
            duration?: number | undefined;
            track?: number | undefined;
            year?: number | undefined;
            artist?: string | undefined;
            genre?: string | undefined;
            genres?: {
                name: string;
            }[] | undefined;
            starred?: boolean | undefined;
            artistId?: string | number | undefined;
            explicitStatus?: string | undefined;
            playCount?: number | undefined;
            albumId?: string | number | undefined;
            bitDepth?: number | undefined;
            bitRate?: number | undefined;
            userRating?: number | undefined;
            played?: string | undefined;
            contributors?: {
                artist: {
                    id: string;
                    name: string;
                };
                role: string;
                subRole?: string | undefined;
            }[] | undefined;
            coverArt?: string | undefined;
            averageRating?: number | undefined;
            channelCount?: number | undefined;
            musicBrainzId?: string | undefined;
            replayGain?: {
                albumGain?: number | undefined;
                albumPeak?: number | undefined;
                trackGain?: number | undefined;
                trackPeak?: number | undefined;
            } | undefined;
            samplingRate?: number | undefined;
        }>;
        structuredLyrics: z.ZodObject<{
            lyricsList: z.ZodOptional<z.ZodObject<{
                structuredLyrics: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    displayArtist: z.ZodOptional<z.ZodString>;
                    displayTitle: z.ZodOptional<z.ZodString>;
                    lang: z.ZodString;
                    line: z.ZodArray<z.ZodObject<{
                        start: z.ZodOptional<z.ZodNumber>;
                        value: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        value: string;
                        start?: number | undefined;
                    }, {
                        value: string;
                        start?: number | undefined;
                    }>, "many">;
                    offset: z.ZodOptional<z.ZodNumber>;
                    synced: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    line: {
                        value: string;
                        start?: number | undefined;
                    }[];
                    lang: string;
                    synced: boolean;
                    offset?: number | undefined;
                    displayArtist?: string | undefined;
                    displayTitle?: string | undefined;
                }, {
                    line: {
                        value: string;
                        start?: number | undefined;
                    }[];
                    lang: string;
                    synced: boolean;
                    offset?: number | undefined;
                    displayArtist?: string | undefined;
                    displayTitle?: string | undefined;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                structuredLyrics?: {
                    line: {
                        value: string;
                        start?: number | undefined;
                    }[];
                    lang: string;
                    synced: boolean;
                    offset?: number | undefined;
                    displayArtist?: string | undefined;
                    displayTitle?: string | undefined;
                }[] | undefined;
            }, {
                structuredLyrics?: {
                    line: {
                        value: string;
                        start?: number | undefined;
                    }[];
                    lang: string;
                    synced: boolean;
                    offset?: number | undefined;
                    displayArtist?: string | undefined;
                    displayTitle?: string | undefined;
                }[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            lyricsList?: {
                structuredLyrics?: {
                    line: {
                        value: string;
                        start?: number | undefined;
                    }[];
                    lang: string;
                    synced: boolean;
                    offset?: number | undefined;
                    displayArtist?: string | undefined;
                    displayTitle?: string | undefined;
                }[] | undefined;
            } | undefined;
        }, {
            lyricsList?: {
                structuredLyrics?: {
                    line: {
                        value: string;
                        start?: number | undefined;
                    }[];
                    lang: string;
                    synced: boolean;
                    offset?: number | undefined;
                    displayArtist?: string | undefined;
                    displayTitle?: string | undefined;
                }[] | undefined;
            } | undefined;
        }>;
        topSongsList: z.ZodObject<{
            topSongs: z.ZodOptional<z.ZodObject<{
                song: z.ZodArray<z.ZodObject<{
                    album: z.ZodOptional<z.ZodString>;
                    albumArtists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    albumId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artist: z.ZodOptional<z.ZodString>;
                    artistId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
                    artists: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">;
                    averageRating: z.ZodOptional<z.ZodNumber>;
                    bitDepth: z.ZodOptional<z.ZodNumber>;
                    bitRate: z.ZodOptional<z.ZodNumber>;
                    bpm: z.ZodOptional<z.ZodNumber>;
                    channelCount: z.ZodOptional<z.ZodNumber>;
                    contentType: z.ZodString;
                    contributors: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        artist: z.ZodObject<{
                            id: z.ZodString;
                            name: z.ZodString;
                        }, "strip", z.ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>;
                        role: z.ZodString;
                        subRole: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }, {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }>, "many">>;
                    coverArt: z.ZodOptional<z.ZodString>;
                    created: z.ZodString;
                    discNumber: z.ZodNumber;
                    duration: z.ZodOptional<z.ZodNumber>;
                    explicitStatus: z.ZodOptional<z.ZodString>;
                    genre: z.ZodOptional<z.ZodString>;
                    genres: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                    }, {
                        name: string;
                    }>, "many">>;
                    id: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
                    isDir: z.ZodBoolean;
                    isVideo: z.ZodBoolean;
                    musicBrainzId: z.ZodOptional<z.ZodString>;
                    parent: z.ZodString;
                    path: z.ZodString;
                    playCount: z.ZodOptional<z.ZodNumber>;
                    played: z.ZodOptional<z.ZodString>;
                    replayGain: z.ZodOptional<z.ZodObject<{
                        albumGain: z.ZodOptional<z.ZodNumber>;
                        albumPeak: z.ZodOptional<z.ZodNumber>;
                        trackGain: z.ZodOptional<z.ZodNumber>;
                        trackPeak: z.ZodOptional<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }, {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    }>>;
                    samplingRate: z.ZodOptional<z.ZodNumber>;
                    size: z.ZodNumber;
                    starred: z.ZodOptional<z.ZodBoolean>;
                    suffix: z.ZodString;
                    title: z.ZodString;
                    track: z.ZodOptional<z.ZodNumber>;
                    type: z.ZodString;
                    userRating: z.ZodOptional<z.ZodNumber>;
                    year: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }, {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }, {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            }>>;
        }, "strip", z.ZodTypeAny, {
            topSongs?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }, {
            topSongs?: {
                song: {
                    id: string | number;
                    path: string;
                    size: number;
                    title: string;
                    artists: {
                        id: string;
                        name: string;
                    }[];
                    type: string;
                    discNumber: number;
                    suffix: string;
                    albumArtists: {
                        id: string;
                        name: string;
                    }[];
                    parent: string;
                    contentType: string;
                    created: string;
                    isDir: boolean;
                    isVideo: boolean;
                    bpm?: number | undefined;
                    album?: string | undefined;
                    duration?: number | undefined;
                    track?: number | undefined;
                    year?: number | undefined;
                    artist?: string | undefined;
                    genre?: string | undefined;
                    genres?: {
                        name: string;
                    }[] | undefined;
                    starred?: boolean | undefined;
                    artistId?: string | number | undefined;
                    explicitStatus?: string | undefined;
                    playCount?: number | undefined;
                    albumId?: string | number | undefined;
                    bitDepth?: number | undefined;
                    bitRate?: number | undefined;
                    userRating?: number | undefined;
                    played?: string | undefined;
                    contributors?: {
                        artist: {
                            id: string;
                            name: string;
                        };
                        role: string;
                        subRole?: string | undefined;
                    }[] | undefined;
                    coverArt?: string | undefined;
                    averageRating?: number | undefined;
                    channelCount?: number | undefined;
                    musicBrainzId?: string | undefined;
                    replayGain?: {
                        albumGain?: number | undefined;
                        albumPeak?: number | undefined;
                        trackGain?: number | undefined;
                        trackPeak?: number | undefined;
                    } | undefined;
                    samplingRate?: number | undefined;
                }[];
            } | undefined;
        }>;
        updateInternetRadioStation: z.ZodNull;
        user: z.ZodObject<{
            user: z.ZodObject<{
                adminRole: z.ZodBoolean;
                commentRole: z.ZodBoolean;
                coverArtRole: z.ZodBoolean;
                downloadRole: z.ZodBoolean;
                folder: z.ZodArray<z.ZodString, "many">;
                jukeboxRole: z.ZodBoolean;
                playlistRole: z.ZodBoolean;
                podcastRole: z.ZodBoolean;
                scrobblingEnabled: z.ZodBoolean;
                settingsRole: z.ZodBoolean;
                shareRole: z.ZodBoolean;
                streamRole: z.ZodBoolean;
                uploadRole: z.ZodBoolean;
                username: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                folder: string[];
                username: string;
                adminRole: boolean;
                commentRole: boolean;
                coverArtRole: boolean;
                downloadRole: boolean;
                jukeboxRole: boolean;
                playlistRole: boolean;
                podcastRole: boolean;
                scrobblingEnabled: boolean;
                settingsRole: boolean;
                shareRole: boolean;
                streamRole: boolean;
                uploadRole: boolean;
            }, {
                folder: string[];
                username: string;
                adminRole: boolean;
                commentRole: boolean;
                coverArtRole: boolean;
                downloadRole: boolean;
                jukeboxRole: boolean;
                playlistRole: boolean;
                podcastRole: boolean;
                scrobblingEnabled: boolean;
                settingsRole: boolean;
                shareRole: boolean;
                streamRole: boolean;
                uploadRole: boolean;
            }>;
        }, "strip", z.ZodTypeAny, {
            user: {
                folder: string[];
                username: string;
                adminRole: boolean;
                commentRole: boolean;
                coverArtRole: boolean;
                downloadRole: boolean;
                jukeboxRole: boolean;
                playlistRole: boolean;
                podcastRole: boolean;
                scrobblingEnabled: boolean;
                settingsRole: boolean;
                shareRole: boolean;
                streamRole: boolean;
                uploadRole: boolean;
            };
        }, {
            user: {
                folder: string[];
                username: string;
                adminRole: boolean;
                commentRole: boolean;
                coverArtRole: boolean;
                downloadRole: boolean;
                jukeboxRole: boolean;
                playlistRole: boolean;
                podcastRole: boolean;
                scrobblingEnabled: boolean;
                settingsRole: boolean;
                shareRole: boolean;
                streamRole: boolean;
                uploadRole: boolean;
            };
        }>;
    };
};
