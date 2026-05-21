import { AxiosHeaders } from 'axios';
import { z } from 'zod';
import { Album, AlbumArtist, AlbumArtistListSort, AlbumListSort, ArtistListSort, InternetRadioStation, LibraryItem, RadioListSort, ServerListItem, Song, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { ServerFeature } from '/@/shared/types/features-types';
export declare const resultWithHeaders: <ItemType extends z.ZodTypeAny>(itemSchema: ItemType) => z.ZodObject<{
    data: ItemType;
    headers: z.ZodType<AxiosHeaders, z.ZodTypeDef, AxiosHeaders>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    data: ItemType;
    headers: z.ZodType<AxiosHeaders, z.ZodTypeDef, AxiosHeaders>;
}>, any> extends infer T ? { [k in keyof T]: T[k]; } : never, z.baseObjectInputType<{
    data: ItemType;
    headers: z.ZodType<AxiosHeaders, z.ZodTypeDef, AxiosHeaders>;
}> extends infer T_1 ? { [k_1 in keyof T_1]: T_1[k_1]; } : never>;
export declare const resultSubsonicBaseResponse: <ItemType extends z.ZodRawShape>(itemSchema: ItemType) => z.ZodObject<{
    'subsonic-response': z.ZodObject<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>>, any> extends infer T ? { [k in keyof T]: T[k]; } : never, z.baseObjectInputType<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>> extends infer T_1 ? { [k_1 in keyof T_1]: T_1[k_1]; } : never>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    'subsonic-response': z.ZodObject<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>>, any> extends infer T_3 ? { [k in keyof T_3]: T_3[k]; } : never, z.baseObjectInputType<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>> extends infer T_4 ? { [k_1 in keyof T_4]: T_4[k_1]; } : never>;
}>, any> extends infer T_2 ? { [k_2 in keyof T_2]: T_2[k_2]; } : never, z.baseObjectInputType<{
    'subsonic-response': z.ZodObject<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>>, any> extends infer T_6 ? { [k in keyof T_6]: T_6[k]; } : never, z.baseObjectInputType<z.objectUtil.extendShape<{
        status: z.ZodString;
        version: z.ZodString;
    }, ItemType>> extends infer T_7 ? { [k_1 in keyof T_7]: T_7[k_1]; } : never>;
}> extends infer T_5 ? { [k_3 in keyof T_5]: T_5[k_3]; } : never>;
export declare const hasFeature: (server: null | ServerListItem, feature: ServerFeature) => boolean;
export declare const hasFeatureWithVersion: (server: null | ServerListItem, feature: ServerFeature, version: number) => boolean;
export type VersionInfo = ReadonlyArray<[
    string,
    Partial<Record<ServerFeature, readonly number[]>>
]>;
/**
 * Returns the available server features given the version string.
 * @param versionInfo a list, in DECREASING VERSION order, of the features supported by the server.
 *  The first version match will automatically consider the rest matched.
 * @example
 * ```
 * // The CORRECT way to order
 * const VERSION_INFO: VersionInfo = [
 *   ['0.49.3', { [ServerFeature.SHARING_ALBUM_SONG]: [1] }],
 *   ['0.48.0', { [ServerFeature.PLAYLISTS_SMART]: [1] }],
 * ];
 * // INCORRECT way to order
 * const VERSION_INFO: VersionInfo = [
 *   ['0.48.0', { [ServerFeature.PLAYLISTS_SMART]: [1] }],
 *   ['0.49.3', { [ServerFeature.SHARING_ALBUM_SONG]: [1] }],
 * ];
 *  ```
 * @param version the version string (SemVer)
 * @returns a Record containing the matched features (if any) and their versions
 */
export declare const getFeatures: (versionInfo: VersionInfo, version: string) => Partial<Record<ServerFeature, number[]>>;
export declare const getClientType: () => string;
export declare const SEPARATOR_STRING = " \u2022 ";
export declare const sortSongList: (songs: Song[], sortBy: SongListSort, sortOrder: SortOrder) => Song[];
export declare const sortSongsByFetchedOrder: (songs: Song[], fetchedIds: string[], itemType: LibraryItem) => Song[];
export declare const sortAlbumArtistList: (artists: AlbumArtist[], sortBy: AlbumArtistListSort | ArtistListSort, sortOrder: SortOrder) => AlbumArtist[];
export declare const sortAlbumList: (albums: Album[], sortBy: AlbumListSort, sortOrder: SortOrder) => Album[];
export declare const sortRadioList: (stations: InternetRadioStation[], sortBy: RadioListSort, sortOrder: SortOrder) => InternetRadioStation[];
export declare const replacePathPrefix: (path: string, replacePrefix?: string, addPrefix?: string) => string;
