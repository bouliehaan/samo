import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
export declare const contract: {
    addToPlaylist: {
        method: "POST";
        body: import("zod").ZodObject<{
            ids: import("zod").ZodArray<import("zod").ZodString, "many">;
        }, "strip", import("zod").ZodTypeAny, {
            ids: string[];
        }, {
            ids: string[];
        }>;
        path: "playlist/:id/tracks";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    added: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
                    added: number;
                }, {
                    added: number;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    added: number;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    added: number;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    authenticate: {
        method: "POST";
        body: import("zod").ZodObject<{
            password: import("zod").ZodString;
            username: import("zod").ZodString;
        }, "strip", import("zod").ZodTypeAny, {
            password: string;
            username: string;
        }, {
            password: string;
            username: string;
        }>;
        path: "auth/login";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    isAdmin: import("zod").ZodBoolean;
                    name: import("zod").ZodString;
                    subsonicSalt: import("zod").ZodString;
                    subsonicToken: import("zod").ZodString;
                    token: import("zod").ZodString;
                    username: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                    username: string;
                    token: string;
                    isAdmin: boolean;
                    subsonicSalt: string;
                    subsonicToken: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                    username: string;
                    token: string;
                    isAdmin: boolean;
                    subsonicSalt: string;
                    subsonicToken: string;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    createPlaylist: {
        method: "POST";
        body: import("zod").ZodObject<{
            comment: import("zod").ZodOptional<import("zod").ZodString>;
            name: import("zod").ZodString;
            ownerId: import("zod").ZodOptional<import("zod").ZodString>;
            public: import("zod").ZodOptional<import("zod").ZodBoolean>;
            rules: import("zod").ZodOptional<import("zod").ZodObject<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodAny, import("zod").objectOutputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip">, import("zod").objectInputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip">>>;
            sync: import("zod").ZodOptional<import("zod").ZodBoolean>;
        }, "strip", import("zod").ZodTypeAny, {
            name: string;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: import("zod").objectOutputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        }, {
            name: string;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: import("zod").objectInputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        }>;
        path: "playlist";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<Pick<{
                    comment: import("zod").ZodString;
                    createdAt: import("zod").ZodString;
                    duration: import("zod").ZodNumber;
                    evaluatedAt: import("zod").ZodString;
                    id: import("zod").ZodString;
                    name: import("zod").ZodString;
                    ownerId: import("zod").ZodString;
                    ownerName: import("zod").ZodString;
                    path: import("zod").ZodString;
                    public: import("zod").ZodBoolean;
                    rules: import("zod").ZodObject<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodAny, import("zod").objectOutputType<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod").ZodAny, "strip">, import("zod").objectInputType<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod").ZodAny, "strip">>;
                    size: import("zod").ZodNumber;
                    songCount: import("zod").ZodNumber;
                    sync: import("zod").ZodBoolean;
                    updatedAt: import("zod").ZodString;
                    uploadedImage: import("zod").ZodOptional<import("zod").ZodString>;
                }, "id">, "strip", import("zod").ZodTypeAny, {
                    id: string;
                }, {
                    id: string;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    deleteArtistImage: {
        method: "DELETE";
        body: null;
        path: "artist/:id/image";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    status: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    status: string;
                }, {
                    status: string;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    deleteInternetRadioStation: {
        method: "DELETE";
        body: null;
        path: "radio/:id";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodNull;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: null;
            }, {
                headers: import("axios").AxiosHeaders;
                data: null;
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    deleteInternetRadioStationImage: {
        method: "DELETE";
        body: null;
        path: "radio/:id/image";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    status: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    status: string;
                }, {
                    status: string;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    deletePlaylist: {
        method: "DELETE";
        body: null;
        path: "playlist/:id";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodNull;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: null;
            }, {
                headers: import("axios").AxiosHeaders;
                data: null;
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    deletePlaylistImage: {
        method: "DELETE";
        body: null;
        path: "playlist/:id/image";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    status: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    status: string;
                }, {
                    status: string;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getAlbumArtistDetail: {
        method: "GET";
        path: "artist/:id";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    albumCount: import("zod").ZodNumber;
                    biography: import("zod").ZodString;
                    createdAt: import("zod").ZodOptional<import("zod").ZodString>;
                    externalInfoUpdatedAt: import("zod").ZodString;
                    externalUrl: import("zod").ZodString;
                    fullText: import("zod").ZodString;
                    genres: import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">>;
                    id: import("zod").ZodString;
                    largeImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mediumImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    name: import("zod").ZodString;
                    orderArtistName: import("zod").ZodString;
                    playCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    playDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rating: import("zod").ZodNumber;
                    size: import("zod").ZodNumber;
                    smallImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    songCount: import("zod").ZodNumber;
                    starred: import("zod").ZodBoolean;
                    starredAt: import("zod").ZodString;
                    stats: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodObject<{
                        albumCount: import("zod").ZodNumber;
                        size: import("zod").ZodNumber;
                        songCount: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        size: number;
                        songCount: number;
                        albumCount: number;
                    }, {
                        size: number;
                        songCount: number;
                        albumCount: number;
                    }>>>;
                    updatedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    uploadedImage: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getAlbumArtistList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodNumber>;
            _order: import("zod").ZodEnum<["ASC", "DESC"]>;
            _start: import("zod").ZodOptional<import("zod").ZodNumber>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("/@/shared/api/navidrome/navidrome-types").NDAlbumArtistListSort>>;
            genre_id: import("zod").ZodOptional<import("zod").ZodString>;
            library_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            missing: import("zod").ZodOptional<import("zod").ZodBoolean>;
            name: import("zod").ZodOptional<import("zod").ZodString>;
            role: import("zod").ZodOptional<import("zod").ZodString>;
            starred: import("zod").ZodOptional<import("zod").ZodBoolean>;
        }, "strip", import("zod").ZodTypeAny, {
            _order: "ASC" | "DESC";
            name?: string | undefined;
            library_id?: string[] | undefined;
            missing?: boolean | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDAlbumArtistListSort | undefined;
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
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDAlbumArtistListSort | undefined;
            genre_id?: string | undefined;
            role?: string | undefined;
            starred?: boolean | undefined;
        }>;
        path: "artist";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    albumCount: import("zod").ZodNumber;
                    biography: import("zod").ZodString;
                    createdAt: import("zod").ZodOptional<import("zod").ZodString>;
                    externalInfoUpdatedAt: import("zod").ZodString;
                    externalUrl: import("zod").ZodString;
                    fullText: import("zod").ZodString;
                    genres: import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">>;
                    id: import("zod").ZodString;
                    largeImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mediumImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    name: import("zod").ZodString;
                    orderArtistName: import("zod").ZodString;
                    playCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    playDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rating: import("zod").ZodNumber;
                    size: import("zod").ZodNumber;
                    smallImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    songCount: import("zod").ZodNumber;
                    starred: import("zod").ZodBoolean;
                    starredAt: import("zod").ZodString;
                    stats: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodObject<{
                        albumCount: import("zod").ZodNumber;
                        size: import("zod").ZodNumber;
                        songCount: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
                        size: number;
                        songCount: number;
                        albumCount: number;
                    }, {
                        size: number;
                        songCount: number;
                        albumCount: number;
                    }>>>;
                    updatedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    uploadedImage: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getAlbumDetail: {
        method: "GET";
        path: "album/:id";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    albumArtist: import("zod").ZodString;
                    albumArtistId: import("zod").ZodString;
                    allArtistIds: import("zod").ZodString;
                    artist: import("zod").ZodString;
                    artistId: import("zod").ZodString;
                    catalogNum: import("zod").ZodOptional<import("zod").ZodString>;
                    comment: import("zod").ZodOptional<import("zod").ZodString>;
                    compilation: import("zod").ZodBoolean;
                    coverArtId: import("zod").ZodOptional<import("zod").ZodString>;
                    coverArtPath: import("zod").ZodOptional<import("zod").ZodString>;
                    createdAt: import("zod").ZodString;
                    duration: import("zod").ZodOptional<import("zod").ZodNumber>;
                    explicitStatus: import("zod").ZodOptional<import("zod").ZodString>;
                    externalInfoUpdatedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    externalUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    fullText: import("zod").ZodString;
                    genre: import("zod").ZodString;
                    genres: import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">>;
                    id: import("zod").ZodString;
                    importedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    libraryId: import("zod").ZodNumber;
                    libraryName: import("zod").ZodString;
                    libraryPath: import("zod").ZodString;
                    maxOriginalYear: import("zod").ZodOptional<import("zod").ZodNumber>;
                    maxYear: import("zod").ZodNumber;
                    mbzAlbumArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumType: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzReleaseGroupId: import("zod").ZodOptional<import("zod").ZodString>;
                    minOriginalYear: import("zod").ZodOptional<import("zod").ZodNumber>;
                    minYear: import("zod").ZodNumber;
                    name: import("zod").ZodString;
                    orderAlbumArtistName: import("zod").ZodString;
                    orderAlbumName: import("zod").ZodString;
                    originalDate: import("zod").ZodOptional<import("zod").ZodString>;
                    participants: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                        subRole: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }>, "many">>>;
                    playCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    playDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rating: import("zod").ZodOptional<import("zod").ZodNumber>;
                    releaseDate: import("zod").ZodOptional<import("zod").ZodString>;
                    size: import("zod").ZodNumber;
                    songCount: import("zod").ZodNumber;
                    sortAlbumArtistName: import("zod").ZodString;
                    sortArtistName: import("zod").ZodString;
                    starred: import("zod").ZodBoolean;
                    starredAt: import("zod").ZodOptional<import("zod").ZodString>;
                    tags: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
                    updatedAt: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getAlbumList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodNumber>;
            _order: import("zod").ZodEnum<["ASC", "DESC"]>;
            _start: import("zod").ZodOptional<import("zod").ZodNumber>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("/@/shared/api/navidrome/navidrome-types").NDAlbumListSort>>;
            album_id: import("zod").ZodOptional<import("zod").ZodString>;
            artist_id: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">]>>;
            compilation: import("zod").ZodOptional<import("zod").ZodBoolean>;
            genre_id: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">]>>;
            has_rating: import("zod").ZodOptional<import("zod").ZodBoolean>;
            id: import("zod").ZodOptional<import("zod").ZodString>;
            library_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            name: import("zod").ZodOptional<import("zod").ZodString>;
            recently_added: import("zod").ZodOptional<import("zod").ZodBoolean>;
            recently_played: import("zod").ZodOptional<import("zod").ZodBoolean>;
            starred: import("zod").ZodOptional<import("zod").ZodBoolean>;
            year: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, "strip", import("zod").ZodTypeAny, {
            _order: "ASC" | "DESC";
            id?: string | undefined;
            name?: string | undefined;
            year?: number | undefined;
            compilation?: boolean | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDAlbumListSort | undefined;
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
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDAlbumListSort | undefined;
            genre_id?: string | string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string | undefined;
            artist_id?: string | string[] | undefined;
            has_rating?: boolean | undefined;
            recently_added?: boolean | undefined;
            recently_played?: boolean | undefined;
        }>;
        path: "album";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    albumArtist: import("zod").ZodString;
                    albumArtistId: import("zod").ZodString;
                    allArtistIds: import("zod").ZodString;
                    artist: import("zod").ZodString;
                    artistId: import("zod").ZodString;
                    catalogNum: import("zod").ZodOptional<import("zod").ZodString>;
                    comment: import("zod").ZodOptional<import("zod").ZodString>;
                    compilation: import("zod").ZodBoolean;
                    coverArtId: import("zod").ZodOptional<import("zod").ZodString>;
                    coverArtPath: import("zod").ZodOptional<import("zod").ZodString>;
                    createdAt: import("zod").ZodString;
                    duration: import("zod").ZodOptional<import("zod").ZodNumber>;
                    explicitStatus: import("zod").ZodOptional<import("zod").ZodString>;
                    externalInfoUpdatedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    externalUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    fullText: import("zod").ZodString;
                    genre: import("zod").ZodString;
                    genres: import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">>;
                    id: import("zod").ZodString;
                    importedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    libraryId: import("zod").ZodNumber;
                    libraryName: import("zod").ZodString;
                    libraryPath: import("zod").ZodString;
                    maxOriginalYear: import("zod").ZodOptional<import("zod").ZodNumber>;
                    maxYear: import("zod").ZodNumber;
                    mbzAlbumArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumType: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzReleaseGroupId: import("zod").ZodOptional<import("zod").ZodString>;
                    minOriginalYear: import("zod").ZodOptional<import("zod").ZodNumber>;
                    minYear: import("zod").ZodNumber;
                    name: import("zod").ZodString;
                    orderAlbumArtistName: import("zod").ZodString;
                    orderAlbumName: import("zod").ZodString;
                    originalDate: import("zod").ZodOptional<import("zod").ZodString>;
                    participants: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                        subRole: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }>, "many">>>;
                    playCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    playDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rating: import("zod").ZodOptional<import("zod").ZodNumber>;
                    releaseDate: import("zod").ZodOptional<import("zod").ZodString>;
                    size: import("zod").ZodNumber;
                    songCount: import("zod").ZodNumber;
                    sortAlbumArtistName: import("zod").ZodString;
                    sortArtistName: import("zod").ZodString;
                    starred: import("zod").ZodBoolean;
                    starredAt: import("zod").ZodOptional<import("zod").ZodString>;
                    tags: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
                    updatedAt: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getGenreList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodNumber>;
            _order: import("zod").ZodEnum<["ASC", "DESC"]>;
            _start: import("zod").ZodOptional<import("zod").ZodNumber>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<{
                readonly NAME: "name";
                readonly SONG_COUNT: "songCount";
            }>>;
            library_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            name: import("zod").ZodOptional<import("zod").ZodString>;
        }, "strip", import("zod").ZodTypeAny, {
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
        path: "genre";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    name: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    id: string;
                    name: string;
                }, {
                    id: string;
                    name: string;
                }>, "many">;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getPlaylistDetail: {
        method: "GET";
        path: "playlist/:id";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    comment: import("zod").ZodString;
                    createdAt: import("zod").ZodString;
                    duration: import("zod").ZodNumber;
                    evaluatedAt: import("zod").ZodString;
                    id: import("zod").ZodString;
                    name: import("zod").ZodString;
                    ownerId: import("zod").ZodString;
                    ownerName: import("zod").ZodString;
                    path: import("zod").ZodString;
                    public: import("zod").ZodBoolean;
                    rules: import("zod").ZodObject<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodAny, import("zod").objectOutputType<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod").ZodAny, "strip">, import("zod").objectInputType<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod").ZodAny, "strip">>;
                    size: import("zod").ZodNumber;
                    songCount: import("zod").ZodNumber;
                    sync: import("zod").ZodBoolean;
                    updatedAt: import("zod").ZodString;
                    uploadedImage: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getPlaylistList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodNumber>;
            _order: import("zod").ZodEnum<["ASC", "DESC"]>;
            _start: import("zod").ZodOptional<import("zod").ZodNumber>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("/@/shared/api/navidrome/navidrome-types").NDPlaylistListSort>>;
            owner_id: import("zod").ZodOptional<import("zod").ZodString>;
            q: import("zod").ZodOptional<import("zod").ZodString>;
            smart: import("zod").ZodOptional<import("zod").ZodBoolean>;
        }, "strip", import("zod").ZodTypeAny, {
            _order: "ASC" | "DESC";
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDPlaylistListSort | undefined;
            owner_id?: string | undefined;
            q?: string | undefined;
            smart?: boolean | undefined;
        }, {
            _order: "ASC" | "DESC";
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDPlaylistListSort | undefined;
            owner_id?: string | undefined;
            q?: string | undefined;
            smart?: boolean | undefined;
        }>;
        path: "playlist";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    comment: import("zod").ZodString;
                    createdAt: import("zod").ZodString;
                    duration: import("zod").ZodNumber;
                    evaluatedAt: import("zod").ZodString;
                    id: import("zod").ZodString;
                    name: import("zod").ZodString;
                    ownerId: import("zod").ZodString;
                    ownerName: import("zod").ZodString;
                    path: import("zod").ZodString;
                    public: import("zod").ZodBoolean;
                    rules: import("zod").ZodObject<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodAny, import("zod").objectOutputType<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod").ZodAny, "strip">, import("zod").objectInputType<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod").ZodAny, "strip">>;
                    size: import("zod").ZodNumber;
                    songCount: import("zod").ZodNumber;
                    sync: import("zod").ZodBoolean;
                    updatedAt: import("zod").ZodString;
                    uploadedImage: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getPlaylistSongList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodNumber>;
            _order: import("zod").ZodEnum<["ASC", "DESC"]>;
            _start: import("zod").ZodOptional<import("zod").ZodNumber>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("/@/shared/api/navidrome/navidrome-types").NDSongListSort>>;
            album_artist_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            album_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            artist_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            artists_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            genre_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            has_rating: import("zod").ZodOptional<import("zod").ZodBoolean>;
            library_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            path: import("zod").ZodOptional<import("zod").ZodString>;
            starred: import("zod").ZodOptional<import("zod").ZodBoolean>;
            title: import("zod").ZodOptional<import("zod").ZodString>;
            year: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, "strip", import("zod").ZodTypeAny, {
            _order: "ASC" | "DESC";
            path?: string | undefined;
            title?: string | undefined;
            year?: number | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDSongListSort | undefined;
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
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDSongListSort | undefined;
            genre_id?: string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string[] | undefined;
            artist_id?: string[] | undefined;
            has_rating?: boolean | undefined;
            album_artist_id?: string[] | undefined;
            artists_id?: string[] | undefined;
        }>;
        path: "playlist/:id/tracks";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    album: import("zod").ZodString;
                    albumArtist: import("zod").ZodString;
                    albumArtistId: import("zod").ZodString;
                    albumId: import("zod").ZodString;
                    artist: import("zod").ZodString;
                    artistId: import("zod").ZodString;
                    bitDepth: import("zod").ZodOptional<import("zod").ZodNumber>;
                    bitRate: import("zod").ZodNumber;
                    bookmarkPosition: import("zod").ZodNumber;
                    bpm: import("zod").ZodOptional<import("zod").ZodNumber>;
                    catalogNum: import("zod").ZodOptional<import("zod").ZodString>;
                    channels: import("zod").ZodOptional<import("zod").ZodNumber>;
                    comment: import("zod").ZodOptional<import("zod").ZodString>;
                    compilation: import("zod").ZodBoolean;
                    createdAt: import("zod").ZodString;
                    discNumber: import("zod").ZodNumber;
                    discSubtitle: import("zod").ZodOptional<import("zod").ZodString>;
                    duration: import("zod").ZodNumber;
                    embedArtPath: import("zod").ZodOptional<import("zod").ZodString>;
                    explicitStatus: import("zod").ZodOptional<import("zod").ZodString>;
                    externalInfoUpdatedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    externalUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    fullText: import("zod").ZodString;
                    genre: import("zod").ZodString;
                    genres: import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">>;
                    hasCoverArt: import("zod").ZodBoolean;
                    id: import("zod").ZodString;
                    imageFiles: import("zod").ZodOptional<import("zod").ZodString>;
                    largeImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    libraryPath: import("zod").ZodOptional<import("zod").ZodString>;
                    lyrics: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzReleaseTrackId: import("zod").ZodOptional<import("zod").ZodString>;
                    mediumImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    orderAlbumArtistName: import("zod").ZodString;
                    orderAlbumName: import("zod").ZodString;
                    orderArtistName: import("zod").ZodString;
                    orderTitle: import("zod").ZodString;
                    participants: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                        subRole: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }>, "many">>>;
                    path: import("zod").ZodString;
                    playCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    playDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rating: import("zod").ZodOptional<import("zod").ZodNumber>;
                    releaseDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rgAlbumGain: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgAlbumPeak: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgTrackGain: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgTrackPeak: import("zod").ZodOptional<import("zod").ZodNumber>;
                    sampleRate: import("zod").ZodNumber;
                    size: import("zod").ZodNumber;
                    smallImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    sortAlbumArtistName: import("zod").ZodString;
                    sortArtistName: import("zod").ZodString;
                    starred: import("zod").ZodBoolean;
                    starredAt: import("zod").ZodOptional<import("zod").ZodString>;
                    suffix: import("zod").ZodString;
                    tags: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
                    title: import("zod").ZodString;
                    trackNumber: import("zod").ZodNumber;
                    updatedAt: import("zod").ZodString;
                    year: import("zod").ZodNumber;
                } & {
                    mediaFileId: import("zod").ZodString;
                    playlistId: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getQueue: {
        method: "GET";
        path: "queue";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    changedBy: import("zod").ZodString;
                    createdAt: import("zod").ZodString;
                    current: import("zod").ZodNumber;
                    id: import("zod").ZodString;
                    items: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                        album: import("zod").ZodString;
                        albumArtist: import("zod").ZodString;
                        albumArtistId: import("zod").ZodString;
                        albumId: import("zod").ZodString;
                        artist: import("zod").ZodString;
                        artistId: import("zod").ZodString;
                        bitDepth: import("zod").ZodOptional<import("zod").ZodNumber>;
                        bitRate: import("zod").ZodNumber;
                        bookmarkPosition: import("zod").ZodNumber;
                        bpm: import("zod").ZodOptional<import("zod").ZodNumber>;
                        catalogNum: import("zod").ZodOptional<import("zod").ZodString>;
                        channels: import("zod").ZodOptional<import("zod").ZodNumber>;
                        comment: import("zod").ZodOptional<import("zod").ZodString>;
                        compilation: import("zod").ZodBoolean;
                        createdAt: import("zod").ZodString;
                        discNumber: import("zod").ZodNumber;
                        discSubtitle: import("zod").ZodOptional<import("zod").ZodString>;
                        duration: import("zod").ZodNumber;
                        embedArtPath: import("zod").ZodOptional<import("zod").ZodString>;
                        explicitStatus: import("zod").ZodOptional<import("zod").ZodString>;
                        externalInfoUpdatedAt: import("zod").ZodOptional<import("zod").ZodString>;
                        externalUrl: import("zod").ZodOptional<import("zod").ZodString>;
                        fullText: import("zod").ZodString;
                        genre: import("zod").ZodString;
                        genres: import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
                            id: import("zod").ZodString;
                            name: import("zod").ZodString;
                        }, "strip", import("zod").ZodTypeAny, {
                            id: string;
                            name: string;
                        }, {
                            id: string;
                            name: string;
                        }>, "many">>;
                        hasCoverArt: import("zod").ZodBoolean;
                        id: import("zod").ZodString;
                        imageFiles: import("zod").ZodOptional<import("zod").ZodString>;
                        largeImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                        libraryPath: import("zod").ZodOptional<import("zod").ZodString>;
                        lyrics: import("zod").ZodOptional<import("zod").ZodString>;
                        mbzAlbumArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                        mbzAlbumId: import("zod").ZodOptional<import("zod").ZodString>;
                        mbzArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                        mbzReleaseTrackId: import("zod").ZodOptional<import("zod").ZodString>;
                        mediumImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                        orderAlbumArtistName: import("zod").ZodString;
                        orderAlbumName: import("zod").ZodString;
                        orderArtistName: import("zod").ZodString;
                        orderTitle: import("zod").ZodString;
                        participants: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodObject<{
                            id: import("zod").ZodString;
                            name: import("zod").ZodString;
                            subRole: import("zod").ZodOptional<import("zod").ZodString>;
                        }, "strip", import("zod").ZodTypeAny, {
                            id: string;
                            name: string;
                            subRole?: string | undefined;
                        }, {
                            id: string;
                            name: string;
                            subRole?: string | undefined;
                        }>, "many">>>;
                        path: import("zod").ZodString;
                        playCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                        playDate: import("zod").ZodOptional<import("zod").ZodString>;
                        rating: import("zod").ZodOptional<import("zod").ZodNumber>;
                        releaseDate: import("zod").ZodOptional<import("zod").ZodString>;
                        rgAlbumGain: import("zod").ZodOptional<import("zod").ZodNumber>;
                        rgAlbumPeak: import("zod").ZodOptional<import("zod").ZodNumber>;
                        rgTrackGain: import("zod").ZodOptional<import("zod").ZodNumber>;
                        rgTrackPeak: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sampleRate: import("zod").ZodNumber;
                        size: import("zod").ZodNumber;
                        smallImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                        sortAlbumArtistName: import("zod").ZodString;
                        sortArtistName: import("zod").ZodString;
                        starred: import("zod").ZodBoolean;
                        starredAt: import("zod").ZodOptional<import("zod").ZodString>;
                        suffix: import("zod").ZodString;
                        tags: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
                        title: import("zod").ZodString;
                        trackNumber: import("zod").ZodNumber;
                        updatedAt: import("zod").ZodString;
                        year: import("zod").ZodNumber;
                    }, "strip", import("zod").ZodTypeAny, {
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
                    position: import("zod").ZodNumber;
                    updatedAt: import("zod").ZodString;
                    userId: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getRadioList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodNumber>>;
            _order: import("zod").ZodOptional<import("zod").ZodEnum<["ASC", "DESC"]>>;
            _start: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodNumber>>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("/@/shared/api/navidrome/navidrome-types").NDRadioListSort>>;
        }, "strip", import("zod").ZodTypeAny, {
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDRadioListSort | undefined;
        }, {
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDRadioListSort | undefined;
        }>;
        path: "radio";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    createdAt: import("zod").ZodString;
                    homePageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    id: import("zod").ZodString;
                    name: import("zod").ZodString;
                    streamUrl: import("zod").ZodString;
                    updatedAt: import("zod").ZodString;
                    uploadedImage: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                    streamUrl: string;
                    createdAt: string;
                    updatedAt: string;
                    homePageUrl?: string | undefined;
                    uploadedImage?: string | undefined;
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                    streamUrl: string;
                    createdAt: string;
                    updatedAt: string;
                    homePageUrl?: string | undefined;
                    uploadedImage?: string | undefined;
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getSongDetail: {
        method: "GET";
        path: "song/:id";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    album: import("zod").ZodString;
                    albumArtist: import("zod").ZodString;
                    albumArtistId: import("zod").ZodString;
                    albumId: import("zod").ZodString;
                    artist: import("zod").ZodString;
                    artistId: import("zod").ZodString;
                    bitDepth: import("zod").ZodOptional<import("zod").ZodNumber>;
                    bitRate: import("zod").ZodNumber;
                    bookmarkPosition: import("zod").ZodNumber;
                    bpm: import("zod").ZodOptional<import("zod").ZodNumber>;
                    catalogNum: import("zod").ZodOptional<import("zod").ZodString>;
                    channels: import("zod").ZodOptional<import("zod").ZodNumber>;
                    comment: import("zod").ZodOptional<import("zod").ZodString>;
                    compilation: import("zod").ZodBoolean;
                    createdAt: import("zod").ZodString;
                    discNumber: import("zod").ZodNumber;
                    discSubtitle: import("zod").ZodOptional<import("zod").ZodString>;
                    duration: import("zod").ZodNumber;
                    embedArtPath: import("zod").ZodOptional<import("zod").ZodString>;
                    explicitStatus: import("zod").ZodOptional<import("zod").ZodString>;
                    externalInfoUpdatedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    externalUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    fullText: import("zod").ZodString;
                    genre: import("zod").ZodString;
                    genres: import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">>;
                    hasCoverArt: import("zod").ZodBoolean;
                    id: import("zod").ZodString;
                    imageFiles: import("zod").ZodOptional<import("zod").ZodString>;
                    largeImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    libraryPath: import("zod").ZodOptional<import("zod").ZodString>;
                    lyrics: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzReleaseTrackId: import("zod").ZodOptional<import("zod").ZodString>;
                    mediumImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    orderAlbumArtistName: import("zod").ZodString;
                    orderAlbumName: import("zod").ZodString;
                    orderArtistName: import("zod").ZodString;
                    orderTitle: import("zod").ZodString;
                    participants: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                        subRole: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }>, "many">>>;
                    path: import("zod").ZodString;
                    playCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    playDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rating: import("zod").ZodOptional<import("zod").ZodNumber>;
                    releaseDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rgAlbumGain: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgAlbumPeak: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgTrackGain: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgTrackPeak: import("zod").ZodOptional<import("zod").ZodNumber>;
                    sampleRate: import("zod").ZodNumber;
                    size: import("zod").ZodNumber;
                    smallImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    sortAlbumArtistName: import("zod").ZodString;
                    sortArtistName: import("zod").ZodString;
                    starred: import("zod").ZodBoolean;
                    starredAt: import("zod").ZodOptional<import("zod").ZodString>;
                    suffix: import("zod").ZodString;
                    tags: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
                    title: import("zod").ZodString;
                    trackNumber: import("zod").ZodNumber;
                    updatedAt: import("zod").ZodString;
                    year: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getSongList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodNumber>;
            _order: import("zod").ZodEnum<["ASC", "DESC"]>;
            _start: import("zod").ZodOptional<import("zod").ZodNumber>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("/@/shared/api/navidrome/navidrome-types").NDSongListSort>>;
            album_artist_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            album_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            artist_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            artists_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            genre_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            has_rating: import("zod").ZodOptional<import("zod").ZodBoolean>;
            library_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            path: import("zod").ZodOptional<import("zod").ZodString>;
            starred: import("zod").ZodOptional<import("zod").ZodBoolean>;
            title: import("zod").ZodOptional<import("zod").ZodString>;
            year: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, "strip", import("zod").ZodTypeAny, {
            _order: "ASC" | "DESC";
            path?: string | undefined;
            title?: string | undefined;
            year?: number | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDSongListSort | undefined;
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
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDSongListSort | undefined;
            genre_id?: string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string[] | undefined;
            artist_id?: string[] | undefined;
            has_rating?: boolean | undefined;
            album_artist_id?: string[] | undefined;
            artists_id?: string[] | undefined;
        }>;
        path: "song";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    album: import("zod").ZodString;
                    albumArtist: import("zod").ZodString;
                    albumArtistId: import("zod").ZodString;
                    albumId: import("zod").ZodString;
                    artist: import("zod").ZodString;
                    artistId: import("zod").ZodString;
                    bitDepth: import("zod").ZodOptional<import("zod").ZodNumber>;
                    bitRate: import("zod").ZodNumber;
                    bookmarkPosition: import("zod").ZodNumber;
                    bpm: import("zod").ZodOptional<import("zod").ZodNumber>;
                    catalogNum: import("zod").ZodOptional<import("zod").ZodString>;
                    channels: import("zod").ZodOptional<import("zod").ZodNumber>;
                    comment: import("zod").ZodOptional<import("zod").ZodString>;
                    compilation: import("zod").ZodBoolean;
                    createdAt: import("zod").ZodString;
                    discNumber: import("zod").ZodNumber;
                    discSubtitle: import("zod").ZodOptional<import("zod").ZodString>;
                    duration: import("zod").ZodNumber;
                    embedArtPath: import("zod").ZodOptional<import("zod").ZodString>;
                    explicitStatus: import("zod").ZodOptional<import("zod").ZodString>;
                    externalInfoUpdatedAt: import("zod").ZodOptional<import("zod").ZodString>;
                    externalUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    fullText: import("zod").ZodString;
                    genre: import("zod").ZodString;
                    genres: import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                    }, {
                        id: string;
                        name: string;
                    }>, "many">>;
                    hasCoverArt: import("zod").ZodBoolean;
                    id: import("zod").ZodString;
                    imageFiles: import("zod").ZodOptional<import("zod").ZodString>;
                    largeImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    libraryPath: import("zod").ZodOptional<import("zod").ZodString>;
                    lyrics: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzAlbumId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzArtistId: import("zod").ZodOptional<import("zod").ZodString>;
                    mbzReleaseTrackId: import("zod").ZodOptional<import("zod").ZodString>;
                    mediumImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    orderAlbumArtistName: import("zod").ZodString;
                    orderAlbumName: import("zod").ZodString;
                    orderArtistName: import("zod").ZodString;
                    orderTitle: import("zod").ZodString;
                    participants: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodObject<{
                        id: import("zod").ZodString;
                        name: import("zod").ZodString;
                        subRole: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodTypeAny, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }, {
                        id: string;
                        name: string;
                        subRole?: string | undefined;
                    }>, "many">>>;
                    path: import("zod").ZodString;
                    playCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    playDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rating: import("zod").ZodOptional<import("zod").ZodNumber>;
                    releaseDate: import("zod").ZodOptional<import("zod").ZodString>;
                    rgAlbumGain: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgAlbumPeak: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgTrackGain: import("zod").ZodOptional<import("zod").ZodNumber>;
                    rgTrackPeak: import("zod").ZodOptional<import("zod").ZodNumber>;
                    sampleRate: import("zod").ZodNumber;
                    size: import("zod").ZodNumber;
                    smallImageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    sortAlbumArtistName: import("zod").ZodString;
                    sortArtistName: import("zod").ZodString;
                    starred: import("zod").ZodBoolean;
                    starredAt: import("zod").ZodOptional<import("zod").ZodString>;
                    suffix: import("zod").ZodString;
                    tags: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString, "many">>>;
                    title: import("zod").ZodString;
                    trackNumber: import("zod").ZodNumber;
                    updatedAt: import("zod").ZodString;
                    year: import("zod").ZodNumber;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getTagList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodNumber>>;
            _order: import("zod").ZodOptional<import("zod").ZodEnum<["ASC", "DESC"]>>;
            _start: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodNumber>>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<typeof import("/@/shared/api/navidrome/navidrome-types").NDTagListSort>>;
            library_id: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            tag_name: import("zod").ZodOptional<import("zod").ZodString>;
            tag_value: import("zod").ZodOptional<import("zod").ZodString>;
        }, "strip", import("zod").ZodTypeAny, {
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDTagListSort | undefined;
            tag_name?: string | undefined;
            tag_value?: string | undefined;
        }, {
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDTagListSort | undefined;
            tag_name?: string | undefined;
            tag_value?: string | undefined;
        }>;
        path: "tag";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    albumCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    id: import("zod").ZodString;
                    songCount: import("zod").ZodOptional<import("zod").ZodNumber>;
                    tagName: import("zod").ZodString;
                    tagValue: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    tagName: string;
                    tagValue: string;
                    songCount?: number | undefined;
                    albumCount?: number | undefined;
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    tagName: string;
                    tagValue: string;
                    songCount?: number | undefined;
                    albumCount?: number | undefined;
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    getUserList: {
        method: "GET";
        query: import("zod").ZodObject<{
            _end: import("zod").ZodOptional<import("zod").ZodNumber>;
            _order: import("zod").ZodEnum<["ASC", "DESC"]>;
            _start: import("zod").ZodOptional<import("zod").ZodNumber>;
        } & {
            _sort: import("zod").ZodOptional<import("zod").ZodNativeEnum<{
                readonly NAME: "name";
            }>>;
        }, "strip", import("zod").ZodTypeAny, {
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
        path: "user";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodArray<import("zod").ZodObject<{
                    createdAt: import("zod").ZodString;
                    email: import("zod").ZodOptional<import("zod").ZodString>;
                    id: import("zod").ZodString;
                    isAdmin: import("zod").ZodBoolean;
                    lastAccessAt: import("zod").ZodString;
                    lastLoginAt: import("zod").ZodString;
                    name: import("zod").ZodString;
                    updatedAt: import("zod").ZodString;
                    userName: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                    isAdmin: boolean;
                    createdAt: string;
                    updatedAt: string;
                    lastAccessAt: string;
                    lastLoginAt: string;
                    userName: string;
                    email?: string | undefined;
                }[];
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                    isAdmin: boolean;
                    createdAt: string;
                    updatedAt: string;
                    lastAccessAt: string;
                    lastLoginAt: string;
                    userName: string;
                    email?: string | undefined;
                }[];
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    movePlaylistItem: {
        method: "PUT";
        body: import("zod").ZodObject<{
            insert_before: import("zod").ZodString;
        }, "strip", import("zod").ZodTypeAny, {
            insert_before: string;
        }, {
            insert_before: string;
        }>;
        path: "playlist/:playlistId/tracks/:trackNumber";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodNull;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: null;
            }, {
                headers: import("axios").AxiosHeaders;
                data: null;
            }>;
            400: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    removeFromPlaylist: {
        method: "DELETE";
        body: null;
        query: import("zod").ZodObject<{
            id: import("zod").ZodArray<import("zod").ZodString, "many">;
        }, "strip", import("zod").ZodTypeAny, {
            id: string[];
        }, {
            id: string[];
        }>;
        path: "playlist/:id/tracks";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    ids: import("zod").ZodArray<import("zod").ZodString, "many">;
                }, "strip", import("zod").ZodTypeAny, {
                    ids: string[];
                }, {
                    ids: string[];
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    ids: string[];
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    ids: string[];
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    saveQueue: {
        method: "POST";
        body: import("zod").ZodObject<{
            current: import("zod").ZodOptional<import("zod").ZodNumber>;
            ids: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString, "many">>;
            position: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, "strip", import("zod").ZodTypeAny, {
            position?: number | undefined;
            ids?: string[] | undefined;
            current?: number | undefined;
        }, {
            position?: number | undefined;
            ids?: string[] | undefined;
            current?: number | undefined;
        }>;
        path: "queue";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodNull;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: null;
            }, {
                headers: import("axios").AxiosHeaders;
                data: null;
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    shareItem: {
        method: "POST";
        body: import("zod").ZodObject<{
            description: import("zod").ZodString;
            downloadable: import("zod").ZodBoolean;
            expires: import("zod").ZodNumber;
            resourceIds: import("zod").ZodString;
            resourceType: import("zod").ZodString;
        }, "strip", import("zod").ZodTypeAny, {
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
        path: "share";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    id: string;
                }, {
                    id: string;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                };
            }>;
            404: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    updateInternetRadioStation: {
        method: "PUT";
        body: import("zod").ZodObject<{
            homePageUrl: import("zod").ZodOptional<import("zod").ZodString>;
            name: import("zod").ZodString;
            streamUrl: import("zod").ZodString;
        }, "strip", import("zod").ZodTypeAny, {
            name: string;
            streamUrl: string;
            homePageUrl?: string | undefined;
        }, {
            name: string;
            streamUrl: string;
            homePageUrl?: string | undefined;
        }>;
        path: "radio/:id";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    createdAt: import("zod").ZodString;
                    homePageUrl: import("zod").ZodOptional<import("zod").ZodString>;
                    id: import("zod").ZodString;
                    name: import("zod").ZodString;
                    streamUrl: import("zod").ZodString;
                    updatedAt: import("zod").ZodString;
                    uploadedImage: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                    streamUrl: string;
                    createdAt: string;
                    updatedAt: string;
                    homePageUrl?: string | undefined;
                    uploadedImage?: string | undefined;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    id: string;
                    name: string;
                    streamUrl: string;
                    createdAt: string;
                    updatedAt: string;
                    homePageUrl?: string | undefined;
                    uploadedImage?: string | undefined;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    updatePlaylist: {
        method: "PUT";
        body: import("zod").ZodObject<{
            comment: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodString>>;
            name: import("zod").ZodOptional<import("zod").ZodString>;
            ownerId: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodString>>;
            public: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodBoolean>>;
            rules: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodObject<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, "strip", import("zod").ZodAny, import("zod").objectOutputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip">, import("zod").objectInputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip">>>>;
            sync: import("zod").ZodOptional<import("zod").ZodOptional<import("zod").ZodBoolean>>;
        }, "strip", import("zod").ZodTypeAny, {
            name?: string | undefined;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: import("zod").objectOutputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        }, {
            name?: string | undefined;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: import("zod").objectInputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        }>;
        path: "playlist/:id";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    comment: import("zod").ZodString;
                    createdAt: import("zod").ZodString;
                    duration: import("zod").ZodNumber;
                    evaluatedAt: import("zod").ZodString;
                    id: import("zod").ZodString;
                    name: import("zod").ZodString;
                    ownerId: import("zod").ZodString;
                    ownerName: import("zod").ZodString;
                    path: import("zod").ZodString;
                    public: import("zod").ZodBoolean;
                    rules: import("zod").ZodObject<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, "strip", import("zod").ZodAny, import("zod").objectOutputType<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod").ZodAny, "strip">, import("zod").objectInputType<{
                        limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                        limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                        sort: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod").ZodAny, "strip">>;
                    size: import("zod").ZodNumber;
                    songCount: import("zod").ZodNumber;
                    sync: import("zod").ZodBoolean;
                    updatedAt: import("zod").ZodString;
                    uploadedImage: import("zod").ZodOptional<import("zod").ZodString>;
                }, "strip", import("zod").ZodTypeAny, {
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
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
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
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    uploadArtistImage: {
        method: "POST";
        body: import("zod").ZodObject<{
            image: import("zod").ZodType<Uint8Array<ArrayBuffer>, import("zod").ZodTypeDef, Uint8Array<ArrayBuffer>>;
        }, "strip", import("zod").ZodTypeAny, {
            image: Uint8Array<ArrayBuffer>;
        }, {
            image: Uint8Array<ArrayBuffer>;
        }>;
        path: "artist/:id/image";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    status: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    status: string;
                }, {
                    status: string;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    uploadInternetRadioStationImage: {
        method: "POST";
        body: import("zod").ZodObject<{
            image: import("zod").ZodType<Uint8Array<ArrayBuffer>, import("zod").ZodTypeDef, Uint8Array<ArrayBuffer>>;
        }, "strip", import("zod").ZodTypeAny, {
            image: Uint8Array<ArrayBuffer>;
        }, {
            image: Uint8Array<ArrayBuffer>;
        }>;
        path: "radio/:id/image";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    status: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    status: string;
                }, {
                    status: string;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
    uploadPlaylistImage: {
        method: "POST";
        body: import("zod").ZodObject<{
            image: import("zod").ZodType<Uint8Array<ArrayBuffer>, import("zod").ZodTypeDef, Uint8Array<ArrayBuffer>>;
        }, "strip", import("zod").ZodTypeAny, {
            image: Uint8Array<ArrayBuffer>;
        }, {
            image: Uint8Array<ArrayBuffer>;
        }>;
        path: "playlist/:id/image";
        responses: {
            200: import("zod").ZodObject<{
                data: import("zod").ZodObject<{
                    status: import("zod").ZodString;
                }, "strip", import("zod").ZodTypeAny, {
                    status: string;
                }, {
                    status: string;
                }>;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }, {
                headers: import("axios").AxiosHeaders;
                data: {
                    status: string;
                };
            }>;
            500: import("zod").ZodObject<{
                data: import("zod").ZodString;
                headers: import("zod").ZodType<import("axios").AxiosHeaders, import("zod").ZodTypeDef, import("axios").AxiosHeaders>;
            }, "strip", import("zod").ZodTypeAny, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }, {
                headers: import("axios").AxiosHeaders;
                data: string;
            }>;
        };
    };
};
export declare const ndApiClient: (args: {
    server: null | ServerListItemWithCredential;
    signal?: AbortSignal;
    url?: string;
}) => {
    addToPlaylist: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        body: {
            ids: string[];
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                added: number;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    authenticate: (args: {
        cache?: RequestCache | undefined;
        body: {
            password: string;
            username: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                id: string;
                name: string;
                username: string;
                token: string;
                isAdmin: boolean;
                subsonicSalt: string;
                subsonicToken: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    createPlaylist: (args: {
        cache?: RequestCache | undefined;
        body: {
            name: string;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: import("zod").objectInputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                id: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    deleteArtistImage: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                status: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    deleteInternetRadioStation: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: null;
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    deleteInternetRadioStationImage: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                status: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    deletePlaylist: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: null;
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    deletePlaylistImage: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                status: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getAlbumArtistDetail: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getAlbumArtistList: (args: {
        cache?: RequestCache | undefined;
        query: {
            _order: "ASC" | "DESC";
            name?: string | undefined;
            library_id?: string[] | undefined;
            missing?: boolean | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDAlbumArtistListSort | undefined;
            genre_id?: string | undefined;
            role?: string | undefined;
            starred?: boolean | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getAlbumDetail: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getAlbumList: (args: {
        cache?: RequestCache | undefined;
        query: {
            _order: "ASC" | "DESC";
            id?: string | undefined;
            name?: string | undefined;
            year?: number | undefined;
            compilation?: boolean | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDAlbumListSort | undefined;
            genre_id?: string | string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string | undefined;
            artist_id?: string | string[] | undefined;
            has_rating?: boolean | undefined;
            recently_added?: boolean | undefined;
            recently_played?: boolean | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getGenreList: (args: {
        cache?: RequestCache | undefined;
        query: {
            _order: "ASC" | "DESC";
            name?: string | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: "name" | "songCount" | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                id: string;
                name: string;
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getPlaylistDetail: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getPlaylistList: (args: {
        cache?: RequestCache | undefined;
        query: {
            _order: "ASC" | "DESC";
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDPlaylistListSort | undefined;
            owner_id?: string | undefined;
            q?: string | undefined;
            smart?: boolean | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getPlaylistSongList: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        query: {
            _order: "ASC" | "DESC";
            path?: string | undefined;
            title?: string | undefined;
            year?: number | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDSongListSort | undefined;
            genre_id?: string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string[] | undefined;
            artist_id?: string[] | undefined;
            has_rating?: boolean | undefined;
            album_artist_id?: string[] | undefined;
            artists_id?: string[] | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getQueue: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getRadioList: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDRadioListSort | undefined;
        } | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                id: string;
                name: string;
                streamUrl: string;
                createdAt: string;
                updatedAt: string;
                homePageUrl?: string | undefined;
                uploadedImage?: string | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getSongDetail: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getSongList: (args: {
        cache?: RequestCache | undefined;
        query: {
            _order: "ASC" | "DESC";
            path?: string | undefined;
            title?: string | undefined;
            year?: number | undefined;
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDSongListSort | undefined;
            genre_id?: string[] | undefined;
            starred?: boolean | undefined;
            album_id?: string[] | undefined;
            artist_id?: string[] | undefined;
            has_rating?: boolean | undefined;
            album_artist_id?: string[] | undefined;
            artists_id?: string[] | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getTagList: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        query?: {
            library_id?: string[] | undefined;
            _end?: number | undefined;
            _order?: "ASC" | "DESC" | undefined;
            _start?: number | undefined;
            _sort?: import("/@/shared/api/navidrome/navidrome-types").NDTagListSort | undefined;
            tag_name?: string | undefined;
            tag_value?: string | undefined;
        } | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                id: string;
                tagName: string;
                tagValue: string;
                songCount?: number | undefined;
                albumCount?: number | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    getUserList: (args: {
        cache?: RequestCache | undefined;
        query: {
            _order: "ASC" | "DESC";
            _end?: number | undefined;
            _start?: number | undefined;
            _sort?: "name" | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                id: string;
                name: string;
                isAdmin: boolean;
                createdAt: string;
                updatedAt: string;
                lastAccessAt: string;
                lastLoginAt: string;
                userName: string;
                email?: string | undefined;
            }[];
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    movePlaylistItem: (args: {
        cache?: RequestCache | undefined;
        params: {
            playlistId: string;
            trackNumber: string;
        };
        body: {
            insert_before: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: null;
        };
        headers: Headers;
    } | {
        status: 400;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 500 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    removeFromPlaylist: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        query: {
            id: string[];
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                ids: string[];
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    saveQueue: (args?: {
        cache?: RequestCache | undefined;
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        body?: {
            position?: number | undefined;
            ids?: string[] | undefined;
            current?: number | undefined;
        } | undefined;
    } | undefined) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: null;
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    shareItem: (args: {
        cache?: RequestCache | undefined;
        body: {
            description: string;
            downloadable: boolean;
            expires: number;
            resourceIds: string;
            resourceType: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 404;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                id: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    updateInternetRadioStation: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        body: {
            name: string;
            streamUrl: string;
            homePageUrl?: string | undefined;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                id: string;
                name: string;
                streamUrl: string;
                createdAt: string;
                updatedAt: string;
                homePageUrl?: string | undefined;
                uploadedImage?: string | undefined;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    updatePlaylist: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
        body?: {
            name?: string | undefined;
            public?: boolean | undefined;
            comment?: string | undefined;
            ownerId?: string | undefined;
            rules?: import("zod").objectInputType<{
                limit: import("zod").ZodOptional<import("zod").ZodNumber>;
                limitPercent: import("zod").ZodOptional<import("zod").ZodNumber>;
                sort: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip"> | undefined;
            sync?: boolean | undefined;
        } | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
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
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    uploadArtistImage: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        body: {
            image: Uint8Array<ArrayBuffer>;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                status: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    uploadInternetRadioStationImage: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        body: {
            image: Uint8Array<ArrayBuffer>;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                status: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
    uploadPlaylistImage: (args: {
        cache?: RequestCache | undefined;
        params: {
            id: string;
        };
        body: {
            image: Uint8Array<ArrayBuffer>;
        };
        fetchOptions?: import("@ts-rest/core").FetchOptions | undefined;
        extraHeaders?: Record<string, string | undefined> | undefined;
        overrideClientOptions?: Partial<import("@ts-rest/core").OverrideableClientArgs> | undefined;
    }) => Promise<{
        status: 200;
        body: {
            headers: import("axios").AxiosHeaders;
            data: {
                status: string;
            };
        };
        headers: Headers;
    } | {
        status: 500;
        body: {
            headers: import("axios").AxiosHeaders;
            data: string;
        };
        headers: Headers;
    } | {
        status: 404 | 401 | 403 | 300 | 100 | 400 | 204 | 101 | 102 | 201 | 202 | 203 | 205 | 206 | 207 | 301 | 302 | 303 | 304 | 305 | 307 | 308 | 402 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 419 | 420 | 421 | 422 | 423 | 424 | 428 | 429 | 431 | 451 | 501 | 502 | 503 | 504 | 505 | 507 | 511;
        body: unknown;
        headers: Headers;
    }>;
};
