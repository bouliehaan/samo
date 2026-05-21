import { type SamoFetch } from './server-http';
export interface SubsonicGetUserBody {
    'subsonic-response'?: {
        error?: {
            message?: string;
        };
        status?: string;
        user?: {
            adminRole?: boolean;
            username?: string;
        };
        version?: string;
    };
}
export declare const getSubsonicUser: (fetcher: SamoFetch, baseUrl: string, credential: string, username: string) => Promise<{
    error?: {
        message?: string;
    };
    status?: string;
    user?: {
        adminRole?: boolean;
        username?: string;
    };
    version?: string;
}>;
